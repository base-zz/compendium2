/**
 * Generate Mock Wind Data Script
 * 
 * This script generates mock wind data and sends it to the StateDataStore
 * to help with testing the UI components.
 */

import { useStateDataStore } from '../src/client/stores/stateDataStore.js';

// Generate random number between min and max
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// Generate mock wind data
function generateMockWindData() {
  return {
    speedTrue: randomBetween(5, 15).toFixed(1),
    angleTrue: randomBetween(0, 360).toFixed(1),
    speedApparent: randomBetween(6, 18).toFixed(1),
    angleApparent: randomBetween(0, 360).toFixed(1),
    direction: randomBetween(0, 360).toFixed(1),
    reference: 'true',
    timestamp: new Date().toISOString(),
    source: 'mock'
  };
}

// Main function to update the StateDataStore with mock wind data
async function updateStateDataWithMockWind() {
  try {
    console.log('Initializing StateDataStore...');
    const stateDataStore = useStateDataStore();
    
    // Check if the store is initialized
    if (!stateDataStore) {
      console.error('Failed to initialize StateDataStore');
      return;
    }
    
    console.log('StateDataStore initialized successfully');
    
    // Generate and update wind data every 2 seconds
    setInterval(() => {
      const mockWindData = generateMockWindData();
      console.log('Generated mock wind data:', mockWindData);
      
      // Update the environment state with the mock wind data
      stateDataStore.environmentState.weather.wind = {
        ...stateDataStore.environmentState.weather.wind,
        ...mockWindData
      };
      
      console.log('Updated StateDataStore with mock wind data');
      console.log('Current wind data in store:', stateDataStore.environmentState.weather.wind);
    }, 2000);
    
    console.log('Mock wind data generator started');
  } catch (error) {
    console.error('Error in mock wind data generator:', error);
  }
}

// Run the main function
updateStateDataWithMockWind();
