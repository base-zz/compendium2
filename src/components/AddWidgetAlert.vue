<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ existingAlert ? "Edit Alert" : "Add Alert" }}</ion-title>
      <ion-buttons slot="start">
        <ion-button @click="cancel">Cancel</ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button v-if="existingAlert" @click="deleteCurrentAlert" color="danger">
          Delete
        </ion-button>
        <ion-button @click="confirm" :disabled="!isValid">Save</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <form class="custom-form">
      <!-- Alert Title -->
      <div class="form-group">
        <label class="form-label">Alert Title</label>
        <ion-input
          class="form-control"
          type="text"
          v-model="alertData.label"
          placeholder="Enter alert title"
        ></ion-input>
      </div>

      <!-- Data Source -->
      <div class="form-group">
        <label class="form-label">Data Source</label>
        <ion-select
          class="form-control"
          v-model="alertData.dataSource"
          placeholder="Select data source"
          :interface-options="{
            cssClass: 'select-modal',
            header: 'Select Data Source',
          }"
        >
          <ion-select-option v-for="key in navDataKeys" :key="key" :value="key">
            {{ getDataSourceLabel(key) }}
          </ion-select-option>
        </ion-select>
      </div>

      <!-- Current Value -->
      <div class="form-group" v-if="alertData.dataSource">
        <label class="form-label">Current Value</label>
        <ion-input class="form-control" readonly :value="getCurrentValue"></ion-input>
      </div>

      <!-- Alert Type -->
      <div class="form-group">
        <label class="form-label">Alert Level</label>
        <ion-select
          class="form-control"
          v-model="alertData.type"
          placeholder="Select alert type"
          :interface-options="{
            cssClass: 'select-modal',
            header: 'Select Alert Level',
          }"
        >
          <ion-select-option value="info">Info</ion-select-option>
          <ion-select-option value="warning">Warning</ion-select-option>
          <ion-select-option value="critical">Critical</ion-select-option>
        </ion-select>
      </div>

      <!-- Threshold -->
      <div class="form-group" v-if="alertData.dataSource">
        <label class="form-label">Alert At This Value</label>
        <ion-input
          class="form-control"
          type="number"
          v-model="alertData.threshold"
          placeholder="Enter threshold value"
        ></ion-input>
        <small class="form-help">Value that will trigger the alert</small>
      </div>

      <!-- Repeat Alert -->
      <div class="form-group">
        <label class="form-label">Repeat Alert</label>
        <ion-select
          class="form-control"
          v-model="alertData.repeat"
          :interface-options="{
            cssClass: 'select-modal',
            header: 'Select Repeat Alert',
          }"
        >
          <ion-select-option value="">No Repeat</ion-select-option>
          <ion-select-option value="every_5_above">Every 5 Above</ion-select-option>
          <ion-select-option value="every_5_below">Every 5 Below</ion-select-option>
        </ion-select>
      </div>

      <!-- Repeat Threshold -->
      <div class="form-group" v-if="alertData.repeat">
        <label class="form-label">End Alerts At This Value</label>
        <ion-input
          class="form-control"
          type="number"
          v-model="alertData.repeatThreshold"
          placeholder="Enter end threshold"
        ></ion-input>
        <small class="form-help">Value at which to stop alerts</small>
      </div>

      <!-- Remote Alert Toggle -->
      <div class="form-group">
        <label class="form-label">Remote Alert</label>
        <ion-toggle v-model="alertData.remoteAlert"></ion-toggle>
      </div>

      <!-- Custom Message Toggle -->
      <div class="form-group">
        <label class="form-label">Customize Message</label>
        <ion-toggle v-model="customizeMessage"></ion-toggle>
      </div>

      <!-- Custom Header -->
      <div class="form-group" v-if="customizeMessage">
        <label class="form-label">Custom Header</label>
        <ion-input
          class="form-control"
          type="text"
          v-model="alertData.customHeader"
          placeholder="Enter custom header"
        ></ion-input>
        <small class="form-help">Optional custom header for alert</small>
      </div>

      <!-- Message -->
      <div class="form-group" v-if="!customizeMessage">
        <label class="form-label">Message</label>
        <ion-textarea
          class="form-control"
          v-model="alertData.message"
          placeholder="Enter alert message"
        ></ion-textarea>
      </div>

      <!-- Custom Message -->
      <div class="form-group" v-if="customizeMessage">
        <label class="form-label">Custom Message</label>
        <ion-input
          class="form-control"
          type="text"
          v-model="alertData.customMessage"
          placeholder="Enter custom message"
        ></ion-input>
        <small class="form-help">Optional custom message for alert</small>
      </div>
    </form>
  </ion-content>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToggle,
  IonIcon,
  modalController,
} from "@ionic/vue";
import { useAlertStore } from "@/stores/alerts";
import { useStateDataStore } from "@/stores/stateDataStore.js";
import { storeToRefs } from "pinia";
import { checkPocketBaseConnection } from "@/check-pocketbase";

