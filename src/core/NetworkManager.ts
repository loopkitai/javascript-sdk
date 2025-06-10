import type { LoopKitConfig, INetworkManager } from '../types/index.js';
import type { Logger } from '../utils/Logger.js';

/**
 * Network manager for handling API communication
 */
export class NetworkManager implements INetworkManager {
  private config: LoopKitConfig;
  private logger: Logger;

  constructor(config: LoopKitConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Send events to API with retry logic
   */
  async sendEvents(
    endpoint: string,
    payload: any,
    retryCount: number = 0
  ): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': `@loopkit/javascript`,
      };

      // Add compression header if enabled
      if (this.config.enableCompression) {
        headers['Accept-Encoding'] = 'gzip, deflate';
      }

      // Add API key as query parameter
      const url = new URL(endpoint);
      url.searchParams.set('apiKey', this.config.apiKey);
      const finalEndpoint = url.toString();

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      };

      // Add timeout if supported
      if (this.config.requestTimeout && this.config.requestTimeout > 0) {
        const controller = new AbortController();
        requestOptions.signal = controller.signal;

        setTimeout(() => controller.abort(), this.config.requestTimeout);
      }

      // Get event count from payload for logging
      const eventCount = this.getEventCountFromPayload(payload);
      this.logger.debug(`Sending ${eventCount} event(s) to ${finalEndpoint}`, {
        retryCount,
        payload,
      });

      let response: Response | null = null;
      try {
        response = await fetch(finalEndpoint, requestOptions);
      } catch (networkError) {
        // This is a network-level error (connection failed, etc.)
        // Preserve the original error message and re-throw immediately
        this.logger.error(
          `Network error during sendEvents (attempt ${retryCount + 1})`,
          {
            endpoint,
            error:
              networkError instanceof Error
                ? networkError.message
                : networkError,
            retryCount,
          }
        );

        // Retry logic for network errors
        if (retryCount < this.config.maxRetries!) {
          const delay = this.calculateRetryDelay(retryCount);
          this.logger.debug(
            `Retrying in ${delay}ms (attempt ${retryCount + 2})`
          );

          await this.sleep(delay);
          return this.sendEvents(endpoint, payload, retryCount + 1);
        }

        // Max retries exceeded - throw the original network error
        throw networkError;
      }

      // At this point we have a response, check if it's successful
      if (!response || !response.ok) {
        const status = response?.status || 'unknown';
        const statusText = response?.statusText || 'unknown error';
        const httpError = new Error(`HTTP ${status}: ${statusText}`);

        this.logger.error(
          `HTTP error during sendEvents (attempt ${retryCount + 1})`,
          {
            endpoint,
            status,
            statusText,
            retryCount,
          }
        );

        // Retry logic for HTTP errors
        if (retryCount < this.config.maxRetries!) {
          const delay = this.calculateRetryDelay(retryCount);
          this.logger.debug(
            `Retrying in ${delay}ms (attempt ${retryCount + 2})`
          );

          await this.sleep(delay);
          return this.sendEvents(endpoint, payload, retryCount + 1);
        }

        // Max retries exceeded - throw the HTTP error
        throw httpError;
      }

      let result;
      try {
        result = await response.json();
      } catch (error) {
        // If response.json() fails, return empty object
        result = {};
      }

      this.logger.debug('Events sent successfully', { result });

      return result;
    } catch (error) {
      // This catch should only handle non-retry errors that weren't already handled above
      // In practice, this should not be reached for network/HTTP errors as they are handled above
      this.logger.error(`Unexpected error in sendEvents`, {
        endpoint,
        error: error instanceof Error ? error.message : error,
        retryCount,
      });

      throw error;
    }
  }

  /**
   * Send beacon for page unload (fallback for critical events)
   */
  sendBeacon(endpoint: string, payload: any): boolean {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
      this.logger.warn('sendBeacon not available');
      return false;
    }

    try {
      // Add API key as query parameter
      const url = new URL(endpoint);
      url.searchParams.set('apiKey', this.config.apiKey);
      const finalEndpoint = url.toString();

      const data = JSON.stringify(payload);
      const blob = new Blob([data], { type: 'application/json' });

      const success = navigator.sendBeacon(finalEndpoint, blob);

      if (success) {
        this.logger.debug('Beacon sent successfully', {
          endpoint: finalEndpoint,
          payload,
        });
      } else {
        this.logger.warn('Beacon failed to send', { endpoint: finalEndpoint });
      }

      return success;
    } catch (error) {
      this.logger.error('Beacon send error', { error });
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: LoopKitConfig): void {
    this.config = config;
  }

  /**
   * Calculate retry delay based on backoff strategy
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second base delay

    if (this.config.retryBackoff === 'linear') {
      return baseDelay * (retryCount + 1);
    } else {
      // Exponential backoff (default)
      return baseDelay * Math.pow(2, retryCount);
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get event count from payload for logging
   */
  private getEventCountFromPayload(payload: any): number {
    if (!payload || typeof payload !== 'object') {
      return 0;
    }

    if (payload.tracks && Array.isArray(payload.tracks)) {
      return payload.tracks.length;
    }

    if (payload.identifies && Array.isArray(payload.identifies)) {
      return payload.identifies.length;
    }

    if (payload.groups && Array.isArray(payload.groups)) {
      return payload.groups.length;
    }

    return 1; // Default for unknown payload structure
  }
}
