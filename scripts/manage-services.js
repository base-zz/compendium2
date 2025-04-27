#!/usr/bin/env node

/**
 * Service Manager for CompendiumnNav2
 * 
 * This utility helps manage the various services needed for development and testing:
 * - Cleans ports before starting services
 * - Can start/stop the relay server
 * - Can start/stop the test client
 * - Can start/stop all services with a single command
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const execPromise = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Service process references and configuration
const processes = {
  relayServer: null,
  testClient: null,
  vueFrontend: null,
  // Track the current relay port
  relayPort: null
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Clean ports used by the application
 */
async function cleanPorts() {
  console.log('🧹 Cleaning ports...');
  try {
    await execPromise(`node ${path.join(__dirname, 'clean-ports.js')}`);
    console.log('✅ Ports cleaned successfully');
  } catch (error) {
    console.error('❌ Failed to clean ports:', error.message);
  }
}

/**
 * Start the Vue frontend
 */
function startVueFrontend() {
  if (processes.vueFrontend) {
    console.log('⚠️ Vue frontend is already running');
    return;
  }

  console.log('🚀 Starting Vue frontend...');
  
  // Start the Vue frontend with the specified environment variables
  processes.vueFrontend = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: 'pipe'
  });

  // Handle stdout
  processes.vueFrontend.stdout.on('data', (data) => {
    console.log(`[VUE-FRONTEND] ${data.toString().trim()}`);
  });

  // Handle stderr
  processes.vueFrontend.stderr.on('data', (data) => {
    console.error(`[VUE-FRONTEND] ${data.toString().trim()}`);
  });

  // Handle exit
  processes.vueFrontend.on('exit', (code) => {
    console.log(`[VUE-FRONTEND] Process exited with code ${code}`);
    processes.vueFrontend = null;
  });
}

/**
 * Stop the Vue frontend
 */
function stopVueFrontend() {
  if (!processes.vueFrontend) {
    console.log('⚠️ Vue frontend is not running');
    return;
  }

  console.log('🛑 Stopping Vue frontend...');
  processes.vueFrontend.kill('SIGINT');
  processes.vueFrontend = null;
}

/**
 * Start the relay server
 */
function startRelayServer() {
  if (processes.relayServer) {
    console.log('⚠️ Relay server is already running');
    return;
  }

  console.log('🚀 Starting relay server...');
  
  const relayServerPath = path.join(projectRoot, 'src', 'relay', 'start-relay-server.js');
  
  // Use the standard port 3002 for consistency with client expectations
  const standardPort = 3002;
  
  // Store the port for later use
  processes.relayPort = standardPort.toString();
  
  // Set environment variables for the relay server - ensure these override any existing values
  const env = {
    ...process.env,
    PORT: processes.relayPort,
    HOST: '0.0.0.0',
    RELAY_PORT: processes.relayPort,
    // Explicitly override any .env file settings
    NODE_ENV: 'development',
    // Ensure we're using real data (not mock) as per user preference
    MOCK_MODE: 'false',
    SIGNALK_URL: process.env.SIGNALK_URL || 'http://openplotter.local:3000/signalk'
  };
  
  // First, ensure the port is free
  console.log(`🔍 Ensuring port ${standardPort} is free...`);
  try {
    execPromise(`lsof -i :${standardPort} -t | xargs kill -9 2>/dev/null || true`);
  } catch (error) {
    // Ignore errors - the port might already be free
  }
  
  // Start the relay server with the specified environment variables
  processes.relayServer = spawn('node', [relayServerPath], {
    cwd: path.join(projectRoot, 'src', 'relay'),
    stdio: 'pipe',
    env: env
  });

  // Handle stdout
  processes.relayServer.stdout.on('data', (data) => {
    console.log(`[RELAY-SERVER] ${data.toString().trim()}`);
  });

  // Handle stderr
  processes.relayServer.stderr.on('data', (data) => {
    console.error(`[RELAY-SERVER ERROR] ${data.toString().trim()}`);
  });

  // Handle process exit
  processes.relayServer.on('close', (code) => {
    console.log(`[RELAY-SERVER] Process exited with code ${code}`);
    processes.relayServer = null;
  });

  console.log('✅ Relay server started');
}

