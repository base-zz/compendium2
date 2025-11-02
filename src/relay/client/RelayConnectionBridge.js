import mitt from "mitt";
import { applyPatch } from "fast-json-patch";
import {
  getOrCreateClientKeyPair,
  signMessage,
  getClientPublicKey,
  registerClientKeyWithVPS,
} from "../../utils/clientKeyPair.js";
import { remoteLogger } from "../../utils/remoteLogger.js";
import { createLogger } from '../../services/logger.js';
import { createStateDataModel } from "../../shared/stateDataModel.js";

const logger = createLogger('relay-adapter');

// Debug is controlled by config.relayDebug
// import { getOrCreateAppUuid } from "../../server/uniqueAppId.js"
// const boatId = getOrCreateAppUuid();
/**
 * RelayConnectionBridge
 *
 * Client-side bridge that connects to the relay server instead of
 * directly to SignalK or PocketBase. This reduces the load on the VPS
 * by leveraging the throttling done by the relay server.
 */
export function getActiveBoatId() {
  logger.info('Getting active boat ID...');
  
  // Try to get from localStorage
  const id = localStorage.getItem("activeBoatId");
  logger.info('activeBoatId from localStorage:', id);
  
  if (id) {
    logger.info('Using activeBoatId:', id);
    return id;
  }
  
  // Fallback: use first boat in boatIds array
  const boatIds = localStorage.getItem("boatIds");
  logger.info('Raw boatIds from localStorage:', boatIds);
  
  const boats = JSON.parse(boatIds || "[]");
  logger.info('Parsed boatIds:', boats);
  
  if (boats.length > 0) {
    logger.info('Using first boat from boatIds:', boats[0]);
    localStorage.setItem("activeBoatId", boats[0]);
    return boats[0];
  }
  
  console.warn('No boat ID found in localStorage');
  return null;
}

/**
 * Get or create a unique client ID
 * @returns {string} The client ID
 */
export function getOrCreateClientId() {
  let clientId = localStorage.getItem("clientId");
  if (!clientId) {
    // Generate a random client ID
    clientId =
      "client-" +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    localStorage.setItem("clientId", clientId);
  }
  return clientId;
}

export class RelayConnectionBridge {
  // Get current connection information
  _getConnectionInfo() {
    return {
      clientId: this.clientId,
      boatId: getActiveBoatId(),
      readyState: this.socket ? this.socket.readyState : "no-socket",
      url: this.config.relayServerUrl,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Unified logging method
  _log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      ...data,
      timestamp,
      ...this._getConnectionInfo(),
    };

    // Use remoteLogger for remote logging
    remoteLogger.log("RELAY-BRIDGE", `${level}: ${message}`, logData);

    // Also log to console with appropriate level
    const logMessage = `[RELAY-CLIENT][${timestamp}][${level}] ${message}`;
    switch (level) {
      case "ERROR":
        console.error(logMessage, logData);
        break;
      case "WARN":
        console.warn(logMessage, logData);
        break;
      case "INFO":
        console.info(logMessage);
        break;
      case "DEBUG":
        if (this.config.relayDebug) {
          console.debug(logMessage, logData);
        }
        break;
      default:
        logger.info(logMessage, logData);
    }
  }

  // Error handling wrapper for methods
  _withErrorHandling(methodName, fn) {
    return async (...args) => {
      try {
        this._log("DEBUG", `Starting ${methodName}`, { args });
        const result = await fn.apply(this, args);
        this._log("DEBUG", `Completed ${methodName} successfully`);
        return result;
      } catch (error) {
        this._log("ERROR", `Error in ${methodName}`, {
          error: error.message,
          stack: error.stack,
          args: JSON.stringify(args),
        });
        throw error;
      }
    };
  }

  constructor(config = {}) {
    this.emitter = mitt();

    // Always use secure WebSocket for relay connections
    // Use the RELAY_SERVER_URL from env - no default fallback
    const relayServerUrl = import.meta.env.VITE_RELAY_SERVER_URL;

    remoteLogger.log(
      "RELAY-BRIDGE",
      `Relay server URL from environment: ${relayServerUrl || "NOT SET"}`
    );

    this.config = {
      relayDebug:
        import.meta.env.VITE_RELAY_DEBUG === "true" ||
        config.relayDebug ||
        false,
      relayServerUrl: relayServerUrl || config.relayServerUrl,
      reconnectDelay: parseInt(
        import.meta.env.VITE_RELAY_RECONNECT_DELAY || "3000",
        10
      ),
      maxReconnectAttempts: parseInt(
        import.meta.env.VITE_RELAY_MAX_RECONNECT_ATTEMPTS || "5",
        10
      ),
      heartbeatInterval: parseInt(
        import.meta.env.VITE_RELAY_HEARTBEAT_INTERVAL || "30000",
        10
      ),
      ...config,
    };

    logger.info(
      `Initializing with URL: ${this.config.relayServerUrl}`
    );

    this.socket = null;
    this.clientId = null;
    this.reconnectAttempts = 0;
    this.subscriptions = ["navigation", "vessel", "alerts", "environment"];
    this.connectionState = {
      status: "disconnected",
      lastError: null,
    };

    // Unified state object - initialize with base model to ensure all paths exist
    // This prevents patch errors when patches arrive before full state
    this.state = createStateDataModel();

    // Bind mitt pub/sub methods to this instance
    this.on = this.emitter.on;
    this.off = this.emitter.off;
    this.emit = this.emitter.emit;

    // Heartbeat mechanism to keep connection alive
    this.heartbeatInterval = null;
    this.isReconnecting = false;

    this.dataHandlers = {
      navigation: this._handleNavigationData.bind(this),
      vessel: this._handleVesselData.bind(this),
      alert: this._handleAlertData.bind(this),
      environment: this._handleEnvironmentData.bind(this),
    };
  }

  /**
   * Helper method to get a human-readable meaning for WebSocket close codes
   * @private
   * @param {number} code - The WebSocket close code
   * @returns {string} - Human-readable description of the close code
   */
  _getWebSocketCloseCodeMeaning(code) {
    const closeCodeMeanings = {
      1000: "Normal closure",
      1001: "Going away",
      1002: "Protocol error",
      1003: "Unsupported data",
      1004: "Reserved",
      1005: "No status received",
      1006: "Abnormal closure",
      1007: "Invalid frame payload data",
      1008: "Policy violation",
      1009: "Message too big",
      1010: "Mandatory extension",
      1011: "Internal server error",
      1012: "Service restart",
      1013: "Try again later",
      1014: "Bad gateway",
      1015: "TLS handshake failure",
    };

    return closeCodeMeanings[code] || "Unknown close code";
  }

  /**
   * Ensures the WebSocket URL uses the correct protocol (always wss:// for relay connections)
   * @private
   * @param {string} url - The WebSocket URL to check
   * @returns {string} - The URL with the correct protocol
   */
  _ensureSecureWebSocketUrl(url) {
    // Always use secure WebSocket (wss://) for relay connections
    if (url.startsWith("ws://")) {
      logger.info(
        "Converting insecure WebSocket URL to secure for relay connection"
      );
      return url.replace("ws://", "wss://");
    }

    // If the URL doesn't start with wss://, warn about it
    if (!url.startsWith("wss://")) {
      console.warn(
        "WebSocket URL should start with wss:// for relay connections"
      );
    }

    return url;
  }

  /**
   * Connect to the relay server
   * [DEBUG] All major lifecycle events, errors, and messages are logged for debugging.
   */
  async connect() {
    // Enhanced logging for connection attempt
    remoteLogger.log(
      "RELAY-CLIENT",
      `====== ATTEMPTING RELAY CONNECTION at ${new Date().toISOString()} ======`
    );
    remoteLogger.log(
      "RELAY-CLIENT",
      `Connection state: ${this.connectionState?.status || "initializing"}`
    );

    // Validate relay server URL
    if (!this.config.relayServerUrl) {
      remoteLogger.log("RELAY-CLIENT", "ERROR: No relay server URL configured");
      this.connectionState = {
        status: "error",
        lastError: "No relay server URL configured",
      };
      this.emit("connection-status", this.connectionState);
      return false;
    }

    remoteLogger.log(
      "RELAY-CLIENT",
      `Using relay server URL: ${this.config.relayServerUrl}`
    );

    // Log network information for diagnostics
    remoteLogger.log(
      "RELAY-CLIENT",
      `Network type: ${
        navigator.connection ? navigator.connection.type : "unknown"
      }`
    );
    remoteLogger.log(
      "RELAY-CLIENT",
      `Effective connection type: ${
        navigator.connection ? navigator.connection.effectiveType : "unknown"
      }`
    );
    remoteLogger.log(
      "RELAY-CLIENT",
      `Online status: ${navigator.onLine ? "online" : "offline"}`
    );

    if (this.config.relayDebug) {
      remoteLogger.log(
        "RELAY-CLIENT",
        `[DEBUG] Connect called at ${new Date().toISOString()}`
      );
    }
    try {
      this.connectionState.status = "connecting";
      this.emit("connection-status", this.connectionState);

      // Initialize client key pair (will generate if not exists)
      await getOrCreateClientKeyPair();

      // Get or create client ID
      this.clientId = getOrCreateClientId();
      remoteLogger.log("RELAY-CLIENT", `Client ID: ${this.clientId}`);

      return new Promise((resolve, reject) => {
        // Clean up any existing socket
        if (this.socket) {
          try {
            // Remove all event listeners to prevent memory leaks
            this.socket.onopen = null;
            this.socket.onmessage = null;
            this.socket.onclose = null;
            this.socket.onerror = null;

            this.socket.close();
          } catch (e) {
            remoteLogger.log(
              "RELAY-CLIENT",
              `Error closing existing socket: ${e.message}`,
              e
            );
          }
        }

        remoteLogger.log(
          "RELAY-CLIENT",
          `Creating new WebSocket connection to: ${this.config.relayServerUrl}`
        );

        try {
          // Using key-based authentication, no token needed
          remoteLogger.log("RELAY-CLIENT", "Using key-based authentication");

          // Ensure the WebSocket URL uses the correct protocol
          const url = this._ensureSecureWebSocketUrl(
            this.config.relayServerUrl
          );

          // Enhanced logging for WebSocket creation
          remoteLogger.log(
            "RELAY-CLIENT",
            `Creating WebSocket connection to: ${url}`
          );
          remoteLogger.log(
            "RELAY-CLIENT",
            `Using protocol: ${
              url.startsWith("wss://") ? "WSS (secure)" : "WS (insecure)"
            }`
          );

          if (this.config.relayDebug) {
            logger.info(
              `[RELAY-CLIENT][DEBUG] Creating WebSocket with URL: ${url}`
            );
          }

          try {
            this.socket = new WebSocket(url);
            remoteLogger.log(
              "RELAY-CLIENT",
              `WebSocket object created successfully`
            );
          } catch (wsCreationError) {
            remoteLogger.log(
              "RELAY-CLIENT",
              `ERROR CREATING WEBSOCKET: ${wsCreationError.message}`,
              wsCreationError
            );
            throw wsCreationError;
          }

          // Set a connection timeout
          const connectionTimeout = setTimeout(() => {
            if (this.connectionState.status === "connecting") {
              remoteLogger.log(
                "RELAY-CLIENT",
                "Connection timeout after 10 seconds"
              );
              this.connectionState = {
                status: "error",
                lastError: "Connection timeout",
              };
              this.emit("connection-status", this.connectionState);

              // Clean up socket
              if (this.socket) {
                this.socket.close();
              }

              reject(new Error("Connection timeout"));
            }
          }, 10000); // 10 second timeout

          this.socket.onopen = async () => {
            if (this.config.relayDebug) {
              logger.info(
                `[RELAY-CLIENT][DEBUG] WebSocket onopen triggered at ${new Date().toISOString()}`
              );
            }
            logger.info("Connected to relay server");
            // Clear the connection timeout
            clearTimeout(connectionTimeout);

            try {
              // Send identity message with signature for authentication
              await this._sendIdentity();

              // Register the client's public key with the VPS
              await this._registerClientKey();

              // Send required register message for proxy routing
              this._sendMessage({
                type: "register",
                boatIds: [getActiveBoatId()],
              });
            } catch (error) {
              console.error(
                "Error in authentication process:",
                error
              );
            }

            this.connectionState.status = "connected";
            this.connectionState.lastError = null;
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            this.emit("connection-status", this.connectionState);
            this.emit("vps-connection-status", { status: "connected" });

            // Immediately request the full state from the server
            this._sendMessage({
              type: "request-full-state",
              boatId: getActiveBoatId(),
            });

            // Start heartbeat to keep connection alive
            if (this.config.relayDebug) {
              logger.info("[RELAY-CLIENT][DEBUG] Starting heartbeat");
            }
            this._startHeartbeat();

            resolve(true);
          };

          this.socket.onmessage = async (event) => {
            if (this.config.relayDebug) {
              logger.info(
                `[RELAY-CLIENT][DEBUG] WebSocket onmessage triggered at ${new Date().toISOString()}`
              );
            }
            try {
              // Reset reconnect attempts on successful message
              this.reconnectAttempts = 0;

              // Log basic info about the received data
              const dataType =
                event.data instanceof Blob ? "Blob" : typeof event.data;
              const dataSize =
                event.data instanceof Blob
                  ? event.data.size
                  : event.data.length;
              remoteLogger.log(
                "RELAY-CLIENT",
                `Received WebSocket message: type=${dataType}, size=${dataSize} bytes`
              );

              // Handle different data types (especially Blob)
              let messageText;
              if (event.data instanceof Blob) {
                // Convert Blob to text before parsing
                remoteLogger.log(
                  "RELAY-CLIENT",
                  "Converting Blob data to text before parsing"
                );
                messageText = await event.data.text();
                remoteLogger.log(
                  "RELAY-CLIENT",
                  `Blob converted to text, length: ${messageText.length} chars`
                );
              } else {
                // Use data directly if it's already text
                messageText = event.data;
              }

              // [DEBUG] Log full event and timestamp
              if (this.config.relayDebug) {
                console.debug(
                  `[RELAY-CLIENT][DEBUG] Message event at ${new Date().toISOString()}:`,
                  event
                );
              }

              // Parse the message
              try {
                const message = JSON.parse(messageText);

                // Log detailed message info before handling
                remoteLogger.log(
                  "RELAY-CLIENT",
                  `Parsed message: type=${message.type}, boatId=${
                    message.boatId || "none"
                  }, hasData=${!!message.data}`
                );

                if (message.type === "state:full-update") {
                  // Log special details for full state updates
                  const dataKeys = message.data
                    ? Object.keys(message.data)
                    : [];
                  remoteLogger.log(
                    "RELAY-CLIENT",
                    `Full state update contains ${
                      dataKeys.length
                    } top-level keys: ${dataKeys.join(", ")}`
                  );
                  remoteLogger.log(
                    "RELAY-CLIENT",
                    `Full state update size: ${
                      JSON.stringify(message.data).length
                    } bytes`
                  );
                }

                // Handle the message
                this._handleMessage(message);
              } catch (parseError) {
                console.error(
                  "Error parsing JSON message:",
                  parseError
                );
                console.error(
                  "Message text that caused error (first 100 chars):",
                  messageText.substring(0, 100)
                );
                throw parseError; // Re-throw to be caught by outer try/catch
              }
            } catch (error) {
              console.error(
                "Error processing WebSocket message:",
                error
              );
              console.error(
                "Raw message that caused error:",
                event.data
              );
            }
          };

          this.socket.onclose = (event) => {
            if (this.config.relayDebug) {
              logger.info(
                `[RELAY-CLIENT][DEBUG] WebSocket onclose triggered at ${new Date().toISOString()}`
              );
            }
            // Clear the connection timeout if it's still active
            clearTimeout(connectionTimeout);

            // Enhanced close event logging
            logger.info(
              `====== WEBSOCKET CLOSED at ${new Date().toISOString()} ======`
            );
            logger.info(`Connection to ${url} closed`);
            logger.info(
              `Close code: ${
                event.code
              } (${this._getWebSocketCloseCodeMeaning(event.code)})`
            );
            logger.info(
              `Close reason: ${
                event.reason || "No reason provided"
              }`
            );
            logger.info(
              `Clean close: ${event.wasClean ? "Yes" : "No"}`
            );

            // Provide guidance based on close code
            if (event.code === 1006) {
              logger.info(
                `Code 1006 indicates abnormal closure - connection may have been refused or timed out`
              );
              logger.info(
                `Check if the server is running and accessible at ${url}`
              );
            } else if (event.code === 1015) {
              logger.info(
                `Code 1015 indicates TLS handshake failure - check server SSL/TLS configuration`
              );
            }

            // Clear heartbeat interval
            this._stopHeartbeat();

            // Only change connection state if we're not already reconnecting
            if (!this.isReconnecting) {
              this.connectionState.status = "disconnected";
              this.emit("connection-status", this.connectionState);
              this.emit("vps-connection-status", { status: "disconnected" });

              // Attempt to reconnect
              this._attemptReconnect();
            }
          };

          this.socket.onerror = (error) => {
            if (this.config.relayDebug) {
              logger.info(
                `[RELAY-CLIENT][DEBUG] WebSocket onerror triggered at ${new Date().toISOString()}`
              );
            }

            // Enhanced error logging
            console.error(
              `====== WEBSOCKET ERROR at ${new Date().toISOString()} ======`
            );
            console.error(`Error connecting to: ${url}`);
            console.error(`WebSocket error details:`, error);

            // Try to extract more information from the error
            if (error.message) {
              console.error(`Error message: ${error.message}`);
            }

            // Check for common connection issues
            if (url.startsWith("wss://")) {
              logger.info(
                `Using secure WebSocket (WSS) - check if server supports SSL/TLS`
              );
            }

            // Clear the connection timeout if it's still active
            clearTimeout(connectionTimeout);

            this.connectionState = {
              status: "error",
              lastError: "WebSocket connection error",
            };
            this.emit("connection-status", this.connectionState);
            this.emit("vps-connection-status", {
              status: "error",
              error: error.message,
            });

            // If we're still in the connecting state, reject the promise
            if (this.connectionState.status === "connecting") {
              reject(error);
            }
          };
        } catch (error) {
          console.error("Error creating WebSocket:", error);
          reject(error);
        }
      });
    } catch (error) {
      this.connectionState = {
        status: "error",
        lastError: error.message,
      };
      this.emit("connection-status", this.connectionState);
      throw error;
    }
  }

