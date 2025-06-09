/**
 * LoopKit JavaScript SDK
 *
 * A complete analytics SDK for tracking events, user identification,
 * and behavioral analytics in web applications.
 */

class LoopKit {
  constructor() {
    // Core configuration
    this.config = {
      // API Settings
      apiKey: null,
      baseURL: 'https://api.loopkit.ai/v1',

      // Batching
      batchSize: 50,
      flushInterval: 30,
      maxQueueSize: 1000,

      // Performance
      enableCompression: true,
      requestTimeout: 10000,

      // Debugging
      debug: false,
      logLevel: 'info',

      // Auto-capture
      enableAutoCapture: false,
      enableErrorTracking: false,

      // Privacy
      respectDoNotTrack: true,
      enableLocalStorage: true,

      // Retry Logic
      maxRetries: 3,
      retryBackoff: 'exponential',

      // Callbacks
      onBeforeTrack: null,
      onAfterTrack: null,
      onError: null,
    };

    // Internal state
    this.initialized = false;
    this.eventQueue = [];
    this.flushTimer = null;
    this.userId = null;
    this.userProperties = {};
    this.groupId = null;
    this.groupProperties = {};
    this.sessionId = this.generateSessionId();
    this.anonymousId = this.generateAnonymousId();

    // Bind methods to preserve context
    this.track = this.track.bind(this);
    this.identify = this.identify.bind(this);
    this.group = this.group.bind(this);
    this.trackBatch = this.trackBatch.bind(this);
    this.flush = this.flush.bind(this);

    // Initialize auto-capture if browser environment
    if (typeof window !== 'undefined') {
      this.setupBrowserFeatures();
    }
  }

