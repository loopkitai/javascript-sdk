import { PrivacyUtils } from '../utils/PrivacyUtils.js';

/**
 * Event tracking functionality
 */
export class EventTracker {
  constructor(config, logger, queueManager, sessionManager, idGenerator) {
    this.config = config;
    this.logger = logger;
    this.queueManager = queueManager;
    this.sessionManager = sessionManager;
    this.idGenerator = idGenerator;
  }

  /**
   * Update configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    this.config = config;
  }

  /**
   * Track an event
   * @param {string} eventName - Name of the event
   * @param {Object} properties - Event properties
   * @param {Object} options - Tracking options
   * @param {Object} context - User context (userId, userProperties, etc.)
   */
  track(eventName, properties = {}, options = {}, context = {}) {
    if (!eventName || typeof eventName !== 'string') {
      this.logger.error('Event name is required and must be a string');
      return;
    }

    // Check Do Not Track
    if (this.config.respectDoNotTrack && PrivacyUtils.isDoNotTrackEnabled()) {
      this.logger.info('Tracking disabled due to Do Not Track');
      return;
    }

    // Create event object
    const event = this.createEvent(
      'track',
      {
        name: eventName,
        properties: { ...properties },
        ...options,
      },
      context
    );

    // Apply beforeTrack callback
    let processedEvent = event;
    if (
      this.config.onBeforeTrack &&
      typeof this.config.onBeforeTrack === 'function'
    ) {
      try {
        const result = this.config.onBeforeTrack(event);
        processedEvent = result || event;
      } catch (error) {
        this.logger.error('Error in onBeforeTrack callback', error);
        // Continue with original event even if callback fails
      }
    }

    this.queueManager.enqueueEvent(processedEvent);

    this.logger.debug('Event tracked', { name: eventName, properties });

    return this;
  }

  /**
   * Identify a user
   * @param {string} userId - User identifier
   * @param {Object} properties - User properties
   */
  identify(userId, properties = {}) {
    const event = this.createEvent('identify', {
      userId,
      properties: { ...properties },
    });

    this.queueManager.enqueueEvent(event);

    return this;
  }

  /**
   * Associate user with a group
   * @param {string} groupId - Group identifier
   * @param {Object} properties - Group properties
   * @param {string} groupType - Type of group
   * @param {Object} context - User context
   */
  group(groupId, properties = {}, groupType = 'organization', context = {}) {
    const event = this.createEvent(
      'group',
      {
        groupId,
        groupType,
        properties: { ...properties },
      },
      context
    );

    this.queueManager.enqueueEvent(event);

    return this;
  }

  /**
   * Create a standardized event object
   * @param {string} type - Event type (track, identify, group)
   * @param {Object} data - Event data
   * @param {Object} context - User context
   * @private
   */
  createEvent(type, data, context = {}) {
    const baseEvent = {
      anonymousId: this.sessionManager.getAnonymousId(),
      timestamp: new Date().toISOString(), // ISO 8601 format as required by API
    };

    // Create system object with nested properties as expected by API
    const system = {
      sdk: {
        name: '@loopkit/javascript',
        version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.4', // eslint-disable-line no-undef
      },
      sessionId: this.sessionManager.getSessionId(),
    };

    // Add browser context if available
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

    // Create event based on type
    if (type === 'track') {
      return {
        ...baseEvent,
        userId: context.userId,
        name: data.name,
        properties: data.properties,
        system,
      };
    } else if (type === 'identify') {
      return {
        ...baseEvent,
        userId: data.userId,
        properties: data.properties,
        system,
      };
    } else if (type === 'group') {
      return {
        ...baseEvent,
        userId: context.userId,
        groupId: data.groupId,
        groupType: data.groupType,
        properties: data.properties,
        system,
      };
    }

    // Fallback for unknown types
    return {
      ...baseEvent,
      type,
      ...data,
      system,
    };
  }
}
