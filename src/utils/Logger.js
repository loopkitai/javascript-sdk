/**
 * Logger utility for consistent logging throughout the SDK
 */
export class Logger {
  constructor(config) {
    this.config = config;
  }

  /**
   * Update logger configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    this.config = config;
  }

  /**
   * Internal logging method
   */
  log(level, message, data = null) {
    if (!this.config.debug) return;

    const levels = ['error', 'warn', 'info', 'debug'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);

    // Show messages with priority >= configured level (lower index = higher priority)
    if (messageLevel <= configLevel) {
      const now = new Date();
      const fullTimestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}.${now.getMilliseconds().toString().padStart(3, '0')}`;

      // Build log message with timestamp and version at the end
      const logData = {
        ...data,
        timestamp: fullTimestamp,
        version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.4', // eslint-disable-line no-undef
      };

      const logMessage = `[LoopKit] ${message}`;

      if (data) {
        console[level](logMessage, logData);
      } else {
        console[level](logMessage, {
          timestamp: fullTimestamp,
          version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.4', // eslint-disable-line no-undef
        });
      }
    }
  }

  /**
   * Log error message
   */
  error(message, data) {
    this.log('error', message, data);
  }

  /**
   * Log warning message
   */
  warn(message, data) {
    this.log('warn', message, data);
  }

  /**
   * Log info message
   */
  info(message, data) {
    this.log('info', message, data);
  }

  /**
   * Log debug message
   */
  debug(message, data) {
    this.log('debug', message, data);
  }
}
