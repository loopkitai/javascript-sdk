/**
 * Privacy utilities for handling user preferences
 */
export class PrivacyUtils {
  /**
   * Check if Do Not Track is enabled in the browser
   */
  static isDoNotTrackEnabled(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    // Check various DNT implementations
    const dnt =
      navigator.doNotTrack ||
      (window as any).doNotTrack ||
      (navigator as any).msDoNotTrack;

    return dnt === '1' || dnt === 'yes' || dnt === true;
  }
}
