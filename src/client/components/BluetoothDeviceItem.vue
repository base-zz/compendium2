<template>
  <div class="bluetooth-device-item">
    <ion-item>
      <ion-icon :icon="bluetoothIcon" slot="start" :color="isSelected ? 'primary' : 'medium'"></ion-icon>
      
      <ion-label>
        <div class="device-name-container">
          <h2>{{ displayName }}</h2>
          
          <ion-button
            fill="clear"
            size="small"
            @click="openSettings"
          >
            <ion-icon :icon="pencil" slot="icon-only" size="small"></ion-icon>
          </ion-button>
        </div>
        
        <p>{{ device.address || 'Unknown Address' }}</p>
        
        <div class="device-details">
          <ion-badge color="medium">RSSI: {{ device.rssi || 'N/A' }}</ion-badge>
          
          <ion-badge 
            v-if="device.sensorData" 
            color="success"
          >
            Sensor Data Available
          </ion-badge>
          
          <ion-badge 
            v-if="device.lastSensorUpdate" 
            color="primary"
          >
            Updated: {{ formatTime(device.lastSensorUpdate) }}
          </ion-badge>
        </div>
      </ion-label>
      
      <ion-button
        slot="end"
        fill="solid"
        size="small"
        :color="isSelected ? 'danger' : 'primary'"
        @click="toggleSelection"
      >
        {{ isSelected ? 'Deselect' : 'Select' }}
      </ion-button>
    </ion-item>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { 
  IonItem, IonIcon, IonLabel, IonBadge, IonButton
} from '@ionic/vue';
import { bluetooth, pencil } from 'ionicons/icons';

const props = defineProps({
  device: {
    type: Object,
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['select', 'deselect', 'edit-device']);

// Display name logic
const displayName = computed(() => {
  if (props.device.name) return props.device.name;
  if (props.device.localName) return props.device.localName;
  return `Device ${props.deviceId.substring(0, 8)}`;
});

// Icon for the device
const bluetoothIcon = bluetooth;

// Toggle device selection
const toggleSelection = () => {
  if (props.isSelected) {
    emit('deselect');
  } else {
    emit('select');
  }
};

// Open device settings modal
const openSettings = () => {
  emit('edit-device');
};

// Format timestamp
const formatTime = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
</script>

<style scoped>
.device-name-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-details {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
</style>
