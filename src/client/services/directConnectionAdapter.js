// directConnectionAdapter.js
import { EventEmitter } from "events";
import { stateUpdateProvider } from './stateUpdateProvider.js';
import { createLogger } from './logger.js';

const logger = createLogger('direct-connection');

// Get the appropriate WebSocket URL based on environment
const getWebSocketUrl = () => {
  // In development or if explicitly set in .env.local
  if (import.meta.env.VITE_DIRECT_WS_URL) {
    return import.meta.env.VITE_DIRECT_WS_URL;
  }
  
  // For production (mobile app), use the current hostname with the standard port
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = 3009; // Standard port for direct WebSocket server
  
  return `${protocol}//${host}:${port}`;
};

class DirectConnectionAdapter extends EventEmitter {
  constructor() {
    logger.info('DirectConnectionAdapter constructor called');
    super();
    this.mode = "direct";
    this.connectionState = {
      status: "disconnected",
      lastError: null,
    };
    this.ws = null;
    this._reconnectAttempts = 0;
    this._maxReconnects = 5;
    this._reconnectDelay = 2000;
    this._manualClose = false;
    this._wsUrl = getWebSocketUrl();
    logger.info(`Using WebSocket URL: ${this._wsUrl}`);
  }

  connect() {
    logger.info('Connecting to WebSocket server...');
    return new Promise((resolve, reject) => {
      if (
        this.ws &&
        (this.ws.readyState === WebSocket.OPEN ||
          this.ws.readyState === WebSocket.CONNECTING)
      ) {
        resolve();
        return;
      }
      this._manualClose = false;
      this.connectionState.status = "connecting";
      logger.info('Attempting to open WebSocket to', this._wsUrl);
      this.ws = new WebSocket(this._wsUrl);
      
      this.ws.onopen = (event) => {
        logger.info('WebSocket connection established:', event);
        this.connectionState.status = "connected";
        this._reconnectAttempts = 0;
        this.emit("connected");
        resolve();
      };
      this.ws.onmessage = (event) => {
        try {
          let msg = event.data;
          if (typeof msg === 'string') {
            try {
              msg = JSON.parse(msg);
              // Handle the case where the message is double-encoded
              if (typeof msg === 'string') {
                msg = JSON.parse(msg);
              }
            } catch (e) {
              console.warn('[DIRECT-ADAPTER] Error parsing message:', e);
              return;
            }
          }
          
          console.log('[DIRECT-ADAPTER] Received message type:', msg.type);
          
          // Handle different message types
          if (msg.type === 'state:full-update' || msg.type === 'state:patch') {
            // Make sure the data structure is correct
            if (!msg.data) {
              console.warn('[DIRECT-ADAPTER] Missing data in message:', msg);
              return;
            }
            
            // Notify the state update provider
            stateUpdateProvider._notify(msg);
            
            // Also emit the event for other listeners
            if (msg.type === 'state:full-update') {
              this.emit('state:full-update', msg.data);
            } else {
              this.emit('state:patch', msg.data);
            }
          } else {
            // Handle other message types
            this._handleMessage(msg);
          }
        } catch (e) {
          logger.error('[DIRECT-ADAPTER] Error processing message:', e, 'Raw data:', event.data);
        }
      };
      this.ws.onerror = (error) => {
        const errorMessage = error.message || "Unknown error";
        logger.error('WebSocket error:', error);
        this.connectionState.lastError = errorMessage;
        this.connectionState.status = "error";
        this.emit("error", error);
        reject(error);
      };
      this.ws.onclose = () => {
        this.connectionState.status = "disconnected";
        this.emit("disconnected");
        if (
          !this._manualClose &&
          this._reconnectAttempts < this._maxReconnects
        ) {
          setTimeout(() => {
            this._reconnectAttempts++;
            this.connect().catch(() => {});
          }, this._reconnectDelay);
        }
      };
    });
  }

  cleanup() {
    this._manualClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionState.status = "disconnected";
  }

  on(event, callback) {
    super.on(event, callback);
  }

  off(event, callback) {
    super.off(event, callback);
  }

  emit(event, data) {
    super.emit(event, data);
  }

