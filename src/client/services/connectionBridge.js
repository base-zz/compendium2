// Relay-only ConnectionBridge implementation
import { relayConnectionAdapter } from './relayConnectionAdapter.js';

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
    try {
      this.connectionState.status = 'connecting';
      await this.adapter.connect();
      this.connectionState.status = 'connected';
      return true;
    } catch (error) {
      this.connectionState = {
        status: 'error',
        lastError: error.message
      };
      throw error;
    }
  }

  cleanup() {
    this.adapter.cleanup();
    this.connectionState.status = 'disconnected';
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
    if (typeof this.adapter.sendCommand === 'function') {
      return this.adapter.sendCommand(serviceName, action, data);
    }
    throw new Error('Relay adapter does not support sendCommand');
  }
}

// Singleton instance
export const connectionBridge = new ConnectionBridge();