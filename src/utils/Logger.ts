import type { LoopKitConfig, LogLevel } from '../types/index.js';

declare const __VERSION__: string;

/**
 * Logging utility for LoopKit SDK
 */
export class Logger {
  private config: LoopKitConfig;

  constructor(config: LoopKitConfig) {
    this.config = config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: LoopKitConfig): void {
    this.config = config;
  }

  /**
   * Log an error message
   */
  error(message: string, data?: Record<string, any>): void {
    this.log('error', message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, any>): void {
    this.log('warn', message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, any>): void {
    this.log('info', message, data);
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, any>): void {
    this.log('debug', message, data);
  }

  /**
   * Internal logging method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const now = new Date();
    const fullTimestamp =
      now.toLocaleDateString('en-US') +
      ' ' +
      now.toLocaleTimeString('en-US') +
      '.' +
      now.getMilliseconds();

    if (data) {
      const logData = {
        ...data,
        timestamp: fullTimestamp,
        version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.4',
      };

      const logMessage = `[LoopKit] ${message}`;
      console[level](logMessage, logData);
    } else {
      console[level](`[LoopKit] ${message}`, {
        timestamp: fullTimestamp,
        version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.4',
      });
    }
  }

  /**
   * Check if we should log at the given level
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.debug) {
      return false;
    }

    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const configLevel = this.config.logLevel || 'debug';
    const configLevelIndex = levels.indexOf(configLevel);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex <= configLevelIndex;
  }
}
