/**
 * Queue management for event batching and flushing
 */
export class QueueManager {
  constructor(config, logger, storageManager) {
    this.config = config;
    this.logger = logger;
    this.storageManager = storageManager;
    this.eventQueue = [];
    this.flushTimer = null;
    this.flushTimerStartTime = null;
    this.networkManager = null; // Will be set by LoopKit
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    this.config = config;
  }

  /**
   * Set network manager reference
   */
  setNetworkManager(networkManager) {
    this.networkManager = networkManager;
  }

  /**
   * Get current queue size
   */
  getQueueSize() {
    return this.eventQueue.length;
  }

  /**
   * Add event to queue
   */
  enqueueEvent(event) {
    // Check queue size limit
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      this.logger.warn('Event queue full, dropping oldest event');
      this.eventQueue.shift();
    }

    this.eventQueue.push(event);

    // Enhanced debug logging for queue events
    if (this.config.debug) {
      const queueSize = this.eventQueue.length;
      const willAutoFlush = queueSize >= this.config.batchSize;

      // Calculate time until next automatic flush
      let timeUntilNextFlush = null;
      if (!willAutoFlush && this.config.flushInterval > 0) {
        const now = Date.now();
        if (this.flushTimerStartTime) {
          const elapsedSinceTimerStart = now - this.flushTimerStartTime;
          const flushIntervalMs = this.config.flushInterval * 1000;
          timeUntilNextFlush = Math.max(
            0,
            flushIntervalMs - (elapsedSinceTimerStart % flushIntervalMs)
          );
        } else {
          timeUntilNextFlush = this.config.flushInterval * 1000;
        }
      }

      const debugInfo = {
        eventType: event.name
          ? 'track'
          : event.userId && !event.groupId
            ? 'identify'
            : 'group',
        eventName:
          event.name || (event.userId && !event.groupId ? 'identify' : 'group'),
        queueSize,
        batchSize: this.config.batchSize,
        willAutoFlush,
        timeUntilNextFlushMs: timeUntilNextFlush,
        timeUntilNextFlushSeconds: timeUntilNextFlush
          ? Math.round(timeUntilNextFlush / 1000)
          : null,
      };

      this.logger.debug(
        `Event added to queue${willAutoFlush ? ' - triggering immediate flush' : ''}`,
        debugInfo
      );
    }

    // Persist queue if enabled
    if (this.config.enableLocalStorage) {
      this.storageManager.persistQueue(this.eventQueue);
    }

    // Auto-flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush(this.networkManager).catch((error) => {
        this.logger.error('Auto-flush failed', error);
      });
    }
  }

  /**
   * Flush events to network
   */
  async flush(networkManager) {
    if (this.eventQueue.length === 0) {
      this.logger.debug('No events to flush');
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];
    const flushStartTime = Date.now();

    this.logger.debug(`Starting flush of ${events.length} events`);

    // Group events by type
    const eventsByType = {
      tracks: [],
      identifies: [],
      groups: [],
    };

    events.forEach((event) => {
      if (event.name !== undefined) {
        eventsByType.tracks.push(event);
      } else if (event.userId && event.groupId === undefined) {
        eventsByType.identifies.push(event);
      } else if (event.groupId) {
        eventsByType.groups.push(event);
      }
    });

    if (this.config.debug) {
      this.logger.debug('Events grouped for batch sending', {
        tracksCount: eventsByType.tracks.length,
        identifiesCount: eventsByType.identifies.length,
        groupsCount: eventsByType.groups.length,
        totalEvents: events.length,
      });
    }

    try {
      const promises = [];

      if (eventsByType.tracks.length > 0) {
        promises.push(networkManager.sendEvents('tracks', eventsByType.tracks));
      }

      if (eventsByType.identifies.length > 0) {
        promises.push(
          networkManager.sendEvents('identifies', eventsByType.identifies)
        );
      }

      if (eventsByType.groups.length > 0) {
        promises.push(networkManager.sendEvents('groups', eventsByType.groups));
      }

      await Promise.all(promises);

      const flushDuration = Date.now() - flushStartTime;

      if (this.config.debug) {
        this.logger.debug('Batch flush completed successfully', {
          eventsCount: events.length,
          tracksCount: eventsByType.tracks.length,
          identifiesCount: eventsByType.identifies.length,
          groupsCount: eventsByType.groups.length,
          flushDurationMs: flushDuration,
          endpointsSent: promises.length,
          queueSizeAfterFlush: this.eventQueue.length,
        });
      }

      if (this.config.enableLocalStorage) {
        this.storageManager.clearQueue();
      }

      // Call onAfterTrack for each event
      if (
        this.config.onAfterTrack &&
        typeof this.config.onAfterTrack === 'function'
      ) {
        events.forEach((event) => {
          try {
            this.config.onAfterTrack(event, true);
          } catch (error) {
            this.logger.error('Error in onAfterTrack callback', error);
          }
        });
      }
    } catch (error) {
      const flushDuration = Date.now() - flushStartTime;

      if (this.config.debug) {
        this.logger.error('Batch flush failed', {
          eventsCount: events.length,
          tracksCount: eventsByType.tracks.length,
          identifiesCount: eventsByType.identifies.length,
          groupsCount: eventsByType.groups.length,
          flushDurationMs: flushDuration,
          errorMessage: error.message,
          errorType: error.constructor.name,
          queueSizeAfterRequeue: this.eventQueue.length + events.length,
        });
      } else {
        this.logger.error('Failed to flush events', error);
      }

      // Re-queue events on failure
      this.eventQueue.unshift(...events);

      // Call callbacks
      if (
        this.config.onAfterTrack &&
        typeof this.config.onAfterTrack === 'function'
      ) {
        events.forEach((event) => {
          try {
            this.config.onAfterTrack(event, false);
          } catch (callbackError) {
            this.logger.error('Error in onAfterTrack callback', callbackError);
          }
        });
      }

      if (this.config.onError && typeof this.config.onError === 'function') {
        try {
          this.config.onError(error);
        } catch (callbackError) {
          this.logger.error('Error in onError callback', callbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Schedule automatic flush after configured interval
   */
  scheduleFlush() {
    if (this.config.flushInterval > 0 && !this.flushTimer) {
      this.flushTimerStartTime = Date.now();
      this.flushTimer = setTimeout(() => {
        if (this.eventQueue.length > 0) {
          this.flush(this.networkManager).catch((error) => {
            this.logger.error('Scheduled flush failed', error);
          });
        }
      }, this.config.flushInterval * 1000);
    }
  }

  /**
   * Load persisted queue
   */
  loadPersistedQueue() {
    const events = this.storageManager.loadQueue();
    if (events && Array.isArray(events)) {
      this.eventQueue.push(...events);
      this.logger.debug(`Loaded ${events.length} events from storage`);
    }
  }

  /**
   * Clear flush timer
   */
  clearFlushTimer() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
      this.flushTimerStartTime = null;
    }
  }

  /**
   * Reset queue state
   */
  reset() {
    this.eventQueue = [];
    this.clearFlushTimer();
  }

  /**
   * Restart the flush timer (typically after configuration changes)
   */
  restartAutoFlush() {
    this.clearFlushTimer();
    this.scheduleFlush();
  }
}
