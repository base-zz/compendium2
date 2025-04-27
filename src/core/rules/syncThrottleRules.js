// core/rules/syncThrottleRules.js
export const SyncThrottleRules = [
    {
      condition: (state, env) => state === 'underway',
      actions: [
        {
          type: 'setSyncProfile',
          config: {
            navigation: {
              baseFrequency: 2000, // 2s
              priorityMultipliers: {
                CRITICAL: 0.1,  // 200ms
                HIGH: 0.5,       // 1s
                NORMAL: 1        // 2s
              }
            }
          }
        }
      ],
      priority: 20
    },
    {
      condition: (state, env) => 
        state === 'anchored' && 
        env.weather.isStorming,
      actions: [
        {
          type: 'setSyncProfile',
          config: {
            anchor: {
              baseFrequency: 5000, // 5s (normally 10s)
              priorityMultipliers: {
                CRITICAL: 0,       // Instant
                HIGH: 0.2,         // 1s
                NORMAL: 0.5        // 2.5s
              }
            }
          }
        }
      ],
      priority: 40 // Higher than default
    }
  ];