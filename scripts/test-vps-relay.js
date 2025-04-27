#!/usr/bin/env node

/**
 * VPS Relay Test Script
 * 
 * This script tests the full relay system including the cloud VPS:
 * 1. Starts the local relay server
 * 2. Connects the relay server to the cloud VPS at compendiumnav.com
 * 3. Connects a test client to the cloud VPS
 * 4. Monitors data flow through the entire system
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const config = {
  // Local relay server settings
  relayServer: {
    port: process.env.PORT || 9000,
    signalkUrl: process.env.SIGNALK_URL || 'http://openplotter.local:3000/signalk',
    signalkToken: process.env.SIGNALK_TOKEN || ''
  },
  
  // VPS settings
  vps: {
    url: process.env.VPS_URL || 'wss://compendiumnav.com/relay',
    token: process.env.VPS_TOKEN || 'your-auth-token' // Replace with your actual token
  }
};

// Track child processes for cleanup
const processes = [];

/**
 * Clean up on exit
 */
function cleanupOnExit() {
  console.log('\n🧹 Cleaning up...');
  
  // Kill all child processes
  for (const proc of processes) {
    if (!proc.killed) {
      try {
        proc.kill('SIGINT');
      } catch (error) {
        // Ignore errors
      }
    }
  }
  
  console.log('👋 Exiting...');
  process.exit(0);
}

/**
 * Start the relay server
 */
function startRelayServer() {
  console.log(`\n🚀 Starting relay server on port ${config.relayServer.port}...`);
  
  // Create environment variables for the relay server
  const env = {
    ...process.env,
    PORT: config.relayServer.port.toString(),
    RELAY_PORT: config.relayServer.port.toString(),
    SIGNALK_URL: config.relayServer.signalkUrl,
    SIGNALK_TOKEN: config.relayServer.signalkToken,
    // Connect to the VPS
    VPS_URL: config.vps.url,
    VPS_TOKEN: config.vps.token
  };
  
  const relayServerPath = path.join(projectRoot, 'src', 'relay', 'start-relay-server.js');
  const relayServer = spawn('node', [relayServerPath], {
    cwd: path.join(projectRoot, 'src', 'relay'),
    stdio: 'pipe',
    env: env
  });
  
  processes.push(relayServer);
  
  // Handle stdout
  relayServer.stdout.on('data', (data) => {
    process.stdout.write(`\x1b[32m[RELAY-SERVER]\x1b[0m ${data}`);
  });
  
  // Handle stderr
  relayServer.stderr.on('data', (data) => {
    process.stdout.write(`\x1b[31m[RELAY-SERVER ERROR]\x1b[0m ${data}`);
  });
  
  // Handle process exit
  relayServer.on('close', (code) => {
    console.log(`\n❌ Relay server exited with code ${code}`);
    cleanupOnExit();
  });
  
  return relayServer;
}

/**
 * Connect a test client to the VPS
 */
function connectTestClient() {
  console.log(`\n🔌 Connecting test client to VPS at ${config.vps.url}...`);
  
  // Add token to URL if provided
  const url = config.vps.token ? 
    `${config.vps.url}?token=${config.vps.token}` : 
    config.vps.url;
  
  const ws = new WebSocket(url);
  
  ws.on('open', () => {
    console.log('✅ Connected to VPS relay server');
    
    // Subscribe to data types
    const subscriptionMessage = {
      type: 'subscribe',
      data: ['navigation', 'vessel', 'alerts']
    };
    
    ws.send(JSON.stringify(subscriptionMessage));
    console.log('📡 Subscribed to navigation, vessel, and alerts data');
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`\x1b[34m[VPS-CLIENT]\x1b[0m Received ${message.type} data:`, 
        JSON.stringify(message.data, null, 2).substring(0, 200) + 
        (JSON.stringify(message.data, null, 2).length > 200 ? '...' : ''));
    } catch (error) {
      console.log(`\x1b[31m[VPS-CLIENT ERROR]\x1b[0m Error parsing message:`, error);
    }
  });
  
  ws.on('error', (error) => {
    console.log(`\x1b[31m[VPS-CLIENT ERROR]\x1b[0m WebSocket error:`, error);
  });
  
  ws.on('close', () => {
    console.log(`\x1b[31m[VPS-CLIENT]\x1b[0m Disconnected from VPS relay server`);
    cleanupOnExit();
  });
  
  return ws;
}

/**
 * Main function
 */
async function main() {
  // Print header
  console.log('='.repeat(80));
  console.log('🌐 CompendiumnNav VPS Relay Test'.padStart(50, ' '));
  console.log('='.repeat(80));
  
  // Set up cleanup on exit
  process.on('SIGINT', cleanupOnExit);
  process.on('SIGTERM', cleanupOnExit);
  
  try {
    // Start the relay server
    const relayServer = startRelayServer();
    
    // Wait for the relay server to initialize (5 seconds)
    console.log('⏳ Waiting for relay server to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Connect a test client to the VPS
    const client = connectTestClient();
    
    console.log('\n✅ Test environment is running');
    console.log('📊 Monitoring for data flow through the VPS relay...');
    console.log('🔍 Press Ctrl+C to stop the test\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    cleanupOnExit();
  }
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  cleanupOnExit();
});
