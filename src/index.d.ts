export interface LoopKitConfig {
  // API Settings
  apiKey?: string;
  baseURL?: string;

  // Batching
  batchSize?: number;
  flushInterval?: number;
  maxQueueSize?: number;

  // Performance
  enableCompression?: boolean;
  requestTimeout?: number;

  // Debugging
  debug?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';

  // Auto-capture
  enableAutoCapture?: boolean;
  enableAutoClickTracking?: boolean;
  enableErrorTracking?: boolean;

  // Privacy
  respectDoNotTrack?: boolean;
  enableLocalStorage?: boolean;

  // Retry Logic
  maxRetries?: number;
  retryBackoff?: 'exponential' | 'linear';

  // Callbacks
  onBeforeTrack?: (event: LoopKitEvent) => LoopKitEvent | null;
  onAfterTrack?: (event: LoopKitEvent, success: boolean) => void;
  onError?: (error: Error) => void;
}

export interface LoopKitEvent {
  type: 'track' | 'identify' | 'group';
  timestamp: string;
  sessionId: string;
  name?: string;
  properties?: Record<string, any>;
  userId?: string;
  userProperties?: Record<string, any>;
  groupId?: string;
  groupProperties?: Record<string, any>;
  context?: {
    page?: {
      url: string;
      path: string;
      search: string;
      title: string;
      referrer: string;
    };
    userAgent?: string;
    screen?: {
      width: number;
      height: number;
    };
    viewport?: {
      width: number;
      height: number;
    };
  };
}

export interface BatchEvent {
  name: string;
  properties?: Record<string, any>;
}

export interface LoopKitSDK {
  /**
   * Initialize LoopKit with API key
   */
  init(apiKey: string, options?: LoopKitConfig): LoopKitSDK;

  /**
   * Configure LoopKit settings
   */
  configure(options: LoopKitConfig): LoopKitSDK;

  /**
   * Track an event
   */
  track(
    eventName: string,
    properties?: Record<string, any>,
    options?: Record<string, any>
  ): LoopKitSDK;

  /**
   * Identify a user
   */
  identify(userId: string, properties?: Record<string, any>): LoopKitSDK;

  /**
   * Associate user with a group
   */
  group(groupId: string, properties?: Record<string, any>): LoopKitSDK;

  /**
   * Track multiple events in a batch
   */
  trackBatch(events: BatchEvent[]): LoopKitSDK;

  /**
   * Manually flush the event queue
   */
  flush(): Promise<void>;

  /**
   * Get current queue size
   */
  getQueueSize(): number;

  /**
   * Get current configuration
   */
  getConfig(): LoopKitConfig;

  /**
   * Reset the SDK state
   */
  reset(): LoopKitSDK;
}

declare const LoopKit: LoopKitSDK;

export default LoopKit;
