/**
 * Configuration validator utility
 */
export class ConfigValidator {
  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   */
  validate(config) {
    if (config.batchSize <= 0) {
      throw new Error('batchSize must be greater than 0');
    }

    if (config.flushInterval < 0) {
      throw new Error('flushInterval must be >= 0');
    }

    if (config.maxQueueSize <= 0) {
      throw new Error('maxQueueSize must be greater than 0');
    }

    if (config.requestTimeout <= 0) {
      throw new Error('requestTimeout must be greater than 0');
    }

    if (config.maxRetries < 0) {
      throw new Error('maxRetries must be >= 0');
    }

    if (config.sessionTimeout <= 0) {
      throw new Error('sessionTimeout must be greater than 0');
    }
  }
}
