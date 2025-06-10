/**
 * Network manager for API communication
 */
export class NetworkManager {
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
   * Send events to the API
   */
  async sendEvents(endpoint, events, retryCount = 0) {
    const url = `${this.config.baseURL}/${endpoint}?apiKey=${encodeURIComponent(this.config.apiKey)}`;
    const sendStartTime = Date.now();

    // Create payload based on endpoint type
    let payload;
    if (endpoint === 'tracks') {
      payload = { tracks: events };
    } else if (endpoint === 'identifies') {
      payload = { identifies: events };
    } else if (endpoint === 'groups') {
      payload = { groups: events };
    } else {
      // invalid endpoint
      throw new Error(`Invalid endpoint: ${endpoint}`);
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.config.debug) {
      this.logger.debug(
        `Sending ${events.length} events to ${endpoint} endpoint${retryCount > 0 ? ` (retry ${retryCount})` : ''}`,
        {
          endpoint,
          eventsCount: events.length,
          retryAttempt: retryCount,
          url: url.replace(/apiKey=[^&]+/, 'apiKey=***'),
          payloadSize: JSON.stringify(payload).length,
        }
      );
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.requestTimeout
      );

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const sendDuration = Date.now() - sendStartTime;

      // Check if response exists and has ok property
      if (!response || !response.ok) {
        const statusText = response ? response.statusText : 'Network error';
        const status = response ? response.status : 0;
        throw new Error(status ? `HTTP ${status}: ${statusText}` : statusText);
      }

      if (this.config.debug) {
        this.logger.debug(
          `Successfully sent ${events.length} ${endpoint} events`,
          {
            endpoint,
            eventsCount: events.length,
            sendDurationMs: sendDuration,
            responseStatus: response.status,
            retryAttempt: retryCount,
          }
        );
      } else {
        this.logger.debug(
          `Successfully sent ${events.length} ${endpoint} events`
        );
      }
    } catch (error) {
      const sendDuration = Date.now() - sendStartTime;

      if (this.config.debug) {
        this.logger.error(
          `Failed to send ${endpoint} events (attempt ${retryCount + 1})`,
          {
            endpoint,
            eventsCount: events.length,
            sendDurationMs: sendDuration,
            retryAttempt: retryCount + 1,
            maxRetries: this.config.maxRetries,
            errorMessage: error.message,
            errorType: error.constructor.name,
          }
        );
      } else {
        this.logger.error(
          `Failed to send ${endpoint} events (attempt ${retryCount + 1})`,
          error
        );
      }

      // Retry logic
      if (retryCount < this.config.maxRetries) {
        const delay = this.calculateRetryDelay(retryCount);

        if (this.config.debug) {
          this.logger.debug(`Retrying ${endpoint} endpoint in ${delay}ms`, {
            endpoint,
            retryDelay: delay,
            nextRetryAttempt: retryCount + 2,
            maxRetries: this.config.maxRetries,
          });
        } else {
          this.logger.debug(`Retrying in ${delay}ms`);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendEvents(endpoint, events, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Calculate retry delay based on backoff strategy
   */
  calculateRetryDelay(retryCount) {
    if (this.config.retryBackoff === 'exponential') {
      return Math.min(1000 * Math.pow(2, retryCount), 30000);
    } else {
      return 1000 * (retryCount + 1);
    }
  }

  /**
   * Send events using navigator.sendBeacon for reliability
   */
  sendBeacon(events) {
    if (!navigator.sendBeacon || events.length === 0) {
      return false;
    }

    // Group events by type like in flush()
    const eventsByType = {
      tracks: [],
      identifies: [],
      groups: [],
    };

    events.forEach((event) => {
      if (event.name !== undefined) {
        // Track event
        eventsByType.tracks.push(event);
      } else if (event.userId && event.groupId === undefined) {
        // Identify event
        eventsByType.identifies.push(event);
      } else if (event.groupId) {
        // Group event
        eventsByType.groups.push(event);
      }
    });

    let successCount = 0;

    // Send each event type to its respective endpoint
    if (eventsByType.tracks.length > 0) {
      const url = `${this.config.baseURL}/tracks?apiKey=${encodeURIComponent(this.config.apiKey)}`;
      const payload = {
        tracks: eventsByType.tracks,
      };
      if (navigator.sendBeacon(url, JSON.stringify(payload))) {
        successCount++;
      }
    }

    if (eventsByType.identifies.length > 0) {
      const url = `${this.config.baseURL}/identifies?apiKey=${encodeURIComponent(this.config.apiKey)}`;
      const payload = {
        identifies: eventsByType.identifies,
      };
      if (navigator.sendBeacon(url, JSON.stringify(payload))) {
        successCount++;
      }
    }

    if (eventsByType.groups.length > 0) {
      const url = `${this.config.baseURL}/groups?apiKey=${encodeURIComponent(this.config.apiKey)}`;
      const payload = {
        groups: eventsByType.groups,
      };
      if (navigator.sendBeacon(url, JSON.stringify(payload))) {
        successCount++;
      }
    }

    if (successCount > 0) {
      this.logger.debug(`Events sent via beacon to ${successCount} endpoints`);
      return true;
    }

    return false;
  }
}
