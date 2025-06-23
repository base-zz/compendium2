import { relayConnectionBridge } from './RelayConnectionBridge';

/**
 * Main entry point for the relay client
 */
async function initializeRelayClient() {
  console.log('[RELAY-CLIENT] Initializing relay client...');
  
  try {
    // Log the relay server URL being used
    const relayUrl = relayConnectionBridge.config?.relayServerUrl || 'not set';
    console.log(`[RELAY-CLIENT] Using relay server URL: ${relayUrl}`);
    
    console.log('[RELAY-CLIENT] Attempting to connect to relay server...');
    // Connect to the relay server
    await relayConnectionBridge.connect();
    
    console.log('[RELAY-CLIENT] Connection established, setting up event listeners...');
    // Set up event listeners
    setupEventListeners();
    
    console.log('[RELAY-CLIENT] Relay client initialized successfully');
    
    return relayConnectionBridge;
  } catch (error) {
    console.error('[RELAY-CLIENT] Failed to initialize relay client:', error);
    if (error.response) {
      console.error('[RELAY-CLIENT] Error response data:', error.response.data);
      console.error('[RELAY-CLIENT] Error status:', error.response.status);
      console.error('[RELAY-CLIENT] Error headers:', error.response.headers);
    } else if (error.request) {
      console.error('[RELAY-CLIENT] No response received:', error.request);
    } else {
      console.error('[RELAY-CLIENT] Error message:', error.message);
    }
    console.error('[RELAY-CLIENT] Error stack:', error.stack);
    throw error;
  }
}

/**
 * Set up event listeners for the relay client
 */
function setupEventListeners() {
  // Listen for connection status changes
  relayConnectionBridge.on('connection-status', (status) => {
    console.log('[RELAY-CLIENT] Connection status:', status);
  });
  
  // Listen for navigation data
  relayConnectionBridge.on('nav-position', (position) => {
    console.log('[RELAY-CLIENT] Received position update:', position);
    // Update UI or state with position data
  });
  
  relayConnectionBridge.on('nav-instruments', (instruments) => {
    console.log('[RELAY-CLIENT] Received instruments update:', instruments);
    // Update UI or state with instruments data
  });
  
  // Listen for vessel data
  relayConnectionBridge.on('vessel-update', (vessel) => {
    console.log('[RELAY-CLIENT] Received vessel update:', vessel);
    // Update UI or state with vessel data
  });
  
  // Listen for alert data
  relayConnectionBridge.on('signalk-alert', (alert) => {
    console.log('[RELAY-CLIENT] Received SignalK alert:', alert);
    // Handle SignalK alert
  });
  
  relayConnectionBridge.on('user-alert', (alert) => {
    console.log('[RELAY-CLIENT] Received user alert:', alert);
    // Handle user alert
  });
}


export { initializeRelayClient };
