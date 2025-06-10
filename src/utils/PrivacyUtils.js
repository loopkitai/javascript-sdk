/**
 * Privacy-related utility functions
 */
export class PrivacyUtils {
  /**
   * Check if Do Not Track is enabled
   * @returns {boolean} True if DNT is enabled
   */
  static isDoNotTrackEnabled() {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return false; // Node.js environment - no DNT support
    }

    return (
      navigator.doNotTrack === '1' ||
      window.doNotTrack === '1' ||
      navigator.msDoNotTrack === '1'
    );
  }
}
