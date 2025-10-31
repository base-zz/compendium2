<template>
  <ion-header>
    <ion-toolbar color="primary">
      <ion-buttons slot="start">
        <ion-button color="light" fill="solid" @click="cancel">Cancel</ion-button>
      </ion-buttons>
      <ion-title>{{ editMode ? 'Edit Widget' : 'Add Widget' }}</ion-title>
      <ion-buttons slot="end">
        <ion-button color="success" fill="solid" @click="saveWidget" :strong="true">
          Save
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content fullscreen class="ion-padding widget-content">
    <ion-card>
      <ion-card-header color="primary">
        <ion-card-title>{{ editMode ? 'Edit Widget' : 'Add Widget' }}</ion-card-title>
        <ion-card-subtitle>Configure Widget Parameters</ion-card-subtitle>
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
              <ion-select-option value="windspeed">Wind Speed</ion-select-option>
              <ion-select-option value="instrument">Digital Instrument</ion-select-option>
              <ion-select-option value="clock">Clock</ion-select-option>
              <ion-select-option value="anchor">Anchor</ion-select-option>
              <ion-select-option value="tank">Tank</ion-select-option>
              <ion-select-option value="battery">Battery</ion-select-option>
              <ion-select-option value="ruuvi">Ruuvi Sensor</ion-select-option>
              <ion-select-option value="victron-battery-monitor">Victron Battery Monitor</ion-select-option>
              <ion-select-option value="victron-electrical">Victron Electrical System</ion-select-option>
            </ion-select>
          </div>

          <!-- Data Source Selection (not needed for electrical-flow or victron-electrical) -->
          <div
            class="form-group"
            v-if="
              displayType &&
              !widgetsWithoutDataSource.includes(displayType)
            "
          >
            <div class="form-label">Data Source</div>
            <ion-select
              class="form-control"
              interface="action-sheet"
              placeholder="Select Data Source"
              v-model="dataSource"
              @ionChange="updateTitleFromDataSource"
              :interface-options="{
                cssClass: 'select-modal',
                header: 'Select Data Source',
              }"
            >
              <!-- Dynamic options from widget data configuration -->
              <ion-select-option v-for="field in availableDataSources" :key="field.value" :value="field.value">
                {{ field.label }}: {{ field.description }}
              </ion-select-option>
            </ion-select>
          </div>
          
          <!-- Tank Type Selection is no longer needed as it's included in the data source selection -->
          <!-- Each tank is now a separate data source with its own ID -->

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

          <!-- Graph Settings -->
          <div v-if="displayType === 'instrument'" class="form-group">
            <div class="form-label">Graph Settings</div>
          </div>
          
          <!-- Number Formatting Options -->
          <div v-if="displayType === 'instrument'" class="form-group">
            <div class="form-label">Number Formatting</div>
            <div class="number-format-options">
              <div class="decimal-places">
                <ion-label>Decimal Places</ion-label>
                <ion-select
                  v-model="decimalPlaces"
                  interface="popover"
                  placeholder="Select decimal places"
                >
                  <ion-select-option :value="0">0 (Integer)</ion-select-option>
                  <ion-select-option :value="1">1 (e.g., 5.9)</ion-select-option>
                  <ion-select-option :value="2">2 (e.g., 5.98)</ion-select-option>
                  <ion-select-option :value="3">3 (e.g., 5.989)</ion-select-option>
                  <ion-select-option :value="4">4 (e.g., 5.9895)</ion-select-option>
                </ion-select>
              </div>
              
              <ion-item lines="none">
                <ion-label>Show Thousands Separator</ion-label>
                <ion-toggle slot="end" v-model="showThousandsSeparator"></ion-toggle>
              </ion-item>
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
              <span class="color-box" :style="{ backgroundColor: graphColor }">&nbsp;</span>
            </div>
          </div>

          <!-- Maintain Square Aspect Ratio Toggle -->
          <div class="form-group">
            <div class="form-label">Widget Display</div>
            <ion-item lines="none" class="custom-toggle-item">
              <ion-label>Maintain Square Aspect Ratio</ion-label>
              <ion-toggle v-model="maintainSquareRatio" color="primary"></ion-toggle>
            </ion-item>
          </div>
        </form>
      </ion-card-content>
    </ion-card>
    
    <!-- Color Picker Modal -->
    <ion-modal :is-open="showColorPicker" class="color-picker-modal">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Select Color</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="cancelColorPicker">Cancel</ion-button>
            <ion-button @click="saveColorPicker" strong>Done</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="color-grid">
          <div
            v-for="color in colorOptions"
            :key="color"
            class="color-option"
            :style="{ backgroundColor: color }"
            :class="{ selected: tempColor === color }"
            @click="tempColor = color"
          ></div>
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
  IonItem,
  IonLabel,
  IonToggle,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonModal,
  IonIcon,
  modalController,
} from '@ionic/vue';
import { colorPaletteOutline } from 'ionicons/icons';
import { ref, watch, computed, onMounted } from 'vue';
import { getDataSourceById, getDataSourcesByType } from '@/shared/widgetDataConfig';
import { useStateDataStore } from '@/client/stores/stateDataStore';
import { storeToRefs } from 'pinia';

