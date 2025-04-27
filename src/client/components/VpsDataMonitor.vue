<template>
  <div class="vps-data-monitor">
    <h2>VPS Relay Data Monitor</h2>
    
    <div class="connection-info">
      <h3>Connection Information</h3>
      <p><strong>Status:</strong> {{ connectionStatus }}</p>
      <p><strong>Messages Received:</strong> {{ messageCount }}</p>
      <p><strong>Last Update:</strong> {{ lastUpdateFormatted }}</p>
    </div>
    
    <div class="navigation-data" v-if="navigationData">
      <h3>Navigation Data</h3>
      <div class="data-grid">
        <div class="data-item" v-if="navigationData.position">
          <div class="data-label">Position</div>
          <div class="data-value">
            {{ formatCoordinate(navigationData.position.latitude, 'lat') }}, 
            {{ formatCoordinate(navigationData.position.longitude, 'lon') }}
          </div>
        </div>
        
        <div class="data-item" v-if="navigationData.heading !== undefined">
          <div class="data-label">Heading</div>
          <div class="data-value">{{ formatNumber(navigationData.heading) }}°</div>
        </div>
        
        <div class="data-item" v-if="navigationData.depth && navigationData.depth.belowTransducer !== undefined">
          <div class="data-label">Depth</div>
          <div class="data-value">{{ formatNumber(navigationData.depth.belowTransducer) }} m</div>
        </div>
        
        <div class="data-item" v-if="navigationData.wind">
          <div class="data-label">Wind</div>
          <div class="data-value">
            {{ formatNumber(navigationData.wind.speedApparent) }} kts at 
            {{ formatNumber(radiansToDegrees(navigationData.wind.angleApparent)) }}°
          </div>
        </div>
        
        <div class="data-item" v-if="navigationData.attitude">
          <div class="data-label">Attitude</div>
          <div class="data-value">
            Roll: {{ formatNumber(radiansToDegrees(navigationData.attitude.roll)) }}°, 
            Pitch: {{ formatNumber(radiansToDegrees(navigationData.attitude.pitch)) }}°
          </div>
        </div>
      </div>
    </div>
    
    <div class="raw-data-section" v-if="rawMessages.length > 0">
      <h3>Raw Messages (Most Recent First)</h3>
      <div class="message-list">
        <div v-for="(message, index) in rawMessages" :key="index" class="message-item">
          <div class="message-header">
            <span class="message-type">{{ message.type || 'Unknown Type' }}</span>
            <span class="message-time">{{ formatTime(message.receivedAt) }}</span>
          </div>
          <pre class="message-content">{{ JSON.stringify(message.data, null, 2) }}</pre>
        </div>
      </div>
    </div>
    
    <div class="no-data" v-if="rawMessages.length === 0">
      <p>No messages received yet. Make sure your VPS relay server is running.</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'VpsDataMonitor',
  
  setup() {
    // State
    const socket = ref(null);
    const isConnected = ref(false);
    const connectionStatus = ref('Disconnected');
    const messageCount = ref(0);
    const lastUpdate = ref(null);
    const rawMessages = ref([]);
    const navigationData = ref(null);
    const maxMessages = 10; // Keep only the last 10 messages
    
    // Configuration
    const config = {
      vpsUrl: 'ws://compendiumnav.com:8081',
      tokenSecret: 'a8f3e6d9c2b5a7f1e4d8c3b6a9f2e5d8',
      userId: 'test-user-1',
      vesselId: 'demo-vessel'
    };
    
    // Note: Token generation is handled server-side in production
    // This is just a placeholder for the client-side implementation
    
    // Connect to the VPS relay server
    const connectToVpsRelay = () => {
      try {
        // For testing in browser, use a hardcoded token
        // In production, tokens should be generated server-side
        const token = "eyJwYXlsb2FkIjp7InN1YiI6InRlc3QtdXNlci0xIiwidmVzc2VsSWQiOiJkZW1vLXZlc3NlbCIsIm5hbWUiOiJ0ZXN0LXVzZXItMSIsImlhdCI6MTc0NDAzNzQ1MywiZXhwIjoxNzQ0MDQxMDUzfSwic2lnbmF0dXJlIjoiNjIxMzNkODFjNGJlZTRjZmNmYzAxMDdiOTU5Nzg2N2U5MjM5YzU2YTA2NzU1NDE1N2NiMzQxOTBhYTVmNzg0NSJ9";
        const relayUrl = `${config.vpsUrl}?token=${token}`;
        
        console.log('[VpsDataMonitor] Connecting to VPS relay server at:', config.vpsUrl);
        connectionStatus.value = 'Connecting...';
        
        socket.value = new WebSocket(relayUrl);
        
        socket.value.onopen = () => {
          console.log('[VpsDataMonitor] Connected to VPS relay server');
          isConnected.value = true;
          connectionStatus.value = 'Connected';
          
          // Subscribe to all paths
          const subscribeMessage = {
            type: 'subscribe',
            paths: ['*']
          };
          
          socket.value.send(JSON.stringify(subscribeMessage));
          console.log('[VpsDataMonitor] Subscribed to all paths');
        };
        
        socket.value.onmessage = (event) => {
          try {
            // Check if the data is a Blob (binary data)
            if (event.data instanceof Blob) {
              // Convert Blob to text
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const jsonText = reader.result;
                  const message = JSON.parse(jsonText);
                  processMessage(message);
                } catch (error) {
                  console.error('[VpsDataMonitor] Error parsing Blob data:', error);
                }
              };
              reader.readAsText(event.data);
            } else {
              // Handle text data directly
              const message = JSON.parse(event.data);
              processMessage(message);
            }
          } catch (error) {
            console.error('[VpsDataMonitor] Error processing message:', error);
          }
        };
        
        socket.value.onerror = (error) => {
          console.error('[VpsDataMonitor] WebSocket error:', error);
          connectionStatus.value = 'Error: ' + (error.message || 'Unknown error');
        };
        
        socket.value.onclose = () => {
          console.log('[VpsDataMonitor] Connection closed');
          isConnected.value = false;
          connectionStatus.value = 'Disconnected';
          
          // Try to reconnect after a delay
          setTimeout(() => {
            if (!isConnected.value) {
              console.log('[VpsDataMonitor] Attempting to reconnect...');
              connectToVpsRelay();
            }
          }, 5000);
        };
      } catch (error) {
        console.error('[VpsDataMonitor] Error connecting to VPS relay server:', error);
        connectionStatus.value = 'Error: ' + error.message;
      }
    };
    
    // Helper function to process parsed messages
    const processMessage = (message) => {
      console.log('[VpsDataMonitor] Received message:', message);
      
      // Update stats
      messageCount.value++;
      lastUpdate.value = new Date();
      
      // Add to raw messages list (at the beginning)
      rawMessages.value.unshift({
        type: message.type,
        data: message,
        receivedAt: new Date()
      });
      
      // Limit the number of messages we keep
      if (rawMessages.value.length > maxMessages) {
        rawMessages.value = rawMessages.value.slice(0, maxMessages);
      }
      
      // Update navigation data if this is a navigation message
      if (message.type === 'navigation' && message.data) {
        navigationData.value = message.data;
      }
    };
    
    // Format the last update time
    const lastUpdateFormatted = computed(() => {
      if (!lastUpdate.value) return 'Never';
      return formatTime(lastUpdate.value);
    });
    
    // Helper to format time
    const formatTime = (time) => {
      if (!time) return '';
      const date = new Date(time);
      return date.toLocaleTimeString();
    };
    
    // Helper to format numbers
    const formatNumber = (value) => {
      if (value === undefined || value === null) return 'N/A';
      return Number(value).toFixed(2);
    };
    
    // Helper to format coordinates
    const formatCoordinate = (value, type) => {
      if (value === undefined || value === null) return 'N/A';
      const formatted = Number(value).toFixed(6);
      return `${formatted}° ${type === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W')}`;
    };
    
    // Helper to convert radians to degrees
    const radiansToDegrees = (radians) => {
      if (radians === undefined || radians === null) return 0;
      return radians * (180 / Math.PI);
    };
    
    // Connect on mount
    onMounted(() => {
      console.log('[VpsDataMonitor] Component mounted');
      connectToVpsRelay();
    });
    
    // Clean up on unmount
    onUnmounted(() => {
      console.log('[VpsDataMonitor] Component unmounted');
      if (socket.value && socket.value.readyState === WebSocket.OPEN) {
        socket.value.close();
      }
    });
    
    return {
      connectionStatus,
      messageCount,
      lastUpdate,
      lastUpdateFormatted,
      rawMessages,
      navigationData,
      formatTime,
      formatNumber,
      formatCoordinate,
      radiansToDegrees
    };
  }
};
</script>

