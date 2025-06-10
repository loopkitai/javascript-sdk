/**
 * Browser-specific features for auto-capture functionality
 */
export class BrowserFeatures {
  constructor(config, logger, eventTracker, sessionManager, queueManager) {
    this.config = config;
    this.logger = logger;
    this.eventTracker = eventTracker;
    this.sessionManager = sessionManager;
    this.queueManager = queueManager;
    this.networkManager = null; // Will be set by LoopKit
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    this.config = config;
  }

  /**
   * Set network manager reference
   */
  setNetworkManager(networkManager) {
    this.networkManager = networkManager;
  }

  /**
   * Setup all browser features based on configuration
   */
  setupFeatures() {
    // Auto page view tracking
    if (this.config.enableAutoCapture) {
      this.setupAutoPageViews();
    }

    // Auto click tracking
    if (this.config.enableAutoClickTracking) {
      this.setupAutoClickTracking();
    }

    // Auto error tracking
    if (this.config.enableErrorTracking) {
      this.setupErrorTracking();
    }

    // Flush on page unload
    this.setupPageUnloadHandling();

    this.logger.debug('Browser features setup completed');
  }

  /**
   * Setup automatic page view tracking
   */
  setupAutoPageViews() {
    // Track initial page view
    window.addEventListener('load', () => {
      this.eventTracker.track('page_view', {
        page: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
      });
    });

    // Track navigation (for SPAs)
    window.addEventListener('popstate', () => {
      this.eventTracker.track('page_view', {
        page: window.location.pathname,
        title: document.title,
      });
    });

    this.logger.debug('Auto page view tracking enabled');
  }

  /**
   * Setup automatic click tracking for buttons and interactive elements
   */
  setupAutoClickTracking() {
    if (typeof document === 'undefined') {
      return; // Not in browser environment
    }

    // Store current page info that gets updated on page changes
    let currentPageInfo = {
      pathname: window.location.pathname,
      title: document.title,
      href: window.location.href,
    };

    // Update page info on navigation events
    const updatePageInfo = () => {
      currentPageInfo = {
        pathname: window.location.pathname,
        title: document.title,
        href: window.location.href,
      };
    };

    // Listen for page changes to keep our cached page info current
    window.addEventListener('popstate', updatePageInfo);
    window.addEventListener('pushstate', updatePageInfo);
    window.addEventListener('replacestate', updatePageInfo);

    // Use capture phase to run before other click handlers and navigation
    document.addEventListener(
      'click',
      (event) => {
        try {
          // Use pre-captured page information to ensure we get the source page
          const sourcePage = currentPageInfo.pathname;
          const sourcePageTitle = currentPageInfo.title;
          const sourcePageUrl = currentPageInfo.href;

          // Immediately update our cached info in case this click causes navigation
          updatePageInfo();

          // Start with the direct target and traverse up to find clickable elements
          let element = event.target;
          let clickableInfo = null;

          // Traverse up the DOM tree to find a clickable element (max 5 levels up)
          let traversalDepth = 0;
          const maxTraversalDepth = 5;

          while (
            element &&
            element.tagName &&
            traversalDepth < maxTraversalDepth
          ) {
            clickableInfo = this.getClickableElementInfo(element);
            if (clickableInfo) {
              break; // Found a clickable element
            }
            element = element.parentElement;
            traversalDepth++;
          }

          if (clickableInfo) {
            const eventProperties = {
              element_type: clickableInfo.type,
              element_text: clickableInfo.text,
              element_id: clickableInfo.id,
              element_class: clickableInfo.className,
              element_tag: clickableInfo.tag,
              page: sourcePage, // Use pre-captured source page
              page_title: sourcePageTitle, // Use pre-captured source title
              page_url: sourcePageUrl, // Use pre-captured source URL
              position: {
                x: event.clientX,
                y: event.clientY,
              },
            };

            // Add href if the element has one
            if (clickableInfo.href) {
              eventProperties.element_href = clickableInfo.href;
            }

            // Add aria-label if the element has one
            if (clickableInfo.ariaLabel) {
              eventProperties.element_aria_label = clickableInfo.ariaLabel;
            }

            // Add traversal info for debugging if we had to traverse up
            if (this.config.debug && traversalDepth > 0) {
              eventProperties.traversal_depth = traversalDepth;
              eventProperties.original_target_tag =
                event.target.tagName.toLowerCase();
            }

            this.eventTracker.track('element_click', eventProperties);
          }
        } catch (error) {
          this.logger.warn('Error in auto click tracking', error);
        }
      },
      { capture: true, passive: true } // Use capture phase to run before navigation
    );

    this.logger.debug('Auto click tracking enabled with capture phase');
  }

