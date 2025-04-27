<template>
  <div class="state-data-debugger">
    <h2>State Data Debugger</h2>
    
    <div class="connection-status">
      <h3>Connection Status</h3>
      <p><strong>Connected:</strong> {{ isConnected }}</p>
      <p><strong>Connection Source:</strong> {{ connectionSource }}</p>
      <p><strong>Last Update:</strong> {{ lastUpdateFormatted }}</p>
    </div>

    <div class="data-section" v-if="isConnected">
      <h3>Navigation State</h3>
      <pre>{{ JSON.stringify(navigationState, null, 2) }}</pre>
      
      <h3>Vessel State</h3>
      <pre>{{ JSON.stringify(vesselState, null, 2) }}</pre>
      
      <h3>Anchor State</h3>
      <pre>{{ JSON.stringify(anchorState, null, 2) }}</pre>
      
      <h3>VPS Connection Status</h3>
      <pre>{{ JSON.stringify(vpsConnectionStatus, null, 2) }}</pre>
    </div>
    
    <div class="no-data" v-else>
      <p>Not connected to data source</p>
    </div>
  </div>
</template>

<script>
import { useStateDataStore } from '../stores/stateDataStore';
import { onMounted, onUnmounted, computed } from 'vue';

export default {
  name: 'StateDataDebugger',
  
  setup() {
    const stateDataStore = useStateDataStore();
    
    // Initialize connection on mount
    onMounted(async () => {
      try {
        console.log('[StateDataDebugger] Component mounted, initializing connection');
        await stateDataStore.init();
        console.log('[StateDataDebugger] Connection initialized');
      } catch (error) {
        console.error('[StateDataDebugger] Failed to initialize connection:', error);
      }
    });
    
    // Clean up on unmount
    onUnmounted(() => {
      console.log('[StateDataDebugger] Component unmounted, cleaning up');
      stateDataStore.cleanup();
    });
    
    // Format the last update timestamp
    const lastUpdateFormatted = computed(() => {
      if (!stateDataStore.lastUpdate) return 'Never';
      return new Date(stateDataStore.lastUpdate).toLocaleTimeString();
    });
    
    return {
      // Connection status
      isConnected: computed(() => stateDataStore.isConnected),
      connectionSource: computed(() => stateDataStore.connectionSource),
      lastUpdate: computed(() => stateDataStore.lastUpdate),
      lastUpdateFormatted,
      
      // State data
      navigationState: computed(() => stateDataStore.navigationState),
      vesselState: computed(() => stateDataStore.vesselState),
      anchorState: computed(() => stateDataStore.anchorState),
      vpsConnectionStatus: computed(() => stateDataStore.vpsConnectionStatus),
    };
  }
};
</script>

<style scoped>
.state-data-debugger {
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
</style>
