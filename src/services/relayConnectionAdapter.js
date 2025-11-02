/**
 * Relay Connection Adapter
 * 
 * Adapts the RelayConnectionBridge to work with the existing connectionBridge interface
 * so the stateDataStore can use it without major changes.
 */

import mitt from 'mitt';
import { relayConnectionBridge } from '@/relay/client/RelayConnectionBridge.js';
import { createLogger } from './logger';
import { remoteLogger } from '../utils/remoteLogger';

const logger = createLogger('relay-adapter');


class RelayConnectionAdapter {
  constructor() {
    this.emitter = mitt();
    this.on = this.emitter.on;
    this.off = this.emitter.off;
    this.once = this.emitter.once;
    this.emit = this.emitter.emit;

    this.mode = 'relay';
    this.services = new Map();
    this.connectionState = {
      status: 'disconnected',
      lastError: null
    };
    
    // Expose the relay bridge config for diagnostic purposes
    this.config = {
      relayServerUrl: relayConnectionBridge.config?.relayServerUrl || 'wss://compendiumnav.com/relay'
    };
    
    // Set up event mapping from relay to our expected events
    this._setupRelayEventMapping();
  }

  _setupRelayEventMapping() {
    logger.info('Setting up relay event mapping');
    
    // Map relay events to our expected events
    relayConnectionBridge.on('nav-position', (data) => {
      logger.debug('Received nav-position event', { data: data ? 'present' : 'empty' });
      this.emit('nav-position', data);
    });
    
    // Handle boat-status events
    relayConnectionBridge.on('boat-status', (status) => {
      logger.debug('Received boat-status event', { status });
      this.emit('boat-status', status);
    });

    // --- Harmonized state/patch update handling ---
    relayConnectionBridge.on('state-update', ({ type, data, boatId, timestamp }) => {
      logger.debug('Received state-update', { type, hasData: Boolean(data), boatId });
      if (type === 'state:full-update' || type === 'state:patch') {
        this.emit('state-update', { type, data, boatId, timestamp });
      }
    });


    relayConnectionBridge.on('tide-update', (data) => {
      logger.debug('Tide update received:', data);
      this.emit('tide-update', data);
    });
  
    relayConnectionBridge.on('weather-update', (data) => {
      logger.debug('Weather update received:', data);
      this.emit('weather-update', data);
    });

    relayConnectionBridge.on('preferences-update', (data) => {
      logger.debug('Preferences update received:', data);
      this.emit('preferences:update', data);
    });

    
    relayConnectionBridge.on('nav-instruments', (data) => {
      logger.debug('Received nav-instruments data');
      this.emit('nav-instruments', data);
    });
    
    // Handle unified navigation data format
    relayConnectionBridge.on('navigation', (data) => {
      logger.debug('Navigation data structure:', JSON.stringify(data, null, 2));
      
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
      logger.debug('Vessel data received:', data);
      this.emit('vessel-update', data);
    });
    
    relayConnectionBridge.on('anchor-position', (data) => {
      logger.debug('Anchor position data received:', data);
      this.emit('anchor-position', data);
    });
    
    relayConnectionBridge.on('anchor-status', (data) => {
      logger.debug('Anchor status received:', data);
      this.emit('anchor-status', data);
    });
    
    relayConnectionBridge.on('alert', (data) => {
      logger.warn('SignalK alert received:', data);
      this.emit('signalk-alert', data);
    });
    
    // Handle environment data (wind)
    relayConnectionBridge.on('env-wind', (data) => {
      logger.debug('Wind data received:', data);
      this.emit('env-wind', data);
    });
    
    // Handle environment data (depth)
    relayConnectionBridge.on('env-depth', (data) => {
      logger.debug('Depth data received:', data);
      this.emit('env-depth', data);
    });
    
    // Handle environment data (temperature)
    relayConnectionBridge.on('env-temperature', (data) => {
      logger.debug('Temperature data received:', data);
      this.emit('env-temperature', data);
    });
    
    // Handle general environment data
    relayConnectionBridge.on('environment', (data) => {
      logger.debug('Environment data received:', data);
      this.emit('environment', data);
    });

    // No longer handle 'full-state' events from relay. Only handle 'state:full-update' and 'state:patch'.
    
    relayConnectionBridge.on('connection-status', (status) => {
      logger.info('Connection status changed:', status);
      this.connectionState = status;
      this.emit('connection-status', status);
    });
  }
  
