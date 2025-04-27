// Bridge script to connect your server data to the relay system
import WebSocket from 'ws';
import { vpsConnector } from './server/services/VPSConnector.js';
import fs from 'fs';
import path from 'path';

console.log('Starting server-to-relay bridge...');

// Set up logging
const logFile = path.join(process.cwd(), 'data-flow.log');
fs.writeFileSync(logFile, `=== Data Flow Log Started at ${new Date().toISOString()} ===\n\n`);

function logToFile(message) {
  fs.appendFileSync(logFile, `${message}\n`);
}

// Connect to your local server via WebSocket
const serverWs = new WebSocket('ws://localhost:3000');

// Connect to the VPS Relay Proxy
vpsConnector.config.vpsUrl = 'ws://compendiumnav.com:8081';
vpsConnector.connect();

// Set up event listeners for your server
serverWs.on('open', () => {
  console.log('Connected to local server WebSocket');
  
  // Subscribe to all data
  serverWs.send(JSON.stringify({
    type: 'subscribe',
    paths: ['navigation', 'environment']
  }));
  
  console.log('Sent subscription request to local server');
});

serverWs.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    const logMessage = `[${new Date().toISOString()}] RECEIVED FROM SERVER:\n${JSON.stringify(message, null, 2)}\n`;
    
    console.log('Received data from local server:');
    console.log(JSON.stringify(message, null, 2).substring(0, 300) + '...');
    
    // Log the data
    logToFile(logMessage);
    
    // Forward to VPS
    vpsConnector.send({
      type: 'data',
      data: message
    });
    
    console.log('Forwarded data to VPS Relay Proxy');
    logToFile(`[${new Date().toISOString()}] FORWARDED TO VPS\n`);
  } catch (error) {
    console.error('Error processing server message:', error.message);
    logToFile(`[${new Date().toISOString()}] ERROR: ${error.message}\n`);
  }
});

serverWs.on('error', (error) => {
  console.error('Server WebSocket error:', error.message);
});

serverWs.on('close', () => {
  console.log('Disconnected from local server WebSocket');
});

// Set up event listeners for VPS
vpsConnector.on('connected', () => {
  console.log('Connected to VPS Relay Proxy');
});

vpsConnector.on('disconnected', () => {
  console.log('Disconnected from VPS Relay Proxy');
});

vpsConnector.on('error', (error) => {
  console.error('VPS connection error:', error);
});

vpsConnector.on('message', (message) => {
  console.log('Received message from VPS:', message);
  logToFile(`[${new Date().toISOString()}] RECEIVED FROM VPS:\n${JSON.stringify(message, null, 2)}\n`);
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('Shutting down...');
  serverWs.close();
  vpsConnector.disconnect();
  process.exit(0);
});
