<template>
  <div class="relay-data-inspector">
    <h2>Relay Data Inspector</h2>
    
    <div class="connection-info">
      <h3>Connection Information</h3>
      <p><strong>Status:</strong> {{ connectionStatus }}</p>
      <p><strong>Messages Received:</strong> {{ messageCount }}</p>
      <p><strong>Last Update:</strong> {{ lastUpdateFormatted }}</p>
    </div>
    
    <div class="data-section" v-if="rawMessages.length > 0">
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
    
    <div class="no-data" v-else>
      <p>No messages received yet. Make sure your relay server is running.</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'RelayDataInspector',
  
  setup() {
    // State
    const socket = ref(null);
    const isConnected = ref(false);
    const connectionStatus = ref('Disconnected');
    const messageCount = ref(0);
    const lastUpdate = ref(null);
    const rawMessages = ref([]);
    const maxMessages = 10; // Keep only the last 10 messages
    
    // Connect to the relay server
    const connectToRelay = () => {
      try {
        // Use the same WebSocket URL that your app is configured to use
        const relayUrl = 'ws://localhost:3002/relay';
        
        console.log('[RelayDataInspector] Connecting to relay server at:', relayUrl);
        connectionStatus.value = 'Connecting...';
        
        socket.value = new WebSocket(relayUrl);
        
        socket.value.onopen = () => {
          console.log('[RelayDataInspector] Connected to relay server');
          isConnected.value = true;
          connectionStatus.value = 'Connected';
          
          // Subscribe to all channels
          const subscribeMessage = {
            type: 'subscribe',
            channels: ['navigation', 'vessel', 'alert']
          };
          
          socket.value.send(JSON.stringify(subscribeMessage));
          console.log('[RelayDataInspector] Subscribed to channels:', subscribeMessage.channels);
        };
        
        socket.value.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('[RelayDataInspector] Received message:', message);
            
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
          } catch (error) {
            console.error('[RelayDataInspector] Error parsing message:', error);
          }
        };
        
        socket.value.onerror = (error) => {
          console.error('[RelayDataInspector] WebSocket error:', error);
          connectionStatus.value = 'Error: ' + (error.message || 'Unknown error');
        };
        
        socket.value.onclose = () => {
          console.log('[RelayDataInspector] Connection closed');
          isConnected.value = false;
          connectionStatus.value = 'Disconnected';
        };
      } catch (error) {
        console.error('[RelayDataInspector] Error connecting to relay server:', error);
        connectionStatus.value = 'Error: ' + error.message;
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
    
    // Connect on mount
    onMounted(() => {
      console.log('[RelayDataInspector] Component mounted');
      connectToRelay();
    });
    
    // Clean up on unmount
    onUnmounted(() => {
      console.log('[RelayDataInspector] Component unmounted');
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
      formatTime
    };
  }
};
</script>

<style scoped>
.relay-data-inspector {
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

.data-section {
  background-color: #fff;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message-list {
  max-height: 600px;
  overflow-y: auto;
}

.message-item {
  margin-bottom: 15px;
  background-color: #f8f8f8;
  border-radius: 4px;
  overflow: hidden;
}

.message-header {
  display: flex;
  justify-content: space-between;
  background-color: #e8eaf6;
  padding: 8px 12px;
  font-size: 0.9em;
}

.message-type {
  font-weight: bold;
  color: #3f51b5;
}

.message-time {
  color: #666;
}

.message-content {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  background-color: #f8f8f8;
  font-size: 0.9em;
}

.no-data {
  background-color: #ffebee;
  padding: 15px;
  border-radius: 4px;
  text-align: center;
  color: #d32f2f;
}
</style>
