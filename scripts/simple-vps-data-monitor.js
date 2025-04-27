#!/usr/bin/env node

/**
 * Simple VPS Data Monitor
 * 
 * A minimal script to monitor raw data coming from the VPS relay server.
 * No processing, just direct logging of all received messages.
 */

import { WebSocket } from 'ws';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const RELAY_URL = process.env.VPS_RELAY_URL || 'ws://localhost:3002/relay';
const RELAY_TOKEN = process.env.VPS_RELAY_TOKEN || '';

console.log('\n=== SIMPLE VPS DATA MONITOR ===');
console.log(`Connecting to: ${RELAY_URL}`);
console.log(`Using token: ${RELAY_TOKEN ? 'Yes' : 'No'}`);
console.log('===============================\n');

// Connect to the relay server
const socket = new WebSocket(RELAY_TOKEN ? `${RELAY_URL}?token=${RELAY_TOKEN}` : RELAY_URL);
let messageCount = 0;
const startTime = Date.now();

// Connection opened
socket.on('open', () => {
  console.log('✅ Connected to VPS relay server');
  
  // Subscribe to all data channels
  const subscribeMessage = {
    type: 'subscribe',
    channels: ['navigation', 'vessel', 'alerts', 'environment', 'external']
  };
  
  socket.send(JSON.stringify(subscribeMessage));
  console.log('Subscribed to all data channels');
  console.log('\nWaiting for data... (Press Ctrl+C to exit)\n');
});

// Listen for messages
socket.on('message', (data) => {
  messageCount++;
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  
  console.log(`\n[${timeString}] MESSAGE #${messageCount}:`);
  
  try {
    // Try to parse as JSON for prettier display
    const jsonData = JSON.parse(data);
    console.log(JSON.stringify(jsonData, null, 2));
    
    // Show message type and data summary
    if (jsonData.type) {
      console.log(`\nMessage Type: ${jsonData.type}`);
      
      if (jsonData.data) {
        // Show a compact summary of the data
        const keys = Object.keys(jsonData.data);
        console.log(`Data Keys: ${keys.join(', ')}`);
      }
    }
  } catch (e) {
    // If not valid JSON, show raw data
    console.log(`Raw data: ${data}`);
  }
  
  // Show simple stats every 5 messages
  if (messageCount % 5 === 0) {
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    const rate = (messageCount / elapsedSeconds).toFixed(2);
    console.log(`\n--- Stats: ${messageCount} messages in ${elapsedSeconds}s (${rate} msg/sec) ---`);
  }
});

// Handle errors
socket.on('error', (error) => {
  console.error(`\n❌ WebSocket error: ${error.message}`);
});

// Connection closed
socket.on('close', () => {
  console.log('\nConnection closed');
  console.log(`Total messages received: ${messageCount}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nStopping monitor...');
  socket.close();
  process.exit(0);
});