  async connect() {
    try {
      logger.info('Connecting to VPS relay server...');
      remoteLogger.log('connection', 'Starting connection to VPS relay server', { timestamp: new Date().toISOString() });
      
      // Update the config from the relay bridge in case it has changed
      this.config.relayServerUrl = relayConnectionBridge.config?.relayServerUrl || 'wss://compendiumnav.com/relay';
      logger.debug(`Using relay server URL: ${this.config.relayServerUrl}`);
      remoteLogger.log('connection', 'Using relay server URL', { url: this.config.relayServerUrl });
      
      this.connectionState.status = 'connecting';
      this.emit('connection-status', this.connectionState);
      
      // Connect to the relay server
      logger.debug('Initiating connection to relay server...');
      const connected = await relayConnectionBridge.connect();
      
      if (connected) {
        logger.info('Successfully connected to VPS relay server');
        remoteLogger.log('connection', 'Connected to VPS relay server', {
          timestamp: new Date().toISOString(),
          serverUrl: this.config.relayServerUrl
        });
        
        this.connectionState.status = 'connected';
        this.emit('connection-status', this.connectionState);
        return true;
      } else {
        const errorMessage = 'Failed to connect to VPS relay server';
        logger.error(errorMessage);
        
        // Try to get more details about the failure from the relay bridge
        const bridgeState = relayConnectionBridge.connectionState || {};
        const errorDetails = {
          status: bridgeState.status || 'unknown',
          error: bridgeState.lastError || 'No error details available',
          timestamp: new Date().toISOString()
        };
        
        remoteLogger.log('connection:error', errorMessage, errorDetails);
        logger.debug('Connection failure details:', errorDetails);
        
        this.connectionState.status = 'disconnected';
        this.connectionState.lastError = bridgeState.lastError || 'Connection attempt returned false';
        this.emit('connection-status', this.connectionState);
        return false;
      }
    } catch (error) {
      const errorMessage = `Failed to connect to relay server: ${error.message}`;
      logger.error(errorMessage, error);
      
      remoteLogger.log('connection:error', errorMessage, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      this.connectionState = {
        status: 'error',
        lastError: error.message
      };
      throw error;
    }
  }
  
  on(event, callback) {
    return this.emitter.on(event, callback);
  }

  emit(event, data) {
    this.emitter.emit(event, data);
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
  
  /**
   * Send an alert to the server
   * @param {Object} alertData - Alert data to send
   * @param {string} alertData.type - Alert type (e.g., 'critical_range', 'anchor_dragging')
   * @param {string} alertData.status - Alert status ('triggered' or 'resolved')
   * @param {Object} alertData.data - Additional alert data
   */
  sendAlert(alertData) {
    logger.info('[RELAY-ADAPTER] Sending alert to server:', alertData);
    
    // Send the alert data to the server
    relayConnectionBridge.sendCommand('alert', 'update', {
      type: alertData.type,
      status: alertData.status,
      data: alertData.data,
      timestamp: new Date().toISOString(),
      autoResolvable: alertData.autoResolvable !== undefined ? alertData.autoResolvable : true
    });
  }
  
  cleanup() {
    logger.info('Cleaning up relay connection...');
    
    try {
      // Clear all event listeners first
      this.eventListeners.forEach((listener, event) => {
        this.removeAllListeners(event);
      });
      this.eventListeners.clear();
      
      // Disconnect from the relay server
      if (relayConnectionBridge && typeof relayConnectionBridge.disconnect === 'function') {
        logger.info('Disconnecting relay connection bridge...');
        relayConnectionBridge.disconnect();
      }
      
      // Reset connection state
      this.connectionState = {
        status: 'disconnected',
        lastError: null
      };
      
      logger.info('Relay connection cleanup completed');
    } catch (error) {
      logger.error('Error during relay connection cleanup:', error);
      throw error;
    }
  }
}

// Singleton instance
export const relayConnectionAdapter = new RelayConnectionAdapter();
