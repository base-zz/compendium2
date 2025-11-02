// StateUpdateProvider: abstracts source of updates for the store
// Handles hot swapping between direct (connectionBridge) and relay (relayConnectionAdapter)

import { relayConnectionAdapter } from "./relayConnectionAdapter";
import { directConnectionAdapter } from "./directConnectionAdapter";
import { createLogger } from "./logger";

const logger = createLogger("state-update-provider");

class StateUpdateProvider {
  constructor() {
    this.mode = null;
    this.subscribers = new Set();
    this.currentAdapter = null;
    this._listenerRefs = [];
    // Do not call switchSource here; smartConnectionManager will handle it
  }

  subscribe(cb) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb) {
    this.subscribers.delete(cb);
  }

  _notify(evt) {
    // Only log non-routine message types to reduce console noise
    // Uncomment for debugging:
    // if (evt?.type !== 'state:patch' && evt?.type !== 'state:full-update') {
    //   console.log(`[StateUpdateProvider] Received message type: ${evt?.type}`);
    // }
    logger.debug("Notifying subscribers of event type:", evt?.type);

    // Make sure the event has the expected structure
    if (!evt || !evt.type) {
      logger.warn("Invalid event received", { event: evt });
      return;
    }

    // Make a deep copy of the event to prevent mutation
    let eventCopy;
    try {
      eventCopy = JSON.parse(JSON.stringify(evt));
    } catch (err) {
      logger.error("Failed to clone event", { error: err.message, event: evt });
      return;
    }

    // Notify all subscribers
    const subscriberCount = this.subscribers.size;
    if (subscriberCount === 0) {
      logger.warn("No subscribers to notify");
      return;
    }

    logger.debug(`Notifying ${subscriberCount} subscribers`);
    let errorCount = 0;

    for (const cb of this.subscribers) {
      try {
        cb(eventCopy);
      } catch (err) {
        errorCount++;
        logger.error("Error in subscriber", {
          error: err.message,
          stack: err.stack,
          subscriberType: typeof cb === "function" ? "function" : typeof cb,
        });
      }
    }

    if (errorCount > 0) {
      logger.warn(
        `Encountered errors in ${errorCount} of ${subscriberCount} subscribers`
      );
    }
  }

  /**
   * Test the relay connection without switching to it
   * This allows us to verify if the relay connection works even when using direct mode
   * @returns {Promise<boolean>} - True if the relay connection test succeeded
   */
  async testRelayConnection() {
    logger.info("Testing relay connection...");
    try {
      // Get connection state before attempting
      const prevState =
        relayConnectionAdapter.connectionState?.status || "unknown";
      logger.info(`Relay connection state before attempt: ${prevState}`);

      // Log the relay server URL being used
      const relayUrl =
        relayConnectionAdapter.config?.relayServerUrl || "unknown";
      logger.info(`Using relay server URL: ${relayUrl}`);

      // Attempt to connect to the relay server
      const result = await relayConnectionAdapter.connect();

      // Get connection state after attempt
      const newState =
        relayConnectionAdapter.connectionState?.status || "unknown";
      logger.info(`Relay connection state after attempt: ${newState}`);

      logger.info(
        `Relay connection test result: ${result ? "SUCCESS" : "FAILED"}`
      );

      if (!result) {
        // Log the last error if available
        const lastError =
          relayConnectionAdapter.connectionState?.lastError ||
          "No error details available";
        logger.warn(`Relay connection failure reason: ${lastError}`);
      }

      return result;
    } catch (error) {
      logger.error(`Error testing relay connection: ${error.message}`, error);
      return false;
    }
  }

  async switchSource(mode) {
    // Only proceed if the mode is actually changing
    if (this.mode === mode) {
      logger.debug(`[STATE-PROVIDER] Already in ${mode} mode, skipping switch`);
      return;
    }

    logger.info(`[STATE-PROVIDER] Switching from ${this.mode || 'none'} to ${mode} mode...`);
    
    const previousMode = this.mode;
    const previousAdapter = this.currentAdapter;
    let switchSuccessful = false;

    try {
      // 1. Clean up all listeners before switching
      this._cleanupListeners();
      
      // 2. Set the new adapter before cleaning up the old one to avoid race conditions
      this.currentAdapter = mode === 'relay' ? relayConnectionAdapter : directConnectionAdapter;
      this.mode = mode;
      
      // 3. Clean up previous connection if it exists and is different from the new one
      if (previousAdapter && previousAdapter !== this.currentAdapter) {
        try {
          logger.info(`[STATE-PROVIDER] Cleaning up ${previousMode} connection...`);
          if (previousAdapter === directConnectionAdapter) {
            await previousAdapter.disconnect?.();
          } else {
            await previousAdapter.cleanup?.();
          }
        } catch (cleanupError) {
          logger.warn(`[STATE-PROVIDER] Error cleaning up ${previousMode} connection:`, cleanupError);
          // Continue with the switch even if cleanup fails
        }
      }
      
      // 4. Set up new listeners before connecting
      this._setupListeners();
      
      // 5. Connect to the new adapter if not already connected
      if (this.currentAdapter.connectionState?.status !== 'connected') {
        logger.info(`[STATE-PROVIDER] Connecting to ${mode} adapter...`);
        await this.currentAdapter.connect();
      }
      
      // 6. Verify the connection was successful
      if (this.currentAdapter.connectionState?.status === 'connected') {
        switchSuccessful = true;
        logger.info(`[STATE-PROVIDER] Successfully switched to ${mode} mode`);
        this._notify({ type: 'source-changed', source: mode });
      } else {
        throw new Error(`Failed to establish ${mode} connection`);
      }
      
    } catch (error) {
      logger.error(`[STATE-PROVIDER] Failed to switch to ${mode} mode:`, error);
      
      // If we were trying to switch to direct mode and it failed, fall back to relay
      if (mode === 'direct' && previousMode !== 'relay') {
        logger.warn('[STATE-PROVIDER] Falling back to relay mode due to direct connection failure');
        await this.switchSource('relay');
      } else if (!switchSuccessful) {
        // Only throw if we can't handle the error
        throw error;
      }
    }
  }

  async sendCommand(serviceName, action, data) {
    logger.info(`[StateUpdateProvider] Attempting to send command via current adapter (${this.mode || 'none'}):`, { serviceName, action, data: '...' });
    if (!this.currentAdapter) {
      logger.error('[StateUpdateProvider] No current adapter available to send command.');
      return false;
    }
    if (typeof this.currentAdapter.sendCommand !== 'function') {
      logger.error(`[StateUpdateProvider] currentAdapter (${this.mode}) does not have a sendCommand method.`);
      return false;
    }

    try {
      const result = await this.currentAdapter.sendCommand(serviceName, action, data);
      logger.info(`[StateUpdateProvider] Command sent by adapter (${this.mode}), result: ${result}`);
      return result;
    } catch (error) {
      logger.error(`[StateUpdateProvider] Error sending command via adapter (${this.mode}):`, error);
      return false;
    }
  }

  _setupListeners() {
    // Listen for unified navigation updates
    const navListener = (data) => this._notify({ type: "navigation", data });
    this.currentAdapter.on("navigation", navListener);
    this._listenerRefs.push({ event: "navigation", fn: navListener });

    // Listen for anchor updates
    const anchorListener = (data) => this._notify({ type: "anchor", data });
    this.currentAdapter.on("anchor", anchorListener);
    this._listenerRefs.push({ event: "anchor", fn: anchorListener });

    // Listen for vessel updates
    const vesselListener = (data) => this._notify({ type: "vessel", data });
    this.currentAdapter.on("vessel-update", vesselListener);
    this._listenerRefs.push({ event: "vessel-update", fn: vesselListener });

    // Listen for environment updates
    const environmentListener = (data) =>
      this._notify({ type: "environment", data });
    this.currentAdapter.on("environment", environmentListener);
    this._listenerRefs.push({ event: "environment", fn: environmentListener });

    // Listen for specific environment subdomain (e.g., temperature)
    const envTempListener = (data) =>
      this._notify({ type: "env-temperature", data });
    this.currentAdapter.on("env-temperature", envTempListener);
    this._listenerRefs.push({ event: "env-temperature", fn: envTempListener });

    const preferencesListener = (payload) => {
      if (!payload) {
        return;
      }

      const event = payload.type === "preferences:update"
        ? payload
        : { type: "preferences:update", preferences: payload.preferences ?? payload, timestamp: payload.timestamp ?? Date.now() };

      this._notify(event);
    };
    this.currentAdapter.on("preferences:update", preferencesListener);
    this._listenerRefs.push({ event: "preferences:update", fn: preferencesListener });

    // Listen for patch-update events (incremental patches)
    const patchUpdateListener = (data) =>
      this._notify({ type: "patch-update", data });
    this.currentAdapter.on("patch-update", patchUpdateListener);
    this._listenerRefs.push({ event: "patch-update", fn: patchUpdateListener });

    // Listen for native state events
    const fullUpdateListener = (msg) => this._notify(msg);
    this.currentAdapter.on("state:full-update", fullUpdateListener);
    this._listenerRefs.push({
      event: "state:full-update",
      fn: fullUpdateListener,
    });

    const patchListener = (msg) => this._notify(msg);
    this.currentAdapter.on("state:patch", patchListener);
    this._listenerRefs.push({ event: "state:patch", fn: patchListener });

    // Add more as needed for other domains
  }

  _cleanupListeners() {
    if (!this.currentAdapter) {
      this._listenerRefs = [];
      return;
    }
    
    logger.debug(`[STATE-PROVIDER] Cleaning up ${this._listenerRefs.length} listeners...`);
    
    this._listenerRefs.forEach(({ event, fn }) => {
      try {
        if (typeof this.currentAdapter.off === 'function') {
          this.currentAdapter.off(event, fn);
        } else if (this.currentAdapter.removeListener) {
          this.currentAdapter.removeListener(event, fn);
        }
      } catch (error) {
        logger.warn(`[STATE-PROVIDER] Error removing listener for event '${event}':`, error);
      }
    });
    
    this._listenerRefs = [];
    logger.debug('[STATE-PROVIDER] All listeners cleaned up');
  }
}

export const stateUpdateProvider = new StateUpdateProvider();
