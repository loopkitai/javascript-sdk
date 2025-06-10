/**
 * Storage manager for localStorage operations
 */
export class StorageManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    this.config = config;
  }

  /**
   * Get localStorage instance with fallback
   * @private
   */
  getStorage() {
    const storage =
      typeof global !== 'undefined' && global.localStorage
        ? global.localStorage
        : typeof localStorage !== 'undefined'
          ? localStorage
          : null;
    return storage;
  }

  /**
   * Persist event queue to localStorage
   */
  persistQueue(queue) {
    if (!this.config.enableLocalStorage) {
      return;
    }

    const storage = this.getStorage();
    if (storage) {
      try {
        storage.setItem('loopkit_queue', JSON.stringify(queue));
      } catch (error) {
        this.logger.warn('Failed to persist queue', error);
      }
    }
  }

  /**
   * Load persisted queue from localStorage
   */
  loadQueue() {
    if (!this.config.enableLocalStorage) {
      return [];
    }

    const storage = this.getStorage();
    if (storage) {
      try {
        const stored = storage.getItem('loopkit_queue');
        if (stored) {
          const events = JSON.parse(stored);
          if (Array.isArray(events)) {
            return events;
          }
        }
      } catch (error) {
        this.logger.warn('Failed to load persisted queue', error);
      }
    }
    return [];
  }

  /**
   * Clear persisted queue from localStorage
   */
  clearQueue() {
    if (!this.config.enableLocalStorage) {
      return;
    }

    const storage = this.getStorage();
    if (storage) {
      try {
        storage.removeItem('loopkit_queue');
      } catch (error) {
        this.logger.warn('Failed to clear persisted queue', error);
      }
    }
  }

  /**
   * Load anonymous ID from localStorage
   */
  loadAnonymousId() {
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
        this.logger.warn('Failed to load anonymous ID', error);
      }
    }
    return null;
  }

  /**
   * Save anonymous ID to localStorage
   */
  saveAnonymousId(anonymousId) {
    if (!this.config.enableLocalStorage) {
      return;
    }

    const storage = this.getStorage();
    if (storage) {
      try {
        storage.setItem('loopkit_anonymousId', anonymousId);
      } catch (error) {
        this.logger.warn('Failed to save anonymous ID', error);
      }
    }
  }

  /**
   * Clear anonymous ID from localStorage
   */
  clearAnonymousId() {
    if (!this.config.enableLocalStorage) {
      return;
    }

    const storage = this.getStorage();
    if (storage) {
      try {
        storage.removeItem('loopkit_anonymousId');
      } catch (error) {
        this.logger.warn('Failed to clear anonymous ID', error);
      }
    }
  }

  /**
   * Clear all LoopKit data from localStorage
   */
  clearAll() {
    this.clearQueue();
    this.clearAnonymousId();
  }
}
