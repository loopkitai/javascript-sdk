/**
 * Configuration options for LoopKit SDK
 */
export interface LoopKitConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the LoopKit API */
  baseURL?: string;
  /** Number of events to batch before auto-flushing */
  batchSize?: number;
  /** Interval in seconds to auto-flush events */
  flushInterval?: number;
  /** Maximum number of events to store in queue */
  maxQueueSize?: number;
  /** Enable gzip compression for requests */
  enableCompression?: boolean;
  /** Request timeout in milliseconds */
  requestTimeout?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Logging level */
  logLevel?: LogLevel;
  /** Enable automatic event capture */
  enableAutoCapture?: boolean;
  /** Enable automatic click tracking */
  enableAutoClickTracking?: boolean;
  /** Enable automatic error tracking */
  enableErrorTracking?: boolean;
  /** Enable session tracking */
  enableSessionTracking?: boolean;
  /** Session timeout in seconds */
  sessionTimeout?: number;
  /** Respect Do Not Track browser setting */
  respectDoNotTrack?: boolean;
  /** Enable localStorage for event persistence */
  enableLocalStorage?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Retry backoff strategy */
  retryBackoff?: RetryBackoff;
  /** Callback before tracking events */
  onBeforeTrack?: (event: TrackEvent) => TrackEvent | void;
  /** Callback after successfully flushing events */
  onAfterTrack?: (event: TrackEvent, success: boolean) => void;
  /** Error callback */
  onError?: (error: Error) => void;
}

/**
 * Logging levels
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Retry backoff strategies
 */
export type RetryBackoff = 'exponential' | 'linear';

/**
 * Base event properties
 */
export interface BaseEvent {
  /** Unique anonymous identifier */
  anonymousId: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** User ID (if identified) */
  userId?: string | null;
  /** System information */
  system: SystemInfo;
}

/**
 * Track event for analytics
 */
export interface TrackEvent extends BaseEvent {
  /** Event name */
  name: string;
  /** Event properties */
  properties?: Record<string, any>;
}

/**
 * Identify event for user identification
 */
export interface IdentifyEvent extends BaseEvent {
  /** User ID */
  userId: string;
  /** User properties */
  properties?: Record<string, any>;
}

/**
 * Group event for user-group association
 */
export interface GroupEvent extends BaseEvent {
  /** User ID */
  userId: string;
  /** Group ID */
  groupId: string;
  /** Group type */
  groupType: string;
  /** Group properties */
  properties?: Record<string, any>;
}

/**
 * System information included with events
 */
export interface SystemInfo {
  /** SDK information */
  sdk: {
    name: string;
    version: string;
  };
  /** Session ID */
  sessionId: string;
  /** Browser/environment context */
  context?: ContextInfo;
}

/**
 * Browser and environment context
 */
export interface ContextInfo {
  /** Page information */
  page: {
    url: string;
    path: string;
    search: string;
    title: string;
    referrer: string;
  };
  /** User agent string */
  userAgent: string;
  /** Screen dimensions */
  screen: {
    width: number;
    height: number;
  };
  /** Viewport dimensions */
  viewport: {
    width: number;
    height: number;
  };
}

/**
 * Click tracking event properties
 */
export interface ClickEventProperties {
  /** Type of element clicked */
  element_type: string;
  /** Text content of element */
  element_text: string;
  /** Element ID */
  element_id: string | null;
  /** Element CSS classes */
  element_class: string | null;
  /** Element tag name */
  element_tag: string;
  /** Page where click occurred */
  page: string;
  /** Page title */
  page_title: string;
  /** Page URL */
  page_url: string;
  /** Click position */
  position: {
    x: number;
    y: number;
  };
  /** Element href (for links) */
  element_href?: string;
  /** Element aria-label */
  element_aria_label?: string;
  /** DOM traversal depth to find clickable element */
  traversal_depth?: number;
  /** Original clicked element tag */
  original_target_tag?: string;
}

/**
 * Batch event input for trackBatch method
 */
export interface BatchEventInput {
  /** Event name */
  name: string;
  /** Event properties */
  properties?: Record<string, any>;
  /** Event options */
  options?: TrackOptions;
}

