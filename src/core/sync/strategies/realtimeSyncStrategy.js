// core/sync/strategies/RealtimeSyncStrategy.js
import { debounce } from 'lodash-es';

export class RealtimeSyncStrategy extends BaseSyncStrategy {
  initialize() {
    this.providerListeners = new Map();

    this.syncManager.providers.forEach((config, name) => {
      const provider = config.instance;
      
      // Debounced updates
      const listener = debounce(() => this.syncManager.addToQueue(name), config.debounceMs);
      provider.on('update', listener);
      
      // Critical updates (immediate)
      provider.on('critical', () => this.syncManager.addToQueue(name));
      
      this.providerListeners.set(name, listener);
    });
  }

  cleanup() {
    this.providerListeners.forEach((listener, name) => {
      const provider = this.syncManager.providers.get(name).instance;
      provider.off('update', listener);
    });
  }
}