import type { LoopKitConfig } from '../types/index.js';

/**
 * Configuration validation utilities
 */
export class ConfigValidator {
  /**
   * Validate LoopKit configuration
   */
  static validate(config: Partial<LoopKitConfig>): void {
    if (config.batchSize !== undefined && config.batchSize <= 0) {
      throw new Error('batchSize must be greater than 0');
    }

    if (config.flushInterval !== undefined && config.flushInterval < 0) {
      throw new Error('flushInterval must be >= 0');
    }

    if (config.maxQueueSize !== undefined && config.maxQueueSize <= 0) {
      throw new Error('maxQueueSize must be greater than 0');
    }

    if (config.requestTimeout !== undefined && config.requestTimeout <= 0) {
      throw new Error('requestTimeout must be greater than 0');
    }

    if (config.maxRetries !== undefined && config.maxRetries < 0) {
      throw new Error('maxRetries must be >= 0');
    }

    if (config.sessionTimeout !== undefined && config.sessionTimeout <= 0) {
      throw new Error('sessionTimeout must be greater than 0');
    }
  }
}
