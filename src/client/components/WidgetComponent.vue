<template>
  <div
    ref="containerRef"
    class="widget-container no-tap-highlight"
    :class="{ 'fade-in': isReady }"
    :data-aspect-ratio="widgetAspectRatio"
    :style="containerStyle"
    @touchstart.prevent @touchmove.prevent @touchend.prevent
  >
    <component
      v-if="widgetComponent"
      :is="widgetComponent"
      :class="{ 'fade-in': isReady }"
      :data="widget"
      :dataSource="widget.dataSource"
      :layout="layout"
      :label="label"
      :template="template"
      :widget="widget"
      @mounted="handleComponentMounted"
    />
    <div v-else class="empty-widget no-tap-highlight">
      <ion-icon :icon="alertCircleOutline" size="large" />
      <div class="error-text">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, nextTick } from "vue";
import { IonIcon } from "@ionic/vue";
import { alertCircleOutline } from "ionicons/icons";
import { useStateDataStore } from "../stores/stateDataStore.js";
import { storeToRefs } from "pinia";

// Initialize stores
const stateStore = useStateDataStore();
const { navigationState } = storeToRefs(stateStore);

// Import components
import Sail360View from "./Sail360View.vue";
import InstrumentComponent from "./InstrumentComponent.vue";
import TankLevelComponent from "./TankLevelComponent.vue";
import BatteryComponent from "./BatteryComponent.vue";

const props = defineProps({
  data: { type: Object, required: true },
  template: { type: String, required: true },
  layout: { type: Object, required: false },
  label: { type: String, required: false },
});

// Define emits for updating data
const emit = defineEmits(["mounted", "update:data"]);

// Create a separate widget prop to pass to components
const widget = computed(() => {
  // If this is an instrument widget, we need to get the real-time data from the navigation store
  if (props.data?.displayType === "instrument" && props.data?.dataSource) {
    const dataSource = props.data.dataSource;

    // Check if the state store has data for this data source
    // Map old data sources to new state structure paths
    let stateData = null;
    
    // Map common instrument types to their locations in the state structure
    if (dataSource === 'speedOverGround') {
      stateData = navigationState.value?.speed?.speedOverGround;
    } else if (dataSource === 'speedThroughWater') {
      stateData = navigationState.value?.speed?.speedThroughWater;
    } else if (dataSource === 'depth') {
      stateData = navigationState.value?.depth?.belowTransducer;
    } else if (dataSource === 'windSpeedTrue') {
      stateData = navigationState.value?.wind?.speedTrue;
    } else if (dataSource === 'windAngleTrue') {
      stateData = navigationState.value?.wind?.angleTrue;
    } else if (dataSource === 'windSpeedApparent') {
      stateData = navigationState.value?.wind?.speedApparent;
    } else if (dataSource === 'windAngleApparent') {
      stateData = navigationState.value?.wind?.angleApparent;
    } else if (dataSource === 'heading') {
      stateData = navigationState.value?.course?.headingTrue;
    } else if (dataSource === 'courseOverGround') {
      stateData = navigationState.value?.course?.courseOverGround;
    }
    
    if (stateData !== null) {

      // Log the navigation data for debugging
      // console.log('WidgetComponent - Navigation data for', dataSource, ':', navData);

      // Return a merged object with widget metadata and real-time data
      const mergedData = {
        ...props.data,
        value: stateData,
        // For now, hardcode units based on data type until we add them to the state structure
        units: getUnitsForDataSource(dataSource),
        // State structure doesn't have history yet, will need to be added
        history: [],
        updated: true,
        label: props.data.label || getLabelForDataSource(dataSource),
      };

      return mergedData;
    } else {
      console.warn(`Navigation data not found for ${dataSource}`);
    }
  }

  // For non-instrument widgets or if no navigation data is available, return the original data
  return props.data || {};
});

// Track if widget is ready to be shown
const isReady = ref(false);

// Handle component mounted event
const handleComponentMounted = () => {
  // Short delay to ensure component is fully rendered
  setTimeout(() => {
    isReady.value = true;
  }, 100);
};

onMounted(() => {
  updateContainerDimensions();

  // Set up a resize observer to update dimensions when the container size changes
  if (containerRef.value) {
    const resizeObserver = new ResizeObserver(() => {
      updateContainerDimensions();
    });
    resizeObserver.observe(containerRef.value);
  }
});

function updateContainerDimensions() {
  nextTick(() => {
    if (containerRef.value) {
      // Get the parent container dimensions
      const parent = containerRef.value.parentElement;
      if (parent) {
        containerDimensions.value = {
          width: parent.clientWidth,
          height: parent.clientHeight,
        };
        // console.log("Container dimensions:", containerDimensions.value);
      }
    }
  });
}

const errorMessage = ref("Widget not found");

