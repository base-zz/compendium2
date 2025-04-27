#!/usr/bin/env node

/**
 * Direct VPS Connection
 * 
 * This script establishes a direct WebSocket connection to the VPS relay server
 * with minimal abstractions and logs all received data.
 */

import WebSocket from 'ws';
import crypto from 'crypto';
import fs from 'fs';
import { promisify } from 'util';

// Configuration
const config = {
  vpsUrl: process.env.VPS_RELAY_URL || 'ws://compendiumnav.com:8081',
  tokenSecret: 'a8f3e6d9c2b5a7f1e4d8c3b6a9f2e5d8',
  userId: 'test-user-1',
  vesselId: 'demo-vessel',
  logFile: './direct-vps-connection.log'
};

// Create log file
const logStream = fs.createWriteStream(config.logFile, { flags: 'a' });
const sleep = promisify(setTimeout);

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

// Connect to VPS relay server
async function connectToVPS() {
  try {
    log('='.repeat(80));
    log('DIRECT VPS CONNECTION - STARTED');
    log(`Connecting to: ${config.vpsUrl}`);
    log(`User ID: ${config.userId}, Vessel ID: ${config.vesselId}`);
    log('='.repeat(80));
    
    const token = generateToken();
    const url = `${config.vpsUrl}?token=${token}`;
    
    log(`Full connection URL: ${url}`);
    
    // Create WebSocket connection
    const ws = new WebSocket(url);
    let messageCount = 0;
    
    // Handle connection open
    ws.on('open', () => {
      log('✅ WebSocket connection established');
      
      // Try different subscription formats
      const subscriptions = [
        { type: 'subscribe', paths: ['*'] },
        { type: 'subscribe', paths: ['navigation.*', 'environment.*', 'vessel.*', 'alerts.*'] },
        { type: 'subscribe', paths: ['navigation.position'] },
        { type: 'subscribe', paths: ['navigation.position', 'navigation.speedOverGround'] },
        { action: 'subscribe', paths: ['*'] },
        { action: 'subscribe', paths: ['navigation.*'] }
      ];
      
      // Send each subscription with a delay
      (async () => {
        for (const subscription of subscriptions) {
          log(`Sending subscription: ${JSON.stringify(subscription)}`);
          ws.send(JSON.stringify(subscription));
          await sleep(1000); // Wait 1 second between subscriptions
        }
        log('All subscriptions sent. Waiting for data...');
      })();
    });
    
    // Handle incoming messages
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
    
    // Handle errors
    ws.on('error', (error) => {
      log(`❌ WebSocket error: ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        log('Connection refused. Make sure the VPS Relay Proxy is running.');
      }
    });
    
    // Handle connection close
    ws.on('close', (code, reason) => {
      log(`WebSocket connection closed. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
      log(`Total messages received: ${messageCount}`);
      log('Attempting to reconnect in 5 seconds...');
      
      setTimeout(connectToVPS, 5000);
    });
    
    // Send a ping every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        log('Sending ping to keep connection alive');
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
    
    // Handle process termination
    process.on('SIGINT', () => {
      log('\nShutting down...');
      clearInterval(pingInterval);
      ws.close();
      logStream.end();
      process.exit(0);
    });
    
    return ws;
  } catch (error) {
    log(`❌ Error connecting to VPS: ${error.message}`);
    log('Attempting to reconnect in 5 seconds...');
    setTimeout(connectToVPS, 5000);
  }
}

// Start the connection
connectToVPS();
