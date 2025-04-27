<template>
  <div class="signalk-data-viewer">
    <h2>SignalK Data Viewer</h2>
    
    <div class="connection-status">
      <div class="status-indicator" :class="{ connected: isConnected }"></div>
      <span>{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
      <span class="connection-source" v-if="connectionSource">({{ connectionSource }})</span>
    </div>
    
    <div v-if="isConnected && !hasData" class="no-data-message">
      <p>Connected to data source, but no data is available yet.</p>
      <p>This could be because:</p>
      <ul>
        <li>The data source is not sending any data</li>
        <li>The connection is still initializing</li>
        <li>There might be an issue with the data format</li>
      </ul>
      <p>Connection details:</p>
      <pre class="json-display">{{ prettyPrintJson(connectionDetails) }}</pre>
    </div>
    
    <div v-else-if="!isConnected" class="no-data-message">
      <p>Not connected to any data source.</p>
    </div>
    
    <div class="data-sections">
      <!-- Navigation Section -->
      <div class="data-section">
        <h3>Navigation</h3>
        <pre class="json-display">{{ prettyPrintJson(navigationState) }}</pre>
      </div>
      
      <!-- Environment Section -->
      <div class="data-section">
        <h3>Environment</h3>
        <pre class="json-display">{{ prettyPrintJson(environmentState) }}</pre>
      </div>
      
      <!-- Anchor Section -->
      <div class="data-section">
        <h3>Anchor</h3>
        <pre class="json-display">{{ prettyPrintJson(anchorState) }}</pre>
      </div>
      
      <!-- Alerts Section -->
      <div class="data-section">
        <h3>Alerts</h3>
        <pre class="json-display">{{ prettyPrintJson(alertState) }}</pre>
      </div>
    </div>
    
    <!-- Raw Data Section -->
    <div class="data-section">
      <h3>All State Data</h3>
      <pre class="json-display full-data">{{ prettyPrintJson(stateData) }}</pre>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useStateDataStore } from '../stores/stateDataStore';

// Get the state data store
const stateDataStore = useStateDataStore();

// Reactive references to store states
const navigationState = computed(() => stateDataStore.navigationState);
const environmentState = computed(() => stateDataStore.environmentState);
const anchorState = computed(() => stateDataStore.anchorState);
const alertState = computed(() => stateDataStore.alertState);
const isConnected = computed(() => stateDataStore.isConnected);
const connectionSource = computed(() => stateDataStore.connectionSource);

// Check if we have any meaningful data
const hasData = computed(() => {
  // Check if navigation state has position data
  const hasNavData = navigationState.value && 
    (navigationState.value.position || 
     (navigationState.value.course && Object.keys(navigationState.value.course).length > 0));
  
  // Check if environment state has any data
  const hasEnvData = environmentState.value && Object.keys(environmentState.value).length > 0;
  
  // Check if anchor state has status
  const hasAnchorData = anchorState.value && anchorState.value.status;
  
  // Return true if any of the data sections has data
  return hasNavData || hasEnvData || hasAnchorData;
});

// Connection details for debugging
const connectionDetails = computed(() => ({
  connected: isConnected.value,
  source: connectionSource.value,
  lastUpdate: stateDataStore.lastUpdate,
  vpsStatus: stateDataStore.vpsConnectionStatus
}));

// Combined state data
const stateData = computed(() => ({
  navigation: navigationState.value,
  environment: environmentState.value,
  anchor: anchorState.value,
  alerts: alertState.value
}));

// Pretty print JSON data
const prettyPrintJson = (data) => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return 'Error displaying data';
  }
};

// Lifecycle hooks
onMounted(async () => {
  console.log('SignalKDataViewer mounted, connection status:', isConnected.value);
  console.log('Initial navigation state:', navigationState.value);
  
  // Initialize connection if not already connected
  if (!isConnected.value) {
    console.log('Initializing state data store...');
    try {
      await stateDataStore.init();
      console.log('State data store initialized, connection status:', isConnected.value);
      console.log('Navigation state after init:', navigationState.value);
    } catch (error) {
      console.error('Failed to initialize state data store:', error);
    }
  }
});

// Clean up when component is unmounted
onUnmounted(() => {
  console.log('SignalKDataViewer unmounting, cleaning up connection...');
  stateDataStore.cleanup();
});
</script>

<style scoped>
.signalk-data-viewer {
  padding: 1rem;
  font-family: Arial, sans-serif;
}

h2 {
  margin-bottom: 1rem;
  color: #333;
}

h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #555;
}

.connection-status {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ff3b30;
  margin-right: 0.5rem;
}

.status-indicator.connected {
  background-color: #34c759;
}

.connection-source {
  margin-left: 0.5rem;
  font-size: 0.9em;
  color: #666;
}

.data-sections {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.data-section {
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.json-display {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 0.9rem;
  background-color: #f0f0f0;
  padding: 0.5rem;
  border-radius: 4px;
  max-height: 300px;
  overflow: auto;
}

.no-data-message {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #fff8e1;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
}

.no-data-message p {
  margin: 0.5rem 0;
}

.no-data-message ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.no-data-message pre {
  margin-top: 1rem;
  padding: 0.5rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 0.9em;
  overflow-x: auto;
}

.full-data {
  max-height: 500px;
}
</style>
