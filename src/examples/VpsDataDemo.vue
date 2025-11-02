<template>
  <div class="vps-data-demo">
    <h1>VPS Real-Time Data Monitor</h1>
    
    <div class="connection-controls">
      <div class="status-indicator" :class="connectionStatusClass">
        {{ vpsConnectionStatus.status || 'disconnected' }}
      </div>
      <div class="buttons">
        <button @click="initializeRelayMode" :disabled="isConnected" class="btn-connect">
          Connect to VPS
        </button>
        <button @click="disconnectRelay" :disabled="!isConnected" class="btn-disconnect">
          Disconnect
        </button>
      </div>
    </div>
    
    <VpsDataDisplay v-if="isConnected" />
    
    <div v-if="!isConnected" class="not-connected">
      <div class="icon">📡</div>
      <p>Not connected to VPS relay server</p>
      <p class="hint">Click "Connect to VPS" to establish a connection and view real-time vessel data</p>
      <div v-if="stateDataStore.error" class="error-message">
        <strong>Error:</strong> {{ stateDataStore.error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStateDataStore } from '../stores/stateDataStore';
import VpsDataDisplay from '../components/VpsDataDisplay.vue';

const stateDataStore = useStateDataStore();
const vpsConnectionStatus = computed(() => stateDataStore.vpsConnectionStatus);
const isConnected = computed(() => stateDataStore.isConnected);

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
    // Use the store's cleanup or switch method for proper teardown
    if (typeof stateDataStore.cleanup === 'function') {
      await stateDataStore.cleanup();
      console.log('Successfully disconnected from relay');
    } else if (typeof stateDataStore.switchDataSource === 'function') {
      stateDataStore.switchDataSource('local');
      console.log('Switched data source to local');
    }
    // UI status will update automatically via store reactivity
  } catch (error) {
    console.error('Error disconnecting from relay:', error);
  }
}

// Debug watcher for automated state updates
import { watch } from 'vue';
watch(
  () => stateDataStore,
  (val) => {
    // You can customize this to watch specific slices
    console.log('[VPS DEMO] Store updated:', JSON.stringify(val, null, 2));
  },
  { deep: true }
);

</script>

<style scoped>
.vps-data-demo {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #343a40;
  margin-bottom: 1.5rem;
  font-size: 1.75rem;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 0.75rem;
}

.connection-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.status-indicator {
  padding: 6px 12px;
  border-radius: 16px;
  font-weight: 500;
  text-transform: capitalize;
}

.status-connected {
  background-color: #40c057;
  color: white;
}

.status-connecting {
  background-color: #fd7e14;
  color: white;
}

.status-disconnected {
  background-color: #fa5252;
  color: white;
}

.buttons {
  display: flex;
  gap: 0.75rem;
}

button {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-connect {
  background-color: #228be6;
  color: white;
}

.btn-disconnect {
  background-color: #fa5252;
  color: white;
}

.not-connected {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-top: 2rem;
  text-align: center;
}

.icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.hint {
  color: #6c757d;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}
</style>
