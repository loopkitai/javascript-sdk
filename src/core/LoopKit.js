import { EventTracker } from './EventTracker.js';
import { QueueManager } from './QueueManager.js';
import { NetworkManager } from './NetworkManager.js';
import { BrowserFeatures } from './BrowserFeatures.js';
import { StorageManager } from './StorageManager.js';
import { SessionManager } from './SessionManager.js';
import { Logger } from '../utils/Logger.js';
import { ConfigValidator } from '../utils/ConfigValidator.js';
import { IdGenerator } from '../utils/IdGenerator.js';

/**
 * LoopKit JavaScript SDK
 *
 * A complete analytics SDK for tracking events, user identification,
 * and behavioral analytics in web applications.
 */
export class LoopKit {
  constructor() {
    // SDK Version automatically set by Rollup, update in package.json
    this.version = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.4'; // eslint-disable-line no-undef

    // Core configuration
    this.config = {
      // API Settings
      apiKey: null,
      baseURL: 'https://drain.loopkit.ai/v1',

      // Batching
      batchSize: 50,
      flushInterval: 30,
      maxQueueSize: 1000,

      // Performance
      enableCompression: true,
      requestTimeout: 10000,

      // Debugging
      debug: false,
      logLevel: 'debug',

      // Auto-capture
      enableAutoCapture: true,
      enableAutoClickTracking: true,
      enableErrorTracking: true,

      // Session Tracking
      enableSessionTracking: true,
      sessionTimeout: 1800, // 30 minutes of inactivity before session ends

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
    this.userId = null;
    this.userProperties = {};
    this.groupId = null;
    this.groupProperties = {};

    // Initialize core modules
    this.logger = new Logger(this.config);
    this.configValidator = new ConfigValidator();
    this.idGenerator = new IdGenerator();
    this.storageManager = new StorageManager(this.config, this.logger);
    this.queueManager = new QueueManager(
      this.config,
      this.logger,
      this.storageManager
    );
    this.networkManager = new NetworkManager(this.config, this.logger);
    this.sessionManager = new SessionManager(
      this.config,
      this.logger,
      this.idGenerator,
      this.storageManager
    );
    this.eventTracker = new EventTracker(
      this.config,
      this.logger,
      this.queueManager,
      this.sessionManager,
      this.idGenerator
    );

    // Browser-specific features (only initialize in browser environment)
    if (typeof window !== 'undefined') {
      this.browserFeatures = new BrowserFeatures(
        this.config,
        this.logger,
        this.eventTracker,
        this.sessionManager,
        this.queueManager
      );
    }

    // Bind public methods to preserve context
    this.track = this.track.bind(this);
    this.identify = this.identify.bind(this);
    this.group = this.group.bind(this);
    this.trackBatch = this.trackBatch.bind(this);
    this.flush = this.flush.bind(this);
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

    // Stop existing operations if already initialized
    if (this.initialized) {
      this.queueManager.stopAutoFlush();
    }

    this.config.apiKey = apiKey;
    this.configure(options);
    this.initialized = true;

    // Update all modules with new config
    this.updateModuleConfigs();

    this.logger.info('LoopKit initialized', {
      apiKey: apiKey.substring(0, 8) + '...',
      version: this.version,
    });

    // Initialize modules
    this.queueManager.setNetworkManager(this.networkManager);
    this.queueManager.scheduleFlush();

    if (this.config.enableLocalStorage) {
      this.queueManager.loadPersistedQueue();
    }

    if (this.config.enableSessionTracking) {
      this.sessionManager.startSession();
    }

    if (this.browserFeatures) {
      this.browserFeatures.setNetworkManager(this.networkManager);
      this.browserFeatures.setupFeatures();
    }

    return this;
  }

  /**
   * Configure LoopKit settings
   * @param {Object} options - Configuration options
   */
  configure(options = {}) {
    const oldFlushInterval = this.config.flushInterval;
    this.config = { ...this.config, ...options };

    // Validate configuration
    this.configValidator.validate(this.config);

    // Update all modules with new config
    this.updateModuleConfigs();

    this.logger.debug('LoopKit configured', this.config);

    // Restart flush timer if interval changed
    if (
      this.initialized &&
      options.flushInterval !== undefined &&
      oldFlushInterval !== this.config.flushInterval
    ) {
      this.queueManager.restartAutoFlush();
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
      this.logger.warn('LoopKit not initialized. Call init() first.');
      return this;
    }

    this.eventTracker.track(eventName, properties, options, {
      userId: this.userId,
      userProperties: this.userProperties,
      groupId: this.groupId,
      groupProperties: this.groupProperties,
    });

    return this;
  }

  /**
   * Identify a user
   * @param {string} userId - User identifier
   * @param {Object} properties - User properties
   */
  identify(userId, properties = {}) {
    if (!this.initialized) {
      this.logger.warn('LoopKit not initialized. Call init() first.');
      return this;
    }

    if (!userId || typeof userId !== 'string') {
      this.logger.error('User ID is required and must be a string');
      return this;
    }

    this.userId = userId;
    this.userProperties = { ...this.userProperties, ...properties };

    this.eventTracker.identify(userId, properties);

    this.logger.debug('User identified', { userId, properties });

    return this;
  }

  /**
   * Associate user with a group
   * @param {string} groupId - Group identifier
   * @param {Object} properties - Group properties
   * @param {string} groupType - Type of group
   */
  group(groupId, properties = {}, groupType = 'organization') {
    if (!this.initialized) {
      this.logger.warn('LoopKit not initialized. Call init() first.');
      return this;
    }

    if (!groupId || typeof groupId !== 'string') {
      this.logger.error('Group ID is required and must be a string');
      return this;
    }

    if (!groupType || typeof groupType !== 'string') {
      this.logger.error('Group type is required and must be a string');
      return this;
    }

    this.groupId = groupId;
    this.groupProperties = { ...this.groupProperties, ...properties };

    this.eventTracker.group(groupId, properties, groupType, {
      userId: this.userId,
    });

    this.logger.debug('User grouped', { groupId, groupType, properties });

    return this;
  }

  /**
   * Track multiple events in a batch
   * @param {Array} events - Array of event objects
   */
  trackBatch(events) {
    if (!this.initialized) {
      this.logger.warn('LoopKit not initialized. Call init() first.');
      return this;
    }

    if (!Array.isArray(events)) {
      this.logger.error('Events must be an array');
      return this;
    }

    events.forEach((event) => {
      if (event.name && event.properties) {
        this.track(event.name, event.properties);
      } else {
        this.logger.warn('Invalid event in batch', event);
      }
    });

    return this;
  }

  /**
   * Manually flush the event queue
   */
  async flush() {
    if (!this.initialized) {
      this.logger.warn('LoopKit not initialized. Call init() first.');
      return;
    }

    return this.queueManager.flush(this.networkManager);
  }

  /**
   * Get current queue size
   * @returns {number} Number of events in queue
   */
  getQueueSize() {
    return this.queueManager.getQueueSize();
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get SDK version
   * @returns {string} Current SDK version
   */
  getVersion() {
    return this.version;
  }

  /**
   * Reset the SDK state
   */
  reset() {
    // Reset user/group state
    this.userId = null;
    this.userProperties = {};
    this.groupId = null;
    this.groupProperties = {};

    // Reset modules
    this.queueManager.reset();
    this.sessionManager.reset();
    this.storageManager.clearAll();

    // Reset initialization flag
    this.initialized = false;

    this.logger.debug('SDK state reset');

    return this;
  }

  /**
   * Full reset for testing purposes
   */
  resetForTesting() {
    this.reset();

    // Reset config to defaults
    this.config = {
      apiKey: null,
      baseURL: 'https://drain.loopkit.ai/v1',
      batchSize: 50,
      flushInterval: 30,
      maxQueueSize: 1000,
      enableCompression: true,
      requestTimeout: 10000,
      debug: false,
      logLevel: 'debug',
      enableAutoCapture: false,
      enableAutoClickTracking: false,
      enableErrorTracking: false,
      enableSessionTracking: true,
      sessionTimeout: 1800,
      respectDoNotTrack: true,
      enableLocalStorage: true,
      maxRetries: 3,
      retryBackoff: 'exponential',
      onBeforeTrack: null,
      onAfterTrack: null,
      onError: null,
    };

    this.updateModuleConfigs();

    this.logger.debug('SDK state reset for testing');

    return this;
  }

  /**
   * Update all module configurations
   * @private
   */
  updateModuleConfigs() {
    this.logger.updateConfig(this.config);
    this.storageManager.updateConfig(this.config);
    this.queueManager.updateConfig(this.config);
    this.networkManager.updateConfig(this.config);
    this.sessionManager.updateConfig(this.config);
    this.eventTracker.updateConfig(this.config);

    if (this.browserFeatures) {
      this.browserFeatures.updateConfig(this.config);
    }
  }
}
