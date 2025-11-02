<template>
  <div class="real-data-viewer">
    <h2>Real-Time Vessel Data</h2>
    
    <div class="connection-controls">
      <div class="status-indicator" :class="connectionStatusClass">
        <span class="status-dot"></span>
        <span class="status-text">{{ vpsConnectionStatus.status }}</span>
        <span v-if="isConnected" class="message-count">({{ vpsConnectionStatus.messageCount || 0 }} messages)</span>
      </div>
      
      <div class="actions">
        <button @click="connectToRealData" :disabled="isConnected" class="connect-btn">
          Connect to Real Data
        </button>
        <button @click="disconnectFromRealData" :disabled="!isConnected" class="disconnect-btn">
          Disconnect
        </button>
      </div>
    </div>
    
    <div v-if="vpsConnectionStatus.lastError" class="error-message">
      <strong>Error:</strong> {{ vpsConnectionStatus.lastError }}
    </div>
    
    <div class="data-container" v-if="isConnected">
      <!-- Navigation Data Section -->
      <div class="data-section">
        <h3>Navigation Data</h3>
        <div class="data-grid">
          <!-- Position Data -->
          <div class="data-card">
            <h4>Position</h4>
            <div class="data-row" v-if="hasPosition">
              <div class="data-item">
                <span class="label">Latitude:</span>
                <span class="value">{{ formatCoordinate(navigationState.position.latitude, 'lat') }}</span>
              </div>
              <div class="data-item">
                <span class="label">Longitude:</span>
                <span class="value">{{ formatCoordinate(navigationState.position.longitude, 'lon') }}</span>
              </div>
              <div class="data-item">
                <span class="label">Updated:</span>
                <span class="value">{{ formatTime(navigationState.position.timestamp) }}</span>
              </div>
              <div class="data-item">
                <span class="label">Source:</span>
                <span class="value">{{ navigationState.position.source || 'Unknown' }}</span>
              </div>
            </div>
            <div class="no-data" v-else>No position data available</div>
          </div>
          
          <!-- Course Data -->
          <div class="data-card">
            <h4>Course</h4>
            <div class="data-row" v-if="hasCourseData">
              <div class="data-item">
                <span class="label">Heading:</span>
                <span class="value">{{ formatHeading(navigationState.course.heading) }}</span>
              </div>
              <div class="data-item">
                <span class="label">COG:</span>
                <span class="value">{{ formatHeading(navigationState.course.cog) }}</span>
              </div>
              <div class="data-item">
                <span class="label">Variation:</span>
                <span class="value">{{ formatHeading(navigationState.course.variation) }}</span>
              </div>
            </div>
            <div class="no-data" v-else>No course data available</div>
          </div>
          
          <!-- Speed Data -->
          <div class="data-card">
            <h4>Speed</h4>
            <div class="data-row" v-if="hasSpeedData">
              <div class="data-item">
                <span class="label">SOG:</span>
                <span class="value">{{ formatSpeed(navigationState.speed.sog) }}</span>
              </div>
              <div class="data-item">
                <span class="label">STW:</span>
                <span class="value">{{ formatSpeed(navigationState.speed.stw) }}</span>
              </div>
            </div>
            <div class="no-data" v-else>No speed data available</div>
          </div>
          
          <!-- Depth Data -->
          <div class="data-card">
            <h4>Depth</h4>
            <div class="data-row" v-if="hasDepthData">
              <div class="data-item">
                <span class="label">Below Transducer:</span>
                <span class="value">{{ formatDepth(navigationState.depth.belowTransducer) }}</span>
              </div>
              <div class="data-item">
                <span class="label">Below Keel:</span>
                <span class="value">{{ formatDepth(navigationState.depth.belowKeel) }}</span>
              </div>
              <div class="data-item">
                <span class="label">Below Surface:</span>
                <span class="value">{{ formatDepth(navigationState.depth.belowSurface) }}</span>
              </div>
            </div>
            <div class="no-data" v-else>No depth data available</div>
          </div>
          
          <!-- Wind Data -->
          <div class="data-card">
            <h4>Wind</h4>
            <div class="data-row" v-if="hasWindData">
              <div class="data-item">
                <span class="label">Speed:</span>
                <span class="value">{{ formatSpeed(navigationState.wind.speed) }}</span>
              </div>
              <div class="data-item">
                <span class="label">Angle:</span>
                <span class="value">{{ formatHeading(navigationState.wind.angle) }}</span>
              </div>
              <div class="data-item">
                <span class="label">Direction:</span>
                <span class="value">{{ formatHeading(navigationState.wind.direction) }}</span>
              </div>
            </div>
            <div class="no-data" v-else>No wind data available</div>
          </div>
        </div>
      </div>
      
      <!-- Alerts Section -->
      <div class="data-section" v-if="hasActiveAlerts">
        <h3>Active Alerts</h3>
        <div class="alerts-container">
          <div v-for="alert in alertsState.active" :key="alert.id" class="alert-item" :class="'alert-' + alert.type">
            <div class="alert-header">
              <span class="alert-type">{{ alert.type.toUpperCase() }}</span>
              <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
            </div>
            <div class="alert-message">{{ alert.message }}</div>
            <div class="alert-value" v-if="alert.value">
              Value: {{ alert.value }} {{ alert.units || '' }}
            </div>
          </div>
        </div>
      </div>
      
      <div class="data-section" v-if="!hasActiveAlerts && isConnected">
        <h3>Alerts</h3>
        <div class="no-data">No active alerts</div>
      </div>
    </div>
    
    <div class="connection-info" v-if="isConnected">
      <div class="info-item">
        <span class="label">Last Update:</span>
        <span class="value">{{ formatTime(vpsConnectionStatus.lastUpdate) }}</span>
      </div>
      <div class="info-item">
        <span class="label">Connection Source:</span>
        <span class="value">{{ connectionSource || 'Unknown' }}</span>
      </div>
    </div>
    
    <div class="not-connected-message" v-if="!isConnected">
      <p>Not connected to real data. Click "Connect to Real Data" to start receiving vessel data.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted } from 'vue';
