// Relay-only ConnectionBridge implementation
import { relayConnectionAdapter } from './relayConnectionAdapter.js';
import { createLogger } from './logger';

const logger = createLogger('connection-bridge');

class ConnectionBridge {
  constructor() {
    this.mode = 'relay';
    this.eventListeners = new Map();
    this.connectionState = {
      status: 'disconnected',
      lastError: null
    };
    this.adapter = relayConnectionAdapter;
  }

  async connect() {
    logger.debug('Connecting to relay...');
    try {
      this.connectionState.status = 'connecting';
      await this.adapter.connect();
      this.connectionState.status = 'connected';
      logger.debug('Successfully connected to relay');
      return true;
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error';
      logger.error('Failed to connect to relay', { error: errorMessage });
      this.connectionState = {
        status: 'error',
        lastError: errorMessage
      };
      throw error;
    }
  }

  cleanup() {
    logger('Cleaning up connection bridge');
    try {
      this.adapter.cleanup();
      this.connectionState.status = 'disconnected';
      logger('Connection bridge cleaned up successfully');
    } catch (error) {
      logger.error('Error during cleanup', { error: error?.message });
      throw error;
    }
  }

  on(event, callback) {
    return this.adapter.on(event, callback);
  }

  off(event, callback) {
    if (typeof this.adapter.off === 'function') {
      this.adapter.off(event, callback);
    }
  }

  emit(event, data) {
    if (typeof this.adapter.emit === 'function') {
      this.adapter.emit(event, data);
    }
  }

  async sendCommand(serviceName, action, data) {
    logger.info('[ConnectionBridge] Forwarding command to adapter:', { serviceName, action, data: '...' });
    if (typeof this.adapter.sendCommand === 'function') {
      const result = await this.adapter.sendCommand(serviceName, action, data);
      console.log('[ConnectionBridge] Adapter sent command successfully');
      return result;
    }
    const error = new Error('Relay adapter does not support sendCommand');
    console.error('[ConnectionBridge] Error sending command:', error);
    throw error;
  }
}

// Singleton instance
export const connectionBridge = new ConnectionBridge();