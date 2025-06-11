// directConnectionAdapter.js
import { EventEmitter } from "events";
import { stateUpdateProvider } from "./stateUpdateProvider.js";
import { createLogger } from "./logger.js";

const logger = createLogger("direct-connection");

// Get the WebSocket URL from environment variables
const getWebSocketUrl = () => {
  if (!import.meta.env.VITE_DIRECT_WS_URL) {
    throw new Error('VITE_DIRECT_WS_URL environment variable is required');
  }
  const url = import.meta.env.VITE_DIRECT_WS_URL;
  console.log(`Using WebSocket URL: ${url}`);
  return url;
};

class DirectConnectionAdapter extends EventEmitter {
  /**
   * Gets the human-readable name for a WebSocket ready state
   * @param {number} state - The WebSocket readyState
   * @returns {string} The state name
   */
  getReadyStateName(state) {
    const states = {
      0: 'CONNECTING',
      1: 'OPEN',
      2: 'CLOSING',
      3: 'CLOSED'
    };
    return states[state] || `UNKNOWN (${state})`;
  }

  constructor() {
    logger.info("DirectConnectionAdapter constructor called");
    super();
    this.mode = "direct";
    this.connectionState = {
      status: "disconnected",
      lastError: null,
    };
    this.ws = null;
    this._reconnectAttempts = 0;
    this._maxReconnects = 10; // Increased max reconnects
    this._reconnectDelay = 2000;
    this._manualClose = false;
    this._wsUrl = getWebSocketUrl();
    this._heartbeatInterval = 30000; // 30 seconds
    this._lastPingTime = null;
    this._lastPongTime = null;
    this._heartbeatTimer = null;
    this._connectionTimeout = null;
    this._connectResolve = null;
    this._connectReject = null;
    this._reconnectTimeout = null;
    logger.info(`Using WebSocket URL: ${this._wsUrl}`);
  }

