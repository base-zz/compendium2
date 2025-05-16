// Browser-only copy of StateData for client use
import EventEmitter from 'events';
import { UNIT_PRESETS } from '@/shared/unitPreferences.js';
import { createStateDataModel } from '@/shared/stateDataModel.js';
import { EVENTS } from '../shared/constants.js';

class StateData extends EventEmitter {
  constructor() {
    super();
    
    // Create state from shared model with default unit system
    // This will be overridden by user preferences when loaded
    this.state = createStateDataModel(UNIT_PRESETS.IMPERIAL);
  }

  // Add get(path) method for compatibility
  get(path) {
    // Support dot notation, e.g., 'navigation.position'
    return path.split('.').reduce((obj, key) => (obj ? obj[key] : undefined), this.state);
  }
}

StateData.EVENTS = EVENTS;
const stateData = new StateData();

export { stateData, StateData };
