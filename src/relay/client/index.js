import { relayConnectionBridge } from './RelayConnectionBridge';

/**
 * Main entry point for the relay client
 */
async function initializeRelayClient() {
  try {
    console.log('[RELAY-CLIENT] Initializing relay client...');
    
    // Connect to the relay server
    await relayConnectionBridge.connect();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('[RELAY-CLIENT] Relay client initialized successfully');
    
    return relayConnectionBridge;
  } catch (error) {
    console.error('[RELAY-CLIENT] Failed to initialize relay client:', error);
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

// If this file is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeRelayClient();
}

export { initializeRelayClient };