const props = defineProps({
  existingAlert: {
    type: Object,
    default: null,
  },
});

const alertStore = useAlertStore();
const stateStore = useStateDataStore();
const { navigationState, alertState } = storeToRefs(stateStore);

// Get the data source field names as an array
const navDataKeys = computed(() => {
  if (!navigationState.value) return [];
  // Define available instrument fields based on the state structure
  return [
    "Speed Over Ground",
    "Speed Through Water",
    "Depth",
    "Wind Speed (True)",
    "Wind Angle (True)",
    "Wind Speed (Apparent)",
    "Wind Angle (Apparent)",
    "Heading",
    "Course Over Ground",
    "Current Speed",
    "Current Direction",
    "Water Temperature",
    "Air Temperature",
    "Pressure"
  ];
});

console.log("navDataKeys", navDataKeys.value);
// Initialize alert data with default values or existing alert data
const alertData = ref({
  _id: props.existingAlert?._id || null,
  type: props.existingAlert?.type || "info",
  label: props.existingAlert?.label || "",
  message: props.existingAlert?.message || "",
  dataSource: props.existingAlert?.dataSource || "",
  threshold: props.existingAlert?.threshold || "",
  timestamp: props.existingAlert?.timestamp || Date.now(),
  data: props.existingAlert?.data || {},
  repeat: props.existingAlert?.repeat || "",
  repeatThreshold: props.existingAlert?.repeatThreshold || "",
  remoteAlert: props.existingAlert?.remoteAlert || false,
  customHeader: props.existingAlert?.customHeader || "",
  customMessage: props.existingAlert?.customMessage || "",
  source: "user-defined",
});

// Get the display label for a data source
const getDataSourceLabel = (key) => {
  // Map field keys to their display labels
  const fieldLabels = {
    "Speed Over Ground": "Speed Over Ground",
    "Speed Through Water": "Speed Through Water",
    "Depth": "Depth",
    "Wind Speed (True)": "Wind Speed (True)",
    "Wind Angle (True)": "Wind Angle (True)",
    "Wind Speed (Apparent)": "Wind Speed (Apparent)",
    "Wind Angle (Apparent)": "Wind Angle (Apparent)",
    "Heading": "Heading",
    "Course Over Ground": "Course Over Ground",
    "Current Speed": "Current Speed",
    "Current Direction": "Current Direction",
    "Water Temperature": "Water Temperature",
    "Air Temperature": "Air Temperature",
    "Pressure": "Pressure"
  };
  return fieldLabels[key] || key;
};

// Get the current value of the selected data source
const getCurrentValue = computed(() => {
  if (!alertData.value.dataSource || !navigationState.value) {
    return "";
  }

  // Get the value from the appropriate path in the state structure
  const sourceKey = alertData.value.dataSource;
  
  // Map field names to their paths in the state structure
  const fieldPaths = {
    "Speed Over Ground": navigationState.value.speedOverGround,
    "Speed Through Water": navigationState.value.speedThroughWater,
    "Depth": navigationState.value.depth,
    "Wind Speed (True)": navigationState.value.windSpeedTrue,
    "Wind Angle (True)": navigationState.value.windAngleTrue,
    "Wind Speed (Apparent)": navigationState.value.windSpeedApparent,
    "Wind Angle (Apparent)": navigationState.value.windAngleApparent,
    "Heading": navigationState.value.heading,
    "Course Over Ground": navigationState.value.courseOverGround,
    "Current Speed": navigationState.value.currentSpeed,
    "Current Direction": navigationState.value.currentDirection,
    "Water Temperature": navigationState.value.waterTemperature,
    "Air Temperature": navigationState.value.airTemperature,
    "Pressure": navigationState.value.pressure
  };
  
  const value = fieldPaths[sourceKey];
  
  if (value === undefined) return "N/A";
  
  // Map field keys to their units
  const fieldUnits = {
    "Speed Over Ground": "kn",
    "Speed Through Water": "kn",
    "Depth": "m",
    "Wind Speed (True)": "kn",
    "Wind Angle (True)": "°",
    "Wind Speed (Apparent)": "kn",
    "Wind Angle (Apparent)": "°",
    "Heading": "°",
    "Course Over Ground": "°",
    "Current Speed": "kn",
    "Current Direction": "°",
    "Water Temperature": "°C",
    "Air Temperature": "°C",
    "Pressure": "hPa"
  };

  return `${value || 0} ${fieldUnits[sourceKey] || ""}`;
});

// Computed property to check if form is valid
const isValid = computed(() => {
  // Check basic fields
  const basicValidation = alertData.value.label && alertData.value.label.trim() !== "";

  // Check message field - either regular message or custom message must be valid
  const messageValidation = customizeMessage.value
    ? alertData.value.customMessage && alertData.value.customMessage.trim() !== ""
    : alertData.value.message && alertData.value.message.trim() !== "";

  // Check data source and threshold
  const dataSourceValidation =
    alertData.value.dataSource &&
    alertData.value.dataSource.trim() !== "" &&
    alertData.value.threshold !== undefined &&
    alertData.value.threshold !== "";

  // All validations must pass
  return basicValidation && messageValidation && dataSourceValidation;
});

// Toggle for custom message
const customizeMessage = ref(props.existingAlert?.customMessage ? true : false);

// Cancel and close modal
const cancel = () => {
  modalController.dismiss(null, "cancel");
};

// Delete current alert
const deleteCurrentAlert = () => {
  alertStore.deleteAlert(alertData.value._id);
  modalController.dismiss(null, "delete");
};

// Confirm and save alert
const confirm = async () => {
  // Check PocketBase connection first
  const connectionStatus = await checkPocketBaseConnection();
  console.log("PocketBase connection status:", connectionStatus);

  if (!connectionStatus.connected) {
    console.error(
      "Cannot save alert: PocketBase connection failed:",
      connectionStatus.message
    );
    return;
  }

  // Create alert data that matches the format expected by the alerts store
  const alert = {
    _id: alertData.value._id || null,
    type: alertData.value.type || "info",
    label: alertData.value.label || "Untitled Alert",
    message: customizeMessage.value
      ? alertData.value.customMessage
      : alertData.value.message || "",
    dataSource: alertData.value.dataSource || "",
    threshold: alertData.value.threshold || "",
    timestamp: Date.now(),
    data: {},
  };

  // Add additional data for data sources
  if (alert.dataSource && navigationState.value) {
    // Map field names to their paths in the state structure
    const fieldPaths = {
      "Speed Over Ground": navigationState.value.speedOverGround,
      "Speed Through Water": navigationState.value.speedThroughWater,
      "Depth": navigationState.value.depth,
      "Wind Speed (True)": navigationState.value.windSpeedTrue,
      "Wind Angle (True)": navigationState.value.windAngleTrue,
      "Wind Speed (Apparent)": navigationState.value.windSpeedApparent,
      "Wind Angle (Apparent)": navigationState.value.windAngleApparent,
      "Heading": navigationState.value.heading,
      "Course Over Ground": navigationState.value.courseOverGround,
      "Current Speed": navigationState.value.currentSpeed,
      "Current Direction": navigationState.value.currentDirection,
      "Water Temperature": navigationState.value.waterTemperature,
      "Air Temperature": navigationState.value.airTemperature,
      "Pressure": navigationState.value.pressure
    };
    
    // Map field keys to their units
    const fieldUnits = {
      "Speed Over Ground": "kn",
      "Speed Through Water": "kn",
      "Depth": "m",
      "Wind Speed (True)": "kn",
      "Wind Angle (True)": "°",
      "Wind Speed (Apparent)": "kn",
      "Wind Angle (Apparent)": "°",
      "Heading": "°",
      "Course Over Ground": "°",
      "Current Speed": "kn",
      "Current Direction": "°",
      "Water Temperature": "°C",
      "Air Temperature": "°C",
      "Pressure": "hPa"
    };
    
    const value = fieldPaths[alert.dataSource];
    
    if (value !== undefined) {
      alert.data = {
        value: value || 0,
        units: fieldUnits[alert.dataSource] || "",
      };
    }
  }

  if (alert._id) {
    // Update existing alert
    alertStore.updateAlert(alert._id, alert);
  } else {
    // Add new alert
    alertStore.addAlert(alert);
  }

  modalController.dismiss(alert, "confirm");
};

