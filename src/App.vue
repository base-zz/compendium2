<template>
  <ion-app>
    <router-view />
  </ion-app>
</template>

<script setup>
import { IonApp, IonContent, IonButton, IonIcon } from '@ionic/vue';
import { cloudUploadOutline, cloudOfflineOutline } from 'ionicons/icons';
import { computed, onMounted } from 'vue';
import { useStateDataStore } from './client/stores/stateDataStore';
import { useRelayPiniaSync } from './client/services/useRelayPiniaSync';
import { useDirectPiniaSync } from './client/services/useDirectPiniaSync';
import ConnectionStatusIndicator from './client/components/ConnectionStatusIndicator.vue';
import RealDataViewer from './client/examples/RealDataViewer.vue';

const stateDataStore = useStateDataStore();
const isConnected = computed(() => stateDataStore.isConnected);

// Start relay-to-pinia data sync
useRelayPiniaSync();

// Start direct-to-pinia data sync
useDirectPiniaSync();

onMounted(() => {
  // Removed: stateDataStore.init();
  // Removed: stateDataStore.initRelayMode();
  // The smartConnectionManager will handle initialization and switching.
});

async function initializeRelayMode() {
  try {
    console.log('Initializing relay mode...');
  // Removed: await stateDataStore.initRelayMode();
  // The smartConnectionManager will handle relay mode if needed.
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
  } catch (error) {
    console.error('Error disconnecting from relay:', error);
  }
}
</script>

<style>
/* Page transition animations */
.page-transition {
  animation: pageTransitionIn 0.5s ease-out forwards;
}

@keyframes pageTransitionIn {
  from {
    opacity: 0;
    transform: perspective(1000px) rotateY(-10deg);
    transform-origin: left center;
  }
  to {
    opacity: 1;
    transform: perspective(1000px) rotateY(0);
  }
}

/* Ensure the app takes full height */
ion-app {
  min-height: 100vh;
  overflow: hidden;
  position: relative;
  background: #f8f9fa; /* Match your app's background color */
}

/* Smooth transitions for all elements */
* {
  transition: background-color 0.3s ease, color 0.3s ease;
}

.container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
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

.buttons {
  display: flex;
  gap: 0.75rem;
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

.large-icon {
  font-size: 4rem;
  color: #adb5bd;
  margin-bottom: 1rem;
}

.hint {
  color: #6c757d;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}
</style>
