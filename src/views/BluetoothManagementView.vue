<template>
  <ion-page class="bluetooth-page">
    <generic-header title="Bluetooth Management" />
    <ion-content class="content-with-header bluetooth-content">
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
            <p class="hint">Select devices from the discovered list below</p>
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
            <p class="hint">Discovery runs automatically every 30 seconds</p>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, watch } from 'vue';
import {
  IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonIcon, modalController
} from '@ionic/vue';
import { bluetoothOutline, searchOutline } from 'ionicons/icons';
import { useStateDataStore } from '../stores/stateDataStore';
import GenericHeader from '../components/GenericHeader.vue';
import BluetoothDeviceList from '../components/BluetoothDeviceList.vue';
import BluetoothDeviceSettingsModal from '../components/BluetoothDeviceSettingsModal.vue';

const stateStore = useStateDataStore();

// Debug logging for bluetooth state
console.log('[BluetoothManagementView] Full state:', stateStore.state);
console.log('[BluetoothManagementView] Bluetooth state:', stateStore.state.bluetooth);
console.log('[BluetoothManagementView] Bluetooth devices:', stateStore.state.bluetooth?.devices);
console.log('[BluetoothManagementView] Bluetooth selectedDevices:', stateStore.state.bluetooth?.selectedDevices);

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

const deviceCount = computed(() => Object.keys(devices.value).length);
const selectedCount = computed(() => Object.keys(selectedDevices.value).length);

// Get the selected devices' data - now directly from selectedDevices object
const selectedDevicesData = computed(() => selectedDevices.value);

// Watch for changes in bluetooth state
watch(
  () => stateStore.state.bluetooth,
  (newBluetooth) => {
    console.log('[BluetoothManagementView] Bluetooth state changed:', newBluetooth);
    console.log('[BluetoothManagementView] Devices count:', Object.keys(newBluetooth?.devices || {}).length);
    console.log('[BluetoothManagementView] Selected devices count:', Object.keys(newBluetooth?.selectedDevices || {}).length);
  },
  { immediate: true, deep: true }
);

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
      // The server will update the state automatically via WebSocket
    }
  } catch (error) {
    console.error('Failed to open device settings:', error);
  }
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
