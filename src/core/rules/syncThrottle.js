export const SyncThrottleRules = [
    {
      id: 'underway-normal',
      condition: (state, env) => state === 'underway' && env.network.quality === 'good',
      actions: [{
        type: 'SET_SYNC_PROFILE',
        config: {
          navigation: { base: 2000, multipliers: { CRITICAL: 0.1, HIGH: 0.5 } },
          ais: { base: 5000, multipliers: { HIGH: 0.3 } }
        }
      }],
      priority: 30
    },
    {
      id: 'anchored-storm',
      condition: (state, env) => state === 'anchored' && env.weather.isStorming,
      actions: [{
        type: 'SET_SYNC_PROFILE',
        config: {
          anchor: { base: 1000, multipliers: { CRITICAL: 0, HIGH: 0.2 } },
          depth: { base: 30000 } // Every 30s during storm
        }
      }],
      priority: 45
    }
  ];