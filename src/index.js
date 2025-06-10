/**
 * LoopKit JavaScript SDK
 *
 * A complete analytics SDK for tracking events, user identification,
 * and behavioral analytics in web applications.
 */

import { LoopKit } from './core/LoopKit.js';

// Create singleton instance
const loopkit = new LoopKit();

// Support both ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = loopkit;
} else if (typeof window !== 'undefined') {
  window.LoopKit = loopkit;
}

export default loopkit;