// Set a default data source if none is provided
onMounted(() => {
  // If editing an existing alert, no need to set defaults
  if (props.existingAlert && alertData.value.dataSource) {
    // Check if we need to set the customizeMessage toggle
    if (props.existingAlert.customMessage) {
      customizeMessage.value = true;
    }
    return;
  }

  // Wait for navDataKeys to be populated
  setTimeout(() => {
    if (!alertData.value.dataSource) {
      // Set a default data source (first key in navDataKeys)
      if (navDataKeys.value && navDataKeys.value.length > 0) {
        alertData.value.dataSource = navDataKeys.value[0];
      }
    }
  }, 300); // Increased timeout to ensure store is initialized
});
</script>

<style>
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--ion-text-color);
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border-radius: 4px;
  border: 2px solid #3c3c3c;
}

.form-help {
  display: block;
  font-size: 0.8rem;
  margin-top: 0.3rem;
  color: var(--ion-color-medium);
}

.custom-form {
  padding: 1rem;
}

ion-toggle {
  --background: #3c3c3c;
  --background-checked: var(--ion-color-primary);
  --handle-background: #fff;
  --handle-background-checked: #fff;
}

::v-deep .select-modal {
  --height: auto;
  --width: 90%;
  --max-width: 400px;
  --border-radius: 8px;
}

::v-deep .select-modal ion-header {
  background: #2c2c2c;
}

::v-deep .select-modal ion-toolbar {
  --background: #2c2c2c;
  --color: #ffffff;
}

::v-deep .select-modal ion-title {
  color: #ffffff;
}

::v-deep .select-modal ion-content {
  --background: #1c1c1c;
}

::v-deep .select-modal ion-list {
  background: #1c1c1c;
}

::v-deep .select-modal ion-item {
  --background: #1c1c1c;
  --color: #ffffff;
  --border-color: #3c3c3c;
}

::v-deep .select-modal ion-select-option {
  color: #000000;
}

::v-deep .select-modal ion-item:hover {
  --background: #2c2c2c;
}

::v-deep .select-modal .ion-activated {
  --background: #2c2c2c;
}

::v-deep .select-modal ion-radio {
  --color: #ffffff;
  --color-checked: var(--ion-color-primary);
}

::v-deep .select-modal ion-radio::part(container) {
  border-color: #3c3c3c;
}

::v-deep .select-modal ion-radio.radio-checked::part(container) {
  border-color: var(--ion-color-primary);
}

::v-deep .select-modal ion-label {
  --color: #000000;
  color: #000000 !important;
}

::v-deep .select-modal .select-interface-option {
  color: #000000 !important;
}

::v-deep .select-modal .select-interface-option.select-interface-option-selected {
  background: var(--ion-color-primary) !important;
  color: #ffffff !important;
}

::v-deep .modal-wrapper {
  background: #ffffff;
}
</style>
