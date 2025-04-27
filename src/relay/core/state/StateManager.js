import { EventEmitter } from 'events';
import { AllRules } from './rules.js';
import { RuleEngine } from './ruleEngine.js';

class StateManager extends EventEmitter {
  getState() {
    const state = { ...(this.appState || {}) };
    // console.log('[StateManager] getState called, returning:', state);
    return state;
  }
  constructor(initialState = {}) {
    super();
    this.appState = initialState || {}; // Always ensure appState is an object
    this.ruleEngine = new RuleEngine(AllRules);
    this.currentProfile = this._createDefaultProfile();
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
    // console.log('[StateManager] appState after update:', this.appState);
    // Emit a shallow copy for safety
    this.emit('state-updated', { ...this.appState });
  }

  updateState(newState, env = {}) {
    const actions = this.ruleEngine.evaluate(newState, env);
    
    actions.forEach(action => {
      switch (action.type) {
        case 'SET_SYNC_PROFILE':
          this._applySyncProfile(action.config);
          break;
        case 'CREW_ALERT':
          this._sendCrewAlert(action.message);
          break;
      }
    });

    this.emit('profile-updated', this.currentProfile);
  }

  _applySyncProfile(config) {
    Object.entries(config).forEach(([dataType, settings]) => {
      this.currentProfile[dataType] = { 
        ...this.currentProfile[dataType], 
        ...settings 
      };
    });
  }

  _createDefaultProfile() {
    return {
      navigation: { base: 5000, multipliers: { CRITICAL: 0.2, HIGH: 0.8 } },
      anchor: { base: 10000 },
      depth: { base: 60000 },
      ais: { base: 10000 }
    };
  }
}

export const stateManager = new StateManager();
