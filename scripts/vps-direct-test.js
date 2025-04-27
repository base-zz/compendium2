#!/usr/bin/env node

/**
 * VPS Direct Test
 * 
 * This script directly connects to the VPS relay server at compendiumnav.com:8081
 * and logs all received data with proper authentication.
 */

import WebSocket from 'ws';
import crypto from 'crypto';
import fs from 'fs';

// Configuration
const config = {
  vpsUrl: 'ws://compendiumnav.com:8081',
  tokenSecret: 'a8f3e6d9c2b5a7f1e4d8c3b6a9f2e5d8',
  userId: 'test-user-1',
  vesselId: 'demo-vessel',
  logFile: './vps-direct-test.log'
};

// Create log file
const logStream = fs.createWriteStream(config.logFile, { flags: 'a' });

// Log function with timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  logStream.write(formattedMessage + '\n');
}

// Generate token
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

// Main function
async function main() {
  log('='.repeat(80));
  log('VPS DIRECT TEST - STARTED');
  log(`Connecting to: ${config.vpsUrl}`);
  log(`User ID: ${config.userId}, Vessel ID: ${config.vesselId}`);
  log('='.repeat(80));
  
  const token = generateToken();
  const url = `${config.vpsUrl}?token=${token}`;
  
  log(`Full connection URL: ${url}`);
  
  const ws = new WebSocket(url);
  let messageCount = 0;
  
  ws.on('open', () => {
    log('✅ WebSocket connection established');
    
    // Try different subscription formats to ensure we get data
    const subscriptions = [
      { type: 'subscribe', paths: ['*'] },
      { type: 'subscribe', paths: ['navigation.*', 'environment.*', 'vessel.*', 'alerts.*'] },
      { action: 'subscribe', paths: ['*'] }
    ];
    
    // Send each subscription
    subscriptions.forEach(subscription => {
      log(`Sending subscription: ${JSON.stringify(subscription)}`);
      ws.send(JSON.stringify(subscription));
    });
    
    // Send a ping every 30 seconds to keep the connection alive
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        log('Sending ping to keep connection alive');
        ws.ping();
      }
    }, 30000);
    
    log('Waiting for data...');
  });
  
  ws.on('message', (data) => {
    messageCount++;
    const rawData = data.toString();
    
    log(`\n[MESSAGE #${messageCount}] RAW DATA:`);
    log(rawData);
    
    try {
      // Try to parse as JSON for additional info
      const jsonData = JSON.parse(rawData);
      log(`[PARSED] Message type: ${jsonData.type || jsonData.action || 'unknown'}`);
      
      if (jsonData.data) {
        const keys = Object.keys(jsonData.data);
        log(`[PARSED] Data keys: ${keys.join(', ')}`);
      }
    } catch (error) {
      log(`[ERROR] Could not parse as JSON: ${error.message}`);
    }
    
    log('-'.repeat(40));
  });
  
  ws.on('error', (error) => {
    log(`❌ WebSocket error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      log('Connection refused. Make sure the VPS Relay Proxy is running.');
    }
  });
  
  ws.on('close', (code, reason) => {
    log(`WebSocket connection closed. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
    log(`Total messages received: ${messageCount}`);
    log('Attempting to reconnect in 5 seconds...');
    
    setTimeout(main, 5000);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    log('\nShutting down...');
    ws.close();
    logStream.end();
    process.exit(0);
  });
}

// Start the test
main();
