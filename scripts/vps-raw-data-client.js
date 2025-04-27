// VPS Raw Data Client
// This script connects to the VPS Relay Proxy and logs all raw data without processing
import WebSocket from 'ws';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration - use environment variables with fallbacks
const config = {
  vpsUrl: process.env.VPS_RELAY_URL || 'ws://compendiumnav.com:8081',
  tokenSecret: process.env.VPS_TOKEN_SECRET || 'a8f3e6d9c2b5a7f1e4d8c3b6a9f2e5d8',
  userId: process.env.VPS_USER_ID || 'test-user-1',
  vesselId: process.env.VPS_VESSEL_ID || 'demo-vessel',
  logFile: process.env.VPS_LOG_FILE || path.join(process.cwd(), 'vps-raw-data.log')
};

// Create log file stream
const logStream = fs.createWriteStream(config.logFile, { flags: 'a' });

// Helper function to log with timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

// Log separator
function logSeparator() {
  log('='.repeat(80));
}

// Log raw data
function logRawData(data) {
  try {
    // Try to parse as JSON for better formatting
    const jsonData = JSON.parse(data);
    log(`RAW DATA: ${JSON.stringify(jsonData, null, 2)}`);
    
    // Log specific data types
    if (jsonData.type === 'state' && jsonData.data) {
      // Extract navigation data if available
      if (jsonData.data.navigation) {
        const nav = jsonData.data.navigation;
        log(`NAVIGATION DATA: ${JSON.stringify(nav, null, 2)}`);
      }
      
      // Extract vessel data if available
      if (jsonData.data.vessel) {
        const vessel = jsonData.data.vessel;
        log(`VESSEL DATA: ${JSON.stringify(vessel, null, 2)}`);
      }
    }
  } catch (error) {
    // If not valid JSON, log as-is
    log(`RAW DATA (non-JSON): ${data}`);
  }
  
  log('-'.repeat(40));
}

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

// Connect to the VPS Relay Proxy
function connectToVPS() {
  const token = generateToken();
  const url = `${config.vpsUrl}?token=${token}`;
  
  logSeparator();
  log(`VPS RAW DATA CLIENT - Started at ${new Date().toISOString()}`);
  log(`Connecting to VPS Relay Proxy at ${config.vpsUrl}`);
  log(`Using token for user: ${config.userId}, vessel: ${config.vesselId}`);
  log(`Logging to file: ${config.logFile}`);
  logSeparator();
  
  const ws = new WebSocket(url);
  let messageCount = 0;
  const startTime = Date.now();
  
  ws.on('open', () => {
    log('Connected to VPS Relay Proxy');
    
    // Send a subscription message to receive all data
    const subscriptionMessage = {
      type: 'subscribe',
      paths: ['navigation.*', 'vessel.*', 'environment.*', 'alerts.*']
    };
    
    ws.send(JSON.stringify(subscriptionMessage));
    log('Sent subscription request for all data types');
    log('\nWaiting for data... (Press Ctrl+C to stop)\n');
  });
  
  ws.on('message', (data) => {
    messageCount++;
    
    // Log message number and raw data
    log(`\nMESSAGE #${messageCount}:`);
    logRawData(data.toString());
    
    // Log statistics every 10 messages
    if (messageCount % 10 === 0) {
      const runningTime = Math.round((Date.now() - startTime) / 1000);
      const messagesPerSecond = (messageCount / runningTime).toFixed(2);
      log(`\nSTATS: Received ${messageCount} messages in ${runningTime} seconds (${messagesPerSecond} msg/sec)`);
    }
  });
  
  ws.on('error', (error) => {
    log(`ERROR: WebSocket error: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      log('Could not connect to the VPS Relay Proxy. Make sure it is running and accessible.');
    }
  });
  
  ws.on('close', () => {
    log('Disconnected from VPS Relay Proxy');
    log(`Session summary: Received ${messageCount} messages`);
    
    // Try to reconnect after a delay
    log('Attempting to reconnect in 5 seconds...');
    setTimeout(connectToVPS, 5000);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    log('\nStopping client...');
    ws.close();
    log(`Log file saved to: ${config.logFile}`);
    logStream.end();
    process.exit(0);
  });
}

// Start the client
log('Starting VPS Raw Data Client...');
connectToVPS();
