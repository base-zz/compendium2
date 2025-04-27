import { RealtimeSyncStrategy } from './strategies/RealtimeSyncStrategy';
import { BatchSyncStrategy } from './strategies/BatchSyncStrategy';

class SyncManager {
  constructor() {
    this.strategies = {
      realtime: new RealtimeSyncStrategy(this),
      batch: new BatchSyncStrategy(this)
    };
    this.currentStrategy = null;
  }

  setSyncMode(mode) {
    if (this.currentStrategy) {
      this.currentStrategy.cleanup(); // Cleanup old strategy
    }

    this.currentStrategy = this.strategies[mode];
    this.currentStrategy.initialize(); // Activate new strategy
  }
}