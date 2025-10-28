<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button @click="cancel">Cancel</ion-button>
        </ion-buttons>
        <ion-title>{{ deviceConfig.name }} Settings</ion-title>
        <ion-buttons slot="end">
          <ion-button 
            @click="saveSettings" 
            :disabled="!isValid || saving"
            strong
            color="success"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <!-- Device Info (Read-only) -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="getIcon(deviceConfig.icon)"></ion-icon>
            {{ device.name || 'Unknown Device' }}
          </ion-card-title>
          <ion-card-subtitle>{{ deviceConfig.manufacturer }}</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <p><strong>MAC Address:</strong> {{ device.id }}</p>
          <p v-if="device.rssi"><strong>Signal:</strong> {{ device.rssi }} dBm</p>
        </ion-card-content>
      </ion-card>
      
      <!-- Encryption Status (Victron only) -->
      <ion-card v-if="showEncryptionKey && encryptionStatus">
        <ion-card-content>
          <ion-item lines="none">
            <ion-icon 
              :icon="getIcon(encryptionStatus.icon)" 
              :color="encryptionStatus.color"
              slot="start"
            ></ion-icon>
            <ion-label>
              <h3>{{ encryptionStatus.text }}</h3>
            </ion-label>
          </ion-item>
        </ion-card-content>
      </ion-card>
      
      <!-- Common Fields -->
      <ion-list>
        <ion-item>
          <ion-label position="stacked">Device Label (Custom Name)</ion-label>
          <ion-input 
            v-model="userLabel" 
            placeholder="e.g., Salon Temperature"
          ></ion-input>
        </ion-item>
        
        <ion-item>
          <ion-label position="stacked">Notes</ion-label>
          <ion-textarea 
            v-model="notes" 
            placeholder="Optional notes about this device..."
            :rows="3"
          ></ion-textarea>
        </ion-item>
      </ion-list>
      
      <!-- Encryption Key (Victron only) -->
      <ion-list v-if="showEncryptionKey">
        <ion-list-header>
          <ion-label>Encryption Settings</ion-label>
        </ion-list-header>
        
        <ion-item>
          <ion-label position="stacked">
            Encryption Key
            <ion-text color="danger" v-if="deviceConfig.encryptionKeyRequired">*</ion-text>
          </ion-label>
          <ion-input 
            v-model="encryptionKey" 
            placeholder="32 character hex key"
            :maxlength="32"
            type="text"
            autocomplete="off"
          ></ion-input>
        </ion-item>
        
        <ion-item lines="none" v-if="encryptionKeyError">
          <ion-label color="danger">
            <p>{{ encryptionKeyError }}</p>
          </ion-label>
        </ion-item>
        
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <ion-text color="medium">
              <p style="font-size: 0.9em;">{{ deviceConfig.encryptionKeyHelp }}</p>
            </ion-text>
          </ion-label>
        </ion-item>
      </ion-list>
      
      <!-- Live Data Preview -->
      <ion-card v-if="showLiveData">
        <ion-card-header>
          <ion-card-title>Current Data</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <!-- RuuviTag Data -->
          <div v-if="device.manufacturerId === 1177">
            <ion-item v-if="device.sensorData?.temperature">
              <ion-label>Temperature</ion-label>
              <ion-note slot="end">
                {{ device.sensorData.temperature.value }}{{ device.sensorData.temperature.unit }}
                <span v-if="device.sensorData.temperature.fahrenheit">
                  ({{ device.sensorData.temperature.fahrenheit.toFixed(1) }}°F)
                </span>
              </ion-note>
            </ion-item>
            <ion-item v-if="device.sensorData?.humidity">
              <ion-label>Humidity</ion-label>
              <ion-note slot="end">
                {{ device.sensorData.humidity.value }}{{ device.sensorData.humidity.unit }}
              </ion-note>
            </ion-item>
            <ion-item v-if="device.sensorData?.pressure">
              <ion-label>Pressure</ion-label>
              <ion-note slot="end">
                {{ device.sensorData.pressure.value }}{{ device.sensorData.pressure.unit }}
              </ion-note>
            </ion-item>
            <ion-item v-if="device.sensorData?.battery">
              <ion-label>Battery</ion-label>
              <ion-note slot="end">
                {{ device.sensorData.battery.voltage.value }}{{ device.sensorData.battery.voltage.unit }}
              </ion-note>
            </ion-item>
          </div>
          
          <!-- Victron Data -->
          <div v-if="device.manufacturerId === 737">
            <ion-item v-if="device.sensorData?.voltage">
              <ion-label>Voltage</ion-label>
              <ion-note slot="end">
                {{ device.sensorData.voltage.value }}{{ device.sensorData.voltage.unit }}
              </ion-note>
            </ion-item>
            <ion-item v-if="device.sensorData?.current">
              <ion-label>Current</ion-label>
              <ion-note slot="end">
                {{ device.sensorData.current.value }}{{ device.sensorData.current.unit }}
              </ion-note>
            </ion-item>
            <ion-item v-if="device.sensorData?.stateOfCharge">
              <ion-label>State of Charge</ion-label>
              <ion-note slot="end">
                {{ device.sensorData.stateOfCharge.value }}{{ device.sensorData.stateOfCharge.unit }}
              </ion-note>
            </ion-item>
            <ion-item v-if="device.sensorData?.timeRemaining">
              <ion-label>Time Remaining</ion-label>
              <ion-note slot="end">
                {{ Math.floor(device.sensorData.timeRemaining.value / 60) }}h 
                {{ device.sensorData.timeRemaining.value % 60 }}m
              </ion-note>
            </ion-item>
          </div>
          
          <!-- No data message -->
          <ion-item v-if="!device.sensorData || Object.keys(device.sensorData).length === 0">
            <ion-label class="ion-text-wrap">
              <ion-text color="medium">
                <p>No data available yet. Waiting for device broadcast...</p>
              </ion-text>
            </ion-label>
          </ion-item>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonNote,
  IonText,
  IonIcon,
  modalController
} from '@ionic/vue'
import {
  thermometerOutline,
  batteryChargingOutline,
  bluetoothOutline,
  checkmarkCircle,
  timeOutline,
  alertCircle,
  pencilOutline
} from 'ionicons/icons'
import { getDeviceConfig } from '@/client/config/bluetoothDevices'
import { useStateDataStore } from '@/client/stores/stateDataStore'

