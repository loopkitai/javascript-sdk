import type { LoopKitConfig, IBrowserFeatures } from '../types/index.js';
import type { Logger } from '../utils/Logger.js';
import type { EventTracker } from './EventTracker.js';
import type { SessionManager } from './SessionManager.js';
import type { QueueManager } from './QueueManager.js';
import type { INetworkManager } from '../types/index.js';

/**
 * Browser features for auto-tracking and browser-specific functionality
 */
export class BrowserFeatures implements IBrowserFeatures {
  private config: LoopKitConfig;
  private logger: Logger;
  private eventTracker: EventTracker;
  private sessionManager: SessionManager;
  private queueManager: QueueManager;
  private networkManager?: INetworkManager;

  private clickHandler?: (event: MouseEvent) => void;
  private errorHandler?: (event: ErrorEvent) => void;
  private unloadHandler?: (event: BeforeUnloadEvent) => void;

  constructor(
    config: LoopKitConfig,
    logger: Logger,
    eventTracker: EventTracker,
    sessionManager: SessionManager,
    queueManager: QueueManager
  ) {
    this.config = config;
    this.logger = logger;
    this.eventTracker = eventTracker;
    this.sessionManager = sessionManager;
    this.queueManager = queueManager;
  }

  /**
   * Setup all browser features based on configuration
   */
  setupFeatures(): void {
    if (typeof window === 'undefined') {
      this.logger.debug(
        'Not in browser environment, skipping browser features'
      );
      return;
    }

    if (this.config.enableAutoClickTracking) {
      this.setupAutoClickTracking();
    }

    if (this.config.enableAutoCapture) {
      this.setupAutoPageViews();
    }

    if (this.config.enableErrorTracking) {
      this.setupErrorTracking();
    }

    this.setupPageUnloadHandling();

    this.logger.debug('Browser features setup complete');
  }

  /**
   * Setup automatic click tracking
   */
  setupAutoClickTracking(): void {
    if (typeof document === 'undefined') {
      return;
    }

    this.clickHandler = (event: MouseEvent) => {
      try {
        const target = event.target as HTMLElement;
        if (!target) return;

        // Find the clickable element (walk up the DOM)
        const clickableElement = this.findClickableElement(target);
        if (!clickableElement) return;

        const properties = this.extractClickProperties(clickableElement, event);

        this.eventTracker.track('click', properties);
      } catch (error) {
        this.logger.error('Error in click tracking', { error });
      }
    };

    document.addEventListener('click', this.clickHandler, { capture: true });
    this.logger.debug('Auto-click tracking enabled');
  }

  /**
   * Setup automatic page view tracking
   */
  setupAutoPageViews(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Track initial page view
    this.trackPageView();

    // Track page views on navigation (for SPAs)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      setTimeout(() => this.trackPageView(), 0);
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      setTimeout(() => this.trackPageView(), 0);
    };

    window.addEventListener('popstate', () => {
      setTimeout(() => this.trackPageView(), 0);
    });

    this.logger.debug('Auto page view tracking enabled');
  }

  /**
   * Setup error tracking
   */
  setupErrorTracking(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.errorHandler = (event: ErrorEvent) => {
      try {
        this.eventTracker.track('error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.error('Error in error tracking', { error });
      }
    };

    window.addEventListener('error', this.errorHandler);
    this.logger.debug('Error tracking enabled');
  }

  /**
   * Setup page unload handling
   */
  setupPageUnloadHandling(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.unloadHandler = () => {
      try {
        // Try to flush remaining events using beacon API
        if (this.queueManager.getQueueSize() > 0 && this.networkManager) {
          const events = this.queueManager.getQueue();

          if (events.length > 0) {
            // Group events by type and send to separate endpoints
            const tracks: any[] = [];
            const identifies: any[] = [];
            const groups: any[] = [];

            events.forEach(({ type, event }) => {
              switch (type) {
                case 'track':
                  tracks.push(event);
                  break;
                case 'identify':
                  identifies.push(event);
                  break;
                case 'group':
                  groups.push(event);
                  break;
              }
            });

            // Send to separate endpoints using beacon API
            if (tracks.length > 0) {
              const endpoint = `${this.config.baseURL}/tracks`;
              const payload = { tracks };
              this.networkManager.sendBeacon(endpoint, payload);
            }

            if (identifies.length > 0) {
              const endpoint = `${this.config.baseURL}/identifies`;
              const payload = { identifies };
              this.networkManager.sendBeacon(endpoint, payload);
            }

            if (groups.length > 0) {
              const endpoint = `${this.config.baseURL}/groups`;
              const payload = { groups };
              this.networkManager.sendBeacon(endpoint, payload);
            }
          }
        }
      } catch (error) {
        this.logger.error('Error in unload handler', { error });
      }
    };

    window.addEventListener('beforeunload', this.unloadHandler);
    this.logger.debug('Page unload handling enabled');
  }

  /**
   * Update configuration
   */
  updateConfig(config: LoopKitConfig): void {
    this.config = config;
  }

  /**
   * Set network manager
   */
  setNetworkManager(networkManager: INetworkManager): void {
    this.networkManager = networkManager;
  }

  /**
   * Track a page view
   */
  private trackPageView(): void {
    this.eventTracker.track('page_view', {
      url: window.location.href,
      path: window.location.pathname,
      search: window.location.search,
      title: document.title,
      referrer: document.referrer,
    });
  }

  /**
   * Find clickable element by walking up the DOM
   */
  private findClickableElement(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = element;
    let depth = 0;
    const maxDepth = 5;

    while (current && depth < maxDepth) {
      const tagName = current.tagName.toLowerCase();

      // Check if element is clickable
      if (
        tagName === 'a' ||
        tagName === 'button' ||
        current.getAttribute('role') === 'button' ||
        current.onclick ||
        current.style.cursor === 'pointer'
      ) {
        return current;
      }

      current = current.parentElement;
      depth++;
    }

    return element; // Fallback to original element
  }

  /**
   * Extract click properties from element
   */
  private extractClickProperties(element: HTMLElement, event: MouseEvent) {
    const rect = element.getBoundingClientRect();

    return {
      element_type: this.getElementType(element),
      element_text: this.getElementText(element),
      element_id: element.id || null,
      element_class: element.className || null,
      element_tag: element.tagName.toLowerCase(),
      element_href: (element as HTMLAnchorElement).href || undefined,
      element_aria_label: element.getAttribute('aria-label') || undefined,
      page: window.location.pathname,
      page_title: document.title,
      page_url: window.location.href,
      position: {
        x: Math.round(event.clientX),
        y: Math.round(event.clientY),
      },
    };
  }

  /**
   * Get element type for analytics
   */
  private getElementType(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'a') return 'link';
    if (tagName === 'button') return 'button';
    if (element.getAttribute('role') === 'button') return 'button';
    if (tagName === 'input') return 'input';
    if (tagName === 'form') return 'form';

    return 'element';
  }

  /**
   * Get readable text from element
   */
  private getElementText(element: HTMLElement): string {
    // Try different text sources
    const text =
      element.innerText ||
      element.textContent ||
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.getAttribute('alt') ||
      '';

    return text.trim().substring(0, 255); // Limit length
  }
}
