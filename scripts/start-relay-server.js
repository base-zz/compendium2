#!/usr/bin/env node

/**
 * Start Relay Server
 * 
 * This script starts the local relay server that connects to SignalK
 * and forwards data to the VPS relay proxy.
 */

import { startRelayServer } from '../src/relay/server/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get configuration from environment variables
const SIGNALK_URL = process.env.SIGNALK_URL || 'http://localhost:3000/signalk';

// Set environment variables for the relay server
process.env.SIGNALK_URL = SIGNALK_URL;
process.env.PORT = process.env.RELAY_PORT || '3002';
process.env.DEBUG = process.env.DEBUG || 'false';

console.log('\n=== RELAY SERVER CONFIGURATION ===');
console.log(`SignalK URL: ${SIGNALK_URL}`);
console.log(`Relay Port: ${process.env.PORT}`);
console.log(`Debug Mode: ${process.env.DEBUG === 'true' ? 'Enabled' : 'Disabled'}`);
console.log('==================================\n');

// Start the relay server
async function main() {
  try {
    console.log('Starting relay server...');
    await startRelayServer();
    console.log('✅ Relay server started successfully');
    console.log(`🔌 Connected to SignalK at ${SIGNALK_URL}`);
    console.log(`🌐 WebSocket server listening on port ${process.env.PORT}`);
    
    console.log('\n🚢 Relay server is running and ready for connections');
    console.log('Press Ctrl+C to stop the server');
  } catch (error) {
    console.error('Failed to start relay server:', error);
    process.exit(1);
  }
}

// Run the main function
main();
