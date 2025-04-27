<template>
  <div class="connection-status-example">
    <h2>VPS Connection Status</h2>
    
    <div class="status-container">
      <ConnectionStatusIndicator :showDetails="true" />
    </div>
    
    <div class="controls">
      <button @click="initializeRelayMode" :disabled="isConnected">Connect to VPS</button>
      <button @click="disconnectRelay" :disabled="!isConnected">Disconnect</button>
    </div>
    
    <div v-if="isConnected" class="data-display">
      <h3>Real-Time VPS Data</h3>
      
      <div class="data-section connection-section">
        <h4>Connection Status</h4>
        <div class="data-grid">
          <div class="data-item">
            <span class="label">Status:</span>
            <span class="value status-badge" :class="connectionStatusClass">{{ vpsConnectionStatus.status }}</span>
          </div>
          <div class="data-item">
            <span class="label">Messages Received:</span>
            <span class="value message-count">{{ vpsConnectionStatus.messageCount || 0 }}</span>
          </div>
          <div class="data-item">
            <span class="label">Last Update:</span>
            <span class="value">{{ formatTime(vpsConnectionStatus.lastUpdate) }}</span>
          </div>
          <div v-if="vpsConnectionStatus.lastError" class="data-item error">
            <span class="label">Error:</span>
            <span class="value">{{ vpsConnectionStatus.lastError }}</span>
          </div>
        </div>
      </div>
      
      <div v-if="hasPosition" class="data-section">
        <h4>Navigation Data <span class="update-badge" v-if="isPositionUpdated">Updated</span></h4>
        <div class="data-grid">
          <div class="data-item">
            <span class="label">Latitude:</span>
            <span class="value">{{ formatCoordinate(navigationState.position.latitude, 'lat') }}</span>
          </div>
          <div class="data-item">
            <span class="label">Longitude:</span>
            <span class="value">{{ formatCoordinate(navigationState.position.longitude, 'lon') }}</span>
          </div>
          <div class="data-item">
            <span class="label">Timestamp:</span>
            <span class="value">{{ formatTime(navigationState.position.timestamp) }}</span>
          </div>
          <div class="data-item">
            <span class="label">Source:</span>
            <span class="value">{{ navigationState.position.source || 'Unknown' }}</span>
          </div>
        </div>
      </div>
      
      <div v-if="hasCourseData" class="data-section">
        <h4>Course Data <span class="update-badge" v-if="isCourseUpdated">Updated</span></h4>
        <div class="data-grid">
          <div class="data-item">
            <span class="label">Heading:</span>
            <span class="value">{{ navigationState.course.heading !== null ? navigationState.course.heading + '°' : 'N/A' }}</span>
          </div>
          <div class="data-item">
            <span class="label">COG:</span>
            <span class="value">{{ navigationState.course.cog !== null ? navigationState.course.cog + '°' : 'N/A' }}</span>
          </div>
          <div class="data-item">
            <span class="label">Variation:</span>
            <span class="value">{{ navigationState.course.variation !== null ? navigationState.course.variation + '°' : 'N/A' }}</span>
          </div>
        </div>
      </div>
      
      <div v-if="hasSpeedData" class="data-section">
        <h4>Speed Data <span class="update-badge" v-if="isSpeedUpdated">Updated</span></h4>
        <div class="data-grid">
          <div class="data-item">
            <span class="label">SOG:</span>
            <span class="value">{{ navigationState.speed.sog !== null ? navigationState.speed.sog + ' kts' : 'N/A' }}</span>
          </div>
          <div class="data-item">
            <span class="label">STW:</span>
            <span class="value">{{ navigationState.speed.stw !== null ? navigationState.speed.stw + ' kts' : 'N/A' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useStateDataStore } from '../stores/stateDataStore';
import ConnectionStatusIndicator from '../components/ConnectionStatusIndicator.vue';

const stateDataStore = useStateDataStore();
const isConnected = computed(() => stateDataStore.isConnected);
const vpsConnectionStatus = computed(() => stateDataStore.vpsConnectionStatus);
const navigationState = computed(() => stateDataStore.navigationState);

// Track when data is updated
const lastPositionUpdate = ref(Date.now());
const lastCourseUpdate = ref(Date.now());
const lastSpeedUpdate = ref(Date.now());

// Check if we have valid data
const hasPosition = computed(() => {
  const pos = navigationState.value.position;
  return pos && pos.latitude !== null && pos.longitude !== null;
});

const hasCourseData = computed(() => {
  const course = navigationState.value.course;
  return course && (course.heading !== null || course.cog !== null || course.variation !== null);
});

const hasSpeedData = computed(() => {
  const speed = navigationState.value.speed;
  return speed && (speed.sog !== null || speed.stw !== null);
});

// Track when data is updated (shows a visual indicator)
const isPositionUpdated = ref(false);
const isCourseUpdated = ref(false);
const isSpeedUpdated = ref(false);

// Watch for data changes
watch(() => navigationState.value.position, () => {
  if (hasPosition.value) {
    lastPositionUpdate.value = Date.now();
    isPositionUpdated.value = true;
    setTimeout(() => { isPositionUpdated.value = false; }, 2000);
  }
}, { deep: true });

watch(() => navigationState.value.course, () => {
  if (hasCourseData.value) {
    lastCourseUpdate.value = Date.now();
    isCourseUpdated.value = true;
    setTimeout(() => { isCourseUpdated.value = false; }, 2000);
  }
}, { deep: true });

watch(() => navigationState.value.speed, () => {
  if (hasSpeedData.value) {
    lastSpeedUpdate.value = Date.now();
    isSpeedUpdated.value = true;
    setTimeout(() => { isSpeedUpdated.value = false; }, 2000);
  }
}, { deep: true });

// Format helpers
function formatTime(timestamp) {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

function formatCoordinate(value, type) {
  if (value === null || value === undefined) return 'N/A';
  
  // Format to 6 decimal places
  const formatted = value.toFixed(6);
  return `${formatted}° ${type === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W')}`;
}

// CSS classes
const connectionStatusClass = computed(() => {
  const status = vpsConnectionStatus.value.status;
  if (status === 'connected') return 'status-connected';
  if (status === 'connecting') return 'status-connecting';
  return 'status-disconnected';
});

async function initializeRelayMode() {
  try {
    console.log('Initializing relay mode...');
    await stateDataStore.initRelayMode();
    console.log('Relay mode initialized successfully');
  } catch (error) {
    console.error('Failed to initialize relay mode:', error);
  }
}

async function disconnectRelay() {
  try {
    console.log('Disconnecting from relay...');
    // Disconnect from the relay server
    if (stateDataStore.relayConnectionAdapter) {
      await stateDataStore.relayConnectionAdapter.disconnect();
      console.log('Successfully disconnected from relay');
    }
    // Reset connection status
    vpsConnectionStatus.value.status = 'disconnected';
    vpsConnectionStatus.value.lastUpdate = Date.now();
  } catch (error) {
    console.error('Error disconnecting from relay:', error);
  }
}

// Auto-connect on component mount if not already connected
onMounted(() => {
  // Start a timer to update the "last updated" times
  setInterval(() => {
    // Force reactivity update for time displays
    if (vpsConnectionStatus.value.lastUpdate) {
      vpsConnectionStatus.value = { ...vpsConnectionStatus.value };
    }
    if (navigationState.value.position?.timestamp) {
      navigationState.value = { ...navigationState.value };
    }
  }, 1000);
  
  // Connect to the relay server if not already connected
  if (!isConnected.value) {
    initializeRelayMode();
  }
});

// Clean up when component is unmounted
onUnmounted(() => {
  // Disconnect from the relay server when component is unmounted
  if (isConnected.value) {
    disconnectRelay();
  }
});
</script>

<style scoped>
.connection-status-example {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.status-container {
  margin-bottom: 20px;
}

.controls {
  margin-bottom: 20px;
}

button {
  padding: 8px 16px;
  margin-right: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.data-display {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  margin-top: 20px;
}

.data-section {
  margin-bottom: 20px;
  background-color: white;
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.data-section h4 {
  margin-top: 0;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.update-badge {
  font-size: 12px;
  background-color: #28a745;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
  animation: fade 2s forwards;
}

@keyframes fade {
  0% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.data-item {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.value {
  font-weight: bold;
}

.error .value {
  color: #dc3545;
}

.status-connected {
  color: #28a745;
}

.status-connecting {
  color: #ffc107;
}

.status-disconnected {
  color: #dc3545;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #eaeaea;
  padding: 10px;
  border-radius: 4px;
}
</style>
