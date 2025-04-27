<template>
  <div class="connection-status-indicator" :class="statusClass">
    <div class="status-icon">
      <div v-if="isConnected" class="connected-icon">
        <span class="dot"></span>
        <span v-if="isReceivingData" class="pulse"></span>
      </div>
      <div v-else class="disconnected-icon">
        <span class="dot"></span>
      </div>
    </div>
    <div class="status-details">
      <div class="status-text">{{ statusText }}</div>
      <div v-if="showDetails" class="details">
        <div>Source: {{ connectionSource || 'None' }}</div>
        <div>Last Update: {{ lastUpdateText }}</div>
        <div v-if="isVpsConnection">Messages: {{ messageCount }}</div>
        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useStateDataStore } from '../stores/stateDataStore';

defineProps({
  showDetails: {
    type: Boolean,
    default: false
  }
});

const stateDataStore = useStateDataStore();

// Computed properties for connection status
const isConnected = computed(() => stateDataStore.isConnected);
const connectionSource = computed(() => stateDataStore.connectionSource);
const isVpsConnection = computed(() => connectionSource.value === 'vps');
const vpsStatus = computed(() => stateDataStore.vpsConnectionStatus);
const lastUpdate = computed(() => stateDataStore.lastUpdate);

// Check if we're receiving data (had an update in the last 10 seconds)
const isReceivingData = computed(() => {
  if (!lastUpdate.value) return false;
  return Date.now() - lastUpdate.value < 10000; // 10 seconds
});

// Format the last update time
const lastUpdateText = computed(() => {
  if (!lastUpdate.value) return 'Never';
  
  const date = new Date(lastUpdate.value);
  return date.toLocaleTimeString();
});

// Get the message count from VPS connection
const messageCount = computed(() => {
  if (!isVpsConnection.value) return 0;
  return vpsStatus.value.messageCount || 0;
});

// Get any error message
const errorMessage = computed(() => {
  if (!isVpsConnection.value) return null;
  return vpsStatus.value.lastError;
});

// Status text based on connection state
const statusText = computed(() => {
  if (!isConnected.value) return 'Disconnected';
  
  if (isVpsConnection.value) {
    if (vpsStatus.value.status === 'connecting') return 'Connecting to VPS...';
    if (vpsStatus.value.status === 'connected') {
      return isReceivingData.value ? 'Connected to VPS' : 'Connected (no data)';
    }
    return `VPS: ${vpsStatus.value.status}`;
  }
  
  return isReceivingData.value ? 'Connected' : 'Connected (no data)';
});

// CSS class based on status
const statusClass = computed(() => {
  if (!isConnected.value) return 'disconnected';
  if (isReceivingData.value) return 'receiving-data';
  return 'connected';
});

// Debugging - log status changes
watch(() => vpsStatus.value.status, (newStatus) => {
  console.log(`[ConnectionStatusIndicator] VPS status changed to: ${newStatus}`);
});
</script>

<style scoped>
.connection-status-indicator {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.5);
  margin: 8px;
  transition: background-color 0.3s ease;
}

.connection-status-indicator.disconnected {
  background-color: rgba(220, 53, 69, 0.7);
}

.connection-status-indicator.connected {
  background-color: rgba(255, 193, 7, 0.7);
}

.connection-status-indicator.receiving-data {
  background-color: rgba(40, 167, 69, 0.7);
}

.status-icon {
  margin-right: 8px;
  position: relative;
  width: 16px;
  height: 16px;
}

.dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  top: 3px;
  left: 3px;
}

.connected-icon .dot {
  background-color: #28a745;
}

.disconnected-icon .dot {
  background-color: #dc3545;
}

.pulse {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: rgba(40, 167, 69, 0.3);
  top: 0;
  left: 0;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.7;
  }
  70% {
    transform: scale(1.2);
    opacity: 0;
  }
  100% {
    transform: scale(0.8);
    opacity: 0;
  }
}

.status-details {
  display: flex;
  flex-direction: column;
}

.status-text {
  font-weight: bold;
}

.details {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}

.error-message {
  color: #dc3545;
  font-weight: bold;
}
</style>
