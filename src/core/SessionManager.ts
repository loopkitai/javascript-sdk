import type { LoopKitConfig, ISessionManager } from '../types/index.js';
import type { Logger } from '../utils/Logger.js';
import type { IdGenerator } from '../utils/IdGenerator.js';
import type { StorageManager } from './StorageManager.js';

/**
 * Session manager for handling user sessions and anonymous IDs
 */
export class SessionManager implements ISessionManager {
  private config: LoopKitConfig;
  private logger: Logger;
  private idGenerator: IdGenerator;
  private storageManager: StorageManager;

  private sessionId: string;
  private anonymousId: string;
  private lastActivityTime: number;

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
    this.sessionId = this.idGenerator.generateSessionId();
    this.lastActivityTime = Date.now();
    this.logger.debug(`New session started: ${this.sessionId}`);
  }

  /**
   * End current session
   */
  endSession(): void {
    this.logger.debug(`Session ended: ${this.sessionId}`);
    this.sessionId = this.idGenerator.generateSessionId();
    this.lastActivityTime = Date.now();
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

    // If session has timed out, start a new one
    if (
      this.config.enableSessionTracking &&
      timeSinceLastActivity >= sessionTimeoutMs
    ) {
      this.logger.debug('Session timeout detected, starting new session');
      this.startSession();
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
