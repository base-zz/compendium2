#!/usr/bin/env node

/**
 * Test script to verify VPS connection status
 * 
 * This script connects directly to the VPS relay server and monitors
 * connection status and data updates.
 */

// Import required modules
import { WebSocket } from 'ws';
import EventEmitter from 'events';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get relay server URL and token from environment or use default
// Default to local relay server for development testing
const RELAY_SERVER_URL = process.env.VPS_RELAY_URL || 'ws://localhost:3002/relay';
const RELAY_TOKEN = process.env.VPS_RELAY_TOKEN || ''; // Token should be provided via environment variable

// Print instructions for testing
console.log('\n=== VPS CONNECTION TEST INSTRUCTIONS ===');
console.log('This script tests the connection to your relay server. For this to work:');
console.log('1. Your SignalK server must be running (http://localhost:3000/signalk)');
console.log('2. Your local relay server must be running (scripts/start-relay-server.js)');
console.log('3. The relay server must be connected to SignalK');
console.log('\nIf testing against the production VPS relay proxy:');
console.log('- Set VPS_RELAY_URL environment variable to the VPS relay URL');
console.log('- Set VPS_RELAY_TOKEN environment variable with your auth token');
console.log('=======================================\n');

// Check if token is provided for non-local connections
if (!RELAY_SERVER_URL.includes('localhost') && !RELAY_TOKEN) {
  console.log('⚠️ WARNING: No VPS_RELAY_TOKEN provided for remote connection');
  console.log('Authentication will likely fail with a 401 error');
  console.log('Set the VPS_RELAY_TOKEN environment variable before running this script');
}
const RECONNECT_DELAY = parseInt(process.env.VITE_RELAY_RECONNECT_DELAY || '3000', 10);
const MAX_RECONNECT_ATTEMPTS = parseInt(process.env.VITE_RELAY_MAX_RECONNECT_ATTEMPTS || '5', 10);


// Print configuration for verification
console.log('\n--- CONFIGURATION ---');
console.log(`VPS Relay URL: ${RELAY_SERVER_URL}`);
console.log(`Using token: ${RELAY_TOKEN ? 'Yes' : 'No'}`);
console.log(`Reconnect delay: ${RECONNECT_DELAY}ms`);
console.log(`Max reconnect attempts: ${MAX_RECONNECT_ATTEMPTS}`);
console.log('-------------------\n');

