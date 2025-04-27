import mitt from "mitt";
import { KJUR } from "jsrsasign";
import { applyPatch } from "fast-json-patch";

// Set to true to log all incoming WebSocket messages for debugging
const DEBUG_WS = true; // Set to false to disable WS debug logs
// import { getOrCreateAppUuid } from "../../server/uniqueAppId.js"
// const boatId = getOrCreateAppUuid();
/**
 * RelayConnectionBridge
 *
 * Client-side bridge that connects to the relay server instead of
 * directly to SignalK or PocketBase. This reduces the load on the VPS
 * by leveraging the throttling done by the relay server.
 */
function getActiveBoatId() {
  // Try to get from localStorage
  const id = localStorage.getItem('activeBoatId');
  if (id) return id;
  // Fallback: use first boat in boatIds array
  const boats = JSON.parse(localStorage.getItem('boatIds') || '[]');
  if (boats.length > 0) {
    localStorage.setItem('activeBoatId', boats[0]);
    return boats[0];
  }
  return null;
}

export class RelayConnectionBridge {
  constructor(config = {}) {
    this.emitter = mitt();
    this.config = {
      relayDebug: import.meta.env.VITE_RELAY_DEBUG === "true" || config.relayDebug || false,
      relayServerUrl:
        import.meta.env.VITE_RELAY_SERVER_URL || "ws://compendiumnav.com/relay",
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

    console.log(
      `[RELAY-CLIENT] Initializing with URL: ${this.config.relayServerUrl}`
    );

    this.socket = null;
    this.clientId = null;
    this.reconnectAttempts = 0;
    this.subscriptions = ["navigation", "vessel", "alerts", "environment"];
    this.connectionState = {
      status: "disconnected",
      lastError: null,
    };

    // Unified state object (populated by full-state, updated by diffs)
    this.state = null;

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
   * Connect to the relay server
   * [DEBUG] All major lifecycle events, errors, and messages are logged for debugging.
   */
  async connect() {
    if (this.config.relayDebug) {
      console.log('[RELAY-CLIENT][DEBUG] connect() called at', new Date().toISOString());
    }
    // If already connecting or reconnecting, don't try to connect again
    if (this.connectionState.status === "connecting" || this.isReconnecting) {
      console.log(
        "[RELAY-CLIENT] Already attempting to connect, skipping duplicate connect call"
      );
      return Promise.resolve(false);
    }

    try {
      this.connectionState.status = "connecting";
      this.emit("connection-status", this.connectionState);

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
            console.warn("[RELAY-CLIENT] Error closing existing socket:", e);
          }
        }

        console.log(
          "[RELAY-CLIENT][CONNECT] Creating new WebSocket connection to:",
          this.config.relayServerUrl
        );

        try {
          const secret = import.meta.env.VITE_TOKEN_SECRET;
          const payload = {
            originId: "relay-server",
            boatId: getActiveBoatId(),
            role: "relay",
            time: new Date().toISOString(),
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 1 day
          };

          console.log("[RELAY-CLIENT] Payload:", payload);
          // Generate JWT token
          const sHeader = JSON.stringify({ alg: "HS256", typ: "JWT" });
          const sPayload = JSON.stringify(payload);
          const token = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, {
            utf8: secret,
          });
          // console.log("Generated token:", token);

          // console.log('[RELAY-CLIENT] Using token:", token);
          let url = this.config.relayServerUrl;
          if (token) {
            url +=
              (url.includes("?") ? "&" : "?") +
              "token=" +
              encodeURIComponent(token);
          }
          if (this.config.relayDebug) {
            // console.log(`[RELAY-CLIENT][DEBUG] Creating WebSocket with URL: ${url}`);
          }
          this.socket = new WebSocket(url);
          // this.socket = new WebSocket(this.config.relayServerUrl);

          // Set a connection timeout
          const connectionTimeout = setTimeout(() => {
            if (this.connectionState.status === "connecting") {
              console.error("[RELAY-CLIENT] Connection timeout");
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

          this.socket.onopen = () => {
            if (this.config.relayDebug) {
              console.log(`[RELAY-CLIENT][DEBUG] WebSocket onopen triggered at ${new Date().toISOString()}`);
            }
            console.log("[RELAY-CLIENT] Connected to relay server");
            // Clear the connection timeout
            clearTimeout(connectionTimeout);

            // Send required register message for proxy routing
            this._sendMessage({
              type: "register",
              boatIds: [getActiveBoatId()],
            });
          
            this.connectionState.status = "connected";
            this.connectionState.lastError = null;
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            this.emit("connection-status", this.connectionState);

            // Immediately request the full state from the server
            this._sendMessage({
              type: "request-full-state",
              boatId: getActiveBoatId(),
            });

            // Start heartbeat to keep connection alive
            if (this.config.relayDebug) {
              console.log('[RELAY-CLIENT][DEBUG] Starting heartbeat');
            }
            this._startHeartbeat();

            resolve(true);
          };

          this.socket.onmessage = (event) => {
            if (this.config.relayDebug) {
              // console.log(`[RELAY-CLIENT][DEBUG] WebSocket onmessage triggered at ${new Date().toISOString()}`);
            }
            try {
              // Reset reconnect attempts on successful message
              this.reconnectAttempts = 0;
              // console.log("[RELAY-CLIENT] Received message:", event.data);
              // [DEBUG] Log full event and timestamp
              if (this.config.relayDebug) {
                console.debug(`[RELAY-CLIENT][DEBUG] Message event at ${new Date().toISOString()}:`, event);
              }
              // Parse and handle the message
              // console.log("[RELAY-CLIENT] Received message:", event.data);

              const message = JSON.parse(event.data);
              this._handleMessage(message);
            } catch (error) {
              console.error("[RELAY-CLIENT] Error parsing message:", error);
              console.error(
                "[RELAY-CLIENT] Raw message that caused error:",
                event.data
              );
            }
          };

          this.socket.onclose = (event) => {
            if (this.config.relayDebug) {
              console.log(`[RELAY-CLIENT][DEBUG] WebSocket onclose triggered at ${new Date().toISOString()}`);
            }
            // Clear the connection timeout if it's still active
            clearTimeout(connectionTimeout);

            console.log(
              "[RELAY-CLIENT] Disconnected from relay server, code:",
              event.code,
              "reason:",
              event.reason
            );

            // Clear heartbeat interval
            this._stopHeartbeat();

            // Only change connection state if we're not already reconnecting
            if (!this.isReconnecting) {
              this.connectionState.status = "disconnected";
              this.emit("connection-status", this.connectionState);

              // Attempt to reconnect
              this._attemptReconnect();
            }
          };

          this.socket.onerror = (error) => {
            if (this.config.relayDebug) {
              console.log(`[RELAY-CLIENT][DEBUG] WebSocket onerror triggered at ${new Date().toISOString()}`);
            }
            console.error("[RELAY-CLIENT] WebSocket error:", error);

            // Clear the connection timeout if it's still active
            clearTimeout(connectionTimeout);

            this.connectionState = {
              status: "error",
              lastError: "WebSocket connection error",
            };
            this.emit("connection-status", this.connectionState);

            // If we're still in the connecting state, reject the promise
            if (this.connectionState.status === "connecting") {
              reject(error);
            }
          };
        } catch (error) {
          console.error("[RELAY-CLIENT] Error creating WebSocket:", error);
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
  _attemptReconnect() {
    if (this.config.relayDebug) {
      console.log('[RELAY-CLIENT][DEBUG] _attemptReconnect() called at', new Date().toISOString());
    }
    if (this.config.relayDebug) {
      console.log(`[RELAY-CLIENT][DEBUG] Current reconnectAttempts: ${this.reconnectAttempts}`);
    }
    // Ensure config values are always numbers and valid
    const reconnectDelay = (typeof this.config.reconnectDelay === "number" && !isNaN(this.config.reconnectDelay))
      ? this.config.reconnectDelay
      : 3000;
    const maxReconnectAttempts = (typeof this.config.maxReconnectAttempts === "number" && !isNaN(this.config.maxReconnectAttempts))
      ? this.config.maxReconnectAttempts
      : 5;

    // Prevent multiple reconnection attempts
    if (this.isReconnecting) {
      console.log(
        `[RELAY-CLIENT] Already attempting to reconnect (${this.reconnectAttempts}/${maxReconnectAttempts}) in ${reconnectDelay}ms...`
      );
      return;
    }

    if (this.config.relayDebug) {
      console.log(`[RELAY-CLIENT][DEBUG] Setting isReconnecting = true`);
    }
    this.isReconnecting = true;

    // Reset connection state to reconnecting
    this.connectionState = {
      status: "reconnecting",
      lastError: null,
    };
    this.emit("connection-status", this.connectionState);

    if (this.reconnectAttempts < maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `[RELAY-CLIENT] Attempting to reconnect (${this.reconnectAttempts}/${maxReconnectAttempts}) in ${reconnectDelay}ms...`
      );

      // Clean up any existing socket
        setTimeout(() => {
          try {
            this._sendMessage({
              type: "ping",
              timestamp: Date.now(),
            });
            // On successful send, reset attempts and flag
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
          } catch (error) {
            console.error("[RELAY-CLIENT] Reconnection attempt failed:", error);
            this.isReconnecting = false;
            // Try again if we haven't reached max attempts
            if (this.reconnectAttempts < maxReconnectAttempts) {
              this._attemptReconnect();
            } else {
              this.connectionState = {
                status: "error",
                lastError: "Max reconnection attempts reached",
              };
              this.emit("connection-status", this.connectionState);
            }
          }
        }, reconnectDelay /* or cappedDelay for backoff */);
    } else {
      console.error("[RELAY-CLIENT] Max reconnection attempts reached");
      this.connectionState = {
        status: "error",
        lastError: "Max reconnection attempts reached",
      };
      this.emit("connection-status", this.connectionState);
      this.isReconnecting = false;
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  _startHeartbeat() {
    this._stopHeartbeat(); // Clear any existing interval

    this.heartbeatInterval = setInterval(() => {
      if (this.socket) {
        if (this.socket.readyState === WebSocket.OPEN) {
          // console.log('[RELAY-CLIENT][DEBUG] Sending heartbeat ping');
          try {
            this._sendMessage({
              type: "ping",
              timestamp: Date.now(),
            });
          } catch (error) {
            console.error(
              "[RELAY-CLIENT] Error sending heartbeat ping:",
              error
            );
            // If we can't send a ping, the connection might be broken
            // Try to reconnect
            this._attemptReconnect();
          }
        } else if (
          this.socket.readyState === WebSocket.CLOSED ||
          this.socket.readyState === WebSocket.CLOSING
        ) {
          console.log('[RELAY-CLIENT][DEBUG] Socket is closed or closing, attempting to reconnect');
          this._attemptReconnect();
        }
      }
    }, this.config.heartbeatInterval);

    console.log(`[RELAY-CLIENT] Started heartbeat interval (${this.config.heartbeatInterval}ms)`);
  }

  /**
   * Stop heartbeat interval
   */
  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('[RELAY-CLIENT][DEBUG] Stopped heartbeat interval');
    }
  }

  /**
   * Handle messages from the relay server
   */
  _handleMessage(message) {
    // console.log('[RELAY-CLIENT][DEBUG] _handleMessage received:', message);
    const { type } = message;

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
          this.emit("state-update", { type: "state-update", patch: message.data, state: this.state });
        } else {
          console.warn("[RELAY-CLIENT] Received state-update but no base state to patch or invalid patch format.");
        }
        break;
      case "connection":
        // Handle connection status messages
        if (message.clientId) {
          this.clientId = message.clientId;
          console.log(`[RELAY-CLIENT] Assigned client ID: ${this.clientId}`);

          // Send subscription preferences
          this._updateSubscriptions();
        }
        break;

      case "navigation":
        // Handle navigation data
        console.log(`[RELAY-CLIENT] Handling navigation message:`, message);
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
        console.log(`[RELAY-CLIENT] Handling vessel message:`, message);
        this.emit("vessel-update", message);
        break;

      case "alert":
        console.log(`[RELAY-CLIENT] Handling alert message:`, message);
        this.emit("alert", message);
        break;

      case "environment":
        console.log(`[RELAY-CLIENT] Handling environment message:`, message);
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
          "[RELAY-CLIENT] Received error from relay server:",
          message.message
        );
        break;

        case "ping":
          // Handle ping responses (for ping-pong heartbeat)
          // console.log('[RELAY-CLIENT] Received ping from server");
          break;        

      case "pong":
        // Handle pong responses (for ping-pong heartbeat)
        // console.log('[RELAY-CLIENT] Received pong from server");
        break;

      case "subscription":
        // Handle subscription confirmation messages
        console.log(
          "[RELAY-CLIENT] Subscription update confirmed:",
          message.data,
          message
        );
        break;

      default:
        if (
          typeof type === "string" &&
          (type.startsWith("request") || type.startsWith("set") || type === "get-full-state")
        ) {
          // Silently ignore these, as they are not meant for clients
          return;
        }        
        console.warn("[RELAY-CLIENT] Unknown message type:", type, message);
    }
  }

  /**
   * Update subscriptions with the relay server
   */
  _updateSubscriptions() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this._sendMessage({
        type: "subscription",
        action: "update",
        data: {
          subscriptions: this.subscriptions,
        },
      });
    }
  }

  /**
   * Handle navigation data from the relay server
   * De-nests the data structure and emits clean, simplified objects
   */
  _handleNavigationData(message) {
    // Enhanced logging to debug the data received
    // console.log('[RELAY-BRIDGE] Received navigation data from relay server");
    // console.log('[RELAY-BRIDGE] Raw message:", JSON.stringify(message));

    // The data is deeply nested in the structure:
    // { type: 'navigation', data: { type: 'navigation', data: { position: {...} } } }
    // We need to extract the actual data from this nested structure

    // First level unwrapping
    const outerData = message.data || {};
    // Second level unwrapping
    const innerData = outerData.data || {};

    // console.log('[RELAY-BRIDGE] Outer data:", JSON.stringify(outerData));
    // console.log('[RELAY-BRIDGE] Inner data:", JSON.stringify(innerData));

    // Extract position data from the correct location in the structure
    const positionData = innerData.position;
    // console.log('[RELAY-BRIDGE] Position data:", JSON.stringify(positionData));

    // Extract instrument data from the inner data
    // The instrument data might be nested similarly to position data
    // First, log all possible paths where we might find the data
    // console.log('[RELAY-BRIDGE] Exploring all possible data paths:');
    console.log("innerData:", JSON.stringify(innerData));

    // Check for speed over ground in all possible locations
    // console.log('[RELAY-BRIDGE] Checking for speedOverGround:');
    console.log("- innerData.speedOverGround:", innerData.speedOverGround);
    console.log(
      "- innerData.speed?.overGround:",
      innerData.speed && innerData.speed.overGround
    );
    console.log(
      "- innerData.course?.speedOverGround:",
      innerData.course && innerData.course.speedOverGround
    );
    console.log(
      "- outerData.speed?.overGround:",
      outerData.speed && outerData.speed.overGround
    );
    console.log(
      "- outerData.course?.speedOverGround:",
      outerData.course && outerData.course.speedOverGround
    );

    // Check for heading in all possible locations
    // console.log('[RELAY-BRIDGE] Checking for heading:');
    console.log("- innerData.headingMagnetic:", innerData.headingMagnetic);
    console.log(
      "- innerData.heading?.magnetic:",
      innerData.heading && innerData.heading.magnetic
    );
    console.log("- innerData.heading:", innerData.heading);

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

    // console.log('[RELAY-BRIDGE] Final instrument data:", JSON.stringify(instrumentData));

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
    // console.log('[RELAY-BRIDGE] Searching for wind data in all possible locations:');
    console.log("- innerData.wind:", JSON.stringify(innerData.wind));
    console.log("- outerData.wind:", JSON.stringify(outerData.wind));
    console.log("- message.data.wind:", JSON.stringify(message.data?.wind));
    console.log("- message.wind:", JSON.stringify(message.wind));

    // Also check for any properties containing "wind" in their name
    // console.log('[RELAY-BRIDGE] Checking for any wind-related properties in innerData:');
    Object.keys(innerData).forEach((key) => {
      if (key.toLowerCase().includes("wind")) {
        console.log(`- innerData.${key}:`, JSON.stringify(innerData[key]));
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
      // console.log('[RELAY-BRIDGE] Found wind data in navigation message:", JSON.stringify(cleanWindData));
      this.emit("env-wind", cleanWindData);
    } else {
      // console.log('[RELAY-BRIDGE] No wind data found in navigation message");
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
      // console.log('[RELAY-BRIDGE] Found depth data in navigation message:", JSON.stringify(cleanDepthData));
      this.emit("env-depth", cleanDepthData);
    }

    // Log what we're about to emit
    // console.log('[RELAY-BRIDGE] Emitting nav-position with:", JSON.stringify(cleanPositionData));
    // console.log('[RELAY-BRIDGE] Emitting nav-instruments with:", JSON.stringify(instrumentData));

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
    // console.log('[RELAY-BRIDGE] Received environment data from relay server");
    console.log(
      "[RELAY-BRIDGE] Raw environment message:",
      JSON.stringify(message)
    );

    // The data is likely nested in the same way as navigation data
    const outerData = message.data || {};
    const innerData = outerData.data || {};

    // console.log('[RELAY-BRIDGE] Environment outer data:", JSON.stringify(outerData));
    // console.log('[RELAY-BRIDGE] Environment inner data:", JSON.stringify(innerData));

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

    // console.log('[RELAY-BRIDGE] Extracted wind data:", JSON.stringify(windData));

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

      // console.log('[RELAY-BRIDGE] Emitting env-wind with:", JSON.stringify(cleanWindData));
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

      // console.log('[RELAY-BRIDGE] Emitting env-depth with:", JSON.stringify(cleanDepthData));
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

      // console.log('[RELAY-BRIDGE] Emitting env-temperature with:", cleanTempData);
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
      this._sendMessage({
        type: "command",
        service,
        action,
        data,
        timestamp: Date.now(),
      });
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
   * Disconnect from the relay server
   */
  disconnect() {
    // Stop heartbeat
    this._stopHeartbeat();

    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        console.warn(
          "[RELAY-CLIENT] Error closing socket during disconnect:",
          e
        );
      }
      this.socket = null;
    }

    this.isReconnecting = false;
    this.connectionState.status = "disconnected";
    this.emit("connection-status", this.connectionState);
    console.log('[RELAY-CLIENT] Disconnected from relay server');
  }
}

// Helper to ensure every outgoing message includes boatId
RelayConnectionBridge.prototype._sendMessage = function(message) {
  message.boatId = getActiveBoatId();
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
    this.socket.send(JSON.stringify(message));
  }
};

// Singleton instance
export const relayConnectionBridge = new RelayConnectionBridge();
