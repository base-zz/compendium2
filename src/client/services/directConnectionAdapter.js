// directConnectionAdapter.js
import mitt from 'mitt';

import { stateUpdateProvider } from "./stateUpdateProvider.js";
import { createLogger } from "./logger.js";
import {
  getActiveBoatId,
  getOrCreateClientId as getClientId
} from "../../relay/client/RelayConnectionBridge.js";

const logger = createLogger("direct-connection");

// Get the WebSocket URL from environment variables
const getWebSocketUrl = () => {
  if (!import.meta.env.VITE_DIRECT_WS_URL) {
    throw new Error('VITE_DIRECT_WS_URL environment variable is required');
  }
  const url = import.meta.env.VITE_DIRECT_WS_URL;
  logger.info(`Using WebSocket URL: ${url}`);
  return url;
};

class DirectConnectionAdapter {
  constructor() {
    this.emitter = mitt();
    logger.info("DirectConnectionAdapter constructor called");
    this.mode = "direct";
    this.connectionState = { status: "disconnected", lastError: null };
    this.ws = null;
    this._reconnectAttempts = 0;
    this._maxReconnects = 10;
    this._reconnectDelay = 2000;
    this._manualClose = false;
    this._wsUrl = getWebSocketUrl();
    this._heartbeatInterval = 30000;
    this._heartbeatTimer = null;
    this._connectPromise = null;
    this._reconnectTimeout = null;
  }

  getReadyStateName(state) {
    const states = { 0: 'CONNECTING', 1: 'OPEN', 2: 'CLOSING', 3: 'CLOSED' };
    return states[state] || `UNKNOWN (${state})`;
  }

  async _sendIdentity() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send identity, not connected');
      return;
    }
    try {
      const clientId = await getClientId();
      const boatId = getActiveBoatId();
      const identityMessage = {
        type: "identity",
        clientId,
        boatId,
        role: "client",
        timestamp: Date.now(),
      };
      logger.info('📡 [DIRECT] Sending identity message');
      this.ws.send(JSON.stringify(identityMessage));
    } catch (error) {
      logger.error('Error sending identity message:', error);
    }
  }

  _setupHeartbeat() {
    logger.info("🔄 Setting up WebSocket heartbeat...");
    this._clearHeartbeat();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error(`Cannot setup heartbeat: WebSocket is not in OPEN state`);
      return;
    }
    this._heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
        logger.info(`💓 Sent ping`);
      } else {
        logger.warn(`Cannot send ping - WebSocket not in OPEN state.`);
      }
    }, this._heartbeatInterval);
  }

  _clearHeartbeat() {
    logger.debug("Clearing heartbeat timers...");
    clearInterval(this._heartbeatTimer);
    this._heartbeatTimer = null;
  }

  _handlePingPong(msg) {
    if (msg.type === "pong") {
      logger.debug(`Received pong`);
    }
  }

  on(event, handler) {
    this.emitter.on(event, handler);
    return this; // For method chaining
  }

  off(event, handler) {
    this.emitter.off(event, handler);
    return this; // For method chaining
  }

  once(event, handler) {
    const onceHandler = (...args) => {
      this.off(event, onceHandler);
      handler(...args);
    };
    this.on(event, onceHandler);
    return this; // For method chaining
  }

  emit(event, data) {
    this.emitter.emit(event, data);
    return this; // For method chaining
  }

  connect() {
    logger.info("connect() called");
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.info("WebSocket already open. Reusing connection.");
      return Promise.resolve();
    }
    if (this.connectionState.status === "connecting" && this._connectPromise) {
      logger.warn("Connection already in progress. Returning existing promise.");
      return this._connectPromise;
    }

    logger.info("Starting new WebSocket connection process...");
    this._connectPromise = new Promise((resolve, reject) => {
      this._cleanupWebSocket();
      this.connectionState = { status: "connecting", lastError: null };
      this._manualClose = false;
      try {
        logger.info(`Attempting to connect to: ${this._wsUrl}`);
        this.ws = new WebSocket(this._wsUrl);
        
        this.ws.onopen = () => {
          logger.info(`✅ WebSocket connection established to: ${this._wsUrl}`);
          this.connectionState.status = 'connected';
          this._reconnectAttempts = 0;
          this._setupHeartbeat();
          this.emit('connect');
          this._sendIdentity().catch(err => logger.error('Failed to send identity on connect', err));
          resolve();
        };
        this.ws.onerror = (event) => {
          const error = new Error('WebSocket error');
          logger.error("❌ WebSocket connection error:", event);
          this.connectionState = { status: "disconnected", lastError: error };
          this.emit('error', error);
          reject(error);
        };
        this.ws.onclose = (event) => {
          logger.warn(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
          this.connectionState.status = 'disconnected';
          if (!this._manualClose) {
            this._scheduleReconnect();
          }
        };
        this.ws.onmessage = this.onmessage.bind(this);
      } catch (error) {
        logger.error("❌ Failed to create WebSocket:", error);
        this.connectionState = { status: "disconnected", lastError: error };
        reject(error);
      }
    });
    return this._connectPromise;
  }

  onmessage(event) {
    try {
      let msg = event.data;
      const rawData = event.data;
      
      // Parse the message
      if (typeof msg === "string") {
        try {
          msg = JSON.parse(msg);
          if (typeof msg === "string") msg = JSON.parse(msg);
        } catch (e) {
          // If we can't parse it, we'll log it anyway since it might be important
          console.log(`========== RAW WEBSOCKET MESSAGE (PARSE ERROR) ==========`);
          console.log(`Raw message type: ${typeof rawData}`);
          console.log(`Raw message length: ${rawData.length || 'unknown'}`);
          console.log(`Raw message content (first 200 chars):`, rawData.substring(0, 200));
          logger.warn("[DIRECT-ADAPTER] Error parsing message:", e);
          return;
        }
      }
      
      // Only log important message types (not routine patches)
      // Uncomment for debugging:
      // if (msg.type !== 'state:patch' && msg.type !== 'state:full-update') {
      //   console.log(`[DIRECT-ADAPTER] Message: ${msg.type}`);
      // }
      
      // Special logging for weather and tide updates
      // if (msg.type === "weather:update" || msg.type === "tide:update") {
      //   console.log(`========== RAW ${msg.type.toUpperCase()} PAYLOAD ==========`);
      //   console.log("Payload structure:", JSON.stringify(msg, null, 2));
      //   console.log("Payload keys:", Object.keys(msg));
      //   if (msg.data) {
      //     console.log("Data keys:", Object.keys(msg.data));
      //   }
      //   console.log(`========== END ${msg.type.toUpperCase()} PAYLOAD ==========`);
      // }
      
      if (msg.type === "ping" || msg.type === "pong") {
        this._handlePingPong(msg);
        return;
      }
      if (msg.type === "boat-status") {
        this.emit('boat-status', { boatId: msg.boatId, status: msg.status, timestamp: msg.timestamp });
        return;
      }
      if (msg.type === "weather:update") {
        console.log(`========== EMITTING WEATHER:UPDATE EVENT ==========`);
        try {
          // Extract the weather data, handling different possible structures
          let weatherData;
          
          // Check if we have a nested structure where msg.data contains the actual weather data
          if (msg.data && typeof msg.data === 'object') {
            weatherData = msg.data;
            console.log("Using nested data structure for weather update");
          } else {
            // Fallback to using the message itself as the data
            weatherData = msg;
            console.log("Using message as data for weather update");
          }
          
          // Remove any type property from the data to avoid confusion
          if (weatherData.type) {
            console.log("Removing type property from weather data");
            // Create a clean copy without the type property
            const cleanData = { ...weatherData };
            delete cleanData.type;
            weatherData = cleanData;
          }
          
          // Create a properly structured event for the state update provider
          const weatherEvent = {
            type: "weather:update",
            data: weatherData
          };
          
          // Emit both specific and generic events
          this.emit("weather-update", weatherData);
          stateUpdateProvider._notify(weatherEvent);
        } catch (error) {
          logger.error("[DIRECT-ADAPTER] Error processing weather update:", error.message || error, "Raw message type:", msg.type);
        }
        return;
      }

      if (msg.type === "preferences:update") {
        const preferencesEvent = { ...msg };
        if (!Object.prototype.hasOwnProperty.call(preferencesEvent, "timestamp")) {
          preferencesEvent.timestamp = Date.now();
        }

        this.emit("preferences:update", preferencesEvent);
        return;
      }

      if (msg.type === "tide:update") {
        // Create a properly structured event for the state update provider
        const tideEvent = {
          type: "tide:update",
          data: msg.data || msg
        };
        
        // Emit both specific and generic events
        this.emit("tide-update", msg.data || msg);
        stateUpdateProvider._notify(tideEvent);
        return;
      }
      
      if (msg.type === "state:full-update" || msg.type === "state:patch") {
        if (!msg.data) {
          console.warn("[DIRECT-ADAPTER] Missing data in message:", msg);
          return;
        }
        stateUpdateProvider._notify(msg);
        this.emit("state-update", { type: msg.type, data: msg.data });
      } else {
        this.emit("message", msg);
      }
    } catch (e) {
      logger.error("[DIRECT-ADAPTER] Error processing message:", e, "Raw data:", event.data);
    }
  }

  _scheduleReconnect() {
    if (this._reconnectAttempts >= this._maxReconnects) {
      logger.error("Max reconnect attempts reached. Giving up.");
      return;
    }
    this._reconnectAttempts++;
    const delay = this._reconnectDelay * Math.pow(2, this._reconnectAttempts - 1);
    logger.info(`Scheduling reconnect attempt ${this._reconnectAttempts} in ${delay}ms`);
    this._reconnectTimeout = setTimeout(() => {
      logger.info(`Attempting to reconnect... (attempt ${this._reconnectAttempts})`);
      this.connect().catch(err => {
        logger.error(`Reconnection attempt ${this._reconnectAttempts} failed:`, err.message);
      });
    }, delay);
  }

  _cleanupWebSocket() {
    if (!this.ws) return;
    logger.debug(`Cleaning up WebSocket in state: ${this.getReadyStateName(this.ws.readyState)}`);
    this.ws.onopen = null;
    this.ws.onclose = null;
    this.ws.onerror = null;
    this.ws.onmessage = null;
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close(1000, 'Cleanup');
    }
    this.ws = null;
    this._clearHeartbeat();
  }

  disconnect() {
    logger.info("Disconnecting WebSocket connection...");
    this._manualClose = false;
    this._cleanupWebSocket();
    this.connectionState = { status: "disconnected", lastError: null };
  }

  cleanup() {
    logger.info("Cleaning up WebSocket connection permanently...");
    this._manualClose = true;
    clearTimeout(this._reconnectTimeout);
    this._reconnectTimeout = null;
    this._cleanupWebSocket();
    this.connectionState = { status: "disconnected", lastError: null };
    this._connectPromise = null;
  }

  async sendCommand(serviceName, action, data) {
    if (this.connectionState.status !== "connected") {
      try {
        await this.connect();
      } catch (error) {
        return false;
      }
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      const message = {
        type: action,
        ...data,
        timestamp: Date.now(),
        service: serviceName,
        _originalAction: action
      };
      const jsonMessage = JSON.stringify(message);
      this.ws.send(jsonMessage);
      return true;
    } catch (error) {
      return false;
    }
  }

  async send(message) {
    if (this.connectionState.status !== 'connected') {
      logger.warn('Cannot send message, not connected. Attempting to connect...');
      try {
        await this.connect();
      } catch (error) {
        logger.error('Failed to connect before sending message:', error);
        return false;
      }
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const msgString = typeof message === 'string' ? message : JSON.stringify(message);
        this.ws.send(msgString);
        logger.debug('Message sent:', msgString);
        return true;
      } catch (error) {
        logger.error('Error sending message:', error);
        return false;
      }
    } else {
      logger.error('Cannot send message, WebSocket is not open.');
      return false;
    }
  }
}

export const directConnectionAdapter = new DirectConnectionAdapter();
export default DirectConnectionAdapter;
