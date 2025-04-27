<template>
  <div class="raw-data-viewer">
    <h2>Raw Navigation Data Viewer</h2>
    
    <div class="connection-status">
      <h3>Connection Status</h3>
      <p><strong>Connected:</strong> {{ isConnected ? 'Yes' : 'No' }}</p>
      <p><strong>Messages Received:</strong> {{ messageCount }}</p>
      <p><strong>Last Update:</strong> {{ lastUpdateFormatted }}</p>
    </div>

    <div class="data-section" v-if="isConnected">
      <h3>Latest Raw Navigation Data</h3>
      <pre>{{ JSON.stringify(latestNavData, null, 2) }}</pre>
      
      <h3>Latest Raw Instrument Data</h3>
      <pre>{{ JSON.stringify(latestInstrumentData, null, 2) }}</pre>
      
      <div class="extracted-data">
        <h3>Extracted Navigation Values</h3>
        <table>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
          <tr>
            <td>Speed</td>
            <td>{{ extractedValues.speed }}</td>
          </tr>
          <tr>
            <td>Course</td>
            <td>{{ extractedValues.course }}</td>
          </tr>
          <tr>
            <td>Heading</td>
            <td>{{ extractedValues.heading }}</td>
          </tr>
        </table>
      </div>
    </div>
    
    <div class="no-data" v-else>
      <p>Not connected to data source</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';

export default {
  name: 'RawDataViewer',
  
  setup() {
    const isConnected = ref(false);
    const messageCount = ref(0);
    const lastUpdate = ref(null);
    const latestNavData = ref(null);
    const latestInstrumentData = ref(null);
    const extractedValues = ref({
      speed: null,
      course: null,
      heading: null
    });
    
    let socket = null;
    
    // Connect directly to the relay server on mount
    onMounted(() => {
      try {
        console.log('[RawDataViewer] Component mounted, connecting to relay server');
        
        // Connect directly to the relay server WebSocket
        const relayServerUrl = 'ws://localhost:3002/relay';
        socket = new WebSocket(relayServerUrl);
        
        socket.onopen = () => {
          console.log('[RawDataViewer] Connected to relay server');
          isConnected.value = true;
          
          // Subscribe to navigation data
          socket.send(JSON.stringify({
            type: 'subscribe',
            channels: ['navigation', 'vessel', 'alerts']
          }));
        };
        
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[RawDataViewer] Raw message received:', data);
            messageCount.value++;
            lastUpdate.value = Date.now();
            
            if (data.type === 'navigation') {
              latestNavData.value = data;
              
              // Extract values from the data structure
              if (data.data) {
                const navData = data.data;
                if (navData.speed !== undefined) extractedValues.value.speed = navData.speed;
                if (navData.course !== undefined) extractedValues.value.course = navData.course;
                if (navData.heading !== undefined) extractedValues.value.heading = navData.heading;
              }
            }
          } catch (error) {
            console.error('[RawDataViewer] Error parsing message:', error);
          }
        };
        
        socket.onerror = (error) => {
          console.error('[RawDataViewer] WebSocket error:', error);
        };
        
        socket.onclose = () => {
          console.log('[RawDataViewer] Connection to relay server closed');
          isConnected.value = false;
        };
      } catch (error) {
        console.error('[RawDataViewer] Failed to connect to relay server:', error);
      }
    });
    
    // Clean up on unmount
    onUnmounted(() => {
      console.log('[RawDataViewer] Component unmounted, cleaning up');
      if (socket) {
        socket.close();
      }
    });
    
    // Format the last update timestamp
    const lastUpdateFormatted = computed(() => {
      if (!lastUpdate.value) return 'Never';
      return new Date(lastUpdate.value).toLocaleTimeString();
    });
    
    return {
      isConnected,
      messageCount,
      lastUpdate,
      lastUpdateFormatted,
      latestNavData,
      latestInstrumentData,
      extractedValues
    };
  }
};
</script>

<style scoped>
.raw-data-viewer {
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

.connection-status {
  background-color: #e0f7fa;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.data-section {
  background-color: #fff;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

pre {
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.no-data {
  background-color: #ffebee;
  padding: 15px;
  border-radius: 4px;
  text-align: center;
  color: #d32f2f;
}

.extracted-data {
  margin-top: 20px;
  background-color: #e8f5e9;
  padding: 15px;
  border-radius: 4px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f2f2f2;
}
</style>
