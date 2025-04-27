export const TidalRules = [
  {
    id: 'low-tide-anchored',
    condition: (state, env) => 
      state === 'anchored' && 
      env.tides.nextLow < 1.0, // < 1m tide
    actions: [
      {
        type: 'SET_SYNC_PROFILE',
        config: {
          depth: { base: 15000 }, // 15s checks
          alerts: { multipliers: { CRITICAL: 0 } } // Instant
        }
      },
      {
        type: 'CREW_ALERT',
        message: 'Low tide warning'
      }
    ],
    priority: 25
  }
];