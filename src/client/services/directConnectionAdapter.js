// directConnectionAdapter.js
import { EventEmitter } from "events";
import { stateUpdateProvider } from "./stateUpdateProvider.js";
import { createLogger } from "./logger.js";

const logger = createLogger("direct-connection");

// Get the appropriate WebSocket URL based on environment
const getWebSocketUrl = () => {
  // In development or if explicitly set in .env.local
  if (import.meta.env.VITE_DIRECT_WS_URL) {
    return import.meta.env.VITE_DIRECT_WS_URL;
  }

  // For production (mobile app), use the current hostname with the standard port
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const port = 3009; // Standard port for direct WebSocket server

  return `${protocol}//${host}:${port}`;
};

class DirectConnectionAdapter extends EventEmitter {
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
    this._maxReconnects = 5;
    this._reconnectDelay = 2000;
    this._manualClose = false;
    this._wsUrl = getWebSocketUrl();
    this._heartbeatInterval = 30000; // 30 seconds
    this._lastPingTime = null;
    this._lastPongTime = null;
    this._heartbeatTimer = null;
    this._connectionTimeout = null;
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
  connect() {
    logger.info("Starting WebSocket connection process...");
    
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
            logger.info("✅ WebSocket connection established");

            // Update connection state
            this.connectionState = {
              status: "connected",
              lastError: null,
            };
            this._reconnectAttempts = 0;

            // Set up heartbeat
            logger.debug("Setting up heartbeat...");
            this._setupHeartbeat();

            // Notify listeners
            this.emit("connected");

            // Resolve the connect promise
            if (this._connectResolve) {
              this._connectResolve();
              this._connectResolve = null;
              this._connectReject = null;
            }
          } catch (error) {
            logger.error("❌ Error in WebSocket onOpen handler:", error);

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
          const errorMessage = error.message || "Unknown WebSocket error";
          logger.error(`WebSocket error: ${errorMessage}`, error);

          // Update connection state
          this.connectionState = {
            status: "error",
            lastError: errorMessage,
          };

          // Reject the connect promise if it exists
          if (this._connectReject) {
            this._connectReject(error);
            this._connectResolve = null;
            this._connectReject = null;
          } else {
            // Otherwise emit the error
            this.emit("error", error);
          }

          // Clean up if needed
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.close(1011, "WebSocket error occurred");
            } catch (closeError) {
              logger.warn("Error closing WebSocket after error:", closeError);
            }
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
            if (this._reconnectAttempts < this._maxReconnects) {
              const delay =
                this._reconnectDelay * Math.pow(1.5, this._reconnectAttempts);
              logger.info(
                `Attempting to reconnect in ${delay}ms (attempt ${
                  this._reconnectAttempts + 1
                }/${this._maxReconnects})...`
              );

              setTimeout(() => {
                this._reconnectAttempts++;
                this.connect().catch((error) => {
                  logger.error("Reconnection attempt failed:", error);
                });
              }, delay);
            } else {
              logger.error(
                `Max reconnection attempts (${this._maxReconnects}) reached. Giving up.`
              );
              this.emit("reconnection_failed");
            }
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
   * Cleans up resources and closes the WebSocket connection
   */
  cleanup() {
    logger.info("Cleaning up WebSocket connection...");
    this._manualClose = true;

    // Clear any pending heartbeats or timeouts
    this._clearHeartbeat();

    if (this.ws) {
      try {
        // Remove all event listeners first
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;

        // Only try to close if the connection is open or connecting
        if (
          this.ws.readyState === WebSocket.OPEN ||
          this.ws.readyState === WebSocket.CONNECTING
        ) {
          logger.info("Closing WebSocket connection...");
          try {
            this.ws.close(1000, "Client closed connection");
          } catch (closeError) {
            logger.warn("Error while closing WebSocket:", closeError);
          }
        }

        this.ws = null;
      } catch (error) {
        logger.error("Error during WebSocket cleanup:", error);
      } finally {
        // Ensure we always clean up our state
        this.connectionState = {
          status: "disconnected",
          lastError: null,
        };
        this._reconnectAttempts = 0;
        this._lastPingTime = null;
        this._lastPongTime = null;
      }
    }

    logger.info("WebSocket cleanup completed");
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