const props = defineProps({
  device: { type: Object, required: true }
})

// Get state store for sending WebSocket messages
const stateStore = useStateDataStore()

// Get device-specific configuration
const deviceConfig = computed(() => {
  return getDeviceConfig(props.device.manufacturerId)
})

// Form fields
const userLabel = ref(props.device.metadata?.userLabel || '')
const notes = ref(props.device.metadata?.notes || '')
const encryptionKey = ref(props.device.metadata?.encryptionKey || '')

// Validation
const encryptionKeyError = ref('')
const isValid = computed(() => {
  if (deviceConfig.value.encryptionKeyRequired && !encryptionKey.value) {
    return false
  }
  if (encryptionKey.value && deviceConfig.value.encryptionKeyValidation) {
    return deviceConfig.value.encryptionKeyValidation.test(encryptionKey.value)
  }
  return true
})

// Show/hide fields based on device type
const showEncryptionKey = computed(() => {
  return deviceConfig.value.fields.encryptionKey
})

const showLiveData = computed(() => {
  return deviceConfig.value.showLiveData
})

// Status indicator
const encryptionStatus = computed(() => {
  if (!showEncryptionKey.value) return null
  
  const hasKey = props.device.metadata?.encryptionKey
  const hasData = props.device.sensorData && Object.keys(props.device.sensorData).length > 0
  
  if (hasKey && hasData) {
    return { icon: 'checkmark-circle', color: 'success', text: 'Connected & Decrypting' }
  } else if (hasKey && !hasData) {
    return { icon: 'time-outline', color: 'warning', text: 'Waiting for data...' }
  } else {
    return { icon: 'alert-circle', color: 'danger', text: 'Encryption key required' }
  }
})

// Icon helper
const iconMap = {
  'thermometer-outline': thermometerOutline,
  'battery-charging-outline': batteryChargingOutline,
  'bluetooth-outline': bluetoothOutline,
  'checkmark-circle': checkmarkCircle,
  'time-outline': timeOutline,
  'alert-circle': alertCircle,
  'pencil-outline': pencilOutline
}

const getIcon = (iconName) => {
  return iconMap[iconName] || bluetoothOutline
}

// Save metadata
const saving = ref(false)

const saveSettings = async () => {
  // Validate encryption key if required
  if (showEncryptionKey.value && encryptionKey.value) {
    if (!deviceConfig.value.encryptionKeyValidation.test(encryptionKey.value)) {
      encryptionKeyError.value = 'Invalid encryption key format (must be 32 hex characters)'
      return
    }
  }
  
  saving.value = true
  
  try {
    // Build metadata object
    const metadata = {
      userLabel: userLabel.value,
      notes: notes.value
    }
    
    // Add encryption key if provided
    if (showEncryptionKey.value && encryptionKey.value) {
      metadata.encryptionKey = encryptionKey.value
    }
    
    // Send update message via WebSocket using the state store method
    console.log('Sending bluetooth metadata update for device:', props.device.id)
    
    await stateStore.sendMessageToServer('bluetooth:update-metadata', {
      deviceId: props.device.id,
      metadata: metadata
    })
    
    // Close modal
    modalController.dismiss({ updated: true, metadata })
  } catch (error) {
    console.error('Failed to update device metadata:', error)
    alert('Failed to save settings. Please try again.')
  } finally {
    saving.value = false
  }
}

const cancel = () => {
  modalController.dismiss(null, 'cancel')
}
</script>

<style scoped>
ion-card {
  margin-bottom: 16px;
}

ion-card-title ion-icon {
  margin-right: 8px;
  vertical-align: middle;
}

ion-list-header {
  margin-top: 16px;
}

ion-item ion-icon[slot="start"] {
  margin-right: 12px;
}
</style>
