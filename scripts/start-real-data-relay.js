#!/usr/bin/env node

/**
 * Start Real Data Relay
 * 
 * This script starts the relay server with a connection to your real SignalK server.
 * It configures the environment variables correctly to ensure no mock or demo data is used.
 */

import { startRelayServer } from '../src/relay/server/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set the SignalK URL to your real server
// Replace this with your actual SignalK server URL
const REAL_SIGNALK_URL = 'ws://localhost:3000/signalk/v1/stream';

// Set environment variables for the relay server
process.env.SIGNALK_URL = REAL_SIGNALK_URL;
process.env.PORT = process.env.RELAY_PORT || '3002';
process.env.DEBUG = 'true'; // Enable debug mode to see more logs

console.log('\n=== REAL DATA RELAY SERVER CONFIGURATION ===');
console.log(`SignalK URL: ${REAL_SIGNALK_URL}`);
console.log(`Relay Port: ${process.env.PORT}`);
console.log(`Debug Mode: Enabled`);
console.log('============================================\n');

// Start the relay server
async function main() {
  try {
    console.log('Starting relay server with real data connection...');
    await startRelayServer();
    console.log('✅ Relay server started successfully');
    console.log(`🔌 Connected to real SignalK at ${REAL_SIGNALK_URL}`);
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
