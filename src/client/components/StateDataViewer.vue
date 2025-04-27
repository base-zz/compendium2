<template>
  <div class="state-data-viewer">
    <h2>State Data Viewer</h2>
    
    <div class="connection-status">
      <h3>Connection Status</h3>
      <p><strong>Connected:</strong> {{ isConnected }}</p>
      <p><strong>Last Update:</strong> {{ lastUpdateFormatted }}</p>
      <p v-if="hasWindData"><strong>Wind Data:</strong> Present ✅</p>
      <p v-else><strong>Wind Data:</strong> Not available ❌</p>
    </div>
    
    <div class="wind-data-section" v-if="hasWindData">
      <h3>Wind Data</h3>
      <div class="wind-data-grid">
        <div class="wind-data-item">
          <strong>True Wind Speed:</strong> {{ windData.speedTrue }} kts
        </div>
        <div class="wind-data-item">
          <strong>True Wind Angle:</strong> {{ windData.angleTrue }}°
        </div>
        <div class="wind-data-item">
          <strong>Direction:</strong> {{ windData.direction || 'N/A' }}
        </div>
        <div class="wind-data-item">
          <strong>Apparent Wind Speed:</strong> {{ windData.speedApparent }} kts
        </div>
        <div class="wind-data-item">
          <strong>Apparent Wind Angle:</strong> {{ windData.angleApparent }}°
        </div>
        <div class="wind-data-item">
          <strong>Reference:</strong> {{ windData.reference || 'N/A' }}
        </div>
      </div>
    </div>

    <div class="data-section" v-if="isConnected">
      <h3>Full State Data</h3>
      <pre class="state-data-json">{{ JSON.stringify(fullStateData, null, 2) }}</pre>
    </div>
    
    <div class="no-data" v-else>
      <p>Not connected to data source</p>
    </div>
  </div>
</template>

<script>
import { onMounted, onUnmounted, computed } from 'vue';
import { useStateDataStore } from '@/client/stores/stateDataStore';

export default {
  name: 'StateDataViewer',
  
  setup() {
    const stateDataStore = useStateDataStore();
    
    // Initialize connection on mount
    onMounted(async () => {
      try {
        console.log('[StateDataViewer] Component mounted, initializing connection');
        
        // Always use real data from the relay server
        await stateDataStore.init();
        
        console.log('[StateDataViewer] Connection initialized');
        
        // Set up a periodic check to log state data for debugging
        const debugInterval = setInterval(() => {
          if (stateDataStore.environmentState?.weather?.wind) {
            console.log('[StateDataViewer] Current wind data:', 
              JSON.stringify(stateDataStore.environmentState.weather.wind));
          }
          
          if (stateDataStore.lastUpdate) {
            console.log('[StateDataViewer] Last update:', new Date(stateDataStore.lastUpdate).toLocaleString());
          }
        }, 5000);
        
        // Clean up the interval when component is unmounted
        onUnmounted(() => {
          clearInterval(debugInterval);
        });
      } catch (error) {
        console.error('[StateDataViewer] Failed to initialize connection:', error);
      }
    });
    
    // Clean up on unmount
    onUnmounted(() => {
      console.log('[StateDataViewer] Component unmounted, cleaning up');
      stateDataStore.cleanup();
    });
    
    // Computed properties
    const isConnected = computed(() => stateDataStore.isConnected);
    const lastUpdate = computed(() => stateDataStore.lastUpdate);
    const lastUpdateFormatted = computed(() => {
      if (!lastUpdate.value) return 'Never';
      return new Date(lastUpdate.value).toLocaleString();
    });
    
    // Wind data specific computed properties
    const windData = computed(() => {
      if (!stateDataStore.environmentState?.weather?.wind) {
        return {
          speedTrue: 'N/A',
          angleTrue: 'N/A',
          speedApparent: 'N/A',
          angleApparent: 'N/A',
          direction: 'N/A',
          reference: 'N/A'
        };
      }
      return stateDataStore.environmentState.weather.wind;
    });
    
    const hasWindData = computed(() => {
      const wind = stateDataStore.environmentState?.weather?.wind;
      return wind && (wind.speedTrue !== null || wind.speedApparent !== null);
    });
    
    // Get all state data directly from the store
    const fullStateData = computed(() => {
      // Get the raw state data from the store
      return {
        navigation: stateDataStore.navigationState,
        vessel: stateDataStore.vesselState,
        anchor: stateDataStore.anchorState,
        environment: stateDataStore.environmentState,
        alerts: stateDataStore.alertsState,
        external: stateDataStore.externalState,
        _raw: stateDataStore.rawStateData,
        _sources: stateDataStore.dataSources
      };
    });
    
    return {
      isConnected,
      lastUpdateFormatted,
      fullStateData,
      windData,
      hasWindData
    };
  }
};
</script>

<style scoped>
.state-data-viewer {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  color: var(--ion-color-primary, #3880ff);
  margin-bottom: 20px;
}

.connection-status {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: #fff;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.state-data-json {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  overflow-x: auto;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  max-height: 80vh;
  overflow-y: auto;
}

.no-data {
  padding: 1rem;
  background-color: #fff;
  border-radius: 4px;
  border: 1px solid #ddd;
  color: #999;
  text-align: center;
}

.wind-data-section {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f0f8ff;
  border-radius: 8px;
  border: 1px solid #add8e6;
}

.wind-data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.wind-data-item {
  padding: 0.5rem;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}
</style>