  /**
   * Attempt to reconnect to the relay server
   * [DEBUG] Logs all reconnection attempts and status updates.
   */
  /**
   * Attempt to reconnect to the relay server
   * @private
   */
  _attemptReconnect() {
    this._log("DEBUG", "Attempting to reconnect to relay server");
    this._log(
      "DEBUG",
      `Current reconnect attempt: ${this.reconnectAttempts + 1}/${
        this.config.maxReconnectAttempts
      }`
    );

    // Prevent multiple reconnection attempts
    if (this.isReconnecting) {
      this._log("DEBUG", "Reconnection already in progress");
      return;
    }

    // Ensure config values are valid
    const reconnectDelay =
      typeof this.config.reconnectDelay === "number" &&
      !isNaN(this.config.reconnectDelay)
        ? this.config.reconnectDelay
        : 3000;

    const maxReconnectAttempts =
      typeof this.config.maxReconnectAttempts === "number" &&
      !isNaN(this.config.maxReconnectAttempts)
        ? this.config.maxReconnectAttempts
        : 5;

    this.isReconnecting = true;
    this.connectionState = {
      status: "reconnecting",
      lastError: null,
    };
    this.emit("connection-status", this.connectionState);
    this.emit("vps-connection-status", { status: "reconnecting" });

    if (this.reconnectAttempts < maxReconnectAttempts) {
      this.reconnectAttempts++;

      this._log(
        "INFO",
        `Attempting to reconnect (${this.reconnectAttempts}/${maxReconnectAttempts}) in ${reconnectDelay}ms`
      );

      // Clean up any existing socket
      if (this.socket) {
        try {
          this.socket.close();
        } catch (e) {
          this._log("WARN", "Error closing socket during reconnect", {
            error: e,
          });
        }
        this.socket = null;
      }

      // Set up reconnection timer
      setTimeout(() => {
        try {
          this._log("DEBUG", "Initiating new connection attempt");
          this.connect();
        } catch (error) {
          this._log("ERROR", "Error during reconnection attempt", {
            error: error?.message,
            stack: error?.stack,
            attempt: this.reconnectAttempts,
            maxAttempts: maxReconnectAttempts,
          });

          // Update connection state
          this.connectionState = {
            status: "error",
            lastError: `Reconnection failed: ${error?.message}`,
          };
          this.emit("connection-status", this.connectionState);

          // Try again if we haven't reached max attempts
          if (this.reconnectAttempts < maxReconnectAttempts) {
            this._attemptReconnect();
          }
        }
      }, reconnectDelay);
    } else {
      this._log("ERROR", "Max reconnection attempts reached", {
        maxAttempts: maxReconnectAttempts,
        lastError: this.connectionState.lastError,
      });

      this.connectionState = {
        status: "error",
        lastError: "Max reconnection attempts reached",
      };
      this.emit("connection-status", this.connectionState);
      this.isReconnecting = false;
    }
  }

