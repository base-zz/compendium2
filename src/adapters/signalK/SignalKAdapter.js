/**
 * SignalKAdapter - Base adapter for SignalK data formats
 * 
 * This abstract class defines the interface for SignalK format adapters.
 * Each specific format implementation should extend this class.
 */

class SignalKAdapter {
  constructor(config = {}) {
    this.config = {
      debug: process.env.DEBUG === 'true',
      ...config
    };
  }

  /**
   * Parse a SignalK message and convert it to a standardized format
   * @param {string|object} message - Raw SignalK message (string or parsed object)
   * @returns {object|null} Standardized message object or null if invalid
   */
  parseMessage(message) {
    throw new Error('Method parseMessage must be implemented by subclass');
  }

  /**
   * Extract delta updates from a parsed SignalK message
   * @param {object} parsedMessage - Parsed SignalK message
   * @returns {Array} Array of standardized update objects
   */
  extractUpdates(parsedMessage) {
    throw new Error('Method extractUpdates must be implemented by subclass');
  }

  /**
   * Map a SignalK path to the application's state path
   * @param {string} signalKPath - Original SignalK path
   * @returns {string|null} Mapped state path or null if no mapping exists
   */
  mapPath(signalKPath) {
    throw new Error('Method mapPath must be implemented by subclass');
  }

  /**
   * Transform a value from SignalK format to the application's format
   * @param {string} path - SignalK path
   * @param {any} value - Original value
   * @returns {any} Transformed value
   */
  transformValue(path, value) {
    throw new Error('Method transformValue must be implemented by subclass');
  }

  /**
   * Debug logging
   * @private
   */
  _debug(message) {
    if (this.config.debug) {
      console.log(`[SignalKAdapter] ${message}`);
    }
  }
}

module.exports = SignalKAdapter;
