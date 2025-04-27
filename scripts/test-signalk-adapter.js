#!/usr/bin/env node

/**
 * SignalK Adapter Test Script
 * 
 * This script provides a simple way to test the SignalK adapter system:
 * 1. Forcefully kills any processes using our ports
 * 2. Starts the relay server with a unique port
 * 3. Starts the test client connected to the relay server
 * 4. Monitors both processes and shows their output
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const execPromise = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Generate a truly unique port (timestamp-based)
const uniquePort = 30000 + (Date.now() % 10000);

// Track child processes for cleanup
const processes = [];

/**
 * Kill processes by port
 */
async function killProcessesByPort(port) {
  try {
    console.log(`🔍 Finding processes using port ${port}...`);
    const { stdout } = await execPromise(`lsof -i :${port} -t`);
    
    if (!stdout.trim()) {
      console.log(`✅ No processes found using port ${port}`);
      return;
    }
    
    const pids = stdout.trim().split('\n').filter(Boolean);
    console.log(`🚫 Found ${pids.length} processes using port ${port}: ${pids.join(', ')}`);
    
    for (const pid of pids) {
      console.log(`🔪 Killing process ${pid}...`);
      await execPromise(`kill -9 ${pid}`);
    }
    
    console.log(`✅ All processes using port ${port} have been terminated`);
  } catch (error) {
    // If lsof returns nothing, no process is using the port
    console.log(`✅ No processes found using port ${port}`);
  }
}

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
  console.log(`\n🚀 Starting relay server on port ${uniquePort}...`);
  
  // Create environment variables for the relay server
  const env = {
    ...process.env,
    PORT: uniquePort.toString(),
    RELAY_PORT: uniquePort.toString(),
    // Set adapter type if needed for testing specific adapters
    // SIGNALK_ADAPTER: 'OpenPlotterSignalKAdapter'
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
 * Start the test client
 */
function startTestClient() {
  console.log(`\n🚀 Starting test client (connecting to port ${uniquePort})...`);
  
  // Update the test client to use our port
  const testClientPath = path.join(projectRoot, 'src', 'relay', 'test-client.js');
  const testClient = spawn('node', [testClientPath], {
    cwd: path.join(projectRoot, 'src', 'relay'),
    stdio: 'pipe',
    env: {
      ...process.env,
      RELAY_PORT: uniquePort.toString()
    }
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
  console.log('🧪 SignalK Adapter System Test'.padStart(50, ' '));
  console.log('='.repeat(80));
  
  // Set up cleanup on exit
  process.on('SIGINT', cleanupOnExit);
  process.on('SIGTERM', cleanupOnExit);
  
  try {
    // Kill any processes using our port
    await killProcessesByPort(uniquePort);
    
    // Start the relay server
    const relayServer = startRelayServer();
    
    // Wait for the relay server to initialize (3 seconds)
    console.log('⏳ Waiting for relay server to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start the test client
    const testClient = startTestClient();
    
    console.log('\n✅ Test environment is running');
    console.log('📊 Monitoring for SignalK adapter activity...');
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
