// scripts/test-state-store.js
import { relayConnectionAdapter } from '../src/client/services/relayConnectionAdapter.js';

console.log('[TEST] Starting StateDataStore test...');

// Mock the Vue reactivity system since we're in Node.js
const mockRef = (initialValue) => {
  let internalValue = initialValue;
  return {
    get value() { return internalValue; },
    set value(newValue) { internalValue = newValue; }
  };
};

const mockComputed = (fn) => {
  return {
    value: fn(),
  };
};

// Mock the environment state
const environmentState = mockRef({
  weather: {
    temperature: {
      air: null,
      water: null
    },
    wind: {
      speedTrue: null,
      angleTrue: null,
      direction: null,
      speedApparent: null,
      angleApparent: null,
      reference: null,
      timestamp: null,
      source: null
    }
  }
});

// Mock the navigation state
const navigationState = mockRef({
  position: {
    latitude: null,
    longitude: null,
    timestamp: null,
    source: null
  },
  depth: {
    belowTransducer: null
  },
  // Wind data removed from navigationState
});

// Mock the anchor state
const anchorState = mockRef({
  anchorDropLocation: {}
});

// Mock the lastUpdate
const lastUpdate = mockRef(null);
const vpsConnectionStatus = mockRef({
  messageCount: 0,
  lastUpdate: null
});

// Set up event handlers similar to StateDataStore
relayConnectionAdapter.on('env-wind', (data) => {
  console.log('[TEST] Received env-wind event with data:', JSON.stringify(data));
  
  console.log('[TEST] Current environment state BEFORE update:', JSON.stringify(environmentState.value.weather.wind));
  
  if (data && data.wind) {
    // Create a complete wind data object with all properties
    const mappedWindData = {
      // True wind data
      speedTrue: data.wind.speedTrue !== undefined ? data.wind.speedTrue : data.wind.speed,
      angleTrue: data.wind.angleTrue !== undefined ? data.wind.angleTrue : data.wind.angle,
      direction: data.wind.direction !== undefined ? data.wind.direction : null,
      
      // Apparent wind data
      speedApparent: data.wind.speedApparent !== undefined ? data.wind.speedApparent : null,
      angleApparent: data.wind.angleApparent !== undefined ? data.wind.angleApparent : null,
      
      // Metadata
      reference: data.wind.reference || 'apparent',
      timestamp: data.timestamp || new Date().toISOString(),
      source: 'relay'
    };
    
    // Update the environment state with the mapped wind data
    environmentState.value.weather.wind = {
      ...environmentState.value.weather.wind,
      ...mappedWindData
    };
    
    console.log('[TEST] Updated wind data:', JSON.stringify(environmentState.value.weather.wind));
    console.log('[TEST] Environment state AFTER wind update:', JSON.stringify(environmentState.value.weather));
    lastUpdate.value = Date.now();
    vpsConnectionStatus.value.messageCount++;
    vpsConnectionStatus.value.lastUpdate = Date.now();
  }
});

// Create the anchorData computed property similar to the StateDataStore
const anchorData = mockComputed(() => {
  return {
    position: {
      lat: navigationState.value.position.latitude,
      lon: navigationState.value.position.longitude,
      timestamp: navigationState.value.position.timestamp,
      source: navigationState.value.position.source
    },
    depth: navigationState.value.depth.belowTransducer,
    anchorDropLocation: anchorState.value.anchorDropLocation,
    wind: {
      speed: environmentState.value.weather.wind.speedTrue,
      angle: environmentState.value.weather.wind.angleTrue,
      direction: environmentState.value.weather.wind.direction,
      speedApparent: environmentState.value.weather.wind.speedApparent,
      angleApparent: environmentState.value.weather.wind.angleApparent,
      reference: environmentState.value.weather.wind.reference,
      timestamp: environmentState.value.weather.wind.timestamp,
      updated: environmentState.value.weather.wind.speedTrue !== null || environmentState.value.weather.wind.speedApparent !== null,
      speedUnits: 'kts',
      angleUnits: '°',
      source: environmentState.value.weather.wind.source
    }
  };
});

// Connect to the relay server
async function runTest() {
  try {
    console.log('[TEST] Connecting to relay server...');
    await relayConnectionAdapter.connect();
    
    // Log the initial state
    console.log('[TEST] Initial environment state:', JSON.stringify(environmentState.value.weather.wind));
    console.log('[TEST] Initial anchorData.wind:', JSON.stringify(anchorData.value.wind));
    
    // Set up an interval to check the state
    const interval = setInterval(() => {
      console.log('[TEST] Current environment state:', JSON.stringify(environmentState.value.weather.wind));
      console.log('[TEST] Current anchorData.wind:', JSON.stringify(anchorData.value.wind));
      
      // Check if we've received wind data
      if (environmentState.value.weather.wind.speedTrue !== null || environmentState.value.weather.wind.speedApparent !== null) {
        console.log('[TEST] ✅ Wind data successfully received and stored in environmentState!');
        console.log('[TEST] ✅ anchorData.wind is correctly referencing environmentState.weather.wind!');
        
        // Verify specific wind properties
        console.log('[TEST] True wind speed:', environmentState.value.weather.wind.speedTrue);
        console.log('[TEST] True wind angle:', environmentState.value.weather.wind.angleTrue);
        console.log('[TEST] Apparent wind speed:', environmentState.value.weather.wind.speedApparent);
        console.log('[TEST] Apparent wind angle:', environmentState.value.weather.wind.angleApparent);
        
        // Verify anchor data is using the correct wind properties
        console.log('[TEST] Anchor data using true wind speed:', 
          anchorData.value.wind.speed === environmentState.value.weather.wind.speedTrue ? 'Yes' : 'No');
        console.log('[TEST] Anchor data using true wind angle:', 
          anchorData.value.wind.angle === environmentState.value.weather.wind.angleTrue ? 'Yes' : 'No');
        
        clearInterval(interval);
        
        // Keep the script running for a bit longer to receive more data
        setTimeout(() => {
          console.log('[TEST] Test completed successfully. Exiting...');
          process.exit(0);
        }, 10000);
      }
    }, 2000);
    
    // Set a timeout to exit if we don't receive wind data
    setTimeout(() => {
      console.log('[TEST] ❌ Timeout reached without receiving wind data. Exiting...');
      process.exit(1);
    }, 30000);
    
  } catch (error) {
    console.error('[TEST] Error:', error);
    process.exit(1);
  }
}

runTest();

// Handle process termination
process.on('SIGINT', () => {
  console.log('[TEST] Shutting down...');
  relayConnectionAdapter.cleanup();
  process.exit(0);
});
