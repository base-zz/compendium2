/**
 * Relay Connection Adapter
 * 
 * Adapts the RelayConnectionBridge to work with the existing connectionBridge interface
 * so the stateDataStore can use it without major changes.
 */

import { EventEmitter } from 'events';
import { relayConnectionBridge } from '../../relay/client/RelayConnectionBridge.js';

class RelayConnectionAdapter extends EventEmitter {
  constructor() {
    super();
    this.mode = 'relay';
    this.services = new Map();
    this.eventListeners = new Map();
    this.connectionState = {
      status: 'disconnected',
      lastError: null
    };
    
    // Set up event mapping from relay to our expected events
    this._setupRelayEventMapping();
  }
  
  _setupRelayEventMapping() {
    console.log('[RELAY-ADAPTER] Setting up relay event mapping');
    
    // Map relay events to our expected events
    relayConnectionBridge.on('nav-position', (data) => {
      this.emit('nav-position', data);
    });
    
    relayConnectionBridge.on('nav-instruments', (data) => {
      this.emit('nav-instruments', data);
    });
    
    // Handle unified navigation data format
    relayConnectionBridge.on('navigation', (data) => {
      console.log('[RELAY-ADAPTER] Data structure:', JSON.stringify(data, null, 2));
      
      // Forward the event to stateDataStore
      this.emit('navigation', data);
      
      // Check if this contains position data
      if (data && data.data && data.data.position) {
        this.emit('nav-position', {
          position: data.data.position,
          timestamp: data.data.timestamp
        });
      }
      
      // Extract speed and course data
      if (data && data.data) {
        const navData = data.data;
        const instrumentData = {};
        
        if (navData.speed !== undefined) instrumentData.speed = navData.speed;
        if (navData.course !== undefined) instrumentData.cog = navData.course;
        if (navData.heading !== undefined) instrumentData.heading = navData.heading;
        
        if (Object.keys(instrumentData).length > 0) {
          this.emit('nav-instruments', instrumentData);
        }
      }
    });
    
    relayConnectionBridge.on('vessel-update', (data) => {
      console.log('[RELAY-ADAPTER] ======= VPS VESSEL DATA RECEIVED =======');
      console.log('[RELAY-ADAPTER] Event: vessel-update');
      console.log('[RELAY-ADAPTER] Data:', JSON.stringify(data, null, 2));
      console.log('[RELAY-ADAPTER] ================================');
      this.emit('vessel-update', data);
    });
    
    relayConnectionBridge.on('anchor-position', (data) => {
      console.log('[RELAY-ADAPTER] ======= VPS ANCHOR DATA RECEIVED =======');
      console.log('[RELAY-ADAPTER] Event: anchor-position');
      console.log('[RELAY-ADAPTER] Data:', JSON.stringify(data, null, 2));
      console.log('[RELAY-ADAPTER] ================================');
      this.emit('anchor-position', data);
    });
    
    relayConnectionBridge.on('anchor-status', (data) => {
      console.log('[RELAY-ADAPTER] ======= VPS ANCHOR STATUS RECEIVED =======');
      console.log('[RELAY-ADAPTER] Event: anchor-status');
      console.log('[RELAY-ADAPTER] Data:', JSON.stringify(data, null, 2));
      console.log('[RELAY-ADAPTER] ================================');
      this.emit('anchor-status', data);
    });
    
    relayConnectionBridge.on('alert', (data) => {
      console.log('[RELAY-ADAPTER] ======= VPS ALERT RECEIVED =======');
      console.log('[RELAY-ADAPTER] Event: alert');
      console.log('[RELAY-ADAPTER] Data:', JSON.stringify(data, null, 2));
      console.log('[RELAY-ADAPTER] ================================');
      this.emit('signalk-alert', data);
    });
    
    // Handle environment data (wind)
    relayConnectionBridge.on('env-wind', (data) => {
      console.log('[RELAY-ADAPTER] ======= VPS WIND DATA RECEIVED =======');
      console.log('[RELAY-ADAPTER] Event: env-wind');
      console.log('[RELAY-ADAPTER] Data:', JSON.stringify(data, null, 2));
      console.log('[RELAY-ADAPTER] ================================');
      this.emit('env-wind', data);
    });
    
    // Handle environment data (depth)
    relayConnectionBridge.on('env-depth', (data) => {
      console.log('[RELAY-ADAPTER] ======= VPS DEPTH DATA RECEIVED =======');
      console.log('[RELAY-ADAPTER] Event: env-depth');
      console.log('[RELAY-ADAPTER] Data:', JSON.stringify(data, null, 2));
      console.log('[RELAY-ADAPTER] ================================');
      this.emit('env-depth', data);
    });
    
    // Handle environment data (temperature)
    relayConnectionBridge.on('env-temperature', (data) => {
      console.log('[RELAY-ADAPTER] ======= VPS TEMPERATURE DATA RECEIVED =======');
      console.log('[RELAY-ADAPTER] Event: env-temperature');
      console.log('[RELAY-ADAPTER] Data:', JSON.stringify(data, null, 2));
      console.log('[RELAY-ADAPTER] ================================');
      this.emit('env-temperature', data);
    });
    
    // Handle general environment data
    relayConnectionBridge.on('environment', (data) => {
      console.log('[RELAY-ADAPTER] ======= VPS ENVIRONMENT DATA RECEIVED =======');
      console.log('[RELAY-ADAPTER] Event: environment');
      console.log('[RELAY-ADAPTER] Data:', JSON.stringify(data, null, 2));
      console.log('[RELAY-ADAPTER] ================================');
      this.emit('environment', data);
    });

    // Handle full-state snapshot from relay
    relayConnectionBridge.on('full-state', (data) => {
      this.emit('full-state', data);
    });
    
    relayConnectionBridge.on('connection-status', (status) => {
      console.log('[RELAY-ADAPTER] ======= VPS CONNECTION STATUS CHANGED =======');
      console.log('[RELAY-ADAPTER] Status:', JSON.stringify(status, null, 2));
      console.log('[RELAY-ADAPTER] ================================');
      this.connectionState = status;
      this.emit('connection-status', status);
    });
  }
  
