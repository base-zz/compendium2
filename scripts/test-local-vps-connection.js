#!/usr/bin/env node

/**
 * Local VPS Connection Test
 * 
 * This script tests the connection between:
 * 1. Local Relay Server (with SignalK adapter)
 * 2. Local Test Client
 * 
 * This simulates the full system without requiring the remote VPS
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const config = {
  // Local relay server settings
  relayServer: {
    port: process.env.RELAY_PORT || 8765,
    signalkUrl: process.env.SIGNALK_URL || 'http://openplotter.local:3000/signalk'
  },
  
  // Local test client
  testClient: {
    port: process.env.RELAY_PORT || 8765
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
    SIGNALK_URL: config.relayServer.signalkUrl
  };
  
  const relayServerPath = path.join(projectRoot, 'src', 'relay', 'start-relay-server.js');
  const relayServer = spawn('node', [relayServerPath], {
    cwd: projectRoot,
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
 * Start the test client
 */
function startTestClient() {
  console.log(`\n🔌 Starting test client connecting to port ${config.testClient.port}...`);
  
  // Create environment variables for the test client
  const env = {
    ...process.env,
    RELAY_PORT: config.testClient.port.toString()
  };
  
  const testClientPath = path.join(projectRoot, 'src', 'relay', 'test-client.js');
  const testClient = spawn('node', [testClientPath], {
    cwd: projectRoot,
    stdio: 'pipe',
    env: env
  });
  
  processes.push(testClient);
  
  // Handle stdout
  testClient.stdout.on('data', (data) => {
    process.stdout.write(`\x1b[34m[TEST-CLIENT]\x1b[0m ${data}`);
  });
  
  // Handle stderr
  testClient.stderr.on('data', (data) => {
    process.stdout.write(`\x1b[31m[TEST-CLIENT ERROR]\x1b[0m ${data}`);
  });
  
  // Handle process exit
  testClient.on('close', (code) => {
    console.log(`\n❌ Test client exited with code ${code}`);
    cleanupOnExit();
  });
  
  return testClient;
}

/**
 * Main function
 */
async function main() {
  // Print header
  console.log('='.repeat(80));
  console.log('🌐 CompendiumnNav Local VPS Test'.padStart(50, ' '));
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
    
    // Start the test client
    const testClient = startTestClient();
    
    console.log('\n✅ Test environment is running');
    console.log('📊 Monitoring for data flow...');
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
