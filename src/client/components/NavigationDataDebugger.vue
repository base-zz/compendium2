<template>
  <div class="navigation-debugger">
    <h2>Navigation Data Debugger</h2>
    
    <div class="connection-info">
      <h3>Connection Status</h3>
      <p><strong>WebSocket:</strong> {{ wsStatus }}</p>
      <p><strong>Messages Received:</strong> {{ messageCount }}</p>
      <p><strong>Last Update:</strong> {{ lastUpdateFormatted }}</p>
    </div>
    
    <div class="data-comparison" v-if="hasData">
      <div class="data-column">
        <h3>Raw Navigation Data (From Relay)</h3>
        <pre>{{ JSON.stringify(rawNavData, null, 2) }}</pre>
      </div>
      
      <div class="data-column">
        <h3>Expected Format (For stateDataStore)</h3>
        <pre>{{ JSON.stringify(expectedFormat, null, 2) }}</pre>
      </div>
    </div>
    
    <div class="data-analysis" v-if="hasData">
      <h3>Data Format Analysis</h3>
      <div class="analysis-result" :class="{ 'has-error': hasFormatMismatch }">
        <p v-if="hasFormatMismatch" class="error-message">
          <strong>Format Mismatch Detected:</strong> {{ formatMismatchReason }}
        </p>
        <p v-else class="success-message">
          <strong>Data Format Matches Expected Structure</strong>
        </p>
      </div>
      
      <div class="missing-fields" v-if="missingFields.length > 0">
        <h4>Missing Fields in Received Data:</h4>
        <ul>
          <li v-for="(field, index) in missingFields" :key="index">
            <code>{{ field }}</code>
          </li>
        </ul>
      </div>
    </div>
    
    <div class="no-data" v-if="!hasData">
      <p>Waiting for navigation data from relay server...</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'NavigationDataDebugger',
  
  setup() {
    // State
    const socket = ref(null);
    const wsStatus = ref('Disconnected');
    const messageCount = ref(0);
    const lastUpdate = ref(null);
    const rawNavData = ref(null);
    
    // The expected format for the stateDataStore
    const expectedFormat = {
      position: {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 0,
        timestamp: new Date().toISOString()
      },
      headingMagnetic: 180,
      speedOverGround: 5
    };
    
    // Connect to the relay server
    const connectToRelay = () => {
      try {
        const relayUrl = 'ws://localhost:3002/relay';
        wsStatus.value = 'Connecting...';
        
        socket.value = new WebSocket(relayUrl);
        
        socket.value.onopen = () => {
          console.log('[NavigationDebugger] Connected to relay server');
          wsStatus.value = 'Connected';
          
          // Subscribe to navigation data
          socket.value.send(JSON.stringify({
            type: 'subscribe',
            channels: ['navigation']
          }));
        };
        
        socket.value.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            messageCount.value++;
            lastUpdate.value = new Date();
            
            // Only process navigation data
            if (message.type === 'navigation') {
              console.log('[NavigationDebugger] Received navigation data:', message);
              rawNavData.value = message;
            }
          } catch (error) {
            console.error('[NavigationDebugger] Error parsing message:', error);
          }
        };
        
        socket.value.onerror = (error) => {
          console.error('[NavigationDebugger] WebSocket error:', error);
          wsStatus.value = 'Error: ' + (error.message || 'Unknown error');
        };
        
        socket.value.onclose = () => {
          console.log('[NavigationDebugger] Connection closed');
          wsStatus.value = 'Disconnected';
        };
      } catch (error) {
        console.error('[NavigationDebugger] Error connecting to relay server:', error);
        wsStatus.value = 'Error: ' + error.message;
      }
    };
    
    // Computed properties for analysis
    const hasData = computed(() => !!rawNavData.value);
    
    const hasFormatMismatch = computed(() => {
      if (!rawNavData.value) return false;
      
      // Check if the data has the expected structure
      if (!rawNavData.value.data) return true;
      if (!rawNavData.value.data.position && expectedFormat.position) return true;
      
      return false;
    });
    
    const formatMismatchReason = computed(() => {
      if (!rawNavData.value) return '';
      
      if (!rawNavData.value.data) {
        return "The received data doesn't have a 'data' property";
      }
      
      if (!rawNavData.value.data.position && expectedFormat.position) {
        return "The received data doesn't have a 'data.position' property";
      }
      
      return '';
    });
    
    const missingFields = computed(() => {
      if (!rawNavData.value || !rawNavData.value.data) return [];
      
      const missing = [];
      
      // Check for missing position fields
      if (!rawNavData.value.data.position) {
        missing.push('data.position');
      }
      
      // Check for missing instrument fields
      if (expectedFormat.headingMagnetic && !rawNavData.value.data.headingMagnetic) {
        missing.push('data.headingMagnetic');
      }
      
      if (expectedFormat.speedOverGround && !rawNavData.value.data.speedOverGround) {
        missing.push('data.speedOverGround');
      }
      
      return missing;
    });
    
    // Format the last update time
    const lastUpdateFormatted = computed(() => {
      if (!lastUpdate.value) return 'Never';
      return lastUpdate.value.toLocaleTimeString();
    });
    
    // Connect on mount
    onMounted(() => {
      console.log('[NavigationDebugger] Component mounted');
      connectToRelay();
    });
    
    // Clean up on unmount
    onUnmounted(() => {
      console.log('[NavigationDebugger] Component unmounted');
      if (socket.value) {
        socket.value.close();
      }
    });
    
    return {
      wsStatus,
      messageCount,
      lastUpdateFormatted,
      rawNavData,
      expectedFormat,
      hasData,
      hasFormatMismatch,
      formatMismatchReason,
      missingFields
    };
  }
};
</script>

<style scoped>
.navigation-debugger {
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  max-width: 100%;
  overflow-x: auto;
}

h2 {
  color: #333;
  margin-top: 0;
}

h3 {
  color: #555;
  margin-top: 20px;
  margin-bottom: 10px;
}

.connection-info {
  background-color: #e0f7fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.data-comparison {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.data-column {
  flex: 1;
  background-color: #fff;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

pre {
  background-color: #f8f8f8;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.9em;
  max-height: 300px;
  overflow-y: auto;
}

.data-analysis {
  background-color: #fff;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.analysis-result {
  padding: 10px;
  border-radius: 4px;
}

.has-error {
  background-color: #ffebee;
}

.error-message {
  color: #d32f2f;
}

.success-message {
  color: #2e7d32;
}

.missing-fields {
  margin-top: 15px;
  background-color: #fff3e0;
  padding: 10px 15px;
  border-radius: 4px;
}

.missing-fields h4 {
  margin-top: 0;
  color: #e65100;
}

.missing-fields ul {
  padding-left: 20px;
}

.missing-fields code {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}

.no-data {
  background-color: #e8eaf6;
  padding: 15px;
  border-radius: 4px;
  text-align: center;
  color: #3f51b5;
}
</style>