<style scoped>
.vps-data-monitor {
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  max-width: 100%;
  overflow-x: auto;
  font-family: Arial, sans-serif;
}

h2 {
  color: #2c3e50;
  margin-top: 0;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
}

h3 {
  color: #2c3e50;
  margin-top: 20px;
  margin-bottom: 10px;
}

.connection-info {
  background-color: #e0f7fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navigation-data {
  background-color: #fff;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.data-item {
  background-color: #f8f8f8;
  padding: 12px;
  border-radius: 4px;
  border-left: 4px solid #3498db;
}

.data-label {
  font-weight: bold;
  color: #7f8c8d;
  margin-bottom: 5px;
  font-size: 0.9em;
  text-transform: uppercase;
}

.data-value {
  font-size: 1.2em;
  color: #2c3e50;
}

.raw-data-section {
  background-color: #fff;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.message-list {
  max-height: 400px;
  overflow-y: auto;
}

.message-item {
  margin-bottom: 15px;
  background-color: #f8f8f8;
  border-radius: 4px;
  overflow: hidden;
  border-left: 4px solid #e74c3c;
}

.message-header {
  display: flex;
  justify-content: space-between;
  background-color: #eee;
  padding: 8px 12px;
  font-size: 0.9em;
}

.message-type {
  font-weight: bold;
  color: #e74c3c;
}

.message-time {
  color: #7f8c8d;
}

.message-content {
  padding: 12px;
  margin: 0;
  font-size: 0.9em;
  overflow-x: auto;
  background-color: #f8f8f8;
}

.no-data {
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
  text-align: center;
  color: #7f8c8d;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