  /**
   * Extract information from clickable elements
   */
  getClickableElementInfo(element) {
    if (!element || !element.tagName) {
      return null;
    }

    const tagName = element.tagName.toLowerCase();
    const isClickable = this.isClickableElement(element);

    if (!isClickable) {
      return null;
    }

    // Get element text content
    let text = '';
    if (element.innerText) {
      text = element.innerText.trim();
    } else if (element.textContent) {
      text = element.textContent.trim();
    } else if (element.value) {
      text = element.value.trim();
    } else if (element.alt) {
      text = element.alt.trim();
    } else if (element.title) {
      text = element.title.trim();
    }

    // Limit text length to avoid extremely long strings
    if (text.length > 100) {
      text = text.substring(0, 97) + '...';
    }

    // Determine element type
    let type = tagName;
    if (tagName === 'input') {
      type = element.type || 'input';
    } else if (tagName === 'button') {
      type = element.type === 'submit' ? 'submit_button' : 'button';
    } else if (tagName === 'a') {
      type = 'link';
    }

    // Get href if element is a link or has href attribute
    let href = null;
    if (element.href) {
      href = element.href;
    } else if (element.getAttribute && element.getAttribute('href')) {
      href = element.getAttribute('href');
    }

    // Get aria-label if element has one
    let ariaLabel = null;
    if (element.getAttribute && element.getAttribute('aria-label')) {
      ariaLabel = element.getAttribute('aria-label').trim();
    }

    const result = {
      type,
      text,
      id: element.id || null,
      className: element.className || null,
      tag: tagName,
    };

    // Add href to result if it exists
    if (href) {
      result.href = href;
    }

    // Add aria-label to result if it exists
    if (ariaLabel) {
      result.ariaLabel = ariaLabel;
    }

    return result;
  }

  /**
   * Check if an element is clickable and should be tracked
   */
  isClickableElement(element) {
    const tagName = element.tagName.toLowerCase();

    // Direct clickable elements
    const clickableTags = ['button', 'a', 'input', 'select', 'textarea'];
    if (clickableTags.includes(tagName)) {
      return true;
    }

    // Elements with click handlers or specific roles
    if (
      element.onclick ||
      element.getAttribute('role') === 'button' ||
      element.getAttribute('role') === 'link' ||
      element.getAttribute('tabindex') !== null ||
      element.style.cursor === 'pointer'
    ) {
      return true;
    }

    // Elements with common interactive classes
    const className = element.className || '';
    const interactiveClasses = [
      'btn',
      'button',
      'link',
      'clickable',
      'interactive',
    ];
    if (
      interactiveClasses.some((cls) => className.toLowerCase().includes(cls))
    ) {
      return true;
    }

    // Check if element has click event listeners (limited detection)
    if (
      element.hasAttribute('data-click') ||
      element.hasAttribute('data-action') ||
      element.hasAttribute('ng-click') ||
      element.hasAttribute('@click') ||
      element.hasAttribute('v-on:click')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Setup automatic error tracking
   */
  setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.eventTracker.track('javascript_error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.eventTracker.track('promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack,
      });
    });

    this.logger.debug('Auto error tracking enabled');
  }

  /**
   * Setup page unload handling
   */
  setupPageUnloadHandling() {
    window.addEventListener('beforeunload', () => {
      // End session before page unload
      if (this.config.enableSessionTracking) {
        this.sessionManager.endSession();
      }

      if (this.queueManager.getQueueSize() > 0) {
        // Use sendBeacon for reliability on page unload
        this.sendBeacon();
      }
    });

    // Handle visibility changes - just flush events, don't end sessions
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Flush any pending events when tab becomes hidden
        if (this.queueManager.getQueueSize() > 0) {
          this.sendBeacon();
        }
      }
      // Note: We no longer end/start sessions on visibility changes
      // Sessions will only end on actual page unload or after the inactivity timeout
    });

    this.logger.debug('Page unload handling enabled');
  }

  /**
   * Send events using navigator.sendBeacon for reliability
   */
  sendBeacon() {
    if (this.networkManager && this.queueManager.getQueueSize() > 0) {
      const events = [...this.queueManager.eventQueue];
      const success = this.networkManager.sendBeacon(events);

      if (success) {
        // Clear queue if beacon was sent successfully
        this.queueManager.eventQueue = [];
      }
    }
  }
}
