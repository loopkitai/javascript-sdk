/**
 * ID generation utility
 */
export class IdGenerator {
  /**
   * Generate a unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Generate a unique anonymous ID
   * @returns {string} Anonymous ID
   */
  generateAnonymousId() {
    return 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Generate a unique event ID
   * @returns {string} Event ID
   */
  generateEventId() {
    return 'evt_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
}
