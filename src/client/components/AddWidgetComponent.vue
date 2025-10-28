<template>
  <ion-header>
    <ion-toolbar color="primary">
      <ion-buttons slot="start">
        <ion-button color="light" fill="solid" @click="cancel">Cancel</ion-button>
      </ion-buttons>
      <ion-title>Add Widget</ion-title>
      <ion-buttons slot="end">
        <ion-button color="success" fill="solid" @click="saveButton" :strong="true"
          >Save</ion-button
        >
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content fullscreen class="ion-padding widget-content">
    <ion-card>
      <ion-card-header color="primary">
        <ion-card-title>Widget Parameters</ion-card-title>
        <ion-card-subtitle>Add Widget</ion-card-subtitle>
      </ion-card-header>
      <ion-card-content>
        <form class="custom-form">
          <!-- Widget Type Selection -->
          <div class="form-group">
            <div class="form-label">Widget Type</div>
            <ion-select
              class="form-control"
              interface="action-sheet"
              placeholder="Select Widget"
              v-model="displayType"
              :interface-options="{
                cssClass: 'select-modal',
                header: 'Select Widget Type',
              }"
              @click.stop
            >
              <ion-select-option value="sail360">Sail 360 &deg;</ion-select-option>
              <ion-select-option value="instrument">Digital Instrument</ion-select-option>
              <ion-select-option value="tank">Tank</ion-select-option>
              <ion-select-option value="battery">Battery</ion-select-option>
              <ion-select-option value="ruuvi">Ruuvi Sensor</ion-select-option>
            </ion-select>
          </div>

          <!-- Data Source Selection -->
          <div class="form-group" v-if="displayType && displayType !== 'sail360'">
            <div class="form-label">Data Source</div>
            <ion-select
              class="form-control"
              interface="action-sheet"
              placeholder="Select Data Source"
              v-model="dataSource"
              :interface-options="{
                cssClass: 'select-modal',
                header: 'Select Data Source',
              }"
            >
              <!-- Show Bluetooth devices for Ruuvi widgets -->
              <template v-if="displayType === 'ruuvi'">
                <ion-select-option 
                  v-for="device in bluetoothDevices" 
                  :key="device.id" 
                  :value="device.id"
                >
                  {{ device.name || device.id }}
                </ion-select-option>
              </template>
              
              <!-- Show navigation fields for other widgets -->
              <template v-else>
                <ion-select-option 
                  v-for="field in navFields" 
                  :key="field" 
                  :value="field"
                >
                  {{ field }}
                </ion-select-option>
              </template>
            </ion-select>
          </div>

          <!-- Graph Type Selection -->
          <div v-if="displayType === 'instrument'">
            <div class="form-group">
              <div class="form-label">Graph Type</div>
              <ion-select
                class="form-control"
                interface="action-sheet"
                placeholder="Select Graph"
                v-model="graphType"
                :interface-options="{
                  cssClass: 'select-modal',
                  header: 'Select Graph Type',
                }"
              >
                <ion-select-option value="line">Line</ion-select-option>
                <ion-select-option value="bar">Bar</ion-select-option>
              </ion-select>
            </div>
          </div>

          <!-- Tank Type Selection -->
          <div v-if="displayType === 'tank'">
            <div class="form-group">
              <div class="form-label">Tank Type</div>
              <ion-select
                class="form-control"
                interface="action-sheet"
                placeholder="Select Tank Type"
                v-model="tankType"
                :interface-options="{
                  cssClass: 'select-modal',
                  header: 'Select Tank Type',
                }"
              >
                <ion-select-option value="water">Water</ion-select-option>
                <ion-select-option value="waste">Waste</ion-select-option>
                <ion-select-option value="diesel">Diesel</ion-select-option>
                <ion-select-option value="gasoline">Gasoline</ion-select-option>
              </ion-select>
            </div>
          </div>

          <!-- Widget Name Input -->
          <div class="form-group">
            <div class="form-label">Widget Name</div>
            <ion-input
              class="form-control"
              placeholder="Add Unique Name"
              v-model="widgetName"
            ></ion-input>
          </div>

          <!-- Display Label Input -->
          <div class="form-group">
            <div class="form-label">Display Label</div>
            <ion-input
              class="form-control"
              placeholder="Add Display Label"
              v-model="widgetTitle"
            ></ion-input>
          </div>

          <!-- Color Picker -->
          <div class="form-group" v-if="displayType !== 'sail360'">
            <div class="form-label">Graph Color</div>
            <div class="color-picker-container">
              <ion-button
                id="selectGraphColor"
                @click="openColorPicker"
                size="small"
                fill="solid"
                color="primary"
                class="color-picker-btn"
              >
                <ion-icon :icon="colorPaletteOutline" slot="start"></ion-icon>
                Select Color
              </ion-button>
              <span class="color-box-2" ref="indicatorColorRef">&nbsp;</span>
            </div>
          </div>

          <!-- Alarm Threshold Input -->
          <div class="form-group">
            <div class="form-label">Alarm Threshold</div>
            <ion-input
              class="form-control"
              placeholder="Enter Threshold Value"
              v-model="threshold"
            ></ion-input>
          </div>

          <!-- Maintain Square Aspect Ratio Toggle -->
          <div class="form-group">
            <div class="form-label">Widget Display</div>
            <ion-item lines="none" class="custom-toggle-item">
              <ion-label>Maintain Square Aspect Ratio</ion-label>
              <ion-toggle v-model="maintainSquareRatio" color="primary"></ion-toggle>
            </ion-item>
          </div>

          <!-- Alert Controls -->
          <div class="form-group" v-if="dataSource">
            <ion-button
              @click="addAlert"
              class="add-alert-btn"
              size="small"
              fill="outline"
              color="medium"
            >
              <ion-icon name="add-circle-outline" slot="start"></ion-icon>
              Add Alert
            </ion-button>
          </div>

          <!-- Alert Components -->
          <div v-if="dataSource">
            <AlertWidgetComponent
              v-for="(a, i) in alerts"
              :key="'alert-' + i"
              :alertNumber="i"
              v-model:alert="alerts[i]"
              @delete-alert="deleteAlert(i)"
              :dataSource="dataSource"
            />
          </div>
        </form>
      </ion-card-content>
    </ion-card>
    <ion-modal :is-open="showColorPicker" class="color-picker-modal">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Select Color</ion-title>
          <ion-buttons slot="end">
            <ion-button color="light" fill="solid" @click="cancelColorPicker"
              >Cancel</ion-button
            >
            <ion-button
              color="success"
              fill="solid"
              @click="saveColorPicker"
              :strong="true"
              >Done</ion-button
            >
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="color-preview" ref="showColorRef"></div>
        <div class="color-sliders">
          <div class="color-slider">
            <label>R</label>
            <ion-range min="0" max="255" v-model="colorR"></ion-range>
          </div>
          <div class="color-slider">
            <label>G</label>
            <ion-range min="0" max="255" v-model="colorG"></ion-range>
          </div>
          <div class="color-slider">
            <label>B</label>
            <ion-range min="0" max="255" v-model="colorB"></ion-range>
          </div>
          <div class="color-slider">
            <label>Alpha</label>
            <ion-range min="0" max="1" step="0.01" v-model="colorA"></ion-range>
          </div>
        </div>
      </ion-content>
    </ion-modal>
  </ion-content>
</template>

<script setup>
import {
  IonInput,
  IonSelect,
  IonSelectOption,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonToggle,
  IonModal,
  modalController,
  IonRange,
  IonIcon,
} from "@ionic/vue";
import { v4 as uuidv4 } from "uuid";
import { ref, computed, useTemplateRef, watch, onMounted } from "vue";
import { colorPaletteOutline } from "ionicons/icons";
import AlertWidgetComponent from "./AlertWidgetComponent.vue";
import { useWidgetStore } from "@client/stores/widgets.js";
import { useStateDataStore } from "@client/stores/stateDataStore.js";
import { storeToRefs } from "pinia";
import { pick } from "lodash";

console.log("STARTED ADD WIDGET COMPOENENT");

const showColorRef = useTemplateRef("showColorRef");
const indicatorColorRef = useTemplateRef("indicatorColorRef");

const stateStore = useStateDataStore();
const { navigation, anchor } = storeToRefs(stateStore.state);

// Get Bluetooth devices from state
const bluetoothDevices = computed(() => {
  const devices = stateStore.state.bluetooth?.devices || {};
  return Object.entries(devices).map(([id, device]) => ({
    id,
    name: device.name || device.localName || id
  }));
});

// Define available instrument fields based on the state structure
const navFields = [
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

console.log("navFields", navFields);

const dataSource = ref();
const displayType = ref();
const graphType = ref();
const widgetTitle = ref();
const widgetName = ref();
const tankType = ref();
const threshold = ref();
const alerts = ref([]);
const maintainSquareRatio = ref(true); // Default to true

const widgetStore = useWidgetStore();

// Steelblue RGB values (70, 130, 180)
const showColorPicker = ref(false);
const colorR = ref(70);
const colorG = ref(130);
const colorB = ref(180);
const colorA = ref(1);

const color = computed(() => {
  return `rgba(${colorR.value}, ${colorG.value}, ${colorB.value}, ${colorA.value})`;
});

async function saveButton() {
  console.log("Saving widget with maintainSquareRatio:", maintainSquareRatio.value);
  try {
    const myData = {
      _id: uuidv4(),
      displayType: displayType.value,
      dataSource: dataSource.value,
      title: widgetTitle.value,
      name: widgetName.value,
      color: color.value,
      graphType: graphType.value,
      tankType: tankType.value,
      threshold: threshold.value,
      maintainSquareRatio: maintainSquareRatio.value,
    };

    console.log("Widget data being saved:", myData);

    // Add history array for instrument widgets
    if (displayType.value === "instrument") {
      // Only save metadata about the widget, not the actual data
      // The actual data and history should come from the navigation store
      myData.label = dataSource.value;
      myData.type = "instrument";
    }

    console.log("Saving widget:", myData);

    // Save the widget first
    const savedWidget = await widgetStore.addWidget(myData);
    console.log("Widget saved successfully:", savedWidget);

    // Add each alert individually
    if (alerts.value && alerts.value.length > 0) {
      console.log(`Processing ${alerts.value.length} alerts`);
      for (const alert of alerts.value) {
        // Combine alert with widget data
        const enrichedAlert = {
          _id: uuidv4(), // Ensure each alert has a unique ID
          ...alert,
          ...pick(myData, ["displayType", "dataSource", "title", "name"]),
          widgetId: myData._id, // Reference back to the parent widget
        };

        console.log("Adding alert:", enrichedAlert);
        // Add the alert using the addAlert method
        // alertStore.addAlert(enrichedAlert);
      }
    }

    // Return the widget data to the parent component
    console.log("Dismissing modal with widget data:", myData);
    await modalController.dismiss(myData, "confirm");
  } catch (error) {
    console.error("Error saving widget:", error);
    // Still dismiss the modal to prevent UI from getting stuck
    await modalController.dismiss(null, "cancel");
  }
}

function deleteAlert(index) {
  alerts.value.splice(index, 1);
}

function addAlert() {
  alerts.value.push({
    condition: "greater",
    value: 0,
    message: "",
  });
}

function openColorPicker() {
  showColorPicker.value = true;
}

function cancelColorPicker() {
  showColorPicker.value = false;
}

function saveColorPicker() {
  showColorPicker.value = false;
}

function cancel() {
  console.log("Cancel button clicked");
  modalController.dismiss(null, "cancel");
}

// Initialize color picker
onMounted(() => {
  // Make sure the watch function runs at least once to initialize the color preview
  watch(
    [colorR, colorG, colorB, colorA],
    () => {
      // Update the color preview in the modal
      if (showColorRef.value) {
        showColorRef.value.style.backgroundColor = color.value;
      }

      // Update the small color indicator next to the button
      if (indicatorColorRef.value) {
        indicatorColorRef.value.style.backgroundColor = color.value;
      }
    },
    { immediate: true }
  );
});
</script>

<style scoped>
.widget-content {
  --overflow: auto;
  overflow: auto;
}

.custom-form {
  padding-bottom: 30px;
}

.form-group {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
}

.form-label {
  color: var(--ion-color-primary-contrast);
  font-weight: 500;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.form-control {
  width: 100%;
  --background: rgba(var(--ion-color-primary-contrast-rgb), 0.1);
  --color: var(--ion-color-primary-contrast);
  --placeholder-color: rgba(var(--ion-color-primary-contrast-rgb), 0.5);
  --padding-start: 1rem;
  --padding-end: 1rem;
  --border-radius: 4px;
  margin-bottom: 0.75rem;
}

ion-select.form-control {
  --padding-top: 0.6rem;
  --padding-bottom: 0.6rem;
}

ion-select.form-control::part(text) {
  flex: unset;
  text-align: left;
  width: 100%;
  color: var(--ion-color-primary-contrast);
}

.add-alert-btn {
  margin-top: 0.5rem;
  --border-radius: 4px;
  height: 36px;
  font-size: 14px;
  --border-color: rgba(var(--ion-color-primary-contrast-rgb), 0.3);
  align-self: flex-start;
}

.color-picker-btn {
  --border-radius: 4px;
  height: 36px;
  font-size: 14px;
  --background: var(--ion-color-primary-shade);
  --color: var(--ion-color-primary-contrast);
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.color-picker-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.color-preview {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  margin: 1rem auto;
  background-color: steelblue; /* Fallback color */
  border: 4px solid white;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
}

.color-box-2 {
  display: inline-block;
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 2px solid white;
  background-color: steelblue; /* Fallback color */
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
  vertical-align: middle;
}

ion-card {
  background: var(--ion-background-color);
  border: 1px solid rgba(var(--ion-color-primary-contrast-rgb), 0.3);
  border-radius: 8px;
}

ion-card-header[color="primary"] ion-card-title {
  color: var(--ion-color-primary-contrast);
  font-size: 1.25rem;
  font-weight: 600;
}

ion-card-header[color="primary"] ion-card-subtitle {
  color: rgba(var(--ion-color-primary-contrast-rgb), 0.8);
  font-size: 0.875rem;
}

ion-toolbar {
  --background: var(--ion-color-primary) !important;
  --color: var(--ion-color-primary-contrast) !important;
}

ion-title {
  color: var(--ion-color-primary-contrast) !important;
}

.color-picker-modal {
  --width: 300px;
  --height: 400px;
  --background: var(--ion-color-dark) !important;
  background: var(--ion-color-dark) !important;
}

.color-picker-modal ion-toolbar {
  --background: var(--ion-color-primary) !important;
  --color: var(--ion-color-primary-contrast) !important;
}

.color-picker-modal ion-content {
  --background: var(--ion-color-dark);
}

.color-sliders {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 16px;
  border-radius: 8px;
}

.color-slider {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.color-slider label {
  font-size: 1rem;
  font-weight: 500;
  color: var(--ion-color-primary-contrast);
  width: 60px;
}

ion-range {
  --bar-background: rgba(var(--ion-color-primary-contrast-rgb), 0.2);
  --bar-background-active: var(--ion-color-primary);
  --knob-background: var(--ion-color-primary-contrast);
  --pin-background: var(--ion-color-primary);
  --pin-color: var(--ion-color-primary-contrast);
}

:deep(.select-modal) {
  --background: var(--ion-color-primary) !important;
  background: var(--ion-color-primary) !important;
  --color: var(--ion-color-primary-contrast);
  --height: auto;
  --max-height: 70%;
  --overflow: scroll;
}

/* iOS-specific modal fixes */
:deep(.ios) {
  .data-source-modal {
    --height: auto;
    --width: 90%;
    --border-radius: 16px;
    --box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  .data-source-modal ion-content {
    --background: var(--ion-background-color);
  }

  .data-source-modal ion-radio-group ion-item {
    --background: transparent;
    --border-color: var(--ion-color-light);
    margin-bottom: 8px;
    border-radius: 8px;
  }

  .data-source-modal ion-radio {
    margin-right: 8px;
    --color-checked: var(--ion-color-primary);
  }

  .data-source-modal ion-radio-group {
    max-height: 60vh;
    overflow-y: auto;
  }
}

/* Make sure modals work on iOS */
:deep(.modal-wrapper) {
  height: auto;
  max-height: 90%;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.data-source-button {
  width: 100%;
  margin: 0;
  text-transform: none;
  --border-radius: 4px;
  text-align: left;
  justify-content: flex-start;
  height: 40px;
}

ion-modal.data-source-modal {
  --height: 70%;
  --width: 90%;
  --border-radius: 8px;
  --box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

ion-modal.data-source-modal ion-content {
  --overflow: scroll;
}

:deep(.ios ion-modal.data-source-modal) {
  height: auto !important;
  max-height: 70% !important;
  top: 15%;
  bottom: 15%;
}

:deep(.ios ion-modal.data-source-modal ion-content) {
  overflow: scroll !important;
}

:deep(.ios ion-modal.data-source-modal ion-list) {
  overflow-y: auto !important;
  max-height: 100% !important;
}
</style>
