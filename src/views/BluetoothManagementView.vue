<template>
  <ion-page class="bluetooth-page">
    <generic-header title="Bluetooth Management" />
    <ion-content class="content-with-header bluetooth-content">
      <!-- Status and Controls Section -->
      <ion-card class="surface-card status-card">
        <ion-card-header>
          <ion-card-title>Bluetooth Status</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label>Status</ion-label>
            <ion-badge slot="end" :class="['status-badge', bluetoothStatus.tone]">
              {{ bluetoothStatus.text }}
            </ion-badge>
          </ion-item>
          
          <ion-item>
            <ion-label>Last Updated</ion-label>
            <ion-note slot="end" v-if="lastUpdated">
              {{ formatDate(lastUpdated) }}
            </ion-note>
            <ion-note slot="end" v-else>Never</ion-note>
          </ion-item>
          
          <div class="button-container">
            <ion-button 
              :disabled="!canToggleBluetooth" 
              @click="toggleBluetooth"
              :class="['action-button', bluetooth.enabled ? 'warning-button' : 'primary-button']"
            >
              {{ bluetooth.enabled ? 'Disable' : 'Enable' }} Bluetooth
            </ion-button>
            
            <ion-button 
              :disabled="!canScan" 
              @click="toggleScan"
              :class="['action-button', bluetooth.scanning ? 'warning-button' : 'secondary-button']"
            >
              {{ bluetooth.scanning ? 'Stop Scan' : 'Start Scan' }}
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>
      
      <!-- Devices Section -->
      <ion-card class="surface-card">
        <ion-card-header>
          <ion-card-title>Discovered Devices</ion-card-title>
          <ion-card-subtitle>{{ deviceCount }} devices found</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <bluetooth-device-list 
            :devices="devices" 
            :selectedDevices="selectedDevices"
            @select-device="selectDevice"
            @deselect-device="deselectDevice"
            @edit-device="editDevice"
          />
          
          <div v-if="deviceCount === 0" class="empty-state">
            <ion-icon :icon="searchOutline" size="large"></ion-icon>
            <p>No Bluetooth devices discovered</p>
            <ion-button @click="startScan" size="small" class="action-button primary-button">Start Scanning</ion-button>
          </div>
        </ion-card-content>
      </ion-card>
      
      <!-- Selected Devices Section -->
      <ion-card class="surface-card">
        <ion-card-header>
          <ion-card-title>Selected Devices</ion-card-title>
          <ion-card-subtitle>{{ selectedCount }} devices selected</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <bluetooth-device-list 
            :devices="selectedDevicesData" 
            :selectedDevices="selectedDevices"
            :showSelectedOnly="true"
            @deselect-device="deselectDevice"
            @edit-device="editDevice"
          />
          
          <div v-if="selectedCount === 0" class="empty-state">
            <ion-icon :icon="bluetoothOutline" size="large"></ion-icon>
            <p>No devices selected</p>
            <p class="hint">Select devices from the discovered list above</p>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed } from 'vue';
import { 
  IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonItem, IonLabel, IonBadge, IonButton, IonNote, IonIcon,
  modalController
} from '@ionic/vue';
import { bluetoothOutline, searchOutline } from 'ionicons/icons';
import { useStateDataStore } from '../stores/stateDataStore';
import GenericHeader from '../components/GenericHeader.vue';
import BluetoothDeviceList from '../components/BluetoothDeviceList.vue';
import BluetoothDeviceSettingsModal from '../components/BluetoothDeviceSettingsModal.vue';

const stateStore = useStateDataStore();

// Computed properties for Bluetooth state
const bluetooth = computed(() => stateStore.state.bluetooth || {
  enabled: false,
  scanning: false,
  lastUpdated: null,
  devices: {},
  selectedDevices: {},
  status: { state: 'disabled', error: null }
});

// Filter out devices that are already in the selectedDevices list
const devices = computed(() => {
  const allDevices = bluetooth.value.devices || {};
  const selectedIds = Object.keys(selectedDevices.value);
  const filteredDevices = {};
  
  // Only include devices that are not in selectedDevices
  Object.entries(allDevices).forEach(([id, device]) => {
    if (!selectedIds.includes(id)) {
      filteredDevices[id] = device;
    }
  });
  
  return filteredDevices;
});
const selectedDevices = computed(() => bluetooth.value.selectedDevices || {});
const lastUpdated = computed(() => bluetooth.value.lastUpdated);

const deviceCount = computed(() => Object.keys(devices.value).length);
const selectedCount = computed(() => Object.keys(selectedDevices.value).length);

