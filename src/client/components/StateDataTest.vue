<template>
  <div class="state-data-test">
    <h2>StateData Test Component</h2>
    <div class="connection-status">
      <div class="status-indicator" :class="{ connected: isConnected }"></div>
      <span>{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
    </div>
    <button @click="initializeStore">Initialize Store</button>
    <pre>{{ storeState }}</pre>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStateDataStore } from '../stores/stateDataStore';

const stateDataStore = useStateDataStore();
const storeState = ref('Not initialized');

// Computed properties
const isConnected = computed(() => stateDataStore.isConnected);

// Methods
const initializeStore = async () => {
  try {
    await stateDataStore.init();
    storeState.value = {
      isConnected: stateDataStore.isConnected,
      lastUpdate: stateDataStore.lastUpdate,
      navigationData: stateDataStore.navigationState
    };
  } catch (error) {
    storeState.value = `Error: ${error.message}`;
    console.error('Failed to initialize store:', error);
  }
};

// Lifecycle hooks
onMounted(() => {
  storeState.value = {
    isConnected: stateDataStore.isConnected,
    lastUpdate: stateDataStore.lastUpdate
  };
});
</script>

<style scoped>
.state-data-test {
  padding: 1rem;
  font-family: Arial, sans-serif;
}

.connection-status {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: red;
  margin-right: 0.5rem;
}

.status-indicator.connected {
  background-color: green;
}

button {
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}

pre {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}
</style>