/**
 * Start the test client
 */
function startTestClient() {
  if (processes.testClient) {
    console.log('⚠️ Test client is already running');
    return;
  }

  if (!processes.relayServer) {
    console.log('⚠️ Cannot start test client: Relay server is not running');
    return;
  }

  // Use the port that the relay server is running on
  console.log(`🚀 Starting test client (connecting to port ${processes.relayPort})...`);
  
  const testClientPath = path.join(projectRoot, 'src', 'relay', 'test-client.js');
  processes.testClient = spawn('node', [testClientPath], {
    cwd: path.join(projectRoot, 'src', 'relay'),
    stdio: 'pipe',
    env: {
      ...process.env,
      RELAY_PORT: processes.relayPort
    }
  });

  // Handle stdout
  processes.testClient.stdout.on('data', (data) => {
    console.log(`[TEST-CLIENT] ${data.toString().trim()}`);
  });

  // Handle stderr
  processes.testClient.stderr.on('data', (data) => {
    console.error(`[TEST-CLIENT ERROR] ${data.toString().trim()}`);
  });

  // Handle process exit
  processes.testClient.on('close', (code) => {
    console.log(`[TEST-CLIENT] Process exited with code ${code}`);
    processes.testClient = null;
  });

  console.log('✅ Test client started');
}

/**
 * Stop the relay server
 */
function stopRelayServer() {
  if (!processes.relayServer) {
    console.log('⚠️ Relay server is not running');
    return;
  }

  console.log('🛑 Stopping relay server...');
  processes.relayServer.kill('SIGINT');
  processes.relayServer = null;
  console.log('✅ Relay server stopped');
}

/**
 * Stop the test client
 */
function stopTestClient() {
  if (!processes.testClient) {
    console.log('⚠️ Test client is not running');
    return;
  }

  console.log('🛑 Stopping test client...');
  processes.testClient.kill('SIGINT');
  processes.testClient = null;
  console.log('✅ Test client stopped');
}

/**
 * Stop all running services
 */
function stopAll() {
  if (processes.testClient) stopTestClient();
  if (processes.relayServer) stopRelayServer();
  console.log('✅ All services stopped');
}

/**
 * Start all services
 */
async function startAll() {
  await cleanPorts();
  startRelayServer();
  
  // Wait a bit for the relay server to initialize
  console.log('⏳ Waiting for relay server to initialize...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  startTestClient();
  console.log('✅ All services started');
}

/**
 * Display the main menu
 */
function showMenu() {
  console.log('\n📋 CompendiumnNav2 Service Manager');
  console.log('--------------------------------');
  console.log('1. Start all services');
  console.log('2. Stop all services');
  console.log('3. Start relay server');
  console.log('4. Stop relay server');
  console.log('5. Start test client');
  console.log('6. Stop test client');
  console.log('7. Clean ports');
  console.log('8. Exit');
  console.log('--------------------------------');
  
  rl.question('Enter your choice: ', async (choice) => {
    switch (choice) {
      case '1':
        await startAll();
        break;
      case '2':
        stopAll();
        break;
      case '3':
        startRelayServer();
        break;
      case '4':
        stopRelayServer();
        break;
      case '5':
        startTestClient();
        break;
      case '6':
        stopTestClient();
        break;
      case '7':
        await cleanPorts();
        break;
      case '8':
        stopAll();
        rl.close();
        process.exit(0);
        return;
      default:
        console.log('❌ Invalid choice');
    }
    
    // Show the menu again
    showMenu();
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down...');
  stopAll();
  rl.close();
  process.exit(0);
});

// Start the application
console.log('🔧 CompendiumnNav2 Service Manager');
showMenu();
