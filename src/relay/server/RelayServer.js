import EventEmitter from "events";
import { stateManager } from '../core/state/StateManager.js'; // Canonical StateManager instance
import { RuleEngine } from "./core/state/ruleEngine.js";
import { AllRules } from "./core/state/rules.js";
import { syncOrchestrator } from "./core/sync/SyncOrchestrator.js";
import { VPSConnector } from "./services/VPSConnector.js"; // Use class, not singleton
import { getOrCreateAppUuid } from "../../server/uniqueAppId.js";

const boatId = getOrCreateAppUuid();

/**
 * RelayServer
 *
 * A server-side process that intermediates between SignalK and VPS.
 * It throttles data based on priority and importance to reduce VPS load.
 */
export class RelayServer extends EventEmitter {
  constructor(config = {}) {
    super();

    // All config must be passed in; do not access process.env here
    if (!config.port) throw new Error("RelayServer: port must be provided in config");
    this.config = { ...config };
    this.stateManager = stateManager;

    // console.log(`[RELAY] Using SignalK URL: ${this.config.signalKUrl}`);
    // console.log(
//   `[RELAY] Initializing relay server with port ${this.config.port}`
// );

    this.clients = new Map(); // Minimal client management


    // Initialize VPSConnector with config
    this.vpsConnector = new VPSConnector({
      tokenSecret: this.config.tokenSecret,
      vpsUrl: this.config.vpsUrl,
      // Add any other VPSConnector config here
    });

    // Use the SyncOrchestrator for adaptive throttling
    this.syncOrchestrator = syncOrchestrator;

    // Listen for state changes to update throttle profile
    this.stateManager.on("state-changed", (newState) => {
      if (newState.throttleProfile) {
        this.syncOrchestrator.updateThrottleProfile(newState.throttleProfile);
      }
    });

    // Listen for canonical state updates from StateManager and relay to clients
    stateManager.on('state-updated', (appState) => {
      this._sendToClients('state-update', appState);
    });
  }

  /**
   * Initialize the relay server
   */
  async initialize() {
    try {
      console.log("[RELAY] Initializing relay server");
      // Connect to the VPS Relay Proxy
      console.log("[RELAY] Connecting to VPS Relay Proxy");
      try {
        await this.vpsConnector.connect();
      } catch (error) {
        console.error("[RELAY] Failed to connect to VPS Relay Proxy:", error);
        throw error;
      }

      // Set up event listeners for VPS connection
      this.vpsConnector.on("connected", () => {
        console.log("[RELAY] Connected to VPS Relay Proxy");
        this.emit("vps-connected");
      });

      this.vpsConnector.on("disconnected", () => {
        console.log("[RELAY] Disconnected from VPS Relay Proxy");
        this.emit("vps-disconnected");
      });

      this.vpsConnector.on("error", (error) => {
        console.error("[RELAY] VPS connection error:", error);
        console.error("[RELAY] VPS connection error details:", {
          message: error.message,
          code: error.code,
          stack: error.stack,
        });
        this.emit("vps-error", error);
      });

      this.vpsConnector.on("max-retries", () => {
        console.error("[RELAY] Maximum VPS connection retries reached");
        this.emit("vps-max-retries");
      });

      // Set up server
      this._setupServer();

      console.log(
        `[RELAY] Relay server initialized and running on port ${this.config.port}`
      );
      this.emit("initialized");

      return true;
    } catch (error) {
      console.error("[RELAY] Initialization failed:", error);
      this.emit("error", error);
      throw error;
    }
  }

  // Then add this method to the class:
  // Port validation is now handled by the entry point; this method is not needed


  // No longer needed (all updates are handled via unified state-update)
  _setupDataStreams() {}

  // No longer needed (all updates are handled via unified state-update)
  _setupThrottling() {}

