export class SyncOrchestrator {
    constructor(stateManager) {
      this.stateManager = stateManager;
      this.activeThrottles = new Map();
  
      stateManager.on('profile-updated', profile => {
        this._updateAllThrottles(profile);
      });
    }
  
    createThrottleStream(dataType, source$) {
      const throttle$ = new BehaviorSubject(1000); // Default
      
      this.activeThrottles.set(dataType, {
        stream: source$.pipe(
          switchMap(data => 
            throttle$.pipe(
              throttleTime(interval => interval),
              map(() => data)
            )
          )
        ),
        update: (interval) => throttle$.next(interval)
      });
  
      return this.activeThrottles.get(dataType).stream;
    }
  
    _updateAllThrottles(profile) {
      Object.entries(profile).forEach(([dataType, config]) => {
        if (this.activeThrottles.has(dataType)) {
          const base = config.base || 5000;
          this.activeThrottles.get(dataType).update(base);
        }
      });
    }
  
    getThrottleInterval(dataType, priority = 'NORMAL') {
      const config = this.stateManager.currentProfile[dataType];
      if (!config) return 5000; // Fallback
      
      const base = config.base || 5000;
      const multiplier = config.multipliers?.[priority] || 1;
      return base * multiplier;
    }
  }