import { useStateDataStore } from '../stores/stateDataStore';

const stateDataStore = useStateDataStore();
const isConnected = computed(() => stateDataStore.isConnected);
const vpsConnectionStatus = computed(() => stateDataStore.vpsConnectionStatus);
const navigationState = computed(() => stateDataStore.navigationState);
const alertsState = computed(() => stateDataStore.alertsState);
const connectionSource = computed(() => stateDataStore.connectionSource);

// Data availability checks
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

const hasDepthData = computed(() => {
  const depth = navigationState.value.depth;
  return depth && (depth.belowTransducer !== null || depth.belowKeel !== null || depth.belowSurface !== null);
});

const hasWindData = computed(() => {
  const wind = navigationState.value.wind;
  return wind && (wind.speed !== null || wind.angle !== null || wind.direction !== null);
});

const hasActiveAlerts = computed(() => alertsState.value.active.length > 0);

// Connection status styling
const connectionStatusClass = computed(() => {
  const status = vpsConnectionStatus.value.status;
  if (status === 'connected') return 'status-connected';
  if (status === 'connecting') return 'status-connecting';
  return 'status-disconnected';
});

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

function formatHeading(value) {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(1)}°`;
}

function formatSpeed(value) {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(1)} kts`;
}

function formatDepth(value) {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(1)} m`;
}

// Connection actions
async function connectToRealData() {
  try {
    console.log('Connecting to real data source...');
    await stateDataStore.initRelayMode();
    console.log('Successfully connected to real data source');
  } catch (error) {
    console.error('Failed to connect to real data source:', error);
  }
}

async function disconnectFromRealData() {
  try {
    console.log('Disconnecting from real data source...');
    if (stateDataStore.relayConnectionAdapter) {
      await stateDataStore.relayConnectionAdapter.disconnect();
      console.log('Successfully disconnected from real data source');
    }
    // Reset connection status
    vpsConnectionStatus.value.status = 'disconnected';
    vpsConnectionStatus.value.lastUpdate = Date.now();
  } catch (error) {
    console.error('Failed to disconnect from real data source:', error);
  }
}

// Clean up on component unmount
onUnmounted(() => {
  if (isConnected.value) {
    disconnectFromRealData();
  }
});
</script>

<style scoped>
.real-data-viewer {
  font-family: Arial, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h2 {
  color: #2c3e50;
  margin-top: 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #e1e5eb;
}

.connection-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-indicator {
  display: flex;
  align-items: center;
  font-weight: bold;
}

.status-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-connected .status-dot {
  background-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.status-connecting .status-dot {
  background-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
  animation: pulse 1.5s infinite;
}

.status-disconnected .status-dot {
  background-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.status-connected {
  color: #10b981;
}

.status-connecting {
  color: #f59e0b;
}

.status-disconnected {
  color: #ef4444;
}

.message-count {
  margin-left: 8px;
  font-size: 0.9em;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.connect-btn {
  background-color: #3b82f6;
  color: white;
}

.connect-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.disconnect-btn {
  background-color: #6b7280;
  color: white;
}

.disconnect-btn:hover:not(:disabled) {
  background-color: #4b5563;
}

.error-message {
  margin-bottom: 20px;
  padding: 12px;
  background-color: #fee2e2;
  border-left: 4px solid #ef4444;
  color: #b91c1c;
  border-radius: 4px;
}

.data-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.data-section {
  background-color: #fff;
  border-radius: 6px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.data-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #374151;
  font-size: 1.2em;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.data-card {
  background-color: #f9fafb;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.data-card h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #4b5563;
  font-size: 1em;
}

.data-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.95em;
}

.label {
  color: #6b7280;
  font-weight: 500;
}

.value {
  font-weight: bold;
  color: #111827;
}

.no-data {
  color: #9ca3af;
  font-style: italic;
  text-align: center;
  padding: 10px;
}

.alerts-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid;
}

.alert-warning {
  background-color: #fffbeb;
  border-left-color: #f59e0b;
}

.alert-alarm {
  background-color: #fee2e2;
  border-left-color: #ef4444;
}

.alert-emergency {
  background-color: #fef2f2;
  border-left-color: #b91c1c;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.alert-type {
  font-weight: bold;
  font-size: 0.8em;
}

.alert-time {
  font-size: 0.8em;
  color: #6b7280;
}

.alert-message {
  font-weight: 500;
  margin-bottom: 5px;
}

.alert-value {
  font-size: 0.9em;
  color: #4b5563;
}

.connection-info {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  padding: 10px 15px;
  background-color: #f3f4f6;
  border-radius: 6px;
  font-size: 0.9em;
}

.info-item {
  display: flex;
  gap: 8px;
}

.not-connected-message {
  margin-top: 30px;
  text-align: center;
  padding: 30px;
  background-color: #f3f4f6;
  border-radius: 6px;
  color: #6b7280;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .connection-controls {
    flex-direction: column;
    gap: 15px;
  }
  
  .data-grid {
    grid-template-columns: 1fr;
  }
  
  .connection-info {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
