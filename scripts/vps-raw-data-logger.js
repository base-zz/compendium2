#!/usr/bin/env node

/**
 * VPS Raw Data Logger
 * 
 * This script connects directly to the VPS relay server and logs all raw data
 * received from the VPS without any processing or modification.
 * 
 * It does not modify any existing components and only logs the data for verification.
 */

import { WebSocket } from 'ws';
import EventEmitter from 'events';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Get relay server URL and token from environment or use default
const RELAY_SERVER_URL = process.env.VPS_RELAY_URL || 'ws://localhost:3002/relay';
const RELAY_TOKEN = process.env.VPS_RELAY_TOKEN || ''; // Token should be provided via environment variable
const LOG_FILE = process.env.LOG_FILE || path.join(process.cwd(), 'vps-raw-data.log');

// Print instructions for testing
console.log('\n=== VPS RAW DATA LOGGER ===');
console.log('This script logs raw data received from the VPS relay server.');
console.log('For this to work:');
console.log('1. Your SignalK server must be running');
console.log('2. Your relay server must be connected to SignalK');
console.log('3. The VPS relay proxy must be running');
console.log('\nConfiguration:');
console.log(`- VPS Relay URL: ${RELAY_SERVER_URL}`);
console.log(`- Using token: ${RELAY_TOKEN ? 'Yes' : 'No'}`);
console.log(`- Log file: ${LOG_FILE}`);
console.log('=======================================\n');

// Check if token is provided for non-local connections
if (!RELAY_SERVER_URL.includes('localhost') && !RELAY_TOKEN) {
  console.log('⚠️ WARNING: No VPS_RELAY_TOKEN provided for remote connection');
  console.log('Authentication will likely fail with a 401 error');
  console.log('Set the VPS_RELAY_TOKEN environment variable before running this script');
}

// Create a direct connection to the relay server
class RawDataLogger extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.messageCount = 0;
    this.startTime = Date.now();
    this.logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    
    // Write header to log file
    this.log('='.repeat(80));
    this.log(`VPS RAW DATA LOG - Started at ${new Date().toISOString()}`);
    this.log('='.repeat(80));
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    // Write to console and log file
    console.log(logMessage);
    this.logStream.write(logMessage + '\n');
  }
  
  logRawData(type, data) {
    this.log(`[RAW DATA] Type: ${type}`);
    this.log(`[RAW DATA] Content: ${JSON.stringify(data, null, 2)}`);
    this.log('-'.repeat(40));
  }
  
  async connect() {
    this.log(`Connecting to relay server at ${RELAY_SERVER_URL}...`);
    
    try {
      // Append token as URL parameter for authentication
      const connectionUrl = RELAY_TOKEN ? `${RELAY_SERVER_URL}?token=${RELAY_TOKEN}` : RELAY_SERVER_URL;
      this.log(`Connecting to: ${connectionUrl}`);
      this.socket = new WebSocket(connectionUrl);
      
      this.socket.on('open', () => {
        this.log('Connected to relay server');
        
        // Subscribe to all data types
        this._sendMessage({
          type: 'subscribe',
          channels: ['navigation', 'vessel', 'alerts', 'environment', 'external']
        });
        
        this.log('Subscribed to all data channels');
      });
      
      this.socket.on('message', (data) => {
        try {
          this.messageCount++;
          const rawMessage = data.toString();
          
          // Log the raw message exactly as received
          this.log(`\n[MESSAGE #${this.messageCount}] Raw data received:`);
          this.log(rawMessage);
          
          // Try to parse and log structured data
          try {
            const message = JSON.parse(rawMessage);
            this.log(`[PARSED] Message type: ${message.type || 'unknown'}`);
            
            if (message.data) {
              this.logRawData(message.type, message.data);
            }
            
            // Emit event for specific message types
            if (message.type) {
              this.emit(message.type, message.data);
            }
          } catch (parseError) {
            this.log(`[ERROR] Failed to parse message: ${parseError.message}`);
          }
          
          // Log statistics every 10 messages
          if (this.messageCount % 10 === 0) {
            const runningTime = Math.round((Date.now() - this.startTime) / 1000);
            const messagesPerSecond = (this.messageCount / runningTime).toFixed(2);
            this.log(`\n[STATS] Received ${this.messageCount} messages in ${runningTime} seconds (${messagesPerSecond} msg/sec)`);
          }
        } catch (error) {
          this.log(`[ERROR] Error processing message: ${error.message}`);
        }
      });
      
      this.socket.on('error', (error) => {
        this.log(`[ERROR] WebSocket error: ${error.message}`);
        
        // Provide more helpful error messages
        if (error.message.includes('401')) {
          this.log('\n❌ AUTHENTICATION ERROR: Server returned 401 Unauthorized');
          this.log('This usually means your token is missing or invalid');
          this.log('Make sure VPS_RELAY_TOKEN is set correctly in your environment variables');
        }
      });
      
      this.socket.on('close', () => {
        this.log('Connection to relay server closed');
        this.log(`Session summary: Received ${this.messageCount} messages`);
        this.logStream.end();
      });
      
      return true;
    } catch (error) {
      this.log(`[ERROR] Failed to connect to relay server: ${error.message}`);
      return false;
    }
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.logStream.end();
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
    const logger = new RawDataLogger();
    
    // Set up event listeners for specific data types (just for console output)
    logger.on('navigation', () => {
      process.stdout.write('.');  // Simple progress indicator for navigation data
    });
    
    logger.on('vessel', () => {
      process.stdout.write('v');  // Simple progress indicator for vessel data
    });
    
    logger.on('alert', () => {
      process.stdout.write('!');  // Simple progress indicator for alerts
    });
    
    // Connect to the relay server
    await logger.connect();
    
    console.log('\nLogger is running. Press Ctrl+C to stop...');
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\nStopping logger...');
      logger.disconnect();
      console.log(`Log file saved to: ${LOG_FILE}`);
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