// Define props
const props = defineProps({
  editMode: { type: Boolean, default: false },
  widgetData: { type: Object, default: () => ({}) },
  widgetType: { type: String, default: '' },
  area: { type: String, default: '' }
});

// Get state store for Bluetooth devices
const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

// Log the area prop for debugging
console.log('AddWidgetModal - area prop:', props.area);

// Form data
const displayType = ref(props.editMode ? props.widgetType : '');
const dataSource = ref(props.editMode && props.widgetData.dataSource ? props.widgetData.dataSource : '');
const graphType = ref(props.editMode && props.widgetData.graphType ? props.widgetData.graphType : 'line');
// tankType is no longer needed as each tank is now a separate data source
const widgetName = ref(props.editMode && props.widgetData.widgetName ? props.widgetData.widgetName : '');
const widgetTitle = ref(props.editMode && props.widgetData.widgetTitle ? props.widgetData.widgetTitle : '');
const graphColor = ref(props.editMode && props.widgetData.graphColor ? props.widgetData.graphColor : '#3880ff');
const maintainSquareRatio = ref(props.editMode ? props.widgetData.maintainSquareRatio !== false : true);

// Number formatting options
const decimalPlaces = ref(props.editMode ? 
  (props.widgetData.decimalPlaces !== undefined ? props.widgetData.decimalPlaces : 
   (props.widgetData.data?.decimalPlaces !== undefined ? props.widgetData.data.decimalPlaces : 1)) : 1);

const showThousandsSeparator = ref(props.editMode ? 
  (props.widgetData.showThousandsSeparator || 
   props.widgetData.data?.showThousandsSeparator || false) : false);

// Log formatting options for debugging
console.log('Initializing number formatting options:', {
  decimalPlaces: decimalPlaces.value,
  showThousandsSeparator: showThousandsSeparator.value,
  widgetData: props.widgetData
});

// Color picker
const showColorPicker = ref(false);
const tempColor = ref(graphColor.value);

// Color options
const colorOptions = [
  '#3880ff', // Primary
  '#3dc2ff', // Secondary
  '#5260ff', // Tertiary
  '#2dd36f', // Success
  '#ffc409', // Warning
  '#eb445a', // Danger
  '#92949c', // Medium
  '#f4f5f8', // Light
  '#222428', // Dark
  '#ff6b6b',
  '#48cfad',
  '#ac92ec',
  '#4fc1e9',
  '#a0d468',
  '#ec87c0',
  '#ffce54'
];

// Get data sources from configuration file
const instrumentDataSources = computed(() => {
  // Debug the data sources
  console.log('Getting instrument data sources');
  const sources = getDataSourcesByType('instrument');
  console.log('Raw sources from config:', sources);
  
  // Transform data sources to the format expected by the select component
  const mappedSources = sources.map(source => ({
    category: source.category,
    value: source.id,
    label: source.displayLabel,
    description: source.description
  }));
  
  console.log('Mapped sources for dropdown:', mappedSources);
  return mappedSources;
});

const windSpeedDataSources = computed(() =>
  getDataSourcesByType('windspeed').map((source) => ({
    category: source.category,
    value: source.id,
    label: source.displayLabel || source.label,
    description: source.description,
  }))
);

// Tank types from configuration file
const tankTypes = computed(() => {
  // Transform tank data sources to the format expected by the select component
  return getDataSourcesByType('tank').map(source => ({
    value: source.id,
    label: source.displayLabel
  }));
});

// Computed property to get available data sources based on widget type
const availableDataSources = computed(() => {
  if (!displayType.value) {
    return [];
  }
  
  if (displayType.value === 'instrument') {
    console.log('Instrument data sources:', instrumentDataSources.value);
    return instrumentDataSources.value;
  } else if (displayType.value === 'windspeed') {
    return windSpeedDataSources.value;
  } else if (displayType.value === 'tank') {
    console.log('Tank data sources:', tankTypes.value);
    return getDataSourcesByType('tank').map(source => ({
      value: source.id,
      label: source.displayLabel || source.label,
      description: source.description
    }));
  } else if (displayType.value === 'battery') {
    return getDataSourcesByType('battery').map(source => ({
      value: source.id,
      label: source.displayLabel || source.label,
      description: source.description
    }));
  } else if (displayType.value === 'sail360') {
    return [{
      value: 'sail360',
      label: 'Sail 360°',
      description: 'Sail visualization with wind and boat data'
    }];
  } else if (displayType.value === 'ruuvi') {
    // Get Bluetooth devices from state and filter for Ruuvi sensors only
    const devices = state.value.bluetooth?.devices || {};
    console.log('Ruuvi - All Bluetooth devices:', devices);
    const ruuviDevices = Object.entries(devices)
      .filter(([, device]) => device.manufacturerId === 1177 || device.sensorData?.format === 'ruuvi/rawv2')
      .map(([id, device]) => ({
        value: id,
        label: device.name || device.localName || id,
        description: `Ruuvi sensor: ${device.name || id}`
      }));
    console.log('Ruuvi - Filtered Ruuvi devices:', ruuviDevices);
    return ruuviDevices;
  } else if (displayType.value === 'victron-battery-monitor') {
    // Get Bluetooth devices from state and filter for Victron battery monitors only
    const devices = state.value.bluetooth?.devices || {};
    const selectedDevices = state.value.bluetooth?.selectedDevices || {};
    const allDevices = { ...devices, ...selectedDevices };
    console.log('Victron - All Bluetooth devices:', allDevices);
    const victronDevices = Object.entries(allDevices)
      .filter(([, device]) => device.manufacturerId === 737 && device.sensorData?.deviceType === 'battery_monitor')
      .map(([id, device]) => ({
        value: id,
        label: device.metadata?.userLabel || device.name || device.localName || id,
        description: `Victron Battery Monitor: ${device.metadata?.userLabel || device.name || id}`
      }));
    console.log('Victron - Filtered Victron battery monitors:', victronDevices);
    return victronDevices;
  }
  
  console.log('No data sources available for type:', displayType.value);
  return [];
});

// Watch for displayType changes to set default values
const widgetsWithoutDataSource = ['sail360', 'clock', 'anchor'];
watch(displayType, (newType) => {
  if (newType === 'sail360') {
    maintainSquareRatio.value = true;
  } else if (newType === 'windspeed' && !dataSource.value) {
    maintainSquareRatio.value = true;
    const sources = windSpeedDataSources.value;
    if (sources.length > 0) {
      dataSource.value = sources[0].value;
      if (!widgetTitle.value) {
        widgetTitle.value = sources[0].description || sources[0].label;
      }
    }
  } else if (newType === 'clock') {
    dataSource.value = '';
    maintainSquareRatio.value = true;
    if (!widgetTitle.value) {
      widgetTitle.value = 'Clock';
    }
    if (!widgetName.value) {
      widgetName.value = 'Clock';
    }
  } else if (newType === 'anchor') {
    dataSource.value = '';
    maintainSquareRatio.value = true;
    if (!widgetTitle.value) {
      widgetTitle.value = 'Anchor';
    }
    if (!widgetName.value) {
      widgetName.value = 'Anchor';
    }
  } else if (newType === 'instrument' && !dataSource.value) {
    // Set a default data source but don't hardcode the title
    const defaultSource = instrumentDataSources.value[0];
    if (defaultSource) {
      dataSource.value = defaultSource.value;
      if (!widgetTitle.value) {
        // Use the description as the title for better clarity
        widgetTitle.value = defaultSource.description || defaultSource.label;
      }
    }
  } else if (newType === 'tank' && !dataSource.value) {
    // Get first tank from the configuration
    const tankSources = getDataSourcesByType('tank');
    if (tankSources.length > 0) {
      dataSource.value = tankSources[0].id;
      if (!widgetTitle.value) {
        widgetTitle.value = tankSources[0].displayLabel || tankSources[0].label;
      }
    }
  } else if (newType === 'battery' && !dataSource.value) {
    // Get first battery from the configuration
    const batterySources = getDataSourcesByType('battery');
    if (batterySources.length > 0) {
      dataSource.value = batterySources[0].id;
      if (!widgetTitle.value) {
        widgetTitle.value = batterySources[0].displayLabel || batterySources[0].label;
      }
    }
  }
});

// Function to update the widget title based on the selected data source
const updateTitleFromDataSource = () => {
  console.log('Manual update triggered');
  updateWidgetTitleFromDataSource();
};

