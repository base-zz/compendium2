/**
 * StateManager
 * 
 * Manages the state of the vessel and determines throttling profiles
 * based on rule evaluations.
 */
import EventEmitter from 'events';
import jsonPatch from 'fast-json-patch';
const { observe: jsonPatchObserve, generate: jsonPatchGenerate } = jsonPatch;
import { stateData } from '../../../../server/state/StateData.js';

export class StateManager extends EventEmitter {
  constructor(ruleEngine) {
    super();
    this.ruleEngine = ruleEngine;
    this.currentState = stateData; // Use the whole exported object
    this.observer = jsonPatchObserve(this.currentState);
    console.log('[STATE MANAGER] StateManager initialized with StateData (observer pattern)');
    // console.log('[DEBUG] StateData instance UUID in StateManager:', stateData.INSTANCE_UUID);
  }

  // Call this to wire StateManager to stateData updates
  attachToStateData() {
    console.log('[STATE MANAGER] Attaching StateManager to StateData');
    // No-op: stateData is not an EventEmitter, so nothing to attach here.
    // State changes are tracked via jsonPatch observer.
  }

  // Handles state updates from StateData
  handleStateUpdate(newState) {
    // Only log a summary if there are actual state changes
    const patch = jsonPatchGenerate(this.observer);
    if (patch && patch.length > 0) {
      this.stateUpdateCount++;
      console.info(`[StateManager] Emitting state-update event with ${patch.length} changes at ${Date.now()}`);
      this.emit('state-update', patch);
      // Run rules if enabled
      const actions = this.ruleEngine.evaluate(this.currentState);
      actions.forEach(action => this.emit('rule-action', action));
    }
  }

  /**
   * Get the current state
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.currentState };
  }

  /**
   * Get the current throttle profile
   * @returns {string} Current throttle profile
   */
  getThrottleProfile() {
    return this.currentState.throttleProfile;
  }
}
