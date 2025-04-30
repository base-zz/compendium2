import { EventEmitter } from "events";
import { AllRules } from "./rules.js";
import { RuleEngine } from "./ruleEngine.js";
import { getOrCreateAppUuid } from "../../../server/uniqueAppId.js";
import { stateData } from "../../../server/state/StateData.js";

// import { applyPatch } from 'fast-json-patch';
import pkg from "fast-json-patch";
const { applyPatch } = pkg;

class StateManager extends EventEmitter {
  getState() {
    const state = { ...(this.appState || {}) };
    // console.log('[StateManager] getState called, returning:', state);
    return state;
  }

  /**
   * Get the boat ID
   * @returns {string} - The boat ID
   */
  get boatId() {
    return this._boatId;
  }

  /**
   * Get the client count
   * @returns {number} - The client count
   */
  get clientCount() {
    return this._clientCount;
  }

  constructor(initialState = {}) {
    super();
    this.appState = initialState || {}; // Always ensure appState is an object
    this.ruleEngine = new RuleEngine(AllRules);
    this.currentProfile = this._createDefaultProfile();
    this._boatId = getOrCreateAppUuid();
    this._clientCount = 0; // Track connected clients
  }

  /**
   * Apply a JSON patch (RFC 6902) to the managed state and emit to clients.
   * Emits 'state:patch' with the patch array.
   * Triggers rule evaluation after patch is applied.
   * @param {Array} patch - JSON patch array
   */
  applyPatchAndForward(patch) {
    if (!Array.isArray(patch) || patch.length === 0) return;
    
    try {
      // Apply the patch locally
      applyPatch(this.appState, patch, true);
      this.updateState(this.appState); // Ensure rules are evaluated after patch
      
      const payload = {
        type: "state:patch",
        data: patch,
        boatId: this._boatId,
        role: "boat-server",
        timestamp: Date.now(),
      };
      // console.log('[StateManager] Emitting patch:', payload);
      this.emit("state:patch", payload);
    } catch (error) {
      console.error("[StateManager] Failed to apply patch:", error);
      this.emit("error:patch-error", {
        error,
        patch,
        boatId: this._boatId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Emit the full state to clients.
   * Emits 'state:full-update' with the full appState object.
   */
  emitFullState() {
    // Emit with boatId and timestamp at the base
    const payload = {
      type: "state:full-update",
      data: this.appState,
      boatId: this._boatId,
      role: "boat-server",
      timestamp: Date.now(),
    };
    
    if (!this.appState.anchor) {
      console.warn(
        "[StateManager] WARNING: anchor is missing from outgoing state!"
      );
    }
    this.emit("state:full-update", payload);
  }

  /**
   * Merge a domain update (e.g., from StateData/SignalK) into the unified appState.
   * Emits 'state-updated' after merging.
   * @param {Object} update - Partial state update (e.g., { signalK: ... })
   */
  applyDomainUpdate(update) {
    // console.log('[StateManager] applyDomainUpdate called with:', update);
    // Simple shallow merge; replace with deep merge if needed
    Object.assign(this.appState, update);
    console.log(
      "[StateManager] appState after update:",
      JSON.stringify(this.appState)
    );
    if (!this.appState.anchor) {
      console.warn(
        "[StateManager] WARNING: anchor is missing from appState after update!"
      );
    } else {
      console.log(
        "[StateManager] Updated anchor after domain update:",
        JSON.stringify(this.appState.anchor)
      );
    }
    
    // Always emit updates regardless of client count
    // The VPSConnector will decide whether to actually send the message
    
    // Emit with boatId and timestamp at the base
    this.emit("state:full-update", {
      type: "state:full-update",
      data: this.appState,
      boatId: this._boatId,
      role: "boat-server",
      timestamp: Date.now(),
    });
  }

  updateState(newState, env = {}) {
    const actions = this.ruleEngine.evaluate(newState, env);

    actions.forEach((action) => {
      switch (action.type) {
        case "SET_SYNC_PROFILE":
          this._applySyncProfile(action.config);
          break;
        case "CREW_ALERT":
          this._sendCrewAlert(action.message);
          break;
      }
    });

    this.emit("profile-updated", {
      profile: this.currentProfile,
      boatId: this._boatId,
      timestamp: Date.now(),
    });
  }

  // Add a method to update client count
  updateClientCount(count, forceSendUpdate = false) {
    const previousCount = this._clientCount;
    this._clientCount = count;
    console.log(
      `[StateManager] Client count updated: ${previousCount} -> ${count}`
    );
  
    // If client count changed from 0 to positive, send full state
    if ((previousCount === 0 && count > 0) || forceSendUpdate) {
      console.log("[StateManager] Clients connected, sending full state");
      this.emitFullState();
    }
  }

  _applySyncProfile(config) {
    Object.entries(config).forEach(([dataType, settings]) => {
      this.currentProfile[dataType] = {
        ...this.currentProfile[dataType],
        ...settings,
      };
    });
  }

  _createDefaultProfile() {
    return {
      navigation: { base: 5000, multipliers: { CRITICAL: 0.2, HIGH: 0.8 } },
      anchor: { base: 10000 },
      depth: { base: 60000 },
      ais: { base: 10000 },
    };
  }
}

export const stateManager = new StateManager(stateData.state);