/**
 * Options for tracking events
 */
export interface TrackOptions {
  /** Override timestamp */
  timestamp?: string;
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * API response structure
 */
export interface ApiResponse {
  /** Response success status */
  success: boolean;
  /** Error message if failed */
  message?: string;
  /** Additional response data */
  data?: any;
}

/**
 * Network request payload structure
 */
export interface ApiPayload {
  /** Track events */
  tracks?: TrackEvent[];
  /** Identify events */
  identifies?: IdentifyEvent[];
  /** Group events */
  groups?: GroupEvent[];
}

/**
 * Main LoopKit SDK interface
 */
export interface ILoopKit {
  /** SDK version */
  readonly version: string;

  /** Initialize the SDK */
  init(apiKey: string, config?: Partial<LoopKitConfig>): ILoopKit;

  /** Configure the SDK */
  configure(config: Partial<LoopKitConfig>): ILoopKit;

  /** Get current configuration */
  getConfig(): LoopKitConfig;

  /** Track an event */
  track(
    eventName: string,
    properties?: Record<string, any>,
    options?: TrackOptions
  ): ILoopKit;

  /** Track multiple events in batch */
  trackBatch(events: BatchEventInput[]): ILoopKit;

  /** Identify a user */
  identify(userId: string, properties?: Record<string, any>): ILoopKit;

  /** Associate user with a group */
  group(
    groupId: string,
    properties?: Record<string, any>,
    groupType?: string
  ): ILoopKit;

  /** Manually flush queued events */
  flush(): Promise<void>;

  /** Get current queue size */
  getQueueSize(): number;

  /** Reset SDK state */
  reset(): void;

  /** Reset for testing (internal) */
  resetForTesting(): void;
}

/**
 * Storage interface for localStorage operations
 */
export interface IStorageManager {
  /** Persist event queue */
  persistQueue(queue: any[]): void;

  /** Load persisted queue */
  loadQueue(): any[];

  /** Clear persisted queue */
  clearQueue(): void;

  /** Load anonymous ID */
  loadAnonymousId(): string | null;

  /** Save anonymous ID */
  saveAnonymousId(anonymousId: string): void;

  /** Clear anonymous ID */
  clearAnonymousId(): void;

  /** Clear all data */
  clearAll(): void;
}

/**
 * Session management interface
 */
export interface ISessionManager {
  /** Get current session ID */
  getSessionId(): string;

  /** Get anonymous ID */
  getAnonymousId(): string;

  /** Start new session */
  startSession(): void;

  /** End current session */
  endSession(): void;

  /** Check if session is active */
  isSessionActive(): boolean;

  /** Update activity timestamp */
  updateActivity(): void;
}

/**
 * Event queue management interface
 */
export interface IQueueManager {
  /** Add event to queue */
  enqueueEvent(event: any): void;

  /** Flush events to API */
  flush(networkManager: INetworkManager): Promise<void>;

  /** Get current queue */
  getQueue(): any[];

  /** Get queue size */
  getQueueSize(): number;

  /** Clear queue */
  clearQueue(): void;

  /** Reset queue state */
  reset(): void;
}

/**
 * Network communication interface
 */
export interface INetworkManager {
  /** Send events to API */
  sendEvents(endpoint: string, payload: any, retryCount?: number): Promise<any>;

  /** Send beacon for page unload */
  sendBeacon(endpoint: string, payload: any): boolean;

  /** Update SDK configuration */
  updateConfig(config: LoopKitConfig): void;
}

/**
 * Browser features interface
 */
export interface IBrowserFeatures {
  /** Setup all browser features */
  setupFeatures(): void;

  /** Setup click tracking */
  setupAutoClickTracking(): void;

  /** Setup page view tracking */
  setupAutoPageViews(): void;

  /** Setup error tracking */
  setupErrorTracking(): void;

  /** Setup page unload handling */
  setupPageUnloadHandling(): void;
}

// Re-export main types for easier imports
export type {
  LoopKitConfig as Config,
  TrackEvent as Event,
  ClickEventProperties as ClickEvent,
  BatchEventInput as BatchEvent,
  TrackOptions as Options,
  ILoopKit as LoopKit,
};
