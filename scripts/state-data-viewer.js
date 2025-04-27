#!/usr/bin/env node

/**
 * State Data Viewer
 * 
 * This script connects to the VPS relay server and displays the processed
 * stateDataStore data instead of raw data. It shows how the data looks
 * after being processed by the state management system.
 * 
 * It uses the same state management components as the main application
 * to ensure consistency.
 */

import WebSocket from 'ws';
import EventEmitter from 'events';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Get relay server URL and token configuration
const config = {
  vpsUrl: process.env.VPS_RELAY_URL || 'ws://localhost:8081',
  tokenSecret: process.env.TOKEN_SECRET || 'a8f3e6d9c2b5a7f1e4d8c3b6a9f2e5d8',
  userId: process.env.USER_ID || 'test-user-1',
  vesselId: process.env.VESSEL_ID || 'demo-vessel',
  logFile: process.env.LOG_FILE || path.join(process.cwd(), 'state-data-viewer.log')
};

// Print instructions for testing
console.log('\n=== STATE DATA VIEWER ===');
console.log('This script shows the processed state data from the VPS relay server.');
console.log('For this to work:');
console.log('1. Your SignalK server must be running');
console.log('2. Your relay server must be connected to SignalK');
console.log('3. The VPS relay proxy must be running');
console.log('\nConfiguration:');
console.log(`- VPS Relay URL: ${config.vpsUrl}`);
console.log(`- User ID: ${config.userId}`);
console.log(`- Vessel ID: ${config.vesselId}`);
console.log(`- Log file: ${config.logFile}`);
console.log('=======================================\n');

