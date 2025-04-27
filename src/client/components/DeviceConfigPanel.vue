<template>
  <ion-card class="system-config-card">
    <ion-card-header>
      <ion-card-title>System Configuration</ion-card-title>
      <ion-card-subtitle>Configure device role and GPS settings</ion-card-subtitle>
    </ion-card-header>
    <ion-card-content>
      <ion-list>
        <!-- Device Role Selection -->
        <ion-item>
          <ion-label>Device Role</ion-label>
          <ion-select v-model="deviceRole" @ionChange="updateDeviceRole" interface="popover">
            <ion-select-option value="server">Server</ion-select-option>
            <ion-select-option value="client">Client</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-note>
            <strong>Server:</strong> Processes data locally, ideal for main vessel device<br>
            <strong>Client:</strong> Connects to server, ideal for secondary devices
          </ion-note>
        </ion-item>
        
        <!-- Device GPS Toggle -->
        <ion-item v-if="deviceRole === 'client'">
          <ion-label>Use Device GPS</ion-label>
          <ion-toggle v-model="useDeviceGPS" @ionChange="updateUseDeviceGPS"></ion-toggle>
        </ion-item>
        <ion-item lines="none" v-if="deviceRole === 'client'">
          <ion-note>
            Enable to use this device's GPS for position tracking
          </ion-note>
        </ion-item>
        
        <!-- Default MMSI Setting -->
        <ion-item>
          <ion-label position="stacked">Default MMSI</ion-label>
          <ion-input
            v-model="defaultMMSI"
            type="text"
            placeholder="Enter default MMSI"
            @ionChange="updateDefaultMMSI"
          ></ion-input>
        </ion-item>
        <ion-item lines="none">
          <ion-note>
            Used when MMSI is not available from user profile
          </ion-note>
        </ion-item>
        
        <!-- Run Processing Locally Toggle -->
        <ion-item v-if="deviceRole === 'server'">
          <ion-label>Run Processing Locally</ion-label>
          <ion-toggle v-model="runProcessingLocally" @ionChange="updateRunProcessingLocally"></ion-toggle>
        </ion-item>
        <ion-item lines="none" v-if="deviceRole === 'server'">
          <ion-note>
            Enable to run processing tasks locally
          </ion-note>
        </ion-item>
      </ion-list>
      
      <div class="config-description">
        <p v-if="deviceRole === 'server'">
          <strong>Server Mode:</strong> This device will run processing tasks and store data locally.
          It should remain on the boat and connected to power.
        </p>
        <p v-else>
          <strong>Client Mode:</strong> This device will connect to a server for data and processing.
          You can use this mode on mobile devices that may leave the boat.
        </p>
        
        <p v-if="deviceRole === 'client' && useDeviceGPS">
          Using this device's GPS for position tracking.
        </p>
        <p v-else-if="deviceRole === 'client' && !useDeviceGPS">
          Using external GPS data from SignalK/InfluxDB.
        </p>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup>
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonNote,
  IonInput,
} from '@ionic/vue';
import { ref, onMounted } from 'vue';
import { useSystemConfigStore } from '@/services/config/systemConfig';

// Get the system config store
const systemConfigStore = useSystemConfigStore();

// Local reactive state
const deviceRole = ref('client');
const useDeviceGPS = ref(false);
const defaultMMSI = ref('');
const runProcessingLocally = ref(false);

// Initialize component with current settings
onMounted(() => {
  deviceRole.value = systemConfigStore.deviceRole;
  useDeviceGPS.value = systemConfigStore.useDeviceGPS;
  defaultMMSI.value = systemConfigStore.defaultMMSI;
  runProcessingLocally.value = systemConfigStore.runProcessingLocally;
});

// Update device role in store when changed
const updateDeviceRole = () => {
  systemConfigStore.setDeviceRole(deviceRole.value);
  if (deviceRole.value === 'server') {
    runProcessingLocally.value = true;
    systemConfigStore.setRunProcessingLocally(true);
  }
};

// Update device GPS setting in store when changed
const updateUseDeviceGPS = () => {
  systemConfigStore.setUseDeviceGPS(useDeviceGPS.value);
};

// Update default MMSI in store when changed
const updateDefaultMMSI = () => {
  systemConfigStore.setDefaultMMSI(defaultMMSI.value);
};

// Update run processing locally setting in store when changed
const updateRunProcessingLocally = () => {
  systemConfigStore.setRunProcessingLocally(runProcessingLocally.value);
};
</script>

<style scoped>
.system-config-card {
  margin: 16px 0;
}

ion-note {
  font-size: 0.8rem;
  padding-left: 16px;
}

.config-description {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f8f8f8;
  border-radius: 8px;
}
</style>
