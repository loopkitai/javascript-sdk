import type {
  LoopKitConfig,
  IQueueManager,
  INetworkManager,
  TrackEvent,
  IdentifyEvent,
  GroupEvent,
} from '../types/index.js';
import type { Logger } from '../utils/Logger.js';
import type { StorageManager } from './StorageManager.js';

interface QueuedEvent {
  type: 'track' | 'identify' | 'group';
  event: TrackEvent | IdentifyEvent | GroupEvent;
}

/**
 * Queue manager for handling event batching and flushing
 */
export class QueueManager implements IQueueManager {
  private config: LoopKitConfig;
  private logger: Logger;
  private storageManager: StorageManager;
  private networkManager?: INetworkManager;

  public eventQueue: QueuedEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(
    config: LoopKitConfig,
    logger: Logger,
    storageManager: StorageManager
  ) {
    this.config = config;
    this.logger = logger;
    this.storageManager = storageManager;

    this.loadPersistedQueue();
    this.isInitialized = true;
  }

  /**
   * Add event to queue
   */
  enqueueEvent(event: TrackEvent | IdentifyEvent | GroupEvent): void {
    if (!this.isInitialized) {
      this.logger.warn('QueueManager not initialized');
      return;
    }

    // Determine event type based on properties
    let type: 'track' | 'identify' | 'group';
    if ('name' in event) {
      type = 'track';
    } else if ('groupId' in event) {
      type = 'group';
    } else {
      type = 'identify';
    }

    const queuedEvent: QueuedEvent = { type, event };

    // Check queue size limit
    if (this.eventQueue.length >= this.config.maxQueueSize!) {
      this.logger.warn(
        `Queue size limit reached (${this.config.maxQueueSize}), dropping oldest event`
      );
      this.eventQueue.shift(); // Remove oldest event
    }

    // Add to queue
    this.eventQueue.push(queuedEvent);
    this.logger.debug(`Event queued. Queue size: ${this.eventQueue.length}`);

    // Persist to localStorage
    this.persistQueue();

    // Auto-flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize!) {
      this.logger.debug(
        `Batch size reached (${this.config.batchSize}), auto-flushing`
      );
      this.flush(this.networkManager!);
    }
  }

  /**
   * Flush events to API
   */
  async flush(networkManager: INetworkManager): Promise<void> {
    if (!networkManager) {
      this.logger.warn('NetworkManager not set, cannot flush');
      return;
    }

    if (this.eventQueue.length === 0) {
      this.logger.debug('No events to flush');
      return;
    }

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];
    this.persistQueue();

    try {
      // Group events by type
      const tracks: TrackEvent[] = [];
      const identifies: IdentifyEvent[] = [];
      const groups: GroupEvent[] = [];

      eventsToFlush.forEach(({ type, event }) => {
        switch (type) {
          case 'track':
            tracks.push(event as TrackEvent);
            break;
          case 'identify':
            identifies.push(event as IdentifyEvent);
            break;
          case 'group':
            groups.push(event as GroupEvent);
            break;
        }
      });

      // Send to separate API endpoints
      const promises: Promise<any>[] = [];

      if (tracks.length > 0) {
        const endpoint = `${this.config.baseURL}/tracks`;
        const payload = { tracks };
        promises.push(networkManager.sendEvents(endpoint, payload));
      }

      if (identifies.length > 0) {
        const endpoint = `${this.config.baseURL}/identifies`;
        const payload = { identifies };
        promises.push(networkManager.sendEvents(endpoint, payload));
      }

      if (groups.length > 0) {
        const endpoint = `${this.config.baseURL}/groups`;
        const payload = { groups };
        promises.push(networkManager.sendEvents(endpoint, payload));
      }

      // Wait for all requests to complete
      await Promise.all(promises);

      this.logger.debug(`Successfully flushed ${eventsToFlush.length} events`);

      // Call onAfterTrack for each event
      if (this.config.onAfterTrack) {
        eventsToFlush.forEach(({ type, event }) => {
          if (type === 'track') {
            this.config.onAfterTrack!(event as TrackEvent, true);
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to flush events', { error });

      // Re-queue failed events at the front
      this.eventQueue = [...eventsToFlush, ...this.eventQueue];
      this.persistQueue();

      // Call onAfterTrack for failed events
      if (this.config.onAfterTrack) {
        eventsToFlush.forEach(({ type, event }) => {
          if (type === 'track') {
            this.config.onAfterTrack!(event as TrackEvent, false);
          }
        });
      }

      if (this.config.onError) {
        this.config.onError(error as Error);
      }

      throw error;
    }
  }

  /**
   * Get current queue
   */
  getQueue(): QueuedEvent[] {
    return [...this.eventQueue];
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.eventQueue = [];
    this.persistQueue();
    this.logger.debug('Queue cleared');
  }

  /**
   * Reset queue state
   */
  reset(): void {
    this.clearQueue();
    this.stopAutoFlush();
    this.storageManager.clearQueue();
  }

  /**
   * Update configuration
   */
  updateConfig(config: LoopKitConfig): void {
    this.config = config;
  }

  /**
   * Set network manager
   */
  setNetworkManager(networkManager: INetworkManager): void {
    this.networkManager = networkManager;
  }

  /**
   * Schedule auto-flush
   */
  scheduleFlush(): void {
    if (this.config.flushInterval! > 0) {
      this.flushTimer = setInterval(() => {
        if (this.eventQueue.length > 0 && this.networkManager) {
          this.logger.debug('Auto-flush triggered');
          this.flush(this.networkManager);
        }
      }, this.config.flushInterval! * 1000);
    }
  }

  /**
   * Restart auto-flush with new config
   */
  restartAutoFlush(): void {
    this.stopAutoFlush();
    this.scheduleFlush();
  }

  /**
   * Stop auto-flush timer
   */
  private stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Persist queue to storage
   */
  private persistQueue(): void {
    if (this.config.enableLocalStorage) {
      try {
        this.storageManager.persistQueue(this.eventQueue);
      } catch (error) {
        this.logger.warn('Failed to persist queue', { error });
      }
    }
  }

  /**
   * Load persisted queue from storage
   */
  private loadPersistedQueue(): void {
    if (this.config.enableLocalStorage) {
      try {
        const persistedQueue = this.storageManager.loadQueue();
        if (Array.isArray(persistedQueue) && persistedQueue.length > 0) {
          this.eventQueue = persistedQueue;
          this.logger.debug(
            `Loaded ${this.eventQueue.length} persisted events`
          );
        }
      } catch (error) {
        this.logger.warn('Failed to load persisted queue', { error });
      }
    }
  }
}
