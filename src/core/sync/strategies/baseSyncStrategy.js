vascript
Copy
// core/sync/strategies/BaseSyncStrategy.js
export class BaseSyncStrategy {
  constructor(syncManager) {
    this.syncManager = syncManager;
  }

  initialize() {
    throw new Error('Not implemented!');
  }

  cleanup() {
    throw new Error('Not implemented!');
  }
}