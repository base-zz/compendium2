<template>
  <!-- Outer container with relative positioning -->
  <div class="widget-outer-container" ref="widgetContainer">
    <!-- Content container -->
    <div class="widget-container" :style="widgetStyle" :class="{ 
      'fade-in': isReady, 
      'editing': isEditing
    }">
      <div class="widget-content">
        <div class="widget-inner-container">
          <!-- Edit and Delete FABs positioned directly over the instrument -->
          <div class="fab-container" v-if="isEditing">
            <div class="fab-buttons-row">
              <ion-fab-button
                class="widget-edit-button"
                size="small"
                color="primary"
                @click="$emit('edit')"
              >
                <ion-icon :icon="pencilOutline"></ion-icon>
              </ion-fab-button>
              
              <ion-fab-button
                class="widget-delete-button"
                size="small"
                color="danger"
                @click="$emit('remove')"
              >
                <ion-icon :icon="trashOutline"></ion-icon>
              </ion-fab-button>
            </div>
          </div>
          <component
            v-if="resolvedComponent"
            :is="resolvedComponent"
            :widgetData="widgetData"
            @mounted="handleComponentMounted"
            @add-widget="$emit('add-widget', $event)"
          />
          <div v-else class="empty-widget">
            <ion-icon :icon="alertCircleOutline" size="large" />
            <div class="error-text">{{ errorMessage }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, onUnmounted, defineComponent } from "vue";
import { storeToRefs } from 'pinia';
import { useStateDataStore } from "@client/stores/stateDataStore.js";
import { getDataSourceById, getDataFromState } from "@/shared/widgetDataConfig.js";
import "@client/styles/aspect-ratio.css";
import { IonIcon, IonFabButton } from "@ionic/vue";
import { alertCircleOutline, pencilOutline, trashOutline } from "ionicons/icons";

// Define component name to fix lint error
defineComponent({
  name: 'DashboardWidget'
});

// Import components
import Sail360View from "../Sail360Component.vue";
import DashboardInstrumentComponent from "./DashboardInstrumentComponent.vue";
import TankLevelComponent from "../TankLevelComponent.vue";
import BatteryComponent from "../BatteryComponent.vue";

const props = defineProps({
  widget: {
    type: Object,
    required: true
  },
  type: {
    type: String,
    required: false,
    default: ''
  },
  isEditing: { type: Boolean, default: false }
});

// Method to get the appropriate aspect ratio class based on widget configuration
// Ensure widget has proper dimensions
const widgetStyle = computed(() => {
  if (!props.widget.maintainAspectRatio) return {};
  
  const aspectRatio = props.widget.aspectRatio;
  return {
    width: '100%',
    height: '100%',
    'aspect-ratio': aspectRatio,
    position: 'relative'
  };
});

// Debug isEditing prop


// Watch for changes to isEditing
watch(
  () => props.isEditing,
  (newValue) => {

  }
);

// Add window resize listener to update container size
onMounted(() => {
  window.addEventListener('resize', adjustContainerSize);
});

// Clean up event listeners when component is unmounted
onUnmounted(() => {
  window.removeEventListener('resize', adjustContainerSize);
});

const emit = defineEmits(['edit', 'remove', 'mounted', 'add-widget']);

// Track if widget is ready to be shown
const isReady = ref(false);

// Initialize state store
const stateStore = useStateDataStore();
const { state: navigationState } = storeToRefs(stateStore);

// Debug state initialization
// State initialization

// Watch for navigation state changes
watch(navigationState, () => {
  // State change handler
}, { deep: true });

// Import the placeholder widget component
import PlaceholderWidget from './PlaceholderWidget.vue';

// Component mapping
const componentMap = {
  'sail360': Sail360View,
  'instrument': DashboardInstrumentComponent,
  'tank': TankLevelComponent,
  'battery': BatteryComponent,
  'placeholder': PlaceholderWidget
};

// Resolve component based on type
const resolvedComponent = computed(() => {
  if (!props.type) {

    return null;
  }
  
  const component = componentMap[props.type];

  
  // Log widget data when the component is a tank
  if (props.type === 'tank') {


    
    // Get the data source configuration
    const dataSource = getDataSourceById(props.widget.dataSource);

    
    // Log the state path we're trying to access
    if (dataSource && dataSource.statePath) {

      
      // Log each level of the state path to find where it's breaking
      let data = navigationState.value;

      
      for (const part of dataSource.statePath) {

        data = data && typeof data === 'object' ? data[part] : undefined;

      }
    }
    

  }
  
  return component || null;
});

// Error message for invalid components
const errorMessage = ref("Widget not found");

// Handle component mounted event
const widgetContainer = ref(null);
const widgetContent = ref(null);
const containerDimensions = ref({ width: 0, height: 0 });

// We're using CSS for square aspect ratio instead of a computed style

// Function to measure container dimensions
const measureContainer = () => {
  if (widgetContainer.value) {
    const rect = widgetContainer.value.getBoundingClientRect();
    containerDimensions.value = {
      width: rect.width,
      height: rect.height
    };

  }
};

const handleComponentMounted = () => {
  // Set the widget as ready after a short delay to allow for transitions
  setTimeout(() => {
    isReady.value = true;
    emit('mounted');
    
    // Measure container and adjust size to be square
    measureContainer();
    
    // Adjust container size to match the square widget content
    adjustContainerSize();
  }, 100);
};

// Function to adjust the container size to match the square widget
const adjustContainerSize = () => {
  if (!widgetContent.value || !widgetContainer.value) return;
  
  // Get the actual dimensions of the widget content
  const content = widgetContent.value.querySelector('.instrument-container svg, .tank-component, .battery-component, .sail360-component');
  
  if (content) {
    // For SVG components, ensure we're getting the square dimensions
    const size = Math.max(content.offsetWidth, content.offsetHeight);
    
    // Set the container to be exactly square
    widgetContainer.value.style.width = size + 'px';
    widgetContainer.value.style.height = size + 'px';
    
    // Center the content within the container
    widgetContent.value.style.display = 'flex';
    widgetContent.value.style.justifyContent = 'center';
    widgetContent.value.style.alignItems = 'center';
  }
};

// Get real-time data for the widget based on its type and data source
const widgetData = computed(() => {
  // Start with the widget data
  const data = { ...props.widget };
  
  // Get the data source configuration
  const dataSource = getDataSourceById(data.dataSource);
  
  // Get data from the state using the data source configuration
  const stateData = getDataFromState(navigationState.value, data.dataSource);
  
  // Log detailed information about the data for tank widgets
  if (data.type === 'tank') {

    
    // Log the state path we're trying to access
    if (dataSource && dataSource.statePath) {
      
      // Log the navigation state structure focusing on the tanks
      // Log the tanks structure:
      
      // Trace the path step by step to see where it breaks
      let currentObj = navigationState.value;
      let pathTrace = '';
      for (const pathPart of dataSource.statePath) {
        pathTrace = pathTrace ? `${pathTrace}.${pathPart}` : pathPart;
        const nextObj = currentObj ? currentObj[pathPart] : undefined;

        currentObj = nextObj;
      }
      
      // Check if the specific tank exists in the state
      const tankPath = dataSource.statePath.join('.');
      const tankExists = tankPath.split('.').reduce((obj, key) => 
        obj && typeof obj === 'object' ? obj[key] : undefined, navigationState.value);

    }
    
    // Log the data retrieved from the state

    

  }
  
  // Merge the state data with the widget data
  const result = {
    ...data,
    ...stateData,
    dataConfig: dataSource,
    // Include important properties from the data source configuration
    threshold: dataSource?.threshold ?? data.threshold ?? 20,
    thresholdOperator: dataSource?.thresholdOperator ?? data.thresholdOperator,
    fluidType: dataSource?.fluidType ?? data.fluidType,
    voltage: stateData?.voltage,
    amperage: stateData?.amperage,
    label: dataSource?.label || stateData?.label || data.label,
    displayLabel: dataSource?.displayLabel || stateData?.displayLabel || data.displayLabel,
    decimalPlaces: data.decimalPlaces ?? 1,
    showThousandsSeparator: data.showThousandsSeparator ?? false,
    updated: true
  };
  
  // Log the final merged data for tank widgets
  if (data.type === 'tank') {

  }
  
  return result;
});

// Update error message when type changes
watch(
  () => props.type,
  (type) => {
    if (!type) {
      errorMessage.value = "Missing widget type";
    } else if (!componentMap[type]) {
      errorMessage.value = `Unknown widget type: ${type}`;
    } else {
      errorMessage.value = "";
    }
  },
  { immediate: true }
);

onMounted(() => {

  
  // Initial measurement
  setTimeout(() => {
    // Measure container dimensions
    measureContainer();
    
    // Find parent placeholder
    const parentPlaceholder = widgetContainer.value?.closest('.template-area');
    if (parentPlaceholder) {
      const placeholderRect = parentPlaceholder.getBoundingClientRect();
    }
    
    isReady.value = true;

    
    // Add window resize listener
    window.addEventListener('resize', handleResize);
  }, 500); // Increased timeout to ensure elements are rendered
});

// Handle window resize
const handleResize = () => {

  measureContainer();
};

// Clean up event listeners
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.widget-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: transparent;
  border-radius: 8px;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s ease;
  position: relative;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

/* Force square aspect ratio using padding-bottom technique */
.widget-outer-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.widget-square-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* Creates a 1:1 aspect ratio */
  overflow: hidden;
  box-sizing: border-box;
}

.widget-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: transparent;
  border-radius: 8px;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s ease;
  box-sizing: border-box;
}

.fade-in {
  opacity: 1;
}

.widget-actions {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none; /* Allow click events to pass through when not visible */
}

.widget-delete-action {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none; /* Allow click events to pass through when not visible */
}

/* Position FABs relative to the inner container */
/* FAB container positioned over the instrument */
.fab-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  pointer-events: none; /* Allow clicks to pass through when not on buttons */
  display: flex;
  justify-content: space-between;
  padding: 10px;
  box-sizing: border-box;
}

/* Container for the FAB buttons */
.fab-container {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 100;
  pointer-events: none;
  padding: 5px;
}

/* Row container for the buttons to ensure they're side by side */
.fab-buttons-row {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-top: -5px; /* Move entire row up */
  margin-right: -5px; /* Move entire row right */
}

/* Make the buttons themselves clickable */
.fab-container ion-fab-button {
  pointer-events: auto;
  --size: 24px; /* Make buttons even smaller */
  width: 24px;
  height: 24px;
  margin: 2px;
}

/* Position the widget-edit-button */
.widget-edit-button {
  margin-right: 3px;
}

/* Position the widget-delete-button */
.widget-delete-button {
  margin-left: 3px; /* Add a small margin for spacing */
}

.widget-outer-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100px;
  min-width: 100px;
}

.widget-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--ion-color-light);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.widget-container.editing {
  border: 2px solid var(--ion-color-primary);
}

.widget-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.widget-inner-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.widget-edit-button,
.widget-delete-button {
  --border-radius: 50%;
  --box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  height: 28px;
  width: 28px;
  min-height: 28px;
  font-size: 12px;
}

.widget-edit-button::part(native),
.widget-delete-button::part(native) {
  padding: 0;
}

.widget-edit-button ion-icon,
.widget-delete-button ion-icon {
  font-size: 14px;
}

.widget-content {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  overflow: hidden;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.widget-inner-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  margin: 0;
  padding: 0;
  aspect-ratio: 1 / 1;
  box-sizing: border-box;
}

/* Make sure instrument components fill the entire space */
.widget-inner-container :deep(.dashboard-instrument-container),
.widget-inner-container :deep(.dashboard-instrument),
.widget-inner-container :deep(svg) {
  width: 100% !important;
  height: 100% !important;
  min-width: 100% !important;
  min-height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  padding: 0 !important;
}

.empty-widget {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--ion-color-medium);
  padding: 16px;
  text-align: center;
}

.error-text {
  margin-top: 8px;
  font-size: 12px;
}

.debug-info {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 0, 0, 0.1);
  color: red;
  font-size: 10px;
  padding: 2px 4px;
  z-index: 10;
}
</style>