  async connect() {
    try {
      console.log('[RELAY-ADAPTER] ======= CONNECTING TO VPS RELAY SERVER =======');
      console.log('[RELAY-ADAPTER] Connection attempt started');
      console.log('[RELAY-ADAPTER] Timestamp:', new Date().toISOString());
      console.log('[RELAY-ADAPTER] ================================');
      
      this.connectionState.status = 'connecting';
      this.emit('connection-status', this.connectionState);
      
      // Connect to the relay server
      const connected = await relayConnectionBridge.connect();
      
      if (connected) {
        console.log('[RELAY-ADAPTER] ======= VPS CONNECTION SUCCESSFUL =======');
        console.log('[RELAY-ADAPTER] Connected to VPS relay server');
        console.log('[RELAY-ADAPTER] Timestamp:', new Date().toISOString());
        console.log('[RELAY-ADAPTER] Now listening for incoming data from VPS...');
        console.log('[RELAY-ADAPTER] ================================');
        
        this.connectionState.status = 'connected';
        this.emit('connection-status', this.connectionState);
        return true;
      } else {
        console.log('[RELAY-ADAPTER] ======= VPS CONNECTION FAILED =======');
        console.log('[RELAY-ADAPTER] Failed to connect to VPS relay server');
        console.log('[RELAY-ADAPTER] Timestamp:', new Date().toISOString());
        console.log('[RELAY-ADAPTER] ================================');
        
        this.connectionState.status = 'disconnected';
        this.connectionState.lastError = 'Connection attempt returned false';
        this.emit('connection-status', this.connectionState);
        return false;
      }
    } catch (error) {
      console.error('[RELAY-ADAPTER] Failed to connect to relay server:', error);
      this.connectionState = {
        status: 'error',
        lastError: error.message
      };
      throw error;
    }
  }
  
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => this.eventListeners.get(event)?.delete(callback);
  }
  
  emit(event, data) {
    this.eventListeners.get(event)?.forEach(cb => cb(data));
  }
  
  async sendCommand(serviceName, action, data) {
    // Forward commands to the relay server
    return relayConnectionBridge.sendCommand(serviceName, action, data);
  }

  /**
   * Send a message to the relay server (e.g., get-full-state)
   */
  send(message) {
    relayConnectionBridge._sendMessage(typeof message === 'string' ? JSON.parse(message) : message);
  }
  
  cleanup() {
    // Disconnect from the relay server
    relayConnectionBridge.disconnect();
    
    this.eventListeners.clear();
    this.connectionState.status = 'disconnected';
  }
}

// Singleton instance
export const relayConnectionAdapter = new RelayConnectionAdapter();
