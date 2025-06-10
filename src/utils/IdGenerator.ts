/**
 * ID generation utilities
 */
export class IdGenerator {
  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Generate a unique anonymous ID
   */
  generateAnonymousId(): string {
    return 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Generate a unique event ID
   */
  generateEventId(): string {
    return 'evt_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
}
