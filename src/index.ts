/**
 * LoopKit JavaScript SDK
 *
 * A complete analytics SDK for tracking events, user identification,
 * and behavioral analytics in web applications.
 */

import { LoopKit } from './core/LoopKit.js';

// Create singleton instance
const loopkit = new LoopKit();

// Export the singleton instance as default
export default loopkit;

// Export the class for advanced usage
export { LoopKit };

// Export all types for TypeScript consumers
export type {
  LoopKitConfig,
  LogLevel,
  RetryBackoff,
  BaseEvent,
  TrackEvent,
  IdentifyEvent,
  GroupEvent,
  SystemInfo,
  ContextInfo,
  ClickEventProperties,
  BatchEventInput,
  TrackOptions,
  ApiResponse,
  ApiPayload,
  ILoopKit,
  IStorageManager,
  ISessionManager,
  IQueueManager,
  INetworkManager,
  IBrowserFeatures,
  // Type aliases for easier imports
  Config,
  Event,
  ClickEvent,
  BatchEvent,
  Options,
} from './types/index.js';

// Support both ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = loopkit;
} else if (typeof window !== 'undefined') {
  (window as any).LoopKit = loopkit;
}
