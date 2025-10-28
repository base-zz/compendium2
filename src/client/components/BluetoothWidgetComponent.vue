<template>
  <div class="bluetooth-widget">
    <ion-item button @click="router.push('/bluetooth')" detail>
      <ion-icon :icon="bluetooth" slot="start" :color="bluetoothStatus.color"></ion-icon>
      <ion-label>
        <h2>Bluetooth</h2>
        <p>{{ bluetoothStatus.text }}</p>
      </ion-label>
      <ion-badge slot="end" :color="bluetoothStatus.color">{{ deviceCount }}</ion-badge>
    </ion-item>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { IonItem, IonIcon, IonLabel, IonBadge } from '@ionic/vue';
import { bluetooth } from 'ionicons/icons';
import { useStateDataStore } from '../stores/stateDataStore';

const router = useRouter();
const stateStore = useStateDataStore();

// Compute Bluetooth status
const bluetoothStatus = computed(() => {
  const btState = stateStore.state.bluetooth;
  
  if (!btState) {
    return { text: 'Not Available', color: 'medium' };
  }
  
  if (btState.error) {
    return { text: 'Error', color: 'danger' };
  }
  
  if (btState.scanning) {
    return { text: 'Scanning...', color: 'primary' };
  }
  
  switch (btState.status?.state) {
    case 'enabled':
      return { text: 'Enabled', color: 'success' };
    case 'disabled':
      return { text: 'Disabled', color: 'medium' };
    case 'unauthorized':
      return { text: 'Unauthorized', color: 'warning' };
    case 'unsupported':
      return { text: 'Unsupported', color: 'danger' };
    default:
      return { text: 'Unknown', color: 'medium' };
  }
});

// Count of devices
const deviceCount = computed(() => {
  const devices = stateStore.state.bluetooth?.devices || {};
  return Object.keys(devices).length;
});
</script>

<style scoped>
.bluetooth-widget {
  margin-bottom: 8px;
}
</style>