  /**
   * Initialize LoopKit with API key
   * @param {string} apiKey - Your LoopKit API key
   * @param {Object} options - Optional configuration
   */
  init(apiKey, options = {}) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('LoopKit: API key is required and must be a string');
    }

    // If already initialized, stop the existing timer
    if (this.initialized && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.config.apiKey = apiKey;
    this.configure(options);
    this.initialized = true;

    this.log('info', 'LoopKit initialized', {
      apiKey: apiKey.substring(0, 8) + '...',
    });

    // Start auto-flush timer
    this.startFlushTimer();

    // Load persisted queue
    if (this.config.enableLocalStorage) {
      this.loadPersistedQueue();
    }

    return this;
  }

  /**
   * Configure LoopKit settings
   * @param {Object} options - Configuration options
   */
  configure(options = {}) {
    this.config = { ...this.config, ...options };

    // Validate configuration
    this.validateConfig();

    this.log('debug', 'LoopKit configured', this.config);

    // Restart flush timer if interval changed
    if (this.flushTimer && options.flushInterval !== undefined) {
      this.startFlushTimer();
    }

    return this;
  }

  /**
   * Track an event
   * @param {string} eventName - Name of the event
   * @param {Object} properties - Event properties
   * @param {Object} options - Tracking options
   */
  track(eventName, properties = {}, options = {}) {
    if (!this.initialized) {
      this.log('warn', 'LoopKit not initialized. Call init() first.');
      return;
    }

    if (!eventName || typeof eventName !== 'string') {
      this.log('error', 'Event name is required and must be a string');
      return;
    }

    // Check Do Not Track
    if (this.config.respectDoNotTrack && this.isDoNotTrackEnabled()) {
      this.log('info', 'Tracking disabled due to Do Not Track');
      return;
    }

    // Create event object
    const event = this.createEvent('track', {
      name: eventName,
      properties: { ...properties },
      ...options,
    });

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
        this.log('error', 'Error in onBeforeTrack callback', error);
        // Continue with original event even if callback fails
      }
    }

    this.enqueueEvent(processedEvent);

    this.log('debug', 'Event tracked', { name: eventName, properties });

    return this;
  }

  /**
   * Identify a user
   * @param {string} userId - User identifier
   * @param {Object} properties - User properties
   */
  identify(userId, properties = {}) {
    if (!this.initialized) {
      this.log('warn', 'LoopKit not initialized. Call init() first.');
      return;
    }

    if (!userId || typeof userId !== 'string') {
      this.log('error', 'User ID is required and must be a string');
      return;
    }

    this.userId = userId;
    this.userProperties = { ...this.userProperties, ...properties };

    const event = this.createEvent('identify', {
      userId,
      properties: { ...properties },
    });

    this.enqueueEvent(event);

    this.log('debug', 'User identified', { userId, properties });

    return this;
  }

  /**
   * Associate user with a group
   * @param {string} groupId - Group identifier
   * @param {Object} properties - Group properties
   * @param {string} groupType - Type of group (e.g., 'organization', 'team', 'company')
   */
  group(groupId, properties = {}, groupType = 'organization') {
    if (!this.initialized) {
      this.log('warn', 'LoopKit not initialized. Call init() first.');
      return;
    }

    if (!groupId || typeof groupId !== 'string') {
      this.log('error', 'Group ID is required and must be a string');
      return;
    }

    if (!groupType || typeof groupType !== 'string') {
      this.log('error', 'Group type is required and must be a string');
      return;
    }

    this.groupId = groupId;
    this.groupProperties = { ...this.groupProperties, ...properties };

    const event = this.createEvent('group', {
      groupId,
      groupType,
      properties: { ...properties },
    });

    this.enqueueEvent(event);

    this.log('debug', 'User grouped', { groupId, groupType, properties });

    return this;
  }

  /**
   * Track multiple events in a batch
   * @param {Array} events - Array of event objects
   */
  trackBatch(events) {
    if (!this.initialized) {
      this.log('warn', 'LoopKit not initialized. Call init() first.');
      return;
    }

    if (!Array.isArray(events)) {
      this.log('error', 'Events must be an array');
      return;
    }

    events.forEach((event) => {
      if (event.name && event.properties) {
        this.track(event.name, event.properties);
      } else {
        this.log('warn', 'Invalid event in batch', event);
      }
    });

    return this;
  }

  /**
   * Manually flush the event queue
   */
  async flush() {
    if (this.eventQueue.length === 0) {
      this.log('debug', 'No events to flush');
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    this.log('debug', `Flushing ${events.length} events`);

    // Group events by type
    const eventsByType = {
      tracks: [],
      identifies: [],
      groups: [],
    };

    events.forEach((event) => {
      if (event.name !== undefined) {
        // Track event
        eventsByType.tracks.push(event);
      } else if (event.userId && event.groupId === undefined) {
        // Identify event
        eventsByType.identifies.push(event);
      } else if (event.groupId) {
        // Group event
        eventsByType.groups.push(event);
      }
    });

    try {
      // Send each event type to its respective endpoint
      const promises = [];

      if (eventsByType.tracks.length > 0) {
        promises.push(this.sendEvents('tracks', eventsByType.tracks));
      }

      if (eventsByType.identifies.length > 0) {
        promises.push(this.sendEvents('identifies', eventsByType.identifies));
      }

      if (eventsByType.groups.length > 0) {
        promises.push(this.sendEvents('groups', eventsByType.groups));
      }

      await Promise.all(promises);

      // Clear persisted queue on successful flush
      if (this.config.enableLocalStorage) {
        this.clearPersistedQueue();
      }

      // Call onAfterTrack for each event
      if (
        this.config.onAfterTrack &&
        typeof this.config.onAfterTrack === 'function'
      ) {
        events.forEach((event) => {
          try {
            this.config.onAfterTrack(event, true);
          } catch (error) {
            this.log('error', 'Error in onAfterTrack callback', error);
          }
        });
      }
    } catch (error) {
      this.log('error', 'Failed to flush events', error);

      // Re-queue events on failure
      this.eventQueue.unshift(...events);

      // Call onAfterTrack with failure
      if (
        this.config.onAfterTrack &&
        typeof this.config.onAfterTrack === 'function'
      ) {
        events.forEach((event) => {
          try {
            this.config.onAfterTrack(event, false);
          } catch (callbackError) {
            this.log('error', 'Error in onAfterTrack callback', callbackError);
          }
        });
      }

      // Call onError callback
      if (this.config.onError && typeof this.config.onError === 'function') {
        try {
          this.config.onError(error);
        } catch (callbackError) {
          this.log('error', 'Error in onError callback', callbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Get current queue size
   * @returns {number} Number of events in queue
   */
  getQueueSize() {
    return this.eventQueue.length;
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Reset the SDK state
   */
  reset() {
    // Clear event queue
    this.eventQueue = [];

    // Clear user/group state
    this.userId = null;
    this.userProperties = {};
    this.groupId = null;
    this.groupProperties = {};

    // Clear session and generate new anonymous ID
    this.sessionId = this.generateSessionId();
    this.anonymousId = this.generateAnonymousId();

    // Clear timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Clear localStorage if enabled
    if (this.config.enableLocalStorage) {
      this.clearPersistedQueue();
    }

    // Reset initialization flag
    this.initialized = false;

    this.log('debug', 'SDK state reset');

    return this;
  }

  /**
   * Full reset for testing purposes - reinitializes entire SDK
   */
  resetForTesting() {
    // Clear timers first
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Reset to initial state
    this.config = {
      // API Settings
      apiKey: null,
      baseURL: 'https://api.loopkit.ai/v1',

      // Batching
      batchSize: 50,
      flushInterval: 30,
      maxQueueSize: 1000,

      // Performance
      enableCompression: true,
      requestTimeout: 10000,

      // Debugging
      debug: false,
      logLevel: 'info',

      // Auto-capture
      enableAutoCapture: false,
      enableErrorTracking: false,

      // Privacy
      respectDoNotTrack: true,
      enableLocalStorage: true,

      // Retry Logic
      maxRetries: 3,
      retryBackoff: 'exponential',

      // Callbacks
      onBeforeTrack: null,
      onAfterTrack: null,
      onError: null,
    };

    // Reset internal state
    this.initialized = false;
    this.eventQueue = [];
    this.userId = null;
    this.userProperties = {};
    this.groupId = null;
    this.groupProperties = {};
    this.sessionId = this.generateSessionId();
    this.anonymousId = this.generateAnonymousId();

    // Clear localStorage
    this.clearPersistedQueue();

    return this;
  }

  // Private methods

  /**
   * Create a standardized event object
   */
  createEvent(type, data) {
    const baseEvent = {
      anonymousId: this.anonymousId,
      timestamp: new Date().toISOString(),
    };

    // Add system information
    const system = {
      sdk: {
        name: '@loopkit/javascript',
        version: '1.0.0',
      },
      sessionId: this.sessionId,
    };

    // Add page context in browser
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
        userId: this.userId,
        name: data.name,
        properties: data.properties || {},
        system,
      };
    } else if (type === 'identify') {
      return {
        ...baseEvent,
        userId: data.userId,
        properties: data.properties || {},
        system,
      };
    } else if (type === 'group') {
      return {
        ...baseEvent,
        userId: this.userId,
        groupId: data.groupId,
        groupType: data.groupType,
        properties: data.properties || {},
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

  /**
   * Add event to queue and trigger flush if needed
   */
  enqueueEvent(event) {
    // Check queue size limit
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      this.log('warn', 'Event queue full, dropping oldest event');
      this.eventQueue.shift();
    }

    this.eventQueue.push(event);

    // Persist queue if enabled - but don't let it block event queuing
    if (this.config.enableLocalStorage) {
      try {
        this.persistQueue();
      } catch (error) {
        this.log('warn', 'Failed to persist queue', error);
        // Continue execution even if localStorage fails
      }
    }

    // Auto-flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush().catch((error) => {
        this.log('error', 'Auto-flush failed', error);
      });
    }
  }

  /**
   * Send events to the API
   */
  async sendEvents(endpoint, events, retryCount = 0) {
    const url = `${this.config.baseURL}/${endpoint}`;

    // Create payload based on endpoint type
    let payload;
    if (endpoint === 'tracks') {
      payload = { tracks: events };
    } else if (endpoint === 'identifies') {
      payload = { identifies: events };
    } else if (endpoint === 'groups') {
      payload = { groups: events };
    } else {
      // invalid endpoint
      throw new Error(`Invalid endpoint: ${endpoint}`);
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    if (this.config.enableCompression) {
      headers['Content-Encoding'] = 'gzip';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.requestTimeout
      );

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response exists and has ok property
      if (!response || !response.ok) {
        const statusText = response ? response.statusText : 'Network error';
        const status = response ? response.status : 0;
        throw new Error(status ? `HTTP ${status}: ${statusText}` : statusText);
      }

      this.log(
        'debug',
        `Successfully sent ${events.length} ${endpoint} events`
      );
    } catch (error) {
      this.log(
        'error',
        `Failed to send ${endpoint} events (attempt ${retryCount + 1})`,
        error
      );

      // Retry logic
      if (retryCount < this.config.maxRetries) {
        const delay = this.calculateRetryDelay(retryCount);
        this.log('debug', `Retrying in ${delay}ms`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendEvents(endpoint, events, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Calculate retry delay based on backoff strategy
   */
  calculateRetryDelay(retryCount) {
    if (this.config.retryBackoff === 'exponential') {
      return Math.min(1000 * Math.pow(2, retryCount), 30000);
    } else {
      return 1000 * (retryCount + 1);
    }
  }

  /**
   * Start the auto-flush timer
   */
  startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        if (this.eventQueue.length > 0) {
          this.flush().catch((error) => {
            this.log('error', 'Scheduled flush failed', error);
          });
        }
      }, this.config.flushInterval * 1000);
    }
  }

  /**
   * Setup browser-specific features
   */
  setupBrowserFeatures() {
    // Auto page view tracking
    if (this.config.enableAutoCapture) {
      this.setupAutoPageViews();
    }

    // Auto error tracking
    if (this.config.enableErrorTracking) {
      this.setupErrorTracking();
    }

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      if (this.eventQueue.length > 0) {
        // Use sendBeacon for reliability on page unload
        this.sendBeacon();
      }
    });

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.eventQueue.length > 0) {
        this.sendBeacon();
      }
    });
  }

  /**
   * Setup automatic page view tracking
   */
  setupAutoPageViews() {
    // Track initial page view
    window.addEventListener('load', () => {
      this.track('page_view', {
        page: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
      });
    });

    // Track navigation (for SPAs)
    window.addEventListener('popstate', () => {
      this.track('page_view', {
        page: window.location.pathname,
        title: document.title,
      });
    });
  }

  /**
   * Setup automatic error tracking
   */
  setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.track('javascript_error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.track('promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack,
      });
    });
  }

  /**
   * Send events using navigator.sendBeacon for reliability
   */
  sendBeacon() {
    if (navigator.sendBeacon && this.eventQueue.length > 0) {
      const url = `${this.config.baseURL}/events`;
      const payload = {
        apiKey: this.config.apiKey,
        events: [...this.eventQueue],
      };

      const sent = navigator.sendBeacon(url, JSON.stringify(payload));

      if (sent) {
        this.eventQueue = [];
        this.log('debug', 'Events sent via beacon');
      }
    }
  }

  /**
   * Persist event queue to localStorage
   */
  persistQueue() {
    const storage =
      typeof global !== 'undefined' && global.localStorage
        ? global.localStorage
        : typeof localStorage !== 'undefined'
          ? localStorage
          : null;
    if (storage) {
      try {
        storage.setItem('loopkit_queue', JSON.stringify(this.eventQueue));
      } catch (error) {
        this.log('warn', 'Failed to persist queue', error);
      }
    }
  }

  /**
   * Load persisted queue from localStorage
   */
  loadPersistedQueue() {
    const storage =
      typeof global !== 'undefined' && global.localStorage
        ? global.localStorage
        : typeof localStorage !== 'undefined'
          ? localStorage
          : null;
    if (storage) {
      try {
        const stored = storage.getItem('loopkit_queue');
        if (stored) {
          const events = JSON.parse(stored);
          if (Array.isArray(events)) {
            this.eventQueue.push(...events);
            this.log('debug', `Loaded ${events.length} events from storage`);
          }
        }
      } catch (error) {
        this.log('warn', 'Failed to load persisted queue', error);
      }
    }
  }

  /**
   * Clear persisted queue from localStorage
   */
  clearPersistedQueue() {
    const storage =
      typeof global !== 'undefined' && global.localStorage
        ? global.localStorage
        : typeof localStorage !== 'undefined'
          ? localStorage
          : null;
    if (storage) {
      try {
        storage.removeItem('loopkit_queue');
      } catch (error) {
        this.log('warn', 'Failed to clear persisted queue', error);
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Generate a unique anonymous ID
   */
  generateAnonymousId() {
    return 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Check if Do Not Track is enabled
   */
  isDoNotTrackEnabled() {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return false; // Node.js environment - no DNT support
    }

    return (
      navigator.doNotTrack === '1' ||
      window.doNotTrack === '1' ||
      navigator.msDoNotTrack === '1'
    );
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    if (this.config.batchSize <= 0) {
      throw new Error('batchSize must be greater than 0');
    }

    if (this.config.flushInterval < 0) {
      throw new Error('flushInterval must be >= 0');
    }

    if (this.config.maxQueueSize <= 0) {
      throw new Error('maxQueueSize must be greater than 0');
    }

    if (this.config.requestTimeout <= 0) {
      throw new Error('requestTimeout must be greater than 0');
    }

    if (this.config.maxRetries < 0) {
      throw new Error('maxRetries must be >= 0');
    }
  }

  /**
   * Internal logging method
   */
  log(level, message, data = null) {
    if (!this.config.debug) return;

    const levels = ['error', 'warn', 'info', 'debug'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);

    if (messageLevel <= configLevel) {
      const timestamp = new Date().toISOString();
      const logMessage = `[LoopKit ${timestamp}] ${message}`;

      if (data) {
        console[level](logMessage, data);
      } else {
        console[level](logMessage);
      }
    }
  }
}

// Create singleton instance
const loopkit = new LoopKit();

// Support both ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = loopkit;
} else if (typeof window !== 'undefined') {
  window.LoopKit = loopkit;
}

export default loopkit;
