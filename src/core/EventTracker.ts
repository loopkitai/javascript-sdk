import type {
  LoopKitConfig,
  TrackOptions,
  TrackEvent,
  IdentifyEvent,
  GroupEvent,
  BaseEvent,
  SystemInfo,
} from '../types/index.js';
import type { Logger } from '../utils/Logger.js';
import type { QueueManager } from './QueueManager.js';
import type { SessionManager } from './SessionManager.js';
import type { IdGenerator } from '../utils/IdGenerator.js';
import { PrivacyUtils } from '../utils/PrivacyUtils.js';

declare const __VERSION__: string;

/**
 * Event tracker for handling all event types
 */
export class EventTracker {
  private config: LoopKitConfig;
  private logger: Logger;
  private queueManager: QueueManager;
  private sessionManager: SessionManager;
  private idGenerator: IdGenerator;

  constructor(
    config: LoopKitConfig,
    logger: Logger,
    queueManager: QueueManager,
    sessionManager: SessionManager,
    idGenerator: IdGenerator
  ) {
    this.config = config;
    this.logger = logger;
    this.queueManager = queueManager;
    this.sessionManager = sessionManager;
    this.idGenerator = idGenerator;
  }

  /**
   * Track an event
   */
  track(
    eventName: string,
    properties: Record<string, any> = {},
    options: TrackOptions = {},
    context: any = {}
  ): void {
    // Validate input
    if (!eventName || typeof eventName !== 'string') {
      this.logger.warn('Event name is required and must be a string');
      return;
    }

    // Check DNT
    if (this.config.respectDoNotTrack && PrivacyUtils.isDoNotTrackEnabled()) {
      this.logger.debug('Do Not Track is enabled, skipping event tracking');
      return;
    }

    try {
      // Create track event
      const trackEvent: TrackEvent = {
        ...this.createBaseEvent(options.timestamp),
        name: eventName,
        properties: { ...properties },
        ...(context.userId && { userId: context.userId }),
      };

      // Apply onBeforeTrack callback if present
      let finalEvent = trackEvent;
      if (this.config.onBeforeTrack) {
        try {
          const result = this.config.onBeforeTrack(trackEvent);
          if (result) {
            finalEvent = result;
          }
        } catch (error) {
          this.logger.error('Error in onBeforeTrack callback', { error });
        }
      }

      // Add to queue
      this.queueManager.enqueueEvent(finalEvent);
      this.logger.debug(`Tracked event: ${eventName}`, finalEvent);
    } catch (error) {
      this.logger.error('Failed to track event', { eventName, error });
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
    }
  }

  /**
   * Identify a user
   */
  identify(userId: string, properties: Record<string, any> = {}): void {
    // Validate input
    if (!userId || typeof userId !== 'string') {
      this.logger.warn('User ID is required and must be a string');
      return;
    }

    // Check DNT
    if (this.config.respectDoNotTrack && PrivacyUtils.isDoNotTrackEnabled()) {
      this.logger.debug(
        'Do Not Track is enabled, skipping user identification'
      );
      return;
    }

    try {
      // Create identify event
      const identifyEvent: IdentifyEvent = {
        ...this.createBaseEvent(),
        userId,
        properties: { ...properties },
      };

      // Add to queue
      this.queueManager.enqueueEvent(identifyEvent);
      this.logger.debug(`Identified user: ${userId}`, identifyEvent);
    } catch (error) {
      this.logger.error('Failed to identify user', { userId, error });
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
    }
  }

  /**
   * Associate user with a group
   */
  group(
    groupId: string,
    properties: Record<string, any> = {},
    groupType: string = 'organization',
    context: any = {}
  ): void {
    // Validate input
    if (!groupId || typeof groupId !== 'string') {
      this.logger.warn('Group ID is required and must be a string');
      return;
    }

    // Check DNT
    if (this.config.respectDoNotTrack && PrivacyUtils.isDoNotTrackEnabled()) {
      this.logger.debug('Do Not Track is enabled, skipping group association');
      return;
    }

    try {
      // Create group event
      const groupEvent: GroupEvent = {
        ...this.createBaseEvent(),
        groupId,
        groupType,
        properties: { ...properties },
        ...(context.userId && { userId: context.userId }),
      };

      // Add to queue
      this.queueManager.enqueueEvent(groupEvent);
      this.logger.debug(`Associated with group: ${groupId}`, groupEvent);
    } catch (error) {
      this.logger.error('Failed to associate with group', { groupId, error });
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: LoopKitConfig): void {
    this.config = config;
  }

  /**
   * Create base event structure
   */
  private createBaseEvent(timestamp?: string): BaseEvent {
    const now = timestamp || new Date().toISOString();

    return {
      anonymousId: this.sessionManager.getAnonymousId(),
      timestamp: now,
      system: this.createSystemInfo(),
    };
  }

  /**
   * Create system information
   */
  private createSystemInfo(): SystemInfo {
    const system: SystemInfo = {
      sdk: {
        name: '@loopkit/javascript',
        version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.5',
      },
      sessionId: this.sessionManager.getSessionId(),
    };

    // Add browser context if in browser environment
    if (typeof window !== 'undefined') {
      system.context = {
        page: {
          url: window.location.href,
          path: window.location.pathname,
          search: window.location.search,
          title: document.title,
          referrer: document.referrer,
        },
        userAgent: navigator.userAgent,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };
    }

    return system;
  }
}
