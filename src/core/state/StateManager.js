import { EventEmitter } from 'events';
import { AllRules } from './rules';
import { RuleEngine } from './ruleEngine';

export class StateManager extends EventEmitter {
  constructor() {
    super();
    this.ruleEngine = new RuleEngine(AllRules);
    this.currentProfile = this._createDefaultProfile();
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