  /**
   * Sets up the WebSocket heartbeat mechanism
   * @private
   */
  _setupHeartbeat() {
    console.log("🔄 [DIRECT] _setupHeartbeat called");
    logger.info("🔄 Setting up WebSocket heartbeat...");
    // Clear any existing heartbeat
    this._clearHeartbeat();

    if (!this.ws) {
      const error = "Cannot setup heartbeat: WebSocket is not initialized";
      console.error("❌ [DIRECT]", error);
      logger.error(error);
      return;
    }

    const stateMsg = `WebSocket state during heartbeat setup: ${this.ws.readyState} (1=OPEN, 2=CLOSING, 3=CLOSED)`;
    console.log(`ℹ️ [DIRECT] ${stateMsg}`);
    logger.info(stateMsg);

    if (this.ws.readyState !== WebSocket.OPEN) {
      const error = `Cannot setup heartbeat: WebSocket is not in OPEN state (state=${this.ws.readyState})`;
      console.error(`❌ [DIRECT] ${error}`);
      logger.error(error);
      return;
    }

    // Setup ping interval
    logger.info(`Starting heartbeat interval: ${this._heartbeatInterval}ms`);
    this._heartbeatTimer = setInterval(() => {
      const timestamp = Date.now();
      logger.info(`💓 Sending ping at ${new Date(timestamp).toISOString()}`);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this._lastPingTime = timestamp;
          const pingMsg = JSON.stringify({
            type: "ping",
            timestamp: this._lastPingTime,
          });
          this.ws.send(pingMsg);
          logger.info(`✅ Sent ping: ${pingMsg}`);
        } catch (error) {
          logger.error("❌ Error sending ping:", error);
        }
      } else {
        logger.warn(
          `⚠️  Cannot send ping - WebSocket not in OPEN state (state=${
            this.ws ? this.ws.readyState : "no WebSocket"
          })`
        );
      }
    }, this._heartbeatInterval);

    // Set a timeout to detect unresponsive connections
    const timeoutMs = this._heartbeatInterval * 1.5;
    logger.info(`Setting connection timeout: ${timeoutMs}ms`);
    this._connectionTimeout = setTimeout(() => {
      if (
        this.ws &&
        this._lastPingTime &&
        this._lastPongTime &&
        this._lastPingTime > this._lastPongTime
      ) {
        const timeSincePing = Date.now() - this._lastPingTime;
        logger.warn(
          `⚠️  No pong received in ${timeSincePing}ms, connection may be stale`
        );
        this.ws.close(1001, "No pong received");
      }
    }, timeoutMs);

    logger.info("✅ Heartbeat setup complete");
  }

  /**
   * Clears all heartbeat-related timers and timeouts
   * @private
   */
  _clearHeartbeat() {
    logger.debug("Clearing heartbeat timers...");

    // Clear the heartbeat interval
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }

    // Clear the connection timeout
    if (this._connectionTimeout) {
      clearTimeout(this._connectionTimeout);
      this._connectionTimeout = null;
    }

    // Reset ping/pong tracking
    this._lastPingTime = null;
    this._lastPongTime = null;

    logger.debug("Heartbeat timers cleared");
  }

  /**
   * Handles ping/pong messages for WebSocket keepalive
   * @param {{type: string, timestamp: number}} msg - The ping/pong message
   */
  _handlePingPong(msg) {
    if (msg.type === "ping") {
      // Respond to ping with pong
      try {
        this.ws.send(
          JSON.stringify({
            type: "pong",
            timestamp: msg.timestamp,
          })
        );
        logger.debug("Responded to ping");
      } catch (error) {
        logger.error("Error sending pong:", error);
      }
    } else if (msg.type === "pong") {
      this._lastPongTime = Date.now();
      const rtt = this._lastPongTime - (msg.timestamp || this._lastPingTime);
      logger.debug(`Received pong, RTT: ${rtt}ms`);
    }
  }

  /**
   * Establishes a WebSocket connection to the server
   * @returns {Promise<void>} Resolves when connected, rejects on error
   */
  async connect() {
    logger.info("Starting WebSocket connection process...");
    logger.info(`Attempting to connect to: ${this._wsUrl}`);
    
    // Store the promise resolve/reject functions if this is a new connection attempt
    if (this._connectResolve) {
      logger.warn("Connect already in progress, returning existing promise");
      return new Promise((resolve, reject) => {
        this._connectResolve = resolve;
        this._connectReject = reject;
      });
    }

    // Return immediately if already connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.info("WebSocket already connected, reusing existing connection");
      return Promise.resolve();
    }

    // If connecting, return a promise that resolves when connection is complete
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      logger.info("WebSocket connection in progress, waiting for it to complete...");
      return new Promise((resolve, reject) => {
        const onOpen = () => {
          cleanup();
          logger.info("Existing WebSocket connection completed");
          resolve();
        };

        const onError = (error) => {
          cleanup();
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`Error in existing WebSocket connection: ${errorMsg}`, error);
          reject(error);
        };

        const onClose = (event) => {
          cleanup();
          const error = new Error(`Connection closed before open: ${event.code} - ${event.reason || 'No reason provided'}`);
          logger.error(error.message);
          reject(error);
        };

        const cleanup = () => {
          clearTimeout(timeoutId);
          this.ws.removeEventListener("open", onOpen);
          this.ws.removeEventListener("error", onError);
          this.ws.removeEventListener("close", onClose);
        };

        const timeoutId = setTimeout(() => {
          cleanup();
          const error = new Error("Connection attempt timed out after 10 seconds");
          logger.error(error.message);
          reject(error);
        }, 10000);

        this.ws.addEventListener("open", onOpen);
        this.ws.addEventListener("error", onError);
        this.ws.addEventListener("close", onClose);
      });
    }

    // Clean up any existing connection
    this.cleanup();

    // Create new connection
    this._manualClose = false;
    this._reconnectAttempts = 0;
    this.connectionState = {
      status: "connecting",
      lastError: null,
    };

    logger.info("Opening new WebSocket connection to", this._wsUrl);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this._wsUrl);

        /**
         * Handles the WebSocket open event
         * @private
         */
        this.onOpen = () => {
          try {
            logger.info(" WebSocket connection established");
            logger.info(`Connected to: ${this._wsUrl}`);
            logger.info(`WebSocket readyState: ${this.ws.readyState} (${this.getReadyStateName(this.ws.readyState)})`);
            
            this.connectionState.status = 'connected';
            this.connectionState.lastError = null;
            this._reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            this._setupHeartbeat();
            this.emit('connect');
            
            // Log WebSocket protocol and extensions if available
            if (this.ws.protocol) {
              logger.info(`WebSocket protocol: ${this.ws.protocol}`);
            }
            if (this.ws.extensions) {
              logger.info(`WebSocket extensions: ${this.ws.extensions}`);
            }
            
            // Resolve any pending connect promises
            if (this._connectResolve) {
              this._connectResolve();
              this._connectResolve = null;
              this._connectReject = null;
            }
          } catch (error) {
            logger.error(" Error in WebSocket onOpen handler:", error);

            // Reject the connect promise if it exists
            if (this._connectReject) {
              this._connectReject(error);
              this._connectResolve = null;
              this._connectReject = null;
            } else {
              // If no connect promise, emit error
              this.emit("error", error);
            }
          }
        };

        this.ws.onopen = this.onOpen.bind(this);

        this.ws.onmessage = (event) => {
          try {
            let msg = event.data;
            if (typeof msg === "string") {
              try {
                msg = JSON.parse(msg);
                // Handle the case where the message is double-encoded
                if (typeof msg === "string") {
                  msg = JSON.parse(msg);
                }
              } catch (e) {
                console.warn("[DIRECT-ADAPTER] Error parsing message:", e);
                return;
              }
            }

            console.log("[DIRECT-ADAPTER] Received message type:", msg.type);

            // Handle ping/pong messages
            if (msg.type === "ping" || msg.type === "pong") {
              this._handlePingPong(msg);
              return;
            }
            
            // Handle boat-status message
            if (msg.type === "boat-status") {
              logger.info(`Received boat-status: ${msg.status} for boat ${msg.boatId}`);
              this.emit('boat-status', {
                boatId: msg.boatId,
                status: msg.status,
                timestamp: msg.timestamp
              });
              return;
            }

            // Handle other message types
            if (
              msg.type === "state:full-update" ||
              msg.type === "state:patch"
            ) {
              // Make sure the data structure is correct
              if (!msg.data) {
                console.warn("[DIRECT-ADAPTER] Missing data in message:", msg);
                return;
              }

              // Notify the state update provider
              stateUpdateProvider._notify(msg);

              // To:
              if (
                msg.type === "state:full-update" ||
                msg.type === "state:patch"
              ) {
                this.emit("state-update", {
                  type: msg.type,
                  data: msg.data,
                  // Include any other relevant fields
                });
              }
            } else {
              // Handle other message types
              this.emit("message", msg);
            }
          } catch (e) {
            logger.error(
              "[DIRECT-ADAPTER] Error processing message:",
              e,
              "Raw data:",
              event.data
            );
          }
        };

        /**
         * Handles WebSocket errors
         * @param {Event|Error} error - The error event or error object
         * @private
         */
        this.onError = (error) => {
          const errorDetails = {
            message: error.message,
            error: error.toString(),
            readyState: this.ws ? this.ws.readyState : 'no_websocket',
            url: this._wsUrl,
            timestamp: new Date().toISOString()
          };
          
          logger.error(' WebSocket error:', errorDetails);
          console.error('WebSocket Error Details:', errorDetails);
          
          this.connectionState.status = 'error';
          this.connectionState.lastError = error.message || 'Unknown WebSocket error';
          this.emit('error', error);
          
          // Reject any pending connect promises
          if (this._connectReject) {
            this._connectReject(error);
            this._connectResolve = null;
            this._connectReject = null;
          }
          
          // Attempt to reconnect if this wasn't a manual close
          if (!this._manualClose) {
            logger.info('Scheduling reconnection attempt...');
            this._scheduleReconnect();
          } else {
            logger.info('Manual close detected, not reconnecting');
          }
        };

        this.ws.onerror = this.onError.bind(this);

        /**
         * Handles WebSocket close events
         * @param {CloseEvent} event - The close event
         * @private
         */
        this.onClose = (event) => {
          const closeReason = event.reason || "No reason provided";
          const closeMessage = `WebSocket connection closed: ${
            event.code
          } (${getCloseReason(event.code)}) - ${closeReason}`;

          if (event.code === 1000) {
            logger.info(closeMessage);
          } else {
            logger.warn(closeMessage);
          }

          // Update connection state
          this.connectionState = {
            status: "disconnected",
            lastError: closeReason,
          };

          // Clear heartbeat timers
          this._clearHeartbeat();

          // Notify listeners
          this.emit("disconnected", event);

          // Handle reconnection if this wasn't a manual close
          if (!this._manualClose) {
            logger.info('Scheduling reconnection attempt...');
            this._scheduleReconnect();
          } else {
            logger.info('Manual close detected, not reconnecting');
          }

          // Clean up the WebSocket reference
          if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            this.ws = null;
          }
        };

        // Helper function to get close reason from code
        const getCloseReason = (code) => {
          const reasons = {
            1000: "Normal Closure",
            1001: "Going Away",
            1002: "Protocol Error",
            1003: "Unsupported Data",
            1005: "No Status Received",
            1006: "Abnormal Closure",
            1007: "Invalid Frame Payload Data",
            1008: "Policy Violation",
            1009: "Message Too Big",
            1010: "Missing Extension",
            1011: "Internal Error",
            1012: "Service Restart",
            1013: "Try Again Later",
            1014: "Bad Gateway",
            1015: "TLS Handshake Failed",
          };
          return reasons[code] || "Unknown";
        };

        this.ws.onclose = this.onClose.bind(this);
      } catch (error) {
        logger.error("Error creating WebSocket connection:", error);
        this.connectionState.lastError = error.message;
        this.connectionState.status = "error";
        reject(error);
      }
    });
  }

  /**
   * Schedules a reconnection attempt with exponential backoff
   * @private
   */
  _scheduleReconnect() {
    if (this._reconnectAttempts >= this._maxReconnects) {
      const error = new Error(`Max reconnection attempts (${this._maxReconnects}) reached`);
      logger.error(error.message);
      this.emit('connection:failed', error);
      
      // Reset reconnect attempts after a while to allow recovery
      setTimeout(() => {
        logger.info('Resetting reconnection attempts counter');
        this._reconnectAttempts = 0;
      }, 60000); // Reset after 1 minute
      
      return;
    }
    
    this._reconnectAttempts++;
    
    // Exponential backoff with jitter
    const baseDelay = Math.min(
      this._reconnectDelay * Math.pow(1.5, this._reconnectAttempts - 1),
      30000 // Max 30 seconds between retries
    );
    const jitter = Math.random() * 1000; // Add up to 1s jitter
    const delay = Math.floor(baseDelay + jitter);
    
    logger.info(`Scheduling reconnection attempt ${this._reconnectAttempts}/${this._maxReconnects} in ${delay}ms`);
    
    // Clean up any existing WebSocket instance
    this._cleanupWebSocket();
    
    // Clear any existing timeout to prevent multiple reconnection loops
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    
    this._reconnectTimeout = setTimeout(() => {
      logger.info(`Starting reconnection attempt ${this._reconnectAttempts}...`);
      
      // Verify we're not already connecting/connected
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        logger.warn(`Skipping reconnection attempt ${this._reconnectAttempts} - WebSocket is already ${this.getReadyStateName(this.ws.readyState)}`);
        return;
      }
      
      this.connect()
        .then(() => {
          logger.info(`Successfully reconnected on attempt ${this._reconnectAttempts}`);
          this._reconnectAttempts = 0; // Reset on successful connection
        })
        .catch(error => {
          logger.error(`Reconnection attempt ${this._reconnectAttempts} failed:`, error.message);
          // Schedule next attempt if we haven't reached max attempts
          if (this._reconnectAttempts < this._maxReconnects) {
            this._scheduleReconnect();
          }
        });
    }, delay);
  }
  
  /**
   * Cleans up the WebSocket instance and related resources
   * @private
   */
  _cleanupWebSocket() {
    if (!this.ws) return;
    
    try {
      logger.debug(`Cleaning up WebSocket in state: ${this.getReadyStateName(this.ws.readyState)}`);
      
      // Remove all event listeners
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      
      // Close the connection if it's open or connecting
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        logger.info('Closing existing WebSocket connection...');
        this.ws.close(1000, 'Cleanup before reconnection');
      }
    } catch (e) {
      logger.error('Error during WebSocket cleanup:', e);
    } finally {
      this.ws = null;
    }
  }

  /**
   * Cleans up resources and closes the WebSocket connection
   */
  cleanup() {
    logger.info("Cleaning up WebSocket connection...");
    this._manualClose = true;

    // Clear any pending heartbeats or timeouts
    this._clearHeartbeat();

    this._cleanupWebSocket();
    
    // Clear any pending reconnection timeout
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    
    // Reset connection state
    this.connectionState = {
      status: "disconnected",
      lastError: null,
    };
    this._reconnectAttempts = 0;
    this._lastPingTime = null;
    this._lastPongTime = null;
    this._connectResolve = null;
    this._connectReject = null;
  }

  /**
   * Sends a command to the server
   * @param {string} serviceName - The name of the service
   * @param {string} action - The action to perform
   * @param {Object} data - The data to send
   * @returns {Promise<boolean>} Resolves to true if the message was sent, false otherwise
   */
  async sendCommand(serviceName, action, data) {
    // Ensure we're connected
    if (this.connectionState.status !== "connected") {
      logger.warn(
        `Cannot send command: Not connected (state: ${this.connectionState.status})`
      );
      try {
        await this.connect();
      } catch (error) {
        logger.error(
          "Failed to establish connection for sending command:",
          error
        );
        return false;
      }
    }

    // Double-check WebSocket state
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error(
        `Cannot send command: WebSocket is not in OPEN state (state: ${
          this.ws ? this.ws.readyState : "no WebSocket"
        })`
      );
      return false;
    }

    try {
      const message = JSON.stringify({
        type: "command",
        service: serviceName,
        action,
        data,
        timestamp: Date.now(),
      });

      logger.debug(`Sending command: ${serviceName}.${action}`, data);
      this.ws.send(message);
      return true;
    } catch (error) {
      logger.error("Error sending command:", error);
      return false;
    }
  }

  /**
   * Sends a message to the server
   * @param {Object|string} message - The message to send
   * @returns {Promise<boolean>} Resolves to true if the message was sent, false otherwise
   */
  async send(message) {
    // Ensure we're connected
    if (this.connectionState.status !== "connected") {
      logger.warn(
        `Cannot send message: Not connected (state: ${this.connectionState.status})`
      );
      try {
        await this.connect();
      } catch (error) {
        logger.error(
          "Failed to establish connection for sending message:",
          error
        );
        return false;
      }
    }

    // Double-check WebSocket state
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error(
        `Cannot send message: WebSocket is not in OPEN state (state: ${
          this.ws ? this.ws.readyState : "no WebSocket"
        })`
      );
      return false;
    }

    try {
      const messageStr =
        typeof message === "string"
          ? message
          : JSON.stringify({
              ...message,
              timestamp: message.timestamp || Date.now(),
            });

      logger.debug(
        "Sending message:",
        messageStr.length > 200
          ? `${messageStr.substring(0, 200)}...`
          : messageStr
      );
      this.ws.send(messageStr);
      return true;
    } catch (error) {
      logger.error("Error sending message:", error);

      // If the error is due to connection issues, try to reconnect
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        logger.warn("Connection lost, attempting to reconnect...");
        this.connectionState.status = "disconnected";
        this.cleanup();
      }

      return false;
    }
  }
}

export const directConnectionAdapter = new DirectConnectionAdapter();
export default DirectConnectionAdapter;
