import type {
  LoopKitConfig,
  ILoopKit,
  TrackOptions,
  BatchEventInput,
} from '../types';
import { ConfigValidator } from '../utils/ConfigValidator';
import { Logger } from '../utils/Logger';
import { IdGenerator } from '../utils/IdGenerator';
import { StorageManager } from './StorageManager';
import { SessionManager } from './SessionManager';
import { QueueManager } from './QueueManager';
import { EventTracker } from './EventTracker';
import { NetworkManager } from './NetworkManager';
import { BrowserFeatures } from './BrowserFeatures';

declare const __VERSION__: string;

/**
 * Main LoopKit SDK class
 */
export class LoopKit implements ILoopKit {
  // SDK Version automatically set by Rollup, update in packageon
  public readonly version: string =
    typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.4';

  // Core configuration
  public config: LoopKitConfig = {
    apiKey: '',
    baseURL: 'https://drain.loopkit.ai/v1',
    batchSize: 50,
    flushInterval: 5,
    maxQueueSize: 1000,
    enableCompression: true,
    requestTimeout: 10000,
    debug: false,
    logLevel: 'debug',
    enableAutoCapture: true,
    enableAutoClickTracking: true,
    enableErrorTracking: true,
    enableSessionTracking: true,
    sessionTimeout: 30 * 60, // 30 minutes
    respectDoNotTrack: true,
    enableLocalStorage: true,
    maxRetries: 3,
    retryBackoff: 'exponential',
  };

  // Initialization state
  public initialized: boolean = false;

  // User context
  public userId: string | null = null;
  public userProperties: Record<string, any> = {};
  public groupId: string | null = null;
  public groupProperties: Record<string, any> = {};

  // Core components
  public logger!: Logger;
  public idGenerator!: IdGenerator;
  public storageManager!: StorageManager;
  public sessionManager!: SessionManager;
  public queueManager!: QueueManager;
  public eventTracker!: EventTracker;
  public networkManager!: NetworkManager;
  public browserFeatures?: BrowserFeatures;

  constructor() {
    // Components will be initialized in init()
  }

  /**
   * Initialize LoopKit with API key and configuration
   */
  init(apiKey: string, config: Partial<LoopKitConfig> = {}): LoopKit {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('LoopKit: API key is required and must be a string');
    }

    // Merge configuration
    this.config = {
      ...this.config,
      ...config,
      apiKey,
    };

    // Validate configuration
    ConfigValidator.validate(this.config);

    // Initialize core components
    this.logger = new Logger(this.config);
    this.idGenerator = new IdGenerator();
    this.storageManager = new StorageManager(this.config, this.logger);
    this.sessionManager = new SessionManager(
      this.config,
      this.logger,
      this.idGenerator,
      this.storageManager
    );
    this.queueManager = new QueueManager(
      this.config,
      this.logger,
      this.storageManager
    );
    this.eventTracker = new EventTracker(
      this.config,
      this.logger,
      this.queueManager,
      this.sessionManager,
      this.idGenerator
    );
    this.networkManager = new NetworkManager(this.config, this.logger);

    // Setup browser features if in browser environment
    if (typeof window !== 'undefined') {
      this.browserFeatures = new BrowserFeatures(
        this.config,
        this.logger,
        this.eventTracker,
        this.sessionManager,
        this.queueManager
      );
    }

    // Cross-wire dependencies
    this.queueManager.setNetworkManager(this.networkManager);
    this.queueManager.scheduleFlush();

    // Setup session event tracking callback
    this.sessionManager.setSessionEventCallback(
      (eventName: string, properties: Record<string, any>) => {
        this.eventTracker.track(
          eventName,
          properties,
          {},
          {
            userId: this.userId,
            userProperties: this.userProperties,
            groupId: this.groupId,
            groupProperties: this.groupProperties,
          }
        );
      }
    );

    if (this.browserFeatures) {
      this.browserFeatures.setNetworkManager(this.networkManager);
      this.browserFeatures.setupFeatures();
    }

    this.initialized = true;

    this.logger.debug('LoopKit configured', this.config);
    this.logger.info('LoopKit initialized', {
      apiKey: this.config.apiKey.substring(0, 8) + '...',
      version: this.version,
    });

