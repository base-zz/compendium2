declare interface Rule {
    id: string;
    condition: (state: string, env: Environment) => boolean;
    actions: RuleAction[];
    priority: number;
  }
  
  declare interface RuleAction {
    type: 'SET_SYNC_PROFILE' | 'CREW_ALERT' | 'LOG_EVENT';
    config?: SyncProfile;
    message?: string;
  }
  
  declare interface Environment {
    weather: {
      isStorming: boolean;
      visibility: number; // meters
    };
    tides: {
      nextLow: number; // meters
      nextHigh: number;
    };
    network: {
      quality: 'offline' | 'poor' | 'good' | 'satellite';
    };
  }