  sendCommand(serviceName, action, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({
        type: "command",
        service: serviceName,
        action,
        data,
      });
      this.ws.send(msg);
    } else {
      throw new Error("WebSocket is not connected");
    }
  }
  
  /**
   * Send a generic message to the server
   * @param {Object|string} message - The message to send (object will be stringified)
   * @returns {boolean} - Success status
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const msg = typeof message === 'string' ? message : JSON.stringify(message);
        this.ws.send(msg);
        return true;
      } catch (error) {
        logger.error('Error sending message:', error);
        return false;
      }
    } else {
      logger.warn('Cannot send message: WebSocket not connected');
      return false;
    }
  }

  _handleMessage(msg) {
    try {
      logger.debug('Received message from server:', msg);
      if (!msg || !msg.type) {
        logger.warn('Missing or invalid message type:', msg);
        return;
      }
      // Always emit the raw type for compatibility
      if (msg.type === "full-state") {
        this.emit("full-state", msg.state);
        // console.log(`[DIRECT-ADAPTER] Emitted 'full-state'`, msg.state);
      } else {
        // console.log("[DIRECT-ADAPTER] Emitting raw type:", msg.type, msg.data);
        this.emit(msg.type, msg.data);
        // console.log(`[DIRECT-ADAPTER] Emitted '${msg.type}'`, msg.data);
      }

      // Emit 'state-update' for Pinia sync consumers if appropriate
      if (msg.type === "full-state") {
        logger('Handling full state update');
        this.emit("state-update", {
          full: true,
          state: msg.state,
          data: msg.state,
          type: "full-state",
        });
        // console.log(
        //   `[DIRECT-ADAPTER] Emitted 'state-update' (full-state)`,
        //   msg.state
        // );
      } else if (msg.type === "state-update") {
        // console.log("[DIRECT-ADAPTER] Handling 'state-update' branch", msg);
        this.emit("state-update", {
          patch: msg.patch,
          data: msg.patch,
          type: "state-update",
        });
        // console.log(
        //   `[DIRECT-ADAPTER] Emitted 'state-update' (patch)`,
        //   msg.patch
        // );
      }

      // Harmonize with relay events
      // console.log("[DIRECT-ADAPTER] Entering switch(msg.type)", msg.type);
      switch (msg.type) {
        case "navigation":
          // console.log("[DIRECT-ADAPTER] switch: navigation", msg.data);
          if (msg.data && msg.data.position) {
            this.emit("nav-position", {
              position: msg.data.position,
              timestamp: msg.data.timestamp,
            });
            // console.log(`[DIRECT-ADAPTER] Emitted 'nav-position'`, {
            //  position: msg.data.position,
            //  timestamp: msg.data.timestamp,
            // });
          }
          if (msg.data) {
            const navData = msg.data;
            const instrumentData = {};
            if (navData.speed !== undefined)
              instrumentData.speed = navData.speed;
            if (navData.course !== undefined)
              instrumentData.cog = navData.course;
            if (navData.heading !== undefined)
              instrumentData.heading = navData.heading;
            if (Object.keys(instrumentData).length > 0) {
              this.emit("nav-instruments", instrumentData);
              // console.log(
              //   `[DIRECT-ADAPTER] Emitted 'nav-instruments'`,
              //   instrumentData
              // );
            }
          }
          break;
        case "anchor":
          // console.log("[DIRECT-ADAPTER] switch: anchor", msg.data);
          if (msg.data) {
            this.emit("anchor-position", msg.data);
            // console.log(
            //   `[DIRECT-ADAPTER] Emitted 'anchor-position'`,
            //   msg.data
            // );
            if (msg.data.status !== undefined) {
              this.emit("anchor-status", msg.data.status);
              // console.log(
              //   `[DIRECT-ADAPTER] Emitted 'anchor-status'`,
              //   msg.data.status
              // );
            }
          }
          break;
        case "vessel":
          // console.log("[DIRECT-ADAPTER] switch: vessel", msg.data);
          if (msg.data) {
            this.emit("vessel-update", msg.data);
            // console.log(`[DIRECT-ADAPTER] Emitted 'vessel-update'`, msg.data);
          }
          break;
        case "alert":
          // console.log("[DIRECT-ADAPTER] switch: alert", msg.data);
          if (msg.data) {
            this.emit("signalk-alert", msg.data);
            //console.log(`[DIRECT-ADAPTER] Emitted 'signalk-alert'`, msg.data);
          }
          break;
        case "env-wind":
          console.log("[DIRECT-ADAPTER] switch: env-wind", msg.data);
          if (msg.data) {
            this.emit("env-wind", msg.data);
            //console.log(`[DIRECT-ADAPTER] Emitted 'env-wind'`, msg.data);
          }
          break;
        case "env-depth":
          //console.log("[DIRECT-ADAPTER] switch: env-depth", msg.data);
          if (msg.data) {
            this.emit("env-depth", msg.data);
            //console.log(`[DIRECT-ADAPTER] Emitted 'env-depth'`, msg.data);
          }
          break;
        case "env-temperature":
          //console.log("[DIRECT-ADAPTER] switch: env-temperature", msg.data);
          if (msg.data) {
            this.emit("env-temperature", msg.data);
            //console.log(
            //  `[DIRECT-ADAPTER] Emitted 'env-temperature'`,
            //  msg.data
            //);
          }
          break;
        case "environment":
          //console.log("[DIRECT-ADAPTER] switch: environment", msg.data);
          if (msg.data) {
            this.emit("environment", msg.data);
            //console.log(`[DIRECT-ADAPTER] Emitted 'environment'`, msg.data);
          }
          break;
        case "full-state":
          logger.warn('Unexpected legacy "full-state" message received:', msg);
          break;
        case "connection-status":
          //console.log("[DIRECT-ADAPTER] switch: connection-status", msg.data);
          if (msg.data) {
            this.emit("connection-status", msg.data);
            //console.log(
            //  `[DIRECT-ADAPTER] Emitted 'connection-status'`,
            //  msg.data
            //);
          }
          break;
        default:
          //console.log(
          //  "[DIRECT-ADAPTER] switch: default (unknown type)",
          //  msg.type,
          //  msg.data
          //);
          // No-op for unknown types
          break;
      }
      // console.log("[DIRECTs-ADAPTER] _handleMessage EXIT", msg);
    } catch (err) {
      logger.error('Exception in _handleMessage:', { error: err.message, type: msg?.type, message: msg });
    }
  }
}

export const directConnectionAdapter = new DirectConnectionAdapter();
export default DirectConnectionAdapter;