// Helper functions for mapping data sources to units and labels
function getUnitsForDataSource(dataSource) {
  const unitMap = {
    'speedOverGround': 'kts',
    'speedThroughWater': 'kts',
    'depth': 'm',
    'windSpeedTrue': 'kts',
    'windAngleTrue': '°',
    'windSpeedApparent': 'kts',
    'windAngleApparent': '°',
    'heading': '°',
    'courseOverGround': '°',
    'currentSpeed': 'kts',
    'currentAngle': '°',
    'waterTemp': '°C',
    'airTemp': '°C',
    'pressure': 'hPa'
  };
  
  return unitMap[dataSource] || '';
}

function getLabelForDataSource(dataSource) {
  const labelMap = {
    'speedOverGround': 'SOG',
    'speedThroughWater': 'STW',
    'depth': 'Depth',
    'windSpeedTrue': 'Wind Speed (True)',
    'windAngleTrue': 'Wind Angle (True)',
    'windSpeedApparent': 'Wind Speed (App)',
    'windAngleApparent': 'Wind Angle (App)',
    'heading': 'Heading',
    'courseOverGround': 'COG',
    'currentSpeed': 'Current Speed',
    'currentAngle': 'Current Angle',
    'waterTemp': 'Water Temp',
    'airTemp': 'Air Temp',
    'pressure': 'Pressure'
  };
  
  return labelMap[dataSource] || dataSource;
}

// Resolve widget component
const widgetComponent = computed(() => {
  // console.log("WidgetComponent data:", props.data);

  if (!props.data?.displayType) {
    console.log("No displayType found in widget data");
    return null;
  }

  switch (props.data.displayType) {
    case "sail360":
      // console.log("Rendering Sail360View");
      return Sail360View;
    case "instrument":
      // console.log("Rendering InstrumentComponent");
      return InstrumentComponent;
    case "tank":
      // console.log("Rendering TankLevelComponent");
      return TankLevelComponent;
    case "battery":
      // console.log("Rendering BatteryComponent");
      return BatteryComponent;
    default:
      // console.log("Unknown displayType:", props.data.displayType);
      return null;
  }
});

// Handle error message separately outside of computed
watch(
  () => props.data?.displayType,
  (displayType) => {
    if (!displayType) {
      errorMessage.value = "Missing display type";
    } else if (!["sail360", "instrument", "tank", "battery"].includes(displayType)) {
      errorMessage.value = `Unknown widget type: ${displayType}`;
    } else {
      errorMessage.value = "";
    }
  },
  { immediate: true }
);

// Handle maintainSquareRatio separately
watch(
  () => props.data?.displayType,
  (displayType) => {
    if (displayType === "sail360" || displayType === "instrument") {
      // Create a copy of the data to avoid mutating props directly
      const updatedData = { ...props.data, maintainSquareRatio: true };
      // Emit an event to update the data in the parent component
      emit("update:data", updatedData);
    }
  },
  { immediate: true }
);

const widgetAspectRatio = computed(() => {
  if (props.data?.aspectRatio) {
    return props.data.aspectRatio;
  }
  return "1:1";
});

const containerRef = ref(null);
const containerDimensions = ref({ width: 0, height: 0 });
const containerStyle = computed(() => {
  // Explicitly check if it's false (boolean) - this handles undefined/null cases
  const shouldBeSquare = props.data?.maintainSquareRatio !== false;

  if (!shouldBeSquare) {
    console.log("Using default sizing (not square)");
    return {};
  }

  // If we want to maintain square aspect ratio and have dimensions
  if (containerDimensions.value.width && containerDimensions.value.height) {
    const size = Math.min(
      containerDimensions.value.width,
      containerDimensions.value.height
    );
    // console.log(`Making square with size: ${size}px`);
    return {
      width: `${size}px`,
      height: `${size}px`,
      margin: "auto", // Center the widget
    };
  }

  return {};
});

// Watch for changes to props.data.maintainSquareRatio
watch(
  () => props.data?.maintainSquareRatio,
  () => {
    // No need to use the newValue parameter if we're not referencing it
    // console.log("maintainSquareRatio changed");
    updateContainerDimensions();
  },
  { immediate: true }
);
</script>

<style scoped>
.widget-container {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background-color: var(--ion-color-primary);
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  pointer-events: auto;
  touch-action: manipulation;
}

.no-tap-highlight {
  -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  touch-action: manipulation;
  -webkit-user-drag: none;
  -webkit-appearance: none;
  appearance: none;
  outline: none !important;
}

.empty-widget {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 1rem;
  color: var(--ion-color-medium);
  background-color: var(--ion-color-primary);
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  touch-action: manipulation;
}

.error-text {
  margin-top: 0.5rem;
  text-align: center;
  font-size: 0.8rem;
}

.fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