// Generate a client token
function generateToken() {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600; // 1 hour expiration
  
  const payload = {
    sub: config.userId,
    vesselId: config.vesselId,
    name: config.userId,
    iat: now,
    exp: expiresAt
  };
  
  const signature = crypto.createHmac('sha256', config.tokenSecret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return Buffer.from(JSON.stringify({
    payload,
    signature
  })).toString('base64');
}

// StateDataViewer class
class StateDataViewer extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.messageCount = 0;
    this.startTime = Date.now();
    this.stateData = {
      navigation: {},
      environment: {},
      vessel: {},
      alerts: {
        active: [],
        history: []
      },
      anchor: {},
      external: {}
    };
    this.logStream = fs.createWriteStream(config.logFile, { flags: 'a' });
    
    // Write header to log file
    this.log('='.repeat(80));
    this.log(`STATE DATA VIEWER - Started at ${new Date().toISOString()}`);
    this.log('='.repeat(80));
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    // Write to console and log file
    console.log(logMessage);
    this.logStream.write(logMessage + '\n');
  }
  
  async connect() {
    this.log(`Connecting to VPS Relay Proxy at ${config.vpsUrl}...`);
    
    try {
      const token = generateToken();
      const connectionUrl = `${config.vpsUrl}?token=${token}`;
      
      this.log(`Using token for user: ${config.userId}, vessel: ${config.vesselId}`);
      this.socket = new WebSocket(connectionUrl);
      
      this.socket.on('open', () => {
        this.log('Connected to VPS Relay Proxy');
        
        // Subscribe to all data channels
        const subscriptionMessage = {
          type: 'subscribe',
          paths: ['navigation.*', 'environment.*', 'vessel.*', 'alerts.*', 'anchor.*', 'external.*']
        };
        
        this.socket.send(JSON.stringify(subscriptionMessage));
        this.log('Subscribed to all data channels');
      });
      
      this.socket.on('message', (data) => {
        try {
          this.messageCount++;
          const message = JSON.parse(data.toString());
          
          // Process state update
          if (message.type === 'state') {
            this.updateStateData(message.data);
            this.displayStateData();
          } else {
            this.log(`Received message type: ${message.type}`);
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
        
        if (error.message.includes('401')) {
          this.log('\n❌ AUTHENTICATION ERROR: Server returned 401 Unauthorized');
          this.log('This usually means your token is missing or invalid');
        }
      });
      
      this.socket.on('close', () => {
        this.log('Connection to VPS Relay Proxy closed');
        this.log(`Session summary: Received ${this.messageCount} messages`);
        this.logStream.end();
        
        // Try to reconnect after a delay
        setTimeout(() => this.connect(), 5000);
      });
      
      return true;
    } catch (error) {
      this.log(`[ERROR] Failed to connect to VPS Relay Proxy: ${error.message}`);
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
  
  updateStateData(data) {
    // Update our state data with new information
    if (!data) return;
    
    // Merge new data with existing state data
    Object.keys(data).forEach(domain => {
      if (this.stateData[domain]) {
        this.stateData[domain] = { ...this.stateData[domain], ...data[domain] };
      }
    });
  }
  
  displayStateData() {
    console.clear(); // Clear console for better readability
    
    console.log('\n=== STATE DATA VIEWER ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Messages received: ${this.messageCount}`);
    console.log('=======================================\n');
    
    // Display navigation data
    if (this.stateData.navigation) {
      console.log('📍 NAVIGATION:');
      
      const nav = this.stateData.navigation;
      
      if (nav.position) {
        console.log(`  Position: ${nav.position.latitude?.toFixed(6)}°, ${nav.position.longitude?.toFixed(6)}°`);
        console.log(`  Source: ${nav.position.source || 'unknown'}`);
        console.log(`  Timestamp: ${nav.position.timestamp || 'unknown'}`);
      }
      
      if (nav.courseOverGroundTrue !== undefined) {
        console.log(`  Course Over Ground: ${nav.courseOverGroundTrue?.toFixed(1)}°`);
      }
      
      if (nav.headingTrue !== undefined) {
        console.log(`  Heading: ${nav.headingTrue?.toFixed(1)}°`);
      }
      
      if (nav.speedOverGround !== undefined) {
        console.log(`  Speed Over Ground: ${(nav.speedOverGround * 1.94384).toFixed(1)} knots`);
      }
      
      if (nav.depth) {
        console.log(`  Depth: ${nav.depth.belowTransducer?.toFixed(1)} m`);
      }
      
      console.log('');
    }
    
    // Display environment data
    if (this.stateData.environment) {
      console.log('🌤️ ENVIRONMENT:');
      
      const env = this.stateData.environment;
      
      if (env.wind) {
        console.log(`  Wind Speed: ${env.wind.speedApparent ? (env.wind.speedApparent * 1.94384).toFixed(1) + ' knots' : 'N/A'}`);
        console.log(`  Wind Angle: ${env.wind.angleApparent ? env.wind.angleApparent.toFixed(1) + '°' : 'N/A'}`);
      }
      
      if (env.water) {
        console.log(`  Water Temp: ${env.water.temperature ? env.water.temperature.toFixed(1) + '°C' : 'N/A'}`);
      }
      
      console.log('');
    }
    
    // Display anchor data
    if (this.stateData.anchor) {
      console.log('⚓ ANCHOR:');
      
      const anchor = this.stateData.anchor;
      
      console.log(`  Status: ${anchor.status || 'unknown'}`);
      
      if (anchor.setPosition) {
        console.log(`  Set Position: ${anchor.setPosition.latitude?.toFixed(6)}°, ${anchor.setPosition.longitude?.toFixed(6)}°`);
      }
      
      if (anchor.currentRadius !== undefined) {
        console.log(`  Current Radius: ${anchor.currentRadius?.toFixed(1)} m`);
      }
      
      if (anchor.maxRadius !== undefined) {
        console.log(`  Max Radius: ${anchor.maxRadius?.toFixed(1)} m`);
      }
      
      if (anchor.alarmRadius !== undefined) {
        console.log(`  Alarm Radius: ${anchor.alarmRadius?.toFixed(1)} m`);
      }
      
      console.log('');
    }
    
    // Display alerts
    if (this.stateData.alerts) {
      console.log('⚠️ ALERTS:');
      
      const alerts = this.stateData.alerts;
      
      if (alerts.active && alerts.active.length > 0) {
        console.log(`  Active Alerts: ${alerts.active.length}`);
        alerts.active.forEach((alert, index) => {
          console.log(`  [${index + 1}] ${alert.type}: ${alert.message} (${alert.timestamp})`);
        });
      } else {
        console.log('  No active alerts');
      }
      
      console.log('');
    }
    
    // Display vessel data
    if (this.stateData.vessel) {
      console.log('🚢 VESSEL:');
      
      const vessel = this.stateData.vessel;
      
      if (vessel.name) {
        console.log(`  Name: ${vessel.name}`);
      }
      
      if (vessel.mmsi) {
        console.log(`  MMSI: ${vessel.mmsi}`);
      }
      
      console.log('');
    }
  }
}

// Main function
async function main() {
  try {
    const viewer = new StateDataViewer();
    
    // Connect to the VPS relay server
    await viewer.connect();
    
    console.log('\nViewer is running. Press Ctrl+C to stop...');
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\nStopping viewer...');
      viewer.disconnect();
      console.log(`Log file saved to: ${config.logFile}`);
      process.exit(0);
    });
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