  /**
   * Set up the server to handle client connections
   */
  _setupServer() {
    // This is now implemented with a WebSocket server in WebSocketServer.js

    // Set up event listeners for VPS messages
    this.vpsConnector.on("message", (message) => {
      console.log(
        "[RELAY] Received message from VPS Relay Proxy:",
        JSON.stringify(message)
      );

      /**
       * Full State Sync Relay Handler
       * ---------------------------------------------
       * When a client requests the full vessel state via the VPS relay proxy,
       * the VPS forwards a `{ type: 'get-full-state', boatId }` message to this relay server.
       *
       * This handler responds by fetching the current unified state from the StateManager
       * and sending a `{ type: 'full-state', data, boatId, timestamp }` message back to the VPS relay proxy.
       *
       * The VPS relay proxy then relays this message to the original client.
       *
       * This enables secure, authenticated, and isolated state sync for each boat/user,
       * while keeping the VPS stateless and scalable.
       *
       * All messages must include the correct `boatId` for proper routing.
       *
       * See documentation for full architecture details.
       */
      // Handle request-full-state and get-full-state requests from VPS relay proxy
      if (message && (message.type === 'request-full-state' || message.type === 'get-full-state')) {
        const fullState = this.stateManager.getState();
        const response = {
          type: 'full-state',
          data: fullState,
          boatId: boatId,
          timestamp: Date.now()
        };
        this.vpsConnector.send(response);
        console.log(`[RELAY] Responded to ${message.type} with full state`);
        return;
      }

      if (message && message.type) {
        // Forward the message to clients
        this.emit("dataToSend", message);
        console.log(`[RELAY] Forwarding ${message.type} data from VPS to clients`);
      } else if (message && message.status) {
        // Handle status/control messages gracefully
        // console.log("[RELAY] VPS status/control message:", message);
      } else {
        // Only warn for truly unexpected messages
        // console.warn(
    //   "[RELAY] Received unknown or malformed message from VPS Relay Proxy:",
    //   message
    // );
      }
    });

    // console.log("[RELAY] Server setup complete");
  }

    /**
   * Send unified state-update patch to connected clients and VPS Relay Proxy
   * @note boatId must be provided in config (e.g., via environment variable BOAT_ID)
   */
  _sendToClients(event, data) {
    // console.log(`[DEBUG][RelayServer] _sendToClients called for event=${event}`);
    // // console.log(`[RELAY][DEBUG] Sending to clients: event=${event}, data=${JSON.stringify(data)}`);
    if (event !== "state-update") return;
    const message = {
      type: 'state-update',
      data: data,
      timestamp: Date.now(),
      boatId: boatId // Ensure boatId is included in every message
    };

    // Send to VPS
    if (this.vpsConnector && this.vpsConnector.connected) {
      this._vpsOutboundCount = (this._vpsOutboundCount || 0) + 1;
      this.vpsConnector.send(message);
      // Optionally, log every 100 messages or every N seconds
      if (this._vpsOutboundCount % 100 === 0) {
        console.info(`[VPS-OUTBOUND] Sent ${this._vpsOutboundCount} messages so far at ${new Date().toISOString()}`);
      }
    }
    // Send to all connected WebSocket clients (if managed here)
    if (this.clients) {
      this.clients.forEach((client) => {
        if (client && client.readyState === 1 && client.send) {
          client.send(JSON.stringify(message));
        }
      });
    }
    // Emit for any listeners (e.g., WebSocketServer)
    this.emit("dataToSend", message);
  }

  /**
   * Add a client connection
   */
  addClient(clientId, subscriptions = ["navigation", "vessel", "alerts"]) {
    this.clients.set(clientId, {
      id: clientId,
      subscriptions,
      connected: Date.now(),
    });

    console.log(
      `[RELAY] Client ${clientId} connected with subscriptions: ${subscriptions.join(
        ", "
      )}`
    );
    return clientId;
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId) {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      console.log(`[RELAY] Client ${clientId} disconnected`);
      return true;
    }
    return false;
  }

  /**
   * Update client subscriptions
   */
  updateClientSubscriptions(clientId, subscriptions) {
    if (this.clients.has(clientId)) {
      this.clients.get(clientId).subscriptions = subscriptions;
      console.log(
        `[RELAY] Updated subscriptions for client ${clientId}: ${subscriptions.join(
          ", "
        )}`
      );

      if (process.env.DEBUG === "true") {
        console.log(
          `[RELAY-DEBUG] Client ${clientId} subscriptions updated:`,
          JSON.stringify(this.clients.get(clientId))
        );
        console.log(
          `[RELAY-DEBUG] Total clients with subscriptions:`,
          this.clients.size
        );
        // Log all clients and their subscriptions
        this.clients.forEach((c, id) => {
          console.log(
            `[RELAY-DEBUG] Client ${id} subscriptions:`,
            c.subscriptions.join(", ")
          );
        });
      }

      return true;
    }
    return false;
  }

  /**
   * Shutdown the relay server
   */
  shutdown() {
    console.log("[RELAY] Shutting down relay server");

    // Clean up connections
    this.clients.clear();

    // Disconnect from VPS Relay Proxy
    if (this.vpsConnector && this.vpsConnector.connected) {
      console.log("[RELAY] Disconnecting from VPS Relay Proxy");
      this.vpsConnector.disconnect();
    }

    console.log("[RELAY] Relay server shut down");
    this.emit("shutdown");
  }
}

