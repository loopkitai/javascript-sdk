import type { LoopKitConfig, IStorageManager } from '../types/index.js';
import type { Logger } from '../utils/Logger.js';

declare const __VERSION__: string;

interface StorageData {
  version: string;
  events: any[];
  timestamp: number;
}

/**
 * Storage manager for localStorage operations
 */
export class StorageManager implements IStorageManager {
  private config: LoopKitConfig;
  private logger: Logger;

  constructor(config: LoopKitConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Update configuration
   */
  updateConfig(config: LoopKitConfig): void {
    this.config = config;
  }

  /**
   * Get localStorage instance with fallback
   */
  private getStorage(): Storage | null {
    const storage =
      typeof global !== 'undefined' && global.localStorage
        ? global.localStorage
        : typeof localStorage !== 'undefined'
          ? localStorage
          : null;
    return storage;
  }

  /**
   * Persist event queue to localStorage with version tracking
   */
  persistQueue(queue: any[]): void {
    if (!this.config.enableLocalStorage) {
      return;
    }

    const storage = this.getStorage();
    if (storage) {
      try {
        const data: StorageData = {
          version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.4',
          events: queue,
          timestamp: Date.now(),
        };
        storage.setItem('loopkit_queue', JSON.stringify(data));
      } catch (error) {
        this.logger.warn('Failed to persist queue', { error });
      }
    }
  }

  /**
   * Load persisted queue from localStorage with version checking
   */
  loadQueue(): any[] {
    if (!this.config.enableLocalStorage) {
      return [];
    }

    const storage = this.getStorage();
    if (storage) {
      try {
        const stored = storage.getItem('loopkit_queue');
        if (stored) {
          const data = JSON.parse(stored);

          // Handle legacy format (just an array) - clear it
          if (Array.isArray(data)) {
            this.logger.debug('Legacy event format detected, clearing queue');
            if (storage) {
              try {
                storage.removeItem('loopkit_queue');
              } catch (error) {
                this.logger.warn('Failed to clear persisted queue', { error });
              }
            }
            return [];
          }

          // Handle new format with version checking
          if (data && typeof data === 'object' && data.version && data.events) {
            const currentVersion =
              typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.4';

            if (data.version !== currentVersion) {
              this.logger.debug(
                `Version mismatch detected (stored: ${data.version}, current: ${currentVersion}), clearing queue`
              );
              if (storage) {
                try {
                  storage.removeItem('loopkit_queue');
                } catch (error) {
                  this.logger.warn('Failed to clear persisted queue', {
                    error,
                  });
                }
              }
              return [];
            }

            if (Array.isArray(data.events)) {
              this.logger.debug(
                `Loaded ${data.events.length} events from storage (version: ${data.version})`
              );
              return data.events;
            }
          }
        }
      } catch (error) {
        this.logger.warn(
          'Failed to load persisted queue, clearing corrupted data',
          { error }
        );
        this.clearQueue();
      }
    }
    return [];
  }

  /**
   * Clear persisted queue from localStorage
   */
  clearQueue(): void {
    if (!this.config.enableLocalStorage) {
      return;
    }

    const storage = this.getStorage();
    if (storage) {
      try {
        storage.removeItem('loopkit_queue');
      } catch (error) {
        this.logger.warn('Failed to clear persisted queue', { error });
      }
    }
  }

  /**
   * Load anonymous ID from localStorage
   */
  loadAnonymousId(): string | null {
    if (!this.config.enableLocalStorage) {
      return null;
    }

    const storage = this.getStorage();
    if (storage) {
      try {
        const stored = storage.getItem('loopkit_anonymousId');
        if (stored) {
          return stored;
        }
      } catch (error) {
        this.logger.warn('Failed to load anonymous ID', { error });
      }
    }
    return null;
  }

  /**
   * Save anonymous ID to localStorage
   */
  saveAnonymousId(anonymousId: string): void {
    if (!this.config.enableLocalStorage) {
      return;
    }

    const storage = this.getStorage();
    if (storage) {
      try {
        storage.setItem('loopkit_anonymousId', anonymousId);
      } catch (error) {
        this.logger.warn('Failed to save anonymous ID', { error });
      }
    }
  }

  /**
   * Clear anonymous ID from localStorage
   */
  clearAnonymousId(): void {
    if (!this.config.enableLocalStorage) {
      return;
    }

    const storage = this.getStorage();
    if (storage) {
      try {
        storage.removeItem('loopkit_anonymousId');
      } catch (error) {
        this.logger.warn('Failed to clear anonymous ID', { error });
      }
    }
  }

  /**
   * Clear all LoopKit data from localStorage
   */
  clearAll(): void {
    this.clearQueue();
    this.clearAnonymousId();
  }
}
