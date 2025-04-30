// StateUpdateProvider: abstracts source of updates for the store
// Handles hot swapping between direct (connectionBridge) and relay (relayConnectionAdapter)

import { relayConnectionAdapter } from './relayConnectionAdapter';
import DirectConnectionAdapter from './directConnectionAdapter.js';

class StateUpdateProvider {
  constructor() {
    console.log('[StateUpdateProvider] Constructed');
    this.mode = null;
    this.subscribers = new Set();
    this.currentAdapter = null;
    this._listenerRefs = [];
    // Do not call switchSource here; smartConnectionManager will handle it
  }

  subscribe(cb) {
    console.log('[StateUpdateProvider] New subscriber added');
    this.subscribers.add(cb);
  }

  unsubscribe(cb) {
    console.log('[StateUpdateProvider] Subscriber removed');
    this.subscribers.delete(cb);
  }

  _notify(evt) {
    // console.log('[StateUpdateProvider] Notifying subscribers:', evt);
    for (const cb of this.subscribers) {
      cb(evt);
    }
  }

  switchSource(mode) {
    console.log('[StateUpdateProvider] Switching source to', mode);
    // Cleanup previous listeners
    this._cleanupListeners();
    this.mode = mode;
    if (mode === 'relay') {
      this.currentAdapter = relayConnectionAdapter;
    } else if (mode === 'direct') {
      console.log('[StateUpdateProvider] switchSource called with direct');
      this.currentAdapter = new DirectConnectionAdapter();
      this.currentAdapter.connect();
      console.log('[StateUpdateProvider] Assigned directConnectionAdapter:', this.currentAdapter);
    } else {
      // fallback to direct
      this.currentAdapter = new DirectConnectionAdapter();
      this.currentAdapter.connect();
    }
    console.log('[StateUpdateProvider] switchSource called with', mode);

    this._setupListeners();
  }
 

  _setupListeners() {
    console.log('[StateUpdateProvider] Setting up listeners for', this.mode, this.currentAdapter);
    // Listen for unified navigation updates
    const navListener = (data) => this._notify({ type: 'navigation', data });
    this.currentAdapter.on('navigation', navListener);
    this._listenerRefs.push({ event: 'navigation', fn: navListener });

    // Listen for anchor updates
    const anchorListener = (data) => this._notify({ type: 'anchor', data });
    this.currentAdapter.on('anchor', anchorListener);
    this._listenerRefs.push({ event: 'anchor', fn: anchorListener });

    // Listen for vessel updates
    const vesselListener = (data) => this._notify({ type: 'vessel', data });
    this.currentAdapter.on('vessel-update', vesselListener);
    this._listenerRefs.push({ event: 'vessel-update', fn: vesselListener });

    // Listen for environment updates
    const environmentListener = (data) => this._notify({ type: 'environment', data });
    this.currentAdapter.on('environment', environmentListener);
    this._listenerRefs.push({ event: 'environment', fn: environmentListener });

    // Listen for specific environment subdomain (e.g., temperature)
    const envTempListener = (data) => this._notify({ type: 'env-temperature', data });
    this.currentAdapter.on('env-temperature', envTempListener);
    this._listenerRefs.push({ event: 'env-temperature', fn: envTempListener });

    // Listen for patch-update events (incremental patches)
    const patchUpdateListener = (data) => this._notify({ type: 'patch-update', data });
    this.currentAdapter.on('patch-update', patchUpdateListener);
    this._listenerRefs.push({ event: 'patch-update', fn: patchUpdateListener });

    // Listen for native state events
    const fullUpdateListener = (msg) => this._notify(msg);
    this.currentAdapter.on('state:full-update', fullUpdateListener);
    this._listenerRefs.push({ event: 'state:full-update', fn: fullUpdateListener });

    const patchListener = (msg) => this._notify(msg);
    this.currentAdapter.on('state:patch', patchListener);
    this._listenerRefs.push({ event: 'state:patch', fn: patchListener });

    // Add more as needed for other domains
  }

  _cleanupListeners() {
    if (!this.currentAdapter) return;
    console.log('[StateUpdateProvider] Cleaning up listeners for', this.mode, this.currentAdapter);
    this._listenerRefs.forEach(({ event, fn }) => {
      this.currentAdapter.off(event, fn);
    });
    this._listenerRefs = [];
  }
}

export const stateUpdateProvider = new StateUpdateProvider();
