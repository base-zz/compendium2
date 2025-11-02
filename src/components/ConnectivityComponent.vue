<template>
  <div class="connectivity-component">
    <ion-list>
      <ion-list-header>
        <ion-label>Connection Status</ion-label>
      </ion-list-header>

      <!-- Internet Connection -->
      <ion-item>
        <ion-label>Internet</ion-label>
        <ion-badge :color="internetStatus.color" slot="end">
          {{ internetStatus.text }}
        </ion-badge>
      </ion-item>

      <!-- Direct Connection -->
      <ion-item>
        <ion-label>Direct Connection</ion-label>
        <ion-badge :color="directConnectionStatus.color" slot="end">
          {{ directConnectionStatus.text }}
        </ion-badge>
      </ion-item>

      <!-- VPS Connection -->
      <ion-item>
        <ion-label>VPS Connection</ion-label>
        <ion-badge :color="vpsStatus.color" slot="end">
          {{ vpsStatus.text }}
        </ion-badge>
      </ion-item>
    </ion-list>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useBoatConnectionStore } from '../stores/boatConnection';
import { 
  IonList, 
  IonListHeader, 
  IonItem, 
  IonLabel, 
  IonBadge 
} from '@ionic/vue';

const boatStore = useBoatConnectionStore();

// Connection states
const hasInternet = ref(navigator.onLine);
const lastChecked = ref(new Date());

// Check internet connectivity
const checkInternet = () => {
  hasInternet.value = navigator.onLine;
  lastChecked.value = new Date();};

// Initialize connection when component mounts
const initializeConnection = async () => {
  try {
    // Debug log environment variables
    console.log('Environment variables:', {
      VITE_VPS_API_URL: import.meta.env.VITE_VPS_API_URL,
      VITE_RELAY_SERVER_URL: import.meta.env.VITE_RELAY_SERVER_URL,
      MODE: import.meta.env.MODE
    });
    
    console.log('Boat store state before init:', {
      connectionStatus: boatStore.connectionStatus,
      connectionMode: boatStore.connectionMode,
      boatId: boatStore.boatId
    });
    
    await boatStore.initializeConnection();
    
    console.log('Boat store state after init:', {
      connectionStatus: boatStore.connectionStatus,
      connectionMode: boatStore.connectionMode,
      boatId: boatStore.boatId
    });
  } catch (error) {
    console.error('Failed to initialize connection:', error);
  }
};

// Set up event listeners
onMounted(() => {
  window.addEventListener('online', checkInternet);
  window.addEventListener('offline', checkInternet);
  checkInternet();
  initializeConnection();
});

onUnmounted(() => {
  window.removeEventListener('online', checkInternet);
  window.removeEventListener('offline', checkInternet);
});

// Computed properties for status display
const internetStatus = computed(() => {
  return {
    text: hasInternet.value ? 'Online' : 'Offline',
    color: hasInternet.value ? 'success' : 'danger'
  };
});

// Debug connection state
const debugConnectionState = computed(() => ({
  directConnected: boatStore.directConnected,
  connectionStatus: boatStore.connectionStatus,
  vpsConnected: boatStore.vpsConnected,
  connectionMode: boatStore.connectionMode
}));

// Log connection state changes
watch(debugConnectionState, (newState) => {
  console.log('Connection state changed:', JSON.stringify(newState, null, 2));
}, { deep: true });

const directConnectionStatus = computed(() => {
  // In local mode, use the connection status directly
  if (boatStore.connectionMode === 'local') {
    if (boatStore.connectionStatus === 'connected') {
      return { text: 'Connected', color: 'success' };
    }
    if (boatStore.connectionStatus === 'connecting') {
      return { text: 'Connecting...', color: 'warning' };
    }
    return { text: 'Disconnected', color: 'danger' };
  }
  
  // For non-local mode, use directConnected
  if (boatStore.directConnected) {
    return { text: 'Connected', color: 'success' };
  }
  if (boatStore.connectionStatus === 'connecting') {
    return { text: 'Connecting...', color: 'warning' };
  }
  return { text: 'Disconnected', color: 'danger' };
});

const vpsStatus = computed(() => {
  if (boatStore.vpsConnected) {
    return { text: 'Connected', color: 'success' };
  }
  if (boatStore.connectionStatus === 'connecting') {
    return { text: 'Connecting...', color: 'warning' };
  }
  return { text: 'Disconnected', color: 'danger' };
});
</script>

<style scoped>
.connectivity-component {
  padding: 16px;
}

ion-badge {
  min-width: 100px;
  text-align: center;
}
</style>
