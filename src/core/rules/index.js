import { SyncThrottleRules } from './syncThrottle';
import { TidalRules } from './tidal';
import { EmergencyRules } from './emergency';

export const AllRules = [
  ...EmergencyRules,    // Highest priority (100+)
  ...SyncThrottleRules, // Medium priority (20-50)
  ...TidalRules         // Environmental rules (10-30)
];