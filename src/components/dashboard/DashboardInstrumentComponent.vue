<template>
  <div class="dashboard-instrument-container" ref="containerRef">
    <svg
      width="100%"
      height="100%"
      ref="svg"
      class="dashboard-instrument"
      viewBox="0 0 300 300"
      preserveAspectRatio="xMidYMid meet"
    >
      <text class="title" x="150" y="45" ref="titleRef">
        {{ titleText }}
      </text>
      <text class="units" x="266" y="95" ref="unitsRef">
        {{ widgetData?.dataConfig?.defaultUnits || widgetData?.units || "" }}
      </text>
      <text class="metric" x="150" y="165" ref="metric">
        {{ formattedValue }}
      </text>

      <InstrumentBarGraph v-if="widgetData?.graph === 'bar'" :data="history" />
      <InstrumentLineGraph v-else :data="history" />
    </svg>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from "vue";
import InstrumentBarGraph from "../InstrumentBarGraph.vue";
import InstrumentLineGraph from "../InstrumentLineGraph.vue";
import { useStateDataStore } from "@/stores/stateDataStore.js";
import { storeToRefs } from "pinia";

const svg = ref(null);
const metric = ref(null);
const titleRef = ref(null);
const unitsRef = ref(null);
const containerRef = ref(null);

// Track container size
const containerSize = ref({ width: 0, height: 0 });

// Function to measure container dimensions
const measureContainer = () => {
  if (!containerRef.value) return;
  
  // Find the closest widget-container parent
  let parent = containerRef.value.parentElement;
  while (parent && !parent.classList.contains('widget-container')) {
    parent = parent.parentElement;
  }
  
  if (parent) {
    const rect = parent.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height); // Use the smaller dimension to ensure a square
    
    containerSize.value = {
      width: size,
      height: size
    };
    console.log('Measured widget parent container:', containerSize.value);
    nextTick(() => resizeTitle());
  } else {
    // Fallback if we can't find the widget-container
    const rect = containerRef.value.getBoundingClientRect();
    containerSize.value = {
      width: rect.width,
      height: rect.height
    };
    console.log('Fallback container size:', containerSize.value);
    nextTick(() => resizeTitle());
  }
};

const props = defineProps({
  widgetData: {
    type: Object,
    required: true,
  }
});

const emit = defineEmits(['mounted']);

// Initialize state store
const stateStore = useStateDataStore();
const { state: navigationState } = storeToRefs(stateStore);

const titleText = computed(() => {
  return (
    props.widgetData?.dataConfig?.displayLabel ||
    props.widgetData?.widgetTitle ||
    props.widgetData?.label ||
    props.widgetData?.dataSource ||
    ""
  );
});

// Get real-time instrument data from the navigation state
const instrumentData = computed(() => {
  const dataSource = props.widgetData.dataSource;
  if (!dataSource) {
    console.warn('No data source specified in widget data');
    return {
      value: null,
      units: "",
      label: "",
      dataSource: null
    };
  }

  const data = { value: null, units: "", label: "" };

  if (dataSource === "speedOverGround") {
    data.value = navigationState.value?.navigation?.speed?.sog?.value;
    data.units = navigationState.value?.navigation?.speed?.sog?.units || "kts";
    data.label = navigationState.value?.navigation?.speed?.sog?.displayLabel || "SOG";
  } else if (dataSource === "speedThroughWater") {
    data.value = navigationState.value?.navigation?.speed?.stw?.value;
    data.units = navigationState.value?.navigation?.speed?.stw?.units || "kts";
    data.label = navigationState.value?.navigation?.speed?.stw?.displayLabel || "STW";
  } else if (dataSource === "depth") {
    data.value = navigationState.value?.navigation?.depth?.belowTransducer?.value;
    data.units = navigationState.value?.navigation?.depth?.belowTransducer?.units || "m";
    data.label = navigationState.value?.navigation?.depth?.belowTransducer?.displayLabel || "Depth";
  } else if (dataSource === "windSpeedTrue") {
    data.value = navigationState.value?.navigation?.wind?.true?.speed?.value;
    data.units = navigationState.value?.navigation?.wind?.true?.speed?.units || "kts";
    data.label = navigationState.value?.navigation?.wind?.true?.speed?.displayLabel || "TWS";
  } else if (dataSource === "windAngleTrue") {
    data.value = navigationState.value?.navigation?.wind?.true?.direction?.value;
    data.units = navigationState.value?.navigation?.wind?.true?.direction?.units || "°";
    data.label = navigationState.value?.navigation?.wind?.true?.direction?.displayLabel || "TWD";
  } else if (dataSource === "windSpeedApparent") {
    data.value = navigationState.value?.navigation?.wind?.apparent?.speed?.value;
    data.units = navigationState.value?.navigation?.wind?.apparent?.speed?.units || "kts";
    data.label = navigationState.value?.navigation?.wind?.apparent?.speed?.displayLabel || "AWS";
  }

  return {
    value: data.value,
    units: data.units,
    label: props.widgetData.dataConfig?.displayLabel || props.widgetData.widgetTitle,
    dataSource: dataSource
  };
});

// Format the value based on decimal places and thousands separator options
const formattedValue = computed(() => {
  const value = instrumentData.value.value;
  if (value === undefined || value === null) return "--";
  
  // Format the number with decimal places and thousands separator
  let formatted = value.toFixed(props.widgetData.decimalPlaces);
  
  if (props.widgetData.showThousandsSeparator) {
    formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    // Split by decimal point
    const parts = formatted.split('.');
    // Format the integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    // Join back with decimal part if it exists
    formatted = parts.join('.');
    console.log(`Added thousands separators: ${formatted}`);
  }

  return formatted;
});

// Adjust the font size based on the length of the value
const adjustFontSize = () => {
  if (!metric.value) return;

  const metricText = metric.value;
  const metricValue = formattedValue.value || '';
  
  // Default font size
  let fontSize = 80;
  
  // Adjust based on length
  if (metricValue.length > 5) {
    fontSize = 70;
  }
  if (metricValue.length > 7) {
    fontSize = 60;
  }
  if (metricValue.length > 9) {
    fontSize = 50;
  }
  
  try {
    metricText.setAttribute("font-size", `${fontSize}px`);
  } catch (error) {
    console.warn('Could not set font size:', error);
  }
};

const resizeTitle = () => {
  if (!titleRef.value) return;

  const baseSize = 24;
  const minSize = 14;
  const maxSize = 36;
  const maxWidth = 240;

  titleRef.value.style.fontSize = `${baseSize}px`;
  titleRef.value.setAttribute("font-size", `${baseSize}px`);

  let bbox;
  try {
    bbox = titleRef.value.getBBox();
  } catch (error) {
    return;
  }

  if (!bbox || !bbox.width) {
    return;
  }

  const ratio = maxWidth / bbox.width;
  let newSize = baseSize * ratio;

  if (!Number.isFinite(newSize) || newSize <= 0) {
    newSize = baseSize;
  }

  if (ratio < 1) {
    newSize = Math.max(minSize, newSize);
  } else {
    newSize = Math.min(maxSize, Math.max(baseSize, newSize));
  }

  newSize = Math.min(maxSize, Math.max(minSize, newSize));

  titleRef.value.style.fontSize = `${newSize}px`;
  titleRef.value.setAttribute("font-size", `${newSize}px`);
};

// Watch for changes to the formatted value and adjust font size
watch(formattedValue, () => {
  nextTick(() => {
    adjustFontSize();
    resizeTitle();
  });
});

watch(titleText, () => {
  nextTick(() => {
    resizeTitle();
  });
});

// Set up the component when mounted
onMounted(() => {
  // Measure container size
  measureContainer();
  
  // Add window resize listener
  window.addEventListener('resize', () => {
    measureContainer();
    adjustFontSize();
    resizeTitle();
  });
  
  // Adjust font size on mount
  adjustFontSize();
  resizeTitle();
  
  // Emit mounted event
  setTimeout(() => {
    emit('mounted');
  }, 100);
});

// Clean up event listeners when component is unmounted
onUnmounted(() => {
  window.removeEventListener('resize', measureContainer);
});

// Local history tracking
const history = ref([]);

watch(
  () => props.data?.value,
  (newVal) => {
    if (typeof newVal === 'number' && !isNaN(newVal)) {
      history.value.push(newVal);
      if (history.value.length > 100) history.value.shift();
    }
  },
  { immediate: true }
);
</script>

<style>
/* Use :deep to target parent elements */
:deep(.widget-container),
:deep(.widget-content),
:deep(.widget-inner-container),
:deep(.widget-square-wrapper) {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

.dashboard-instrument-container {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
}

.dashboard-instrument {
  width: 100% !important;
  height: 100% !important;
  min-width: 100% !important;
  min-height: 100% !important;
  background-color: var(--widget-surface-color);
  color: var(--widget-text-color);
  border: none;
  border-radius: 8px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

.title {
  fill: var(--widget-text-color);
  font-size: 24px;
  font-weight: 500;
  text-anchor: middle;
  dominant-baseline: middle;
}

.units {
  fill: var(--widget-muted-text-color);
  font-size: 24px;
  font-weight: 400;
  text-anchor: end;
  dominant-baseline: middle;
  opacity: 0.8;
}

.metric {
  fill: var(--widget-text-color);
  font-size: 80px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: middle;
}
</style>
