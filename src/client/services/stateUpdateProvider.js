// StateUpdateProvider: abstracts source of updates for the store
// Handles hot swapping between direct (connectionBridge) and relay (relayConnectionAdapter)

import { relayConnectionAdapter } from './relayConnectionAdapter';
import { directConnectionAdapter } from './directConnectionAdapter';
import { createLogger } from './logger';

const logger = createLogger('state-update-provider');

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
    logger.debug('Notifying subscribers of event type:', evt?.type);
    
    // Make sure the event has the expected structure
    if (!evt || !evt.type) {
      logger.warn('Invalid event received', { event: evt });
      return;
    }
    
    // Make a deep copy of the event to prevent mutation
    let eventCopy;
    try {
      eventCopy = JSON.parse(JSON.stringify(evt));
    } catch (err) {
      logger.error('Failed to clone event', { error: err.message, event: evt });
      return;
    }
    
    // Notify all subscribers
    const subscriberCount = this.subscribers.size;
    if (subscriberCount === 0) {
      logger.warn('No subscribers to notify');
      return;
    }
    
    logger.debug(`Notifying ${subscriberCount} subscribers`);
    let errorCount = 0;
    
    for (const cb of this.subscribers) {
      try {
        cb(eventCopy);
      } catch (err) {
        errorCount++;
        logger.error('Error in subscriber', { 
          error: err.message, 
          stack: err.stack,
          subscriberType: typeof cb === 'function' ? 'function' : typeof cb
        });
      }
    }
    
    if (errorCount > 0) {
      logger.warn(`Encountered errors in ${errorCount} of ${subscriberCount} subscribers`);
    }
  }

  /**
   * Test the relay connection without switching to it
   * This allows us to verify if the relay connection works even when using direct mode
   * @returns {Promise<boolean>} - True if the relay connection test succeeded
   */
  async testRelayConnection() {
    remoteLogger.log('STATE-PROVIDER', 'Testing relay connection...');
    try {
      // Get connection state before attempting
      const prevState = relayConnectionAdapter.connectionState?.status || 'unknown';
      remoteLogger.log('STATE-PROVIDER', `Relay connection state before attempt: ${prevState}`);
      
      // Log the relay server URL being used
      const relayUrl = relayConnectionAdapter.config?.relayServerUrl || 'unknown';
      remoteLogger.log('STATE-PROVIDER', `Using relay server URL: ${relayUrl}`);
      
      // Attempt to connect to the relay server
      const result = await relayConnectionAdapter.connect();
      
      // Get connection state after attempt
      const newState = relayConnectionAdapter.connectionState?.status || 'unknown';
      remoteLogger.log('STATE-PROVIDER', `Relay connection state after attempt: ${newState}`);
      
      remoteLogger.log('STATE-PROVIDER', `Relay connection test result: ${result ? 'SUCCESS' : 'FAILED'}`);
      
      if (!result) {
        // Log the last error if available
        const lastError = relayConnectionAdapter.connectionState?.lastError || 'No error details available';
        remoteLogger.log('STATE-PROVIDER', `Relay connection failure reason: ${lastError}`);
      }
      
      return result;
    } catch (error) {
      remoteLogger.log('STATE-PROVIDER', `Error testing relay connection: ${error.message}`, error);
      return false;
    }
  }

  switchSource(mode) {
    // Cleanup previous listeners
    this._cleanupListeners();
    this.mode = mode;
    if (mode === 'relay') {
      this.currentAdapter = relayConnectionAdapter;
      // Ensure we connect to the relay server when switching to relay mode
      if (this.currentAdapter.connectionState.status !== 'connected') {
        console.log('[STATE-PROVIDER] Initiating relay connection');
        this.currentAdapter.connect();
      } else {
        console.log('[STATE-PROVIDER] Relay connection already established');
      }
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
        
        // We don't need to add a new message listener here
        // The directConnectionAdapter already has its own onmessage handler
        // Adding another one would cause duplicate events and potential issues
        // Just make sure the connection is properly set up
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
