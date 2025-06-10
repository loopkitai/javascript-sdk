/**
 * Session manager for tracking user sessions
 */
export class SessionManager {
  constructor(config, logger, idGenerator, storageManager) {
    this.config = config;
    this.logger = logger;
    this.idGenerator = idGenerator;
    this.storageManager = storageManager;
    this.sessionId = this.idGenerator.generateSessionId();
    this.anonymousId = this.loadOrGenerateAnonymousId();
    this.sessionStarted = false;
    this.lastActivityTime = Date.now();
    this.sessionTimer = null;
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    this.config = config;
  }

  /**
   * Get current session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Get current anonymous ID
   */
  getAnonymousId() {
    return this.anonymousId;
  }

  /**
   * Load or generate a unique anonymous ID
   * @private
   */
  loadOrGenerateAnonymousId() {
    if (this.storageManager) {
      const stored = this.storageManager.loadAnonymousId();
      if (stored) {
        return stored;
      }
    }

    // Generate new anonymous ID
    const newAnonymousId = this.idGenerator.generateAnonymousId();

    // Try to save it to localStorage
    if (this.storageManager) {
      this.storageManager.saveAnonymousId(newAnonymousId);
    }

    return newAnonymousId;
  }

  /**
   * Start a new session
   */
  startSession() {
    if (this.sessionStarted) {
      return; // Session already started
    }

    this.sessionStarted = true;
    this.lastActivityTime = Date.now();

    // Set up activity tracking
    this.setupActivityTracking();

    this.logger.debug('Session started', { sessionId: this.sessionId });
  }

  /**
   * End the current session
   */
  endSession() {
    if (!this.sessionStarted) {
      return; // No active session
    }

    const sessionDuration = Math.round(
      (Date.now() - this.lastActivityTime) / 1000
    );

    this.sessionStarted = false;

    // Clear session timer
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    this.logger.debug('Session ended', {
      sessionId: this.sessionId,
      duration: sessionDuration,
    });
  }

  /**
   * Update activity timestamp and reset session timeout
   */
  updateActivity() {
    this.lastActivityTime = Date.now();

    // Reset session timeout
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    // Set new timeout for session end
    this.sessionTimer = setTimeout(() => {
      this.endSession();
    }, this.config.sessionTimeout * 1000);
  }

  /**
   * Setup activity tracking for session management
   */
  setupActivityTracking() {
    if (typeof window === 'undefined') {
      return; // Node.js environment
    }

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    const throttledUpdateActivity = this.throttle(() => {
      this.updateActivity();
    }, 5000); // Throttle to every 5 seconds

    activityEvents.forEach((eventType) => {
      window.addEventListener(eventType, throttledUpdateActivity, {
        passive: true,
      });
    });

    // Initial activity update
    this.updateActivity();
  }

  /**
   * Throttle function to limit how often activity updates
   */
  throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Reset session state
   */
  reset() {
    // Clear session timer
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    this.sessionId = this.idGenerator.generateSessionId();
    this.anonymousId = this.loadOrGenerateAnonymousId();
    this.sessionStarted = false;
    this.lastActivityTime = Date.now();
  }
}
