import EventEmitter from 'events';

/**
 * Abstract base class for all data providers
 * 
 * Implementations must:
 * 1. Set this.priority (CRITICAL, HIGH, LOW)
 * 2. Implement getData()
 * 3. Emit 'update' events when data changes
 */
export class BaseProvider extends EventEmitter {
  constructor() {
    super();
    if (new.target === BaseProvider) {
      throw new Error("Cannot instantiate abstract class");
    }
    this.priority = 'LOW'; // Override in child classes
    this.name = this.constructor.name.replace('Provider', '').toLowerCase();
  }

  /**
   * Fetch current data for synchronization
   * @returns {Promise<object>} Data ready for PocketBase
   */
  async getData() {
    throw new Error("Method 'getData()' must be implemented");
  }

  /**
   * Standardize sync payload format
   * @param {object} data 
   * @returns {object} Formatted for PB
   */
  formatPayload(data) {
    return {
      id: this.name, // Use provider name as record ID
      data,
      _sync: {
        mode: 'realtime', // Default mode, will be overridden by SyncManager
        timestamp: new Date().toISOString()
      }
    };
  }
}