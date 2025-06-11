import type { LoopKitConfig, ISessionManager } from '../types/index.js';
import type { Logger } from '../utils/Logger.js';
import type { IdGenerator } from '../utils/IdGenerator.js';
import type { StorageManager } from './StorageManager.js';

// Type for the session event callback
type SessionEventCallback = (
  eventName: string,
  properties: Record<string, any>
) => void;

/**
 * Session manager for handling user sessions and anonymous IDs
 */
export class SessionManager implements ISessionManager {
  private config: LoopKitConfig;
  private logger: Logger;
  private idGenerator: IdGenerator;
  private storageManager: StorageManager;
  private sessionEventCallback?: SessionEventCallback;

  private sessionId: string;
  private anonymousId: string;
  private lastActivityTime: number;
  private sessionStartTime: number;

  constructor(
    config: LoopKitConfig,
    logger: Logger,
    idGenerator: IdGenerator,
    storageManager: StorageManager
  ) {
    this.config = config;
    this.logger = logger;
    this.idGenerator = idGenerator;
    this.storageManager = storageManager;

    this.lastActivityTime = Date.now();
    this.sessionStartTime = Date.now();

    // Initialize anonymous ID
    this.anonymousId = this.loadOrCreateAnonymousId();

    // Initialize session
    this.sessionId = this.idGenerator.generateSessionId();
    this.startSession();

    this.logger.debug(`Session initialized`, {
      sessionId: this.sessionId,
      anonymousId: this.anonymousId,
    });
  }

  /**
   * Set callback for session events
   */
  setSessionEventCallback(callback: SessionEventCallback): void {
    this.sessionEventCallback = callback;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    this.updateActivity();
    return this.sessionId;
  }

  /**
   * Get anonymous ID
   */
  getAnonymousId(): string {
    this.updateActivity();
    return this.anonymousId;
  }

  /**
   * Start new session
   */
  startSession(): void {
    const previousSessionId = this.sessionId;
    this.sessionId = this.idGenerator.generateSessionId();
    this.sessionStartTime = Date.now();
    this.lastActivityTime = this.sessionStartTime;

    this.logger.debug(`New session started: ${this.sessionId}`);

    // Track session_start event if callback is available and session tracking is enabled
    if (this.config.enableSessionTracking && this.sessionEventCallback) {
      this.sessionEventCallback('session_start', {
        sessionId: this.sessionId,
        previousSessionId:
          previousSessionId !== this.sessionId ? previousSessionId : undefined,
      });
    }
  }

  /**
   * End current session
   */
  endSession(): void {
    const sessionDuration = Date.now() - this.sessionStartTime;
    const endedSessionId = this.sessionId;

    this.logger.debug(`Session ended: ${endedSessionId}`);

    // Track session_end event if callback is available and session tracking is enabled
    if (this.config.enableSessionTracking && this.sessionEventCallback) {
      this.sessionEventCallback('session_end', {
        sessionId: endedSessionId,
        duration: Math.round(sessionDuration / 1000), // duration in seconds
      });
    }

    // Start new session
    this.startSession();
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    if (!this.config.enableSessionTracking) {
      return true; // Always active if session tracking is disabled
    }

    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    const sessionTimeoutMs = this.config.sessionTimeout! * 1000;

    return timeSinceLastActivity < sessionTimeoutMs;
  }

  /**
   * Update activity timestamp
   */
  updateActivity(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    const sessionTimeoutMs = this.config.sessionTimeout! * 1000;

    // If session has timed out, end current session and start a new one
    if (
      this.config.enableSessionTracking &&
      timeSinceLastActivity >= sessionTimeoutMs
    ) {
      this.logger.debug(
        'Session timeout detected, ending current session and starting new one'
      );
      this.endSession();
    } else {
      this.lastActivityTime = now;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: LoopKitConfig): void {
    this.config = config;
  }

  /**
   * Reset session state
   */
  reset(): void {
    this.logger.debug('Resetting session manager');

    // End current session before starting new one
    if (this.config.enableSessionTracking && this.sessionEventCallback) {
      const sessionDuration = Date.now() - this.sessionStartTime;
      this.sessionEventCallback('session_end', {
        sessionId: this.sessionId,
        duration: Math.round(sessionDuration / 1000),
        reason: 'reset',
      });
    }

    this.startSession();
    // Don't reset anonymous ID on reset - it should persist across sessions
  }

  /**
   * Load existing anonymous ID or create new one
   */
  private loadOrCreateAnonymousId(): string {
    let existingId = this.storageManager.loadAnonymousId();

    if (!existingId) {
      existingId = this.idGenerator.generateAnonymousId();
      this.storageManager.saveAnonymousId(existingId);
      this.logger.debug(`Generated new anonymous ID: ${existingId}`);
    } else {
      this.logger.debug(`Loaded existing anonymous ID: ${existingId}`);
    }

    return existingId;
  }
}