  /**
   * Stop heartbeat interval
   */
  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info("[RELAY-CLIENT][DEBUG] Stopped heartbeat interval");
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  _startHeartbeat() {
    this._stopHeartbeat(); // Clear any existing interval

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this._sendMessage({
            type: "ping",
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("Error sending heartbeat:", error);
        }
      }
    }, this.config.heartbeatInterval || 30000); // Default to 30 seconds if not configured

    if (this.config.relayDebug) {
      logger.info("[RELAY-CLIENT][DEBUG] Started heartbeat interval");
    }
  }

  /**
   * Handle messages from the relay server
   */
  _handleMessage(message) {
    remoteLogger.log(
      "RELAY-CLIENT",
      `Received message of type: ${message.type}`
    );
    const { type } = message;
    
    // Handle boat-status messages
    if (type === 'boat-status') {
      remoteLogger.log(
        "RELAY-CLIENT",
        `Boat status update: ${message.status} for boat ${message.boatId}`
      );
      this.emit('boat-status', {
        status: message.status,
        boatId: message.boatId,
        timestamp: message.timestamp || new Date().toISOString()
      });
      return;
    }

    // Handle state update messages
    if (type === "state:full-update" || type === "state:patch") {
      // Make sure the data structure is correct
      if (!message.data) {
        console.warn("Missing data in message:", message);
        return;
      }

      // Apply the state update
      if (type === "state:full-update") {
        remoteLogger.log(
          "RELAY-CLIENT",
          "Received full state update from server"
        );

        // Clear the waiting flag if we were waiting for a full state update
        if (this._waitingForFullState) {
          remoteLogger.log(
            "RELAY-CLIENT",
            "Full state response received successfully"
          );
          this._waitingForFullState = false;
        }

        // Log state data details for debugging
        const stateKeys = message.data ? Object.keys(message.data) : [];
        remoteLogger.log(
          "RELAY-CLIENT",
          `Full state contains ${
            stateKeys.length
          } top-level keys: ${stateKeys.join(", ")}`
        );

        // Merge with base model to ensure all required paths exist (like bluetooth)
        this.state = this._mergeWithBaseModel(message.data);

        // Emit the direct event (like DirectConnectionAdapter)
        this.emit("state:full-update", message.data);

        // Also emit the standardized event for backward compatibility with useRelayPiniaSync
        // The format must match what useRelayPiniaSync expects: { type, data }
        this.emit("state-update", {
          type: "state:full-update",
          data: message.data, // This is what useRelayPiniaSync expects
          state: this.state,
        });

        remoteLogger.log(
          "RELAY-CLIENT",
          "Full state update applied successfully"
        );
      } else {
        // state:patch
        if (Array.isArray(message.data)) {
          if (this.state) {
            // We have a base state, apply the patch
            remoteLogger.log(
              "RELAY-CLIENT",
              `Applying state patch with ${message.data.length} operations`
            );
            try {
              // Ensure parent paths exist before applying patches
              this._ensureParentPaths(this.state, message.data);
              
              const result = applyPatch(this.state, message.data, true);
              this.state = result.newDocument;

              // Emit the direct event (like DirectConnectionAdapter)
              this.emit("state:patch", message.data);

              // Also emit the standardized event for backward compatibility with useRelayPiniaSync
              // The format must match what useRelayPiniaSync expects: { type, data }
              this.emit("state-update", {
                type: "state:patch",
                data: message.data, // This is what useRelayPiniaSync expects
                patch: message.data, // Keep this for backward compatibility
                state: this.state,
              });

              remoteLogger.log(
                "RELAY-CLIENT",
                "Successfully applied state patch"
              );
            } catch (error) {
              console.error("Error applying patch:", error);
              // Request a full state update if we encounter an error applying the patch
              this._requestFullState();
            }
          } else {
            // We don't have a base state yet, request one
            console.warn(
              "Received state:patch but no base state exists. Requesting full state..."
            );
            this._requestFullState();
          }
        } else {
          console.warn(
            "Received state:patch with invalid format. Expected array, got:",
            typeof message.data
          );
        }
      }
      return;
    }

    // Handle other message types
    switch (type) {
      case "full-state":
        // Replace the entire state
        this.state = message.data;
        this.emit("state-update", { type: "full-state", state: this.state });
        break;
      case "state-update":
        // Apply JSON Patch (RFC 6902)
        if (Array.isArray(message.data) && this.state) {
          const result = applyPatch(this.state, message.data, true);
          this.state = result.newDocument;
          this.emit("state-update", {
            type: "state-update",
            patch: message.data,
            state: this.state,
          });
        } else {
          console.warn(
            "Received state-update but no base state to patch or invalid patch format."
          );
        }
        break;
      case "connection":
        // Handle connection status messages
        if (message.clientId) {
          this.clientId = message.clientId;
          logger.info(`Assigned client ID: ${this.clientId}`);

          // Send subscription preferences
          this._updateSubscriptions();
        }
        break;

      case "tide:update":
        logger.info("Handling tide update:", message.data);
        this.emit("tide-update", message.data);
        break;

      case "weather:update":
        logger.info("Handling weather update:", message.data);
        this.emit("weather-update", message.data);
        break;

      case "navigation":
        // Handle navigation data
        logger.info(`Handling navigation message:`, message);
        this.emit("navigation", message);
        // Also emit nav-position for backward compatibility
        if (message.data && message.data.position) {
          this.emit("nav-position", {
            data: message.data,
            timestamp: message.timestamp,
            boatId: getActiveBoatId(),
          });
        }
        break;

      case "vessel":
        logger.info(`Handling vessel message:`, message);
        this.emit("vessel-update", message);
        break;

      case "alert":
        logger.info(`Handling alert message:`, message);
        this.emit("alert", message);
        break;

      case "environment":
        logger.info(`Handling environment message:`, message);
        this.emit("environment", message);
        // Also emit specific environment events
        if (message.data && message.data.wind) {
          this.emit("env-wind", {
            wind: message.data.wind,
            timestamp: message.timestamp,
          });
        }
        if (message.data && message.data.depth) {
          this.emit("env-depth", {
            depth: message.data.depth,
            timestamp: message.timestamp,
          });
        }
        break;

      case "error":
        // Handle error messages
        console.error(
          "Received error from relay server:",
          message.message
        );
        break;

      case "ping":
        // Handle ping responses (for ping-pong heartbeat)
        // logger.info('Received ping from server");
        break;

      case "pong":
        // Handle pong responses (for ping-pong heartbeat)
        // logger.info('Received pong from server");
        break;

      case "subscription":
        // Handle subscription confirmation messages
        logger.info(
          "Subscription update confirmed:",
          message.data,
          message
        );
        break;

      default:
        if (
          typeof type === "string" &&
          (type.startsWith("request") ||
            type.startsWith("set") ||
            type === "get-full-state")
        ) {
          // Silently ignore these, as they are not meant for clients
          return;
        }
        console.warn("Unknown message type:", type, message);
    }
  }

  /**
   * Update subscriptions with the relay server
   */
  _updateSubscriptions() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this._sendMessage({
        type: "subscribe",
        subscriptions: this.subscriptions,
      });
    }
  }

  /**
   * Merge incoming state with base state model to ensure all required paths exist
   * @param {Object} incomingState - State received from server
   * @returns {Object} Merged state with all base model paths
   */
  _mergeWithBaseModel(incomingState) {
    // Create base state model with all required paths
    const baseModel = createStateDataModel();
    
    // Deep merge incoming state into base model
    const mergeDeep = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          mergeDeep(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    };
    
    return mergeDeep(baseModel, incomingState);
  }

  /**
   * Ensure parent paths exist before applying patches
   * Similar to server's StateManager implementation
   * @param {Object} state - The state object
   * @param {Array} patches - Array of JSON Patch operations
   */
  _ensureParentPaths(state, patches) {
    patches.forEach(operation => {
      if (operation.op === 'add' || operation.op === 'replace') {
        const pathParts = operation.path.substring(1).split('/');
        
        // For paths like /bluetooth/lastUpdated, we need to ensure:
        // 1. bluetooth exists (parent)
        // 2. Then we can set lastUpdated
        
        let current = state;
        // Go through all parts except the last one (which is the property to set)
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          if (!current[part] || typeof current[part] !== 'object') {
            // Create parent object if it doesn't exist or isn't an object
            current[part] = {};
            console.log(`[RelayConnectionBridge] Created parent path: ${part} for ${operation.path}`);
          }
          current = current[part];
        }
      }
    });
  }

  /**
   * Request a full state update from the server
   * This is used when we receive a patch but don't have a base state to apply it to
   * Includes throttling to prevent request spam
   */
  _requestFullState() {
    // Check if we've requested a full state recently
    const now = Date.now();
    if (this._lastFullStateRequest && now - this._lastFullStateRequest < 5000) {
      // Don't request more than once every 5 seconds
      remoteLogger.log(
        "RELAY-CLIENT",
        "Full state request throttled (last request was less than 5 seconds ago)"
      );
      return;
    }

    this._lastFullStateRequest = now;
    remoteLogger.log(
      "RELAY-CLIENT",
      "Requesting full state update from server"
    );

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this._sendMessage({
        type: "request-full-state",
        boatId: getActiveBoatId(),
        timestamp: now,
      });

      // Set a flag to indicate we're waiting for a full state response
      this._waitingForFullState = true;

      // Set a timeout to clear the waiting flag in case we don't get a response
      setTimeout(() => {
        if (this._waitingForFullState) {
          remoteLogger.log(
            "RELAY-CLIENT",
            "Full state request timed out after 10 seconds"
          );
          this._waitingForFullState = false;
        }
      }, 10000); // 10 second timeout
    } else {
      console.warn(
        "Cannot request full state: WebSocket not connected"
      );
    }
  }

  /**
   * Handle navigation data from the relay server
   * De-nests the data structure and emits clean, simplified objects
   */
  _handleNavigationData(message) {
    // Enhanced logging to debug the data received
    // logger.info('[RELAY-BRIDGE] Received navigation data from relay server");
    // logger.info('[RELAY-BRIDGE] Raw message:", JSON.stringify(message));

    // The data is deeply nested in the structure:
    // { type: 'navigation', data: { type: 'navigation', data: { position: {...} } } }
    // We need to extract the actual data from this nested structure

    // First level unwrapping
    const outerData = message.data || {};
    // Second level unwrapping
    const innerData = outerData.data || {};

    // logger.info('[RELAY-BRIDGE] Outer data:", JSON.stringify(outerData));
    // logger.info('[RELAY-BRIDGE] Inner data:", JSON.stringify(innerData));

    // Extract position data from the correct location in the structure
    const positionData = innerData.position;
    // logger.info('[RELAY-BRIDGE] Position data:", JSON.stringify(positionData));

    // Extract instrument data from the inner data
    // The instrument data might be nested similarly to position data
    // First, log all possible paths where we might find the data
    // logger.info('[RELAY-BRIDGE] Exploring all possible data paths:');
    logger.info("innerData:", JSON.stringify(innerData));

    // Check for speed over ground in all possible locations
    // logger.info('[RELAY-BRIDGE] Checking for speedOverGround:');
    logger.info("- innerData.speedOverGround:", innerData.speedOverGround);
    logger.info(
      "- innerData.speed?.overGround:",
      innerData.speed && innerData.speed.overGround
    );
    logger.info(
      "- innerData.course?.speedOverGround:",
      innerData.course && innerData.course.speedOverGround
    );
    logger.info(
      "- outerData.speed?.overGround:",
      outerData.speed && outerData.speed.overGround
    );
    logger.info(
      "- outerData.course?.speedOverGround:",
      outerData.course && outerData.course.speedOverGround
    );

    // Check for heading in all possible locations
    // logger.info('[RELAY-BRIDGE] Checking for heading:');
    logger.info("- innerData.headingMagnetic:", innerData.headingMagnetic);
    logger.info(
      "- innerData.heading?.magnetic:",
      innerData.heading && innerData.heading.magnetic
    );
    logger.info("- innerData.heading:", innerData.heading);

    // Create a more comprehensive instrument data object
    const instrumentData = {
      headingMagnetic:
        innerData.headingMagnetic ||
        (innerData.heading && innerData.heading.magnetic) ||
        innerData.heading,
      speedOverGround:
        innerData.speedOverGround ||
        (innerData.speed && innerData.speed.overGround) ||
        (innerData.course && innerData.course.speedOverGround) ||
        (outerData.speed && outerData.speed.overGround) ||
        (outerData.course && outerData.course.speedOverGround) ||
        innerData.sog, // Try another common abbreviation
    };

    // logger.info('[RELAY-BRIDGE] Final instrument data:", JSON.stringify(instrumentData));

    // Create a clean, de-nested data structure for position that matches the expected format
    // in the stateDataStore
    const cleanPositionData = positionData
      ? {
          position: positionData,
          timestamp:
            innerData.timestamp ||
            outerData.timestamp ||
            message.timestamp ||
            new Date().toISOString(),
        }
      : undefined;

    // Check for wind data in the navigation message with enhanced logging
    // logger.info('[RELAY-BRIDGE] Searching for wind data in all possible locations:');
    logger.info("- innerData.wind:", JSON.stringify(innerData.wind));
    logger.info("- outerData.wind:", JSON.stringify(outerData.wind));
    logger.info("- message.data.wind:", JSON.stringify(message.data?.wind));
    logger.info("- message.wind:", JSON.stringify(message.wind));

    // Also check for any properties containing "wind" in their name
    // logger.info('[RELAY-BRIDGE] Checking for any wind-related properties in innerData:');
    Object.keys(innerData).forEach((key) => {
      if (key.toLowerCase().includes("wind")) {
        logger.info(`- innerData.${key}:`, JSON.stringify(innerData[key]));
      }
    });

    const windData = innerData.wind || outerData.wind;
    if (windData) {
      const cleanWindData = {
        wind: windData,
        timestamp:
          innerData.timestamp ||
          outerData.timestamp ||
          message.timestamp ||
          new Date().toISOString(),
      };
      // logger.info('[RELAY-BRIDGE] Found wind data in navigation message:", JSON.stringify(cleanWindData));
      this.emit("env-wind", cleanWindData);
    } else {
      // logger.info('[RELAY-BRIDGE] No wind data found in navigation message");
    }

    // Check for depth data in the navigation message
    const depthData = innerData.depth || outerData.depth;
    if (depthData) {
      const cleanDepthData = {
        depth: depthData,
        timestamp:
          innerData.timestamp ||
          outerData.timestamp ||
          message.timestamp ||
          new Date().toISOString(),
      };
      // logger.info('[RELAY-BRIDGE] Found depth data in navigation message:", JSON.stringify(cleanDepthData));
      this.emit("env-depth", cleanDepthData);
    }

    // Log what we're about to emit
    // logger.info('[RELAY-BRIDGE] Emitting nav-position with:", JSON.stringify(cleanPositionData));
    // logger.info('[RELAY-BRIDGE] Emitting nav-instruments with:", JSON.stringify(instrumentData));

    // Process navigation data with the clean, simplified structure
    this.emit("nav-position", cleanPositionData);
    this.emit("nav-instruments", instrumentData);
  }

  /**
   * Handle vessel data from the relay server
   */
  _handleVesselData(data) {
    // Process vessel data
    this.emit("vessel-update", data);
  }

  /**
   * Handle environment data from the relay server
   * This includes wind, temperature, and other environmental measurements
   */
  _handleEnvironmentData(message) {
    // logger.info('[RELAY-BRIDGE] Received environment data from relay server");
    logger.info(
      "[RELAY-BRIDGE] Raw environment message:",
      JSON.stringify(message)
    );

    // The data is likely nested in the same way as navigation data
    const outerData = message.data || {};
    const innerData = outerData.data || {};

    // logger.info('[RELAY-BRIDGE] Environment outer data:", JSON.stringify(outerData));
    // logger.info('[RELAY-BRIDGE] Environment inner data:", JSON.stringify(innerData));

    // Try to find wind data in all possible locations
    // First check if wind data is directly in the message
    let windData = message.wind;

    // If not, check in the data or data.data objects
    if (!windData) {
      windData = outerData.wind || innerData.wind;
    }

    // If still not found, check for environment.wind structure
    if (!windData && innerData.environment) {
      windData = innerData.environment.wind;
    }

    // If still not found, check for nested wind properties
    if (!windData) {
      // Look for common wind properties and construct a wind object
      // First look for true wind data
      const windSpeedTrue =
        innerData.windSpeedTrue ||
        outerData.windSpeedTrue ||
        (innerData.wind && innerData.wind.speedTrue) ||
        (outerData.wind && outerData.wind.speedTrue) ||
        innerData.windSpeed ||
        outerData.windSpeed ||
        (innerData.wind && innerData.wind.speed) ||
        (outerData.wind && outerData.wind.speed);

      const windAngleTrue =
        innerData.windAngleTrue ||
        outerData.windAngleTrue ||
        (innerData.wind && innerData.wind.angleTrue) ||
        (outerData.wind && outerData.wind.angleTrue) ||
        innerData.windAngle ||
        outerData.windAngle ||
        (innerData.wind && innerData.wind.angle) ||
        (outerData.wind && outerData.wind.angle);

      // Look for apparent wind data
      const windSpeedApparent =
        innerData.windSpeedApparent ||
        outerData.windSpeedApparent ||
        (innerData.wind && innerData.wind.speedApparent) ||
        (outerData.wind && outerData.wind.speedApparent);

      const windAngleApparent =
        innerData.windAngleApparent ||
        outerData.windAngleApparent ||
        (innerData.wind && innerData.wind.angleApparent) ||
        (outerData.wind && outerData.wind.angleApparent);

      const windDirection =
        innerData.windDirection ||
        outerData.windDirection ||
        (innerData.wind && innerData.wind.direction) ||
        (outerData.wind && outerData.wind.direction);

      if (
        windSpeedTrue ||
        windAngleTrue ||
        windSpeedApparent ||
        windAngleApparent ||
        windDirection
      ) {
        windData = {
          speedTrue: windSpeedTrue,
          angleTrue: windAngleTrue,
          speedApparent: windSpeedApparent,
          angleApparent: windAngleApparent,
          direction: windDirection,
          reference: "true",
        };
      }
    }

    // logger.info('[RELAY-BRIDGE] Extracted wind data:", JSON.stringify(windData));

    if (windData) {
      // Create a clean wind data structure
      const cleanWindData = {
        wind: windData,
        timestamp:
          innerData.timestamp ||
          outerData.timestamp ||
          message.timestamp ||
          new Date().toISOString(),
      };

      // Ensure we have both true and apparent wind data
      if (!cleanWindData.wind.speedTrue && cleanWindData.wind.speed) {
        cleanWindData.wind.speedTrue = cleanWindData.wind.speed;
        delete cleanWindData.wind.speed;
      }

      if (!cleanWindData.wind.angleTrue && cleanWindData.wind.angle) {
        cleanWindData.wind.angleTrue = cleanWindData.wind.angle;
        delete cleanWindData.wind.angle;
      }

      // If we only have true wind data, generate some mock apparent wind data
      if (cleanWindData.wind.speedTrue && !cleanWindData.wind.speedApparent) {
        // Apparent wind is typically slightly higher than true wind
        cleanWindData.wind.speedApparent = cleanWindData.wind.speedTrue * 1.1;
      }

      if (cleanWindData.wind.angleTrue && !cleanWindData.wind.angleApparent) {
        // Apparent wind angle is typically slightly less than true wind angle
        cleanWindData.wind.angleApparent = cleanWindData.wind.angleTrue * 0.9;
      }

      // logger.info('[RELAY-BRIDGE] Emitting env-wind with:", JSON.stringify(cleanWindData));
      this.emit("env-wind", cleanWindData);
    }

    // Look for depth data in all possible locations
    let depthData = message.depth || outerData.depth || innerData.depth;

    // If not found directly, check for nested depth properties
    if (!depthData && (innerData.environment || outerData.environment)) {
      depthData =
        (innerData.environment && innerData.environment.depth) ||
        (outerData.environment && outerData.environment.depth);
    }

    // If still not found, look for common depth properties
    if (!depthData) {
      const belowTransducer =
        innerData.depthBelowTransducer ||
        outerData.depthBelowTransducer ||
        (innerData.depth && innerData.depth.belowTransducer) ||
        (outerData.depth && outerData.depth.belowTransducer);

      const belowKeel =
        innerData.depthBelowKeel ||
        outerData.depthBelowKeel ||
        (innerData.depth && innerData.depth.belowKeel) ||
        (outerData.depth && outerData.depth.belowKeel);

      const belowSurface =
        innerData.depthBelowSurface ||
        outerData.depthBelowSurface ||
        (innerData.depth && innerData.depth.belowSurface) ||
        (outerData.depth && outerData.depth.belowSurface);

      if (belowTransducer || belowKeel || belowSurface) {
        depthData = {
          belowTransducer,
          belowKeel,
          belowSurface,
        };
      }
    }

    if (depthData) {
      const cleanDepthData = {
        depth: depthData,
        timestamp:
          innerData.timestamp ||
          outerData.timestamp ||
          message.timestamp ||
          new Date().toISOString(),
      };

      // logger.info('[RELAY-BRIDGE] Emitting env-depth with:", JSON.stringify(cleanDepthData));
      this.emit("env-depth", cleanDepthData);
    }

    // Extract temperature data if present
    const temperatureData = innerData.temperature || outerData.temperature;
    if (temperatureData) {
      const cleanTempData = {
        temperature: temperatureData,
        timestamp:
          innerData.timestamp ||
          outerData.timestamp ||
          message.timestamp ||
          new Date().toISOString(),
      };

      // logger.info('[RELAY-BRIDGE] Emitting env-temperature with:", cleanTempData);
      this.emit("env-temperature", cleanTempData);
    }

    // Emit the full environment data for any other processing
    this.emit("environment", innerData || outerData);
  }

  /**
   * Handle alert data from the relay server
   */
  _handleAlertData(data) {
    // Process alert data
    if (data.source === "signalk") {
      this.emit("signalk-alert", data);
    } else if (data.source === "user") {
      this.emit("user-alert", data);
    }
  }

  /**
   * Send a command to the relay server
   */
  sendCommand(service, action, data = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Create a flat message with the action as the type
      const message = {
        type: action,  // Use the action as the message type
        ...data,      // Spread the data properties
        timestamp: Date.now(),
        service,      // Keep service as a separate field if needed
        _originalAction: action  // Keep original action for debugging
      };
      
      this._sendMessage(message);
      return true;
    }
    return false;
  }

  /**
   * Add an event listener
   */
  on(event, callback) {
    super.on(event, callback);
    return () => this.off(event, callback);
  }

  /**
   * Send identity message with signature for authentication
   * @private
   */
  async _sendIdentity() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      logger.info("Cannot send identity, not connected");
      return;
    }

    const boatId = getActiveBoatId();
    const timestamp = Date.now();

    // Create the identity message
    const identityMessage = {
      type: "identity",
      clientId: this.clientId,
      boatId,
      role: "client",
      timestamp,
      time: new Date().toISOString(),
    };

    try {
      // Sign the message with our private key
      const signature = await signMessage(
        `${this.clientId}:${boatId}:${timestamp}`
      );
      if (signature) {
        logger.info(`Found private key, generating signature`);
        identityMessage.signature = signature;
        logger.info(`Added signature to identity message`);
      } else {
        logger.info(
          `No private key available, sending unsigned message`
        );
      }
    } catch (error) {
      console.error(`Error signing message:`, error);
    }

    // Send the identity message
    logger.info(`Sending identity message:`, identityMessage);
    this.socket.send(JSON.stringify(identityMessage));
  }

  /**
   * Register the client's public key with the VPS
   * @private
   */
  async _registerClientKey() {
    logger.info('_registerClientKey called');
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      const status = this.socket ? `WebSocket state: ${this.socket.readyState}` : 'No WebSocket connection';
      logger.info(`Cannot register key, not connected (${status})`);
      return;
    }

    const boatId = getActiveBoatId();
    const publicKey = getClientPublicKey();

    if (!publicKey) {
      logger.info("No public key available for registration");
      return;
    }

    logger.info(`Registering public key via WebSocket`);
    logger.info(`Current relayServerUrl: ${this.config.relayServerUrl}`);
    logger.info(`Client ID: ${this.clientId}`);
    logger.info(`Boat ID: ${boatId}`);
    logger.info(`Public Key: ${publicKey ? `${publicKey.substring(0, 30)}...` : 'none'}`);

    const message = {
      type: "register-key",
      clientId: this.clientId,
      boatId,
      publicKey,
      timestamp: Date.now(),
    };

    // Log the WebSocket message being sent
    logger.info('Sending WebSocket message:', {
      type: message.type,
      clientId: message.clientId,
      boatId: message.boatId,
      publicKey: message.publicKey ? `${message.publicKey.substring(0, 30)}...` : 'none',
      timestamp: new Date(message.timestamp).toISOString()
    });

    // Send the registration message
    this.socket.send(JSON.stringify(message));

    // Also try to register via HTTP API as a fallback
    try {
      const vpsUrl = this.config.relayServerUrl;
      logger.info(`Attempting HTTP registration with VPS URL: ${vpsUrl}`);
      await registerClientKeyWithVPS(vpsUrl, this.clientId, boatId);
    } catch (error) {
      console.error("Error registering key via HTTP:", error);
      if (error.response) {
        console.error("HTTP Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
    }
  }

  /**
   * Disconnect from the relay server
   */
  disconnect() {
    // Stop heartbeat
    this._stopHeartbeat();

    if (this.socket) {
      try {
        this.socket.close();
        // Emit disconnected status when WebSocket is closed
        this.emit("vps-connection-status", { status: "disconnected" });
      } catch (e) {
        console.warn(
          "Error closing socket during disconnect:",
          e
        );
        // Emit error status if disconnect fails
        this.emit("vps-connection-status", {
          status: "error",
          error: e.message,
        });
      }
      this.socket = null;
    }

    this.isReconnecting = false;
    this.connectionState.status = "disconnected";
    this.emit("connection-status", this.connectionState);
    logger.info("Disconnected from relay server");
  }
}

// Helper to ensure every outgoing message includes boatId
RelayConnectionBridge.prototype._sendMessage = function (message) {
  // Helper to ensure every outgoing message includes boatId
  if (!message.boatId) {
    message.boatId = getActiveBoatId();
  }

  remoteLogger.log("RELAY-CLIENT", `Sending message of type: ${message.type}`);

  if (this.socket && this.socket.readyState === WebSocket.OPEN) {
    logger.info('[RELAY] Sending message:', message);
    this.socket.send(JSON.stringify(message));
    remoteLogger.log("RELAY-CLIENT", `Message sent successfully`);
  } else {
    remoteLogger.log(
      "RELAY-CLIENT",
      `Cannot send message, socket not open: ${message.type}`,
      message
    );
    console.warn(
      `Cannot send message, socket not open:`,
      message
    );
  }
};

// Singleton instance
export const relayConnectionBridge = new RelayConnectionBridge();