// Get the selected devices' data - now directly from selectedDevices object
const selectedDevicesData = computed(() => selectedDevices.value);

// Status computation
const bluetoothStatus = computed(() => {
  if (bluetooth.value.error) {
    return { text: 'Error', tone: 'error' };
  }
  
  if (bluetooth.value.scanning) {
    return { text: 'Scanning...', tone: 'scanning' };
  }
  
  switch (bluetooth.value.status?.state) {
    case 'enabled':
      return { text: 'Enabled', tone: 'enabled' };
    case 'disabled':
      return { text: 'Disabled', tone: 'disabled' };
    case 'unauthorized':
      return { text: 'Unauthorized', tone: 'warning' };
    case 'unsupported':
      return { text: 'Unsupported', tone: 'error' };
    default:
      return { text: 'Unknown', tone: 'muted' };
  }
});

// Control flags
const canToggleBluetooth = computed(() => {
  return bluetooth.value.status?.state !== 'unsupported';
});

const canScan = computed(() => {
  return bluetooth.value.enabled && !bluetooth.value.scanning;
});

// Actions
const toggleBluetooth = async () => {
  try {
    await stateStore.sendMessageToServer('bluetooth:toggle', {
      enabled: !bluetooth.value.enabled
    });
  } catch (error) {
    console.error('Failed to toggle Bluetooth:', error);
  }
};

const toggleScan = async () => {
  try {
    await stateStore.sendMessageToServer('bluetooth:scan', {
      scanning: !bluetooth.value.scanning
    });
  } catch (error) {
    console.error('Failed to toggle scanning:', error);
  }
};

const startScan = async () => {
  if (!bluetooth.value.enabled) {
    // Enable Bluetooth first
    await toggleBluetooth();
  }
  
  if (!bluetooth.value.scanning) {
    await toggleScan();
  }
};

const selectDevice = async (deviceId) => {
  try {
    await stateStore.sendMessageToServer('bluetooth:select-device', { deviceId });
  } catch (error) {
    console.error('Failed to select device:', error);
  }
};

const deselectDevice = async (deviceId) => {
  try {
    await stateStore.sendMessageToServer('bluetooth:deselect-device', { deviceId });
  } catch (error) {
    console.error('Failed to deselect device:', error);
  }
};

const editDevice = async (deviceId) => {
  try {
    // Get the device data from either devices or selectedDevices
    const device = devices.value[deviceId] || selectedDevices.value[deviceId];
    
    if (!device) {
      console.error('Device not found:', deviceId);
      return;
    }
    
    // Open the settings modal
    const modal = await modalController.create({
      component: BluetoothDeviceSettingsModal,
      componentProps: {
        device: { ...device, id: deviceId }
      }
    });
    
    await modal.present();
    
    const { data } = await modal.onWillDismiss();
    if (data?.updated) {
      console.log('Device metadata updated:', data.metadata);
      // The server will update the state automatically via WebSocket
    }
  } catch (error) {
    console.error('Failed to open device settings:', error);
  }
};

// Helper functions
const formatDate = (timestamp) => {
  if (!timestamp) return 'Never';
  
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// ... rest of the code remains the same ...
</script>

<style scoped>
.bluetooth-page {
  background: var(--app-background-color);
  color: var(--app-text-color);
}

.bluetooth-content {
  --background: var(--app-background-color);
  color: var(--app-text-color);
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

.surface-card {
  --background: var(--app-surface-color);
  --color: var(--app-text-color);
  --border-color: var(--app-border-color);
  margin: 16px;
  border-radius: 16px;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--app-text-color) 12%, transparent);
}

.surface-card :deep(ion-card-header) {
  color: var(--app-text-color);
  border-bottom: 1px solid var(--app-border-color);
}

.surface-card :deep(ion-card-title),
.surface-card :deep(ion-card-subtitle) {
  color: inherit;
}

.surface-card :deep(ion-item) {
  --background: transparent;
  --color: var(--app-text-color);
  --border-color: var(--app-border-color);
  --inner-border-width: 0 0 1px 0;
}

.surface-card :deep(ion-item:last-of-type) {
  --inner-border-width: 0;
}

.surface-card :deep(ion-note) {
  color: var(--app-muted-text-color);
}

.button-container {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--app-muted-text-color);
}

.empty-state ion-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: var(--app-accent-color);
}

.hint {
  font-size: 0.8em;
  opacity: 0.8;
  margin-top: 4px;
}
</style>
