import { EventEmitter } from "events";
import { AllRules } from "./rules.js";
import { RuleEngine } from "./ruleEngine.js";
import { getOrCreateAppUuid } from "../../../server/uniqueAppId.js";
import { stateData } from "../../../server/state/StateData.js";

// import { applyPatch } from 'fast-json-patch';
import pkg from "fast-json-patch";
const { applyPatch } = pkg;

export class StateManager extends EventEmitter {
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
    // Initialize with stateData's state which already has all structures
    this.appState = structuredClone(stateData.state); 
    this.ruleEngine = new RuleEngine(AllRules);
    this.currentProfile = this._createDefaultProfile();
    this._boatId = getOrCreateAppUuid();
    this._clientCount = 0;
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
      // Get fresh state with all structures
      const currentState = stateData.state;
      
      // Filter out any altitude-related operations first
      const filteredPatch = patch.filter(operation => {
        return !operation.path.includes('altitude');
      });

      // Validate remove operations against the canonical state
      const validPatch = filteredPatch.filter(operation => {
        if (operation.op === 'remove') {
          return this._pathExists(currentState, operation.path);
        }
        return true;
      });
  
      if (validPatch.length === 0) return;
  
      // Apply to both our local state and the canonical state
      applyPatch(this.appState, validPatch, true, false);
      applyPatch(currentState, validPatch, true, false);
      
      this.updateState(this.appState);
      
      // Always emit patch events for direct server
      this.emit("state:patch", {
        type: "state:patch",
        data: validPatch,
        boatId: this._boatId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("[StateManager] Patch error:", error);
      this.emit("error:patch-error", { error, patch });
    }
  }
  
  // Helper remains the same
  _pathExists(obj, path) {
    const parts = path.split('/').filter(p => p);
    let current = obj;
    for (const part of parts) {
      if (!current || typeof current !== 'object' || !(part in current)) {
        return false;
      }
      current = current[part];
    }
    return true;
  }
  

  /**
   * Emit the full state to clients.
   * Emits 'state:full-update' with the full appState object.
   */
  emitFullState() {
    // Always emit full state updates regardless of client count
    console.log('[StateManager] Emitting full state update');
    
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
    if (!update || typeof update !== 'object') {
      console.warn('[StateManager] Invalid update received:', update);
      return;
    }
  
    // Debug logging
    console.log('[StateManager] Applying domain update:', JSON.stringify(update));
  
    // Use stateData's batchUpdate to ensure proper structure handling
    const success = stateData.batchUpdate(update);
    if (!success) {
      console.error('[StateManager] Failed to apply batch update');
      return;
    }
  
    // Refresh our local state with proper structure
    this.appState = structuredClone(stateData.state);
  
    // Debug logging
    console.log('[StateManager] State after update:', 
      JSON.stringify({
        anchor: this.appState.anchor, // Just log anchor instead of full state
        updateSize: Object.keys(update).length
      })
    );
  
    if (!this.appState.anchor) {
      console.warn('[StateManager] Anchor missing after update!');
    }
  
    // Only emit if clients are connected
    if (this._clientCount > 0) {
      this.emit("state:full-update", {
        type: "state:full-update",
        data: this.appState,
        boatId: this._boatId,
        role: "boat-server",
        timestamp: Date.now(),
      });
    } else {
      console.debug('[StateManager] Suppressing emission - no clients connected');
    }
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