// Create a direct connection to the relay server
class DirectRelayConnection extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.reconnectAttempts = 0;
    this.connectionState = {
      status: 'disconnected',
      lastError: null
    };
  }

  async connect() {
    console.log(`Connecting to relay server at ${RELAY_SERVER_URL}...`);
    
    this.connectionState.status = 'connecting';
    this.emit('connection-status', this.connectionState);
    
    try {
      // Append token as URL parameter for authentication
      const connectionUrl = RELAY_TOKEN ? `${RELAY_SERVER_URL}?token=${RELAY_TOKEN}` : RELAY_SERVER_URL;
      console.log(`Connecting to: ${connectionUrl}`);
      this.socket = new WebSocket(connectionUrl);
      
      this.socket.on('open', () => {
        console.log('Connected to relay server');
        this.reconnectAttempts = 0;
        this.connectionState.status = 'connected';
        this.connectionState.lastError = null;
        this.emit('connection-status', this.connectionState);
        
        // Subscribe to navigation data
        this._sendMessage({
          type: 'subscribe',
          channels: ['navigation', 'vessel', 'alerts']
        });
      });
      
      this.socket.on('message', (data) => {
        try {
          // Log the raw message exactly as received
          console.log('\n[RAW MESSAGE RECEIVED] Raw data:', data.toString());
          
          // Parse and log structured data
          const message = JSON.parse(data);
          console.log('[PARSED MESSAGE] Type:', message.type);
          
          // Log all message types and data for debugging with full details
          if (message.data) {
            console.log('[DETAILED MESSAGE DATA]', JSON.stringify(message.data, null, 2));
            
            // Log specific data types for easier verification
            if (message.type === 'navigation' && message.data.position) {
              console.log('[POSITION DATA]', JSON.stringify(message.data.position, null, 2));
            }
            if (message.type === 'navigation' && message.data.course) {
              console.log('[COURSE DATA]', JSON.stringify(message.data.course, null, 2));
            }
            if (message.type === 'navigation' && message.data.speed) {
              console.log('[SPEED DATA]', JSON.stringify(message.data.speed, null, 2));
            }
          }
          
          // Increment message count for all valid messages
          this.messageCount = (this.messageCount || 0) + 1;
          console.log(`[REAL DATA] Message #${this.messageCount} received from VPS relay`);
          
          if (message.type === 'nav-position' && message.data) {
            console.log('[REAL DATA] Navigation position data received');
            this.emit('nav-position', message.data);
          } else if (message.type === 'nav-instruments' && message.data) {
            console.log('[REAL DATA] Navigation instruments data received');
            this.emit('nav-instruments', message.data);
          } else if (message.type === 'navigation' && message.data) {
            // Handle unified navigation data format
            console.log('[REAL DATA] Unified navigation data received');
            this.emit('nav-position', message.data);
          } else {
            console.log(`[REAL DATA] Other data type received: ${message.type}`);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
      
      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        
        // Provide more helpful error messages
        if (error.message.includes('401')) {
          console.error('\n❌ AUTHENTICATION ERROR: Server returned 401 Unauthorized');
          console.error('This usually means your token is missing or invalid');
          console.error('Make sure VPS_RELAY_TOKEN is set correctly in your environment variables');
          console.error(`Current token: ${RELAY_TOKEN ? '******' : 'Not provided'}`);
        }
        
        this.connectionState.lastError = error.message;
        this.emit('connection-status', this.connectionState);
      });
      
      this.socket.on('close', () => {
        console.log('Connection to relay server closed');
        this.connectionState.status = 'disconnected';
        this.emit('connection-status', this.connectionState);
        
        // Attempt to reconnect
        if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          console.log(`Reconnecting (attempt ${this.reconnectAttempts} of ${MAX_RECONNECT_ATTEMPTS})...`);
          setTimeout(() => this.connect(), RECONNECT_DELAY);
        } else {
          console.error('Max reconnect attempts reached');
          this.connectionState.lastError = 'Max reconnect attempts reached';
          this.emit('connection-status', this.connectionState);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to connect to relay server:', error);
      this.connectionState.status = 'error';
      this.connectionState.lastError = error.message;
      this.emit('connection-status', this.connectionState);
      return false;
    }
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
  
  _sendMessage(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}

// Main function
async function main() {
  try {
    // Create a connection status tracker
    const connectionStatus = {
      status: 'disconnected',
      lastError: null,
      lastUpdate: null,
      messageCount: 0,
      position: null
    };
    
    console.log('Creating direct relay connection...');
    const relayConnection = new DirectRelayConnection();
    
    // Set up event listeners
    relayConnection.on('connection-status', (status) => {
      console.log('[TEST] Connection status update:', JSON.stringify(status));
      connectionStatus.status = status.status;
      connectionStatus.lastError = status.lastError;
      connectionStatus.lastUpdate = Date.now();
    });
    
    // Add detailed logging for all data types
    relayConnection.on('nav-position', (data) => {
      console.log('\n[REAL DATA EVENT] nav-position received:');
      console.log(JSON.stringify(data, null, 2));
    });
    
    relayConnection.on('nav-instruments', (data) => {
      console.log('\n[REAL DATA EVENT] nav-instruments received:');
      console.log(JSON.stringify(data, null, 2));
    });
    
    relayConnection.on('navigation', (data) => {
      console.log('\n[REAL DATA EVENT] unified navigation data received:');
      console.log(JSON.stringify(data, null, 2));
    });
    
    relayConnection.on('vessel-update', (data) => {
      console.log('\n[REAL DATA EVENT] vessel-update received:');
      console.log(JSON.stringify(data, null, 2));
    });
    
    relayConnection.on('alert', (data) => {
      console.log('\n[REAL DATA EVENT] alert received:');
      console.log(JSON.stringify(data, null, 2));
    });
    
    relayConnection.on('nav-position', (data) => {
      if (data && data.position) {
        console.log('[TEST] Received position update:', JSON.stringify(data.position));
        connectionStatus.position = data.position;
        connectionStatus.messageCount++;
        connectionStatus.lastUpdate = Date.now();
      }
    });
    
    console.log('Connecting to VPS relay...');
    
    await relayConnection.connect();
    console.log('✅ Connected to VPS relay');
    
    console.log('Setting up monitoring for connection status and data updates...');

    // Set up interval to monitor connection status and data updates
    const intervalId = setInterval(() => {
      console.log('\n--- VPS Connection Status ---');
      console.log(`Connection Status: ${connectionStatus.status}`);
      console.log(`Last Error: ${connectionStatus.lastError || 'None'}`);
      console.log(`Message Count: ${connectionStatus.messageCount}`);
      console.log(`Last Update: ${connectionStatus.lastUpdate ? new Date(connectionStatus.lastUpdate).toLocaleTimeString() : 'None'}`);
      
      // Check if we've received any data
      if (connectionStatus.messageCount > 0) {
        console.log('\n--- Latest Navigation Data ---');
        console.log('Position:', JSON.stringify(connectionStatus.position));
        
        // If we have position data, we know we're receiving updates
        if (connectionStatus.position && connectionStatus.position.latitude) {
          console.log('✅ CONFIRMED: Receiving REAL position updates from VPS');
          console.log(`   Latitude: ${connectionStatus.position.latitude}`);
          console.log(`   Longitude: ${connectionStatus.position.longitude}`);
          console.log(`   Timestamp: ${new Date().toISOString()}`);
        }
      }
      
      // Display data source information
      console.log('\n--- DATA SOURCE VERIFICATION ---');
      console.log(`Connected to: ${RELAY_SERVER_URL}`);
      console.log(`Using authentication: ${RELAY_TOKEN ? 'Yes' : 'No'}`);
      console.log(`Message count: ${connectionStatus.messageCount}`);
      console.log('-----------------------------------');
      
      // Check if we've been connected for at least 30 seconds
      if (Date.now() - (connectionStatus.lastUpdate || 0) > 30000 && connectionStatus.messageCount === 0) {
        console.log('❌ No data received after 30 seconds. Possible issues:');
        console.log('  1. VPS relay server is not running');
        console.log('  2. Authentication token is invalid');
        console.log('  3. SignalK server is not connected to the relay');
        console.log('  4. No data is being sent from SignalK to the relay');
        
        if (connectionStatus.lastError && connectionStatus.lastError.includes('401')) {
          console.log('\n⚠️ AUTHENTICATION FAILURE DETECTED');
          console.log('Please check your VPS_RELAY_TOKEN environment variable');
        }
      }
    }, 5000); // Check every 5 seconds

    // Set up a timeout to exit after 2 minutes
    setTimeout(() => {
      clearInterval(intervalId);
      relayConnection.removeAllListeners();
      relayConnection.disconnect();
      console.log('\nTest completed. Exiting...');
      process.exit(0);
    }, 120000); // 2 minutes
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\nTest interrupted. Cleaning up...');
      clearInterval(intervalId);
      relayConnection.removeAllListeners();
      relayConnection.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error in test script:', error);
    process.exit(1);
  }
}




// Run the main function
main();