    return this;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<LoopKitConfig>): LoopKit {
    // Validate configuration
    ConfigValidator.validate(config);

    // Update configuration
    this.config = { ...this.config, ...config };

    // Update components if initialized
    if (this.initialized) {
      this.logger?.updateConfig(this.config);
      this.storageManager?.updateConfig(this.config);
      this.sessionManager?.updateConfig(this.config);
      this.queueManager?.updateConfig(this.config);
      this.eventTracker?.updateConfig(this.config);
      this.networkManager?.updateConfig(this.config);
      this.browserFeatures?.updateConfig(this.config);

      // Restart flush scheduling with new config
      this.queueManager?.restartAutoFlush();
    }

    return this;
  }

  /**
   * Get current configuration
   */
  getConfig(): LoopKitConfig {
    return { ...this.config };
  }

  /**
   * Track an event
   */
  track(
    eventName: string,
    properties: Record<string, any> = {},
    options: TrackOptions = {}
  ): LoopKit {
    if (!this.initialized) {
      this.logger.warn('LoopKit not initialized. Call init() first.');
      return this;
    }

    // Validate event name early
    if (!eventName || typeof eventName !== 'string') {
      this.logger.warn('Event name is required and must be a string');
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
   * Track multiple events in batch
   */
  trackBatch(events: BatchEventInput[]): LoopKit {
    if (!this.initialized) {
      this.logger.warn('LoopKit not initialized. Call init() first.');
      return this;
    }

    if (!Array.isArray(events)) {
      this.logger.error('trackBatch expects an array of events');
      return this;
    }

    events.forEach((event) => {
      if (event && typeof event === 'object' && event.name) {
        this.track(event.name, event.properties || {}, event.options || {});
      }
    });

    return this;
  }

  /**
   * Identify a user
   */
  identify(userId: string, properties: Record<string, any> = {}): LoopKit {
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

    return this;
  }

  /**
   * Associate user with a group
   */
  group(
    groupId: string,
    properties: Record<string, any> = {},
    groupType: string = 'organization'
  ): LoopKit {
    if (!this.initialized) {
      this.logger.warn('LoopKit not initialized. Call init() first.');
      return this;
    }

    if (!groupId || typeof groupId !== 'string') {
      this.logger.error('Group ID is required and must be a string');
      return this;
    }

    this.groupId = groupId;
    this.groupProperties = { ...this.groupProperties, ...properties };

    this.eventTracker.group(groupId, properties, groupType, {
      userId: this.userId,
    });

    return this;
  }

  /**
   * Manually flush queued events
   */
  async flush(): Promise<void> {
    if (!this.initialized) {
      this.logger.warn('LoopKit not initialized. Call init() first.');
      return;
    }

    return this.queueManager.flush(this.networkManager);
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    if (!this.initialized) {
      return 0;
    }
    return this.queueManager.getQueueSize();
  }

  /**
   * Reset SDK state
   */
  reset(): void {
    if (!this.initialized) {
      return;
    }

    // Clear user context
    this.userId = null;
    this.userProperties = {};
    this.groupId = null;
    this.groupProperties = {};

    // Reset components
    this.queueManager?.reset();
    this.storageManager?.clearAll();
    this.sessionManager?.reset();

    this.logger.debug('SDK state reset');
  }

  /**
   * Reset for testing (internal method)
   */
  resetForTesting(): void {
    // Reset components first if they exist
    if (this.initialized) {
      this.queueManager?.reset();
      this.storageManager?.clearAll();
      this.sessionManager?.reset();
    }

    this.initialized = false;
    this.userId = null;
    this.userProperties = {};
    this.groupId = null;
    this.groupProperties = {};

    // Reset config to defaults
    this.config = {
      apiKey: '',
      baseURL: 'https://drain.loopkit.ai/v1',
      batchSize: 50,
      flushInterval: 30,
      maxQueueSize: 1000,
      enableCompression: true,
      requestTimeout: 10000,
      debug: false,
      logLevel: 'debug',
      enableAutoCapture: true,
      enableAutoClickTracking: true,
      enableErrorTracking: true,
      enableSessionTracking: true,
      sessionTimeout: 30 * 60,
      respectDoNotTrack: true,
      enableLocalStorage: true,
      maxRetries: 3,
      retryBackoff: 'exponential',
    };
  }
}