// Actual function to update the title based on data source
const updateWidgetTitleFromDataSource = () => {
  const selectedValue = dataSource.value;
  console.log('Updating title based on data source:', selectedValue);
  
  if (selectedValue) {
    // Find the selected data source from the available options
    const selectedSource = availableDataSources.value.find(s => s.value === selectedValue);
    
    if (selectedSource) {
      // Update widget title and name based on the selected source
      widgetTitle.value = selectedSource.description || selectedSource.label;
      widgetName.value = selectedSource.label;
      console.log('Updated widget title to:', widgetTitle.value);
    } else {
      // Try to get the source from the widget data configuration
      const configSource = getDataSourceById(selectedValue);
      if (configSource) {
        widgetTitle.value = configSource.description || configSource.displayLabel || configSource.label;
        widgetName.value = configSource.label;
        console.log('Updated widget title from config to:', widgetTitle.value);
      }
    }
  }
};

// Watch for dataSource changes to update the title
watch(dataSource, () => {
  console.log('Data source changed via watch to:', dataSource.value);
  updateWidgetTitleFromDataSource();
});

// We no longer need to watch tankType as we're using dataSource directly for tanks

// Open color picker
function openColorPicker() {
  tempColor.value = graphColor.value;
  showColorPicker.value = true;
}

// Cancel color picker
function cancelColorPicker() {
  showColorPicker.value = false;
}

// Save color picker
function saveColorPicker() {
  graphColor.value = tempColor.value;
  showColorPicker.value = false;
}

// Cancel modal
function cancel() {
  modalController.dismiss(null, 'cancel');
}

// Save widget data and close modal
async function saveWidget() {
  // Validate required fields
  if (!displayType.value) {
    alert('Please select a widget type');
  }
  const directWidget = {
    id: props.editMode ? props.widgetData.id : `widget-${Date.now()}`,
    title: widgetTitle.value || 'Widget',
    type: displayType.value,
    displayType: displayType.value,
    component: displayType.value,
    dataSource: dataSource.value || null,
    tankType: null,
    graphType: displayType.value === 'instrument' ? graphType.value : null,
    label: widgetTitle.value || widgetName.value || 'Widget',
    widgetTitle: widgetTitle.value,
    widgetName: widgetName.value,
    decimalPlaces:
      displayType.value === 'instrument' ? decimalPlaces.value : undefined,
    showThousandsSeparator:
      displayType.value === 'instrument' ? showThousandsSeparator.value : undefined,
    maintainSquareRatio: maintainSquareRatio.value,
    data: {
      displayType: displayType.value,
      widgetTitle: widgetTitle.value,
      widgetName: widgetName.value,
      dataSource: dataSource.value || null,
      graphType: displayType.value === 'instrument' ? graphType.value : null,
      decimalPlaces:
        displayType.value === 'instrument' ? decimalPlaces.value : undefined,
      showThousandsSeparator:
        displayType.value === 'instrument' ? showThousandsSeparator.value : undefined,
      maintainSquareRatio: maintainSquareRatio.value,
      label: widgetTitle.value,
    },
  };

  console.log('Saving direct widget data:', directWidget);

  // Dismiss modal with the direct widget data
  modalController.dismiss(directWidget, 'confirm');
}

// Initialize form data from props if in edit mode
onMounted(() => {
  if (props.editMode && props.widgetData) {
    console.log('Edit mode - Widget data:', props.widgetData);
    console.log('Edit mode - Widget type:', props.widgetType);
    
    // Set form values from widget data
    displayType.value = props.widgetType || props.widgetData.displayType || '';
    console.log('Edit mode - Display type set to:', displayType.value);
    
    dataSource.value = props.widgetData.dataSource || '';
    console.log('Edit mode - Data source set to:', dataSource.value);
    
    graphType.value = props.widgetData.graphType || 'line';
    // tankType is no longer used, we use dataSource directly for tanks
    widgetName.value = props.widgetData.widgetName || '';
    widgetTitle.value = props.widgetData.widgetTitle || props.widgetData.label || '';
    graphColor.value = props.widgetData.graphColor || '#3880ff';
    maintainSquareRatio.value = props.widgetData.maintainSquareRatio !== false;
  }
});
</script>

<style scoped>
.widget-content {
  --background: var(--ion-color-light);
}

.custom-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--ion-color-dark);
}

.form-control {
  width: 100%;
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  --background: var(--ion-color-light);
  --border-radius: 8px;
  --border-color: var(--ion-color-medium);
}

.custom-toggle-item {
  --background: transparent;
  --border-color: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
}

.color-picker-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-box {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--ion-color-medium);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
}

.color-option {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.color-option:hover {
  transform: scale(1.05);
}

.color-option.selected {
  border: 3px solid var(--ion-color-dark);
  transform: scale(1.1);
}

.color-picker-modal {
  --height: 300px;
  --width: 300px;
  --border-radius: 16px;
}

/* iOS specific styles */
:deep(.ios) {
  .select-modal {
    --height: auto;
    --width: 90%;
    --border-radius: 16px;
  }
}
</style>
