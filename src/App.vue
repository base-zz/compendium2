<template>
  <ion-app>
    <router-view />
  </ion-app>
</template>

<script setup>
import { IonApp } from '@ionic/vue';
import { computed, onMounted, watch } from 'vue';
import { useStateDataStore } from './client/stores/stateDataStore';
import { useRelayPiniaSync } from './client/services/useRelayPiniaSync';
import { useDirectPiniaSync } from './client/services/useDirectPiniaSync';
import { createLogger } from './client/services/logger';

const logger = createLogger('App');
logger.info('Initializing application...');

const stateDataStore = useStateDataStore();
const isConnected = computed(() => stateDataStore.isConnected);

// Start relay-to-pinia data sync
logger.info('Initializing relay-to-pinia sync...');
useRelayPiniaSync();

// Start direct-to-pinia data sync
logger.info('Initializing direct-to-pinia sync...');
useDirectPiniaSync();

onMounted(() => {
  logger.info('App component mounted');
  // Removed: stateDataStore.init();
  // Removed: stateDataStore.initRelayMode();
  // The smartConnectionManager will handle initialization and switching.
});

// Log connection status changes
watch(isConnected, (newValue) => {
  logger(`Connection status changed: ${newValue ? 'Connected' : 'Disconnected'}`);
});

async function initializeRelayMode() {
  logger('Initializing relay mode...');
  try {
    // Removed: await stateDataStore.initRelayMode();
    // The smartConnectionManager will handle relay mode if needed.
    logger('Relay mode initialization completed');
  } catch (error) {
    logger.error('Failed to initialize relay mode', {
      error: error.message,
      stack: error.stack
    });
  }
}

async function disconnectRelay() {
  logger('Initiating relay disconnection...');
  try {
    // Disconnect from the relay server
    if (stateDataStore.relayConnectionAdapter) {
      logger('Disconnecting from relay server...');
      await stateDataStore.relayConnectionAdapter.disconnect();
      logger('Successfully disconnected from relay server');
    } else {
      logger.warn('No relay connection adapter found to disconnect');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : new Error().stack;
    
    logger.error('Error disconnecting from relay', {
      error: errorMessage,
      stack: errorStack
    });
    
    // Re-throw to allow caller to handle the error
    throw error;
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
