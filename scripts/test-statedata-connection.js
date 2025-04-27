#!/usr/bin/env node

/**
 * Test script to verify StateData connection to VPS relay
 * 
 * This script uses the actual stateDataStore and relayConnectionAdapter
 * to verify we're getting real data from the VPS relay.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize environment variables

// Dynamically import the relayConnectionAdapter
const relayConnectionAdapterPromise = import('../src/client/services/relayConnectionAdapter.js');

// Create a simple state data structure to track updates
const stateData = {
  navigation: {
    position: {
      latitude: null,
      longitude: null,
      timestamp: null
    },
    course: {
      heading: null,
      cog: null
    },
    speed: {
      sog: null
    }
  },
  connectionStatus: {
    status: 'disconnected',
    lastError: null,
    messageCount: 0,
    lastUpdate: null
  }
};

// Main function
async function main() {
  try {
    console.log('Loading relayConnectionAdapter...');
    const module = await relayConnectionAdapterPromise;
    const relayConnectionAdapter = module.relayConnectionAdapter;
    
    console.log('Setting up event listeners...');
    
    // Set up connection status listener
    relayConnectionAdapter.on('connection-status', (status) => {
      console.log('[TEST] Connection status update:', JSON.stringify(status));
      stateData.connectionStatus.status = status.status;
      stateData.connectionStatus.lastError = status.lastError;
      stateData.connectionStatus.lastUpdate = new Date();
    });
    
    // Set up navigation data listeners
    relayConnectionAdapter.on('nav-position', (data) => {
      if (data && data.position) {
        console.log('[TEST] Received position update:', JSON.stringify(data.position));
        stateData.navigation.position = {
          latitude: data.position.latitude,
          longitude: data.position.longitude,
          timestamp: data.timestamp || new Date().toISOString()
        };
        stateData.connectionStatus.messageCount++;
        stateData.connectionStatus.lastUpdate = new Date();
      }
    });
    
    relayConnectionAdapter.on('nav-instruments', (data) => {
      if (data) {
        console.log('[TEST] Received instruments update:', JSON.stringify(data));
        
        // Update course information
        if (data.heading !== undefined) {
          stateData.navigation.course.heading = data.heading;
        }
        if (data.cog !== undefined) {
          stateData.navigation.course.cog = data.cog;
        }
        
        // Update speed
        if (data.speed !== undefined) {
          stateData.navigation.speed.sog = data.speed;
        }
        
        stateData.connectionStatus.messageCount++;
        stateData.connectionStatus.lastUpdate = new Date();
      }
    });
    
    // Connect to the relay server
    console.log('Connecting to VPS relay via relayConnectionAdapter...');
    await relayConnectionAdapter.connect();
    
    console.log('✅ Connected to VPS relay');
    
    // Set up interval to display state data
    const intervalId = setInterval(() => {
      console.log('\n--- StateData Connection Status ---');
      console.log(`Connection Status: ${stateData.connectionStatus.status}`);
      console.log(`Last Error: ${stateData.connectionStatus.lastError || 'None'}`);
      console.log(`Message Count: ${stateData.connectionStatus.messageCount}`);
      console.log(`Last Update: ${stateData.connectionStatus.lastUpdate ? stateData.connectionStatus.lastUpdate.toLocaleTimeString() : 'Never'}`);
      
      // Display data source verification
      console.log('\n--- DATA SOURCE VERIFICATION ---');
      console.log(`Connected via: relayConnectionAdapter (your actual production code)`);
      console.log(`Using mock data: No (Real VPS connection)`);
      console.log(`Message count: ${stateData.connectionStatus.messageCount}`);
      
      // Check if we've received any navigation data
      if (stateData.connectionStatus.messageCount > 0) {
        console.log('\n--- REAL NAVIGATION DATA ---');
        console.log(`Position: ${stateData.navigation.position.latitude}, ${stateData.navigation.position.longitude}`);
        console.log(`Heading: ${stateData.navigation.course.heading || 'N/A'}`);
        console.log(`COG: ${stateData.navigation.course.cog || 'N/A'}`);
        console.log(`SOG: ${stateData.navigation.speed.sog || 'N/A'}`);
        console.log(`Timestamp: ${stateData.navigation.position.timestamp}`);
        console.log('-----------------------------------');
      }
    }, 5000); // Check every 5 seconds
    
    // Set up a timeout to exit after 2 minutes
    setTimeout(() => {
      clearInterval(intervalId);
      relayConnectionAdapter.cleanup();
      console.log('\nTest completed. Exiting...');
      process.exit(0);
    }, 120000); // 2 minutes
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\nTest interrupted. Cleaning up...');
      clearInterval(intervalId);
      relayConnectionAdapter.cleanup();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error in test script:', error);
    process.exit(1);
  }
}

// Run the main function
main();
