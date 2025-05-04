// StateUpdateProvider: abstracts source of updates for the store
// Handles hot swapping between direct (connectionBridge) and relay (relayConnectionAdapter)

import { relayConnectionAdapter } from './relayConnectionAdapter';
import { directConnectionAdapter } from './directConnectionAdapter';

class StateUpdateProvider {
  constructor() {
    this.mode = null;
    this.subscribers = new Set();
    this.currentAdapter = null;
    this._listenerRefs = [];
    // Do not call switchSource here; smartConnectionManager will handle it
  }

  subscribe(cb) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb) {
    this.subscribers.delete(cb);
  }

  _notify(evt) {
    for (const cb of this.subscribers) {
      try {
        cb(evt);
      } catch (err) {
        console.error('[StateUpdateProvider] Error in subscriber:', err);
      }
    }
  }

  switchSource(mode) {
    // Cleanup previous listeners
    this._cleanupListeners();
    this.mode = mode;
    if (mode === 'relay') {
      this.currentAdapter = relayConnectionAdapter;
    } else if (mode === 'direct') {
      this.currentAdapter = directConnectionAdapter;
      if (this.currentAdapter.connectionState.status !== 'connected') {
        this.currentAdapter.connect();
      }
    } else {
      // fallback to direct
      this.currentAdapter = directConnectionAdapter;
      if (this.currentAdapter.connectionState.status !== 'connected') {
        this.currentAdapter.connect();
      }
    }

    this._setupListeners();
  }
  
  // New method to switch source with an existing connection
  switchSourceWithConnection(mode, existingConnection) {
    // Cleanup previous listeners
    this._cleanupListeners();
    this.mode = mode;
    
    if (mode === 'direct') {
      this.currentAdapter = directConnectionAdapter;
      
      // Set the existing connection on the adapter
      if (this.currentAdapter.ws !== existingConnection) {
        // Close any existing connection first
        if (this.currentAdapter.ws) {
          this.currentAdapter._manualClose = true;
          this.currentAdapter.ws.close();
        }
        
        // Assign the existing connection
        this.currentAdapter.ws = existingConnection;
        this.currentAdapter.connectionState.status = 'connected';
        
        // Add a message listener directly to the connection
        existingConnection.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            this._notify(data);
          } catch (err) {
            console.error('[StateUpdateProvider] Error processing message');
          }
        });
      }
    } else {
      // For other modes, just use the regular switchSource
      this.switchSource(mode);
      return;
    }
    
    this._setupListeners();
  }
 

  _setupListeners() {
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
    this._listenerRefs.forEach(({ event, fn }) => {
      this.currentAdapter.off(event, fn);
    });
    this._listenerRefs = [];
  }
}

export const stateUpdateProvider = new StateUpdateProvider();
