/**
 * Rules for the state manager to determine throttling profiles
 */
export const AllRules = [
  // Rule for vessel underway at high speed
  {
    name: 'High Speed Navigation',
    condition: (state) => state.speed > 10 && state.navigationStatus === 'UNDERWAY',
    action: {
      type: 'SET_THROTTLE_PROFILE',
      profile: 'HIGH_SPEED'
    }
  },
  
  // Rule for vessel at anchor
  {
    name: 'At Anchor',
    condition: (state) => state.anchorStatus === 'DOWN',
    action: {
      type: 'SET_THROTTLE_PROFILE',
      profile: 'ANCHORED'
    }
  },
  
  // Default rule for normal operation
  {
    name: 'Default Operation',
    condition: () => true, // Always matches as a fallback
    action: {
      type: 'SET_THROTTLE_PROFILE',
      profile: 'NORMAL'
    }
  }
];
