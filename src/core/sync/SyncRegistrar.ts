import { syncManager } from './syncManager';
import { AnchorProvider } from './providers/AnchorProvider';
import { NavigationProvider } from './providers/NavigationProvider';
import { AlertsProvider } from './providers/AlertsProvider';

// Register providers
syncManager.registerProvider(
  'anchor', 
  new AnchorProvider(),
  { debounceMs: 2000 } // Slower updates for position
);

syncManager.registerProvider(
  'navigation',
  new NavigationProvider(),
  { batchInterval: 60000 } // 1min updates in batch mode
);

syncManager.registerProvider(
  'alerts',
  new AlertsProvider()
);

// Initialize based on connection
// Determine if we're on a boat by checking if we're connecting to a local SignalK server
const isOnBoat = process.env.SIGNALK_URL?.includes('localhost') || process.env.SIGNALK_URL?.includes('192.168.') || false;
syncManager.setSyncMode(isOnBoat ? 'realtime' : 'batch');