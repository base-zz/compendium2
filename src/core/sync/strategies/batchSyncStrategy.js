// core/sync/strategies/BatchSyncStrategy.js
export class BatchSyncStrategy extends BaseSyncStrategy {
    initialize() {
      this.intervals = new Map();
  
      this.syncManager.providers.forEach((config, name) => {
        this.intervals.set(
          name,
          setInterval(() => this.syncManager.addToQueue(name), config.batchInterval)
        );
      });
    }
  
    cleanup() {
      this.intervals.forEach(interval => clearInterval(interval));
    }
  }