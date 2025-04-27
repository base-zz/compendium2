<template>
  <div
    style="
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0;
      margin: 0;
      background-color: var(--ion-color-primary);
      border-radius: 8px;
      -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
      -webkit-touch-callout: none !important;
      user-select: none !important;
      pointer-events: auto;
      touch-action: manipulation;
      -webkit-user-drag: none;
      -webkit-appearance: none;
      appearance: none;
      outline: none !important;
    "
    class="battery-container no-tap-highlight"
    @touchstart.prevent
  >
    <svg
      height="100%"
      width="100%"
      ref="svg"
      class="instrument display-component battery-component no-tap-highlight"
      :class="threshold > batteryValue ? 'critical-border' : ''"
      viewBox="0 0 300 300"
      preserveAspectRatio="xMidYMid meet"
      style="
        max-width: 100%; 
        max-height: 100%;
        -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
        -webkit-touch-callout: none !important;
        user-select: none !important;
        pointer-events: none;
        touch-action: manipulation;
        -webkit-user-drag: none;
        -webkit-appearance: none;
        appearance: none;
        outline: none !important;
      "
      @touchstart.prevent
    >
      <g ref="battery-group" transform="scale(0.8) translate(10, 67)">
        <g ref="battery-body">
          <rect
            ref="battery"
            class="battery"
            :class="threshold > batteryValue ? 'critical' : ''"
            x="30"
            y="40"
            width="80"
            height="240"
            :stroke="widgetColor"
            stroke-width="3"
            rx="5"
          ></rect>
          <rect
            class="battery"
            :class="threshold > batteryValue ? 'critical' : ''"
            x="50"
            y="25"
            width="40"
            height="15"
            :stroke="widgetColor"
            :fill="threshold > batteryValue ? 'red' : widgetColor"
            stroke-width="2"
            rx="5"
          ></rect>
        </g>

        <g ref="power-group" transform="translate(1.5, 0) scale(0.98)">
          <rect
            ref="power-10"
            class="power"
            :class="threshold > batteryValue ? 'critical' : ''"
            x="35"
            y="46"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-9"
            class="power"
            :class="threshold > batteryValue ? 'critical' : ''"
            x="35"
            y="70"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-8"
            class="power"
            :class="threshold > batteryValue ? 'critical' : ''"
            x="35"
            y="94"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-7"
            class="power"
            :class="threshold > batteryValue ? 'critical' : ''"
            x="35"
            y="118"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-6"
            class="power"
            :class="threshold > batteryValue ? 'critical' : ''"
            x="35"
            y="142"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-5"
            class="power"
            :class="threshold > batteryValue ? 'critical' : ''"
            x="35"
            y="166"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-4"
            class="power"
            :class="threshold > batteryValue ? 'critical' : ''"
            x="35"
            y="190"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-3"
            class="power"
            :class="threshold > batteryValue ? 'critical' : ''"
            x="35"
            y="214"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-2"
            class="power"
            :class="threshold > batteryValue ? 'critical' : ''"
            x="35"
            y="238"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-1"
            class="power"
            :class="threshold > batteryValue ? 'critical' : ''"
            x="35"
            y="262"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>
        </g>
        <g transform="translate(118,35)">
          <text
            ref="metric"
            class="metric"
            :class="threshold > batteryValue ? 'pulsating-text' : ''"
            x="114"
            y="80"
          >
            {{ displayValue }}
          </text>
          <text class="units" x="114" y="110">%</text>
          <text class="metric2" x="114" y="160">
            {{ displayVoltage }}
          </text>
          <text class="units" x="114" y="180">V</text>
          <text class="metric2" x="114" y="230">
            {{ displayAmperage }}
          </text>
          <text class="units" x="114" y="250">A</text>
        </g>
      </g>
      <text ref="title" class="title" x="150" y="48">
        {{ batteryTitle }}
      </text>
    </svg>
  </div>
</template>

<script setup>
import { useTemplateRef, onMounted, watch, computed } from "vue";
import { useStateDataStore } from "../stores/stateDataStore.js";
import { storeToRefs } from "pinia";

const props = defineProps({
  data: {
    type: Object,
    required: false,
    default: () => null,
  },
  color: {
    type: String,
    required: false,
    default: () => "steelblue",
  },
  widget: {
    type: Object,
    required: false,
    default: () => null,
  },
  threshold: {
    type: Number,
    required: false,
    default: 20,
  },
  label: {
    type: String,
    required: false,
    default: () => "Battery - No Label",
  },
  alerts: {
    type: Array,
    required: false,
    default: () => [],
  },
});

const emit = defineEmits(["mounted"]);

// Get StateData store
const stateStore = useStateDataStore();
const { vesselState } = storeToRefs(stateStore);

// Get battery data from StateData based on dataSource
const batteryData = computed(() => {
  const dataSource = props.widget?.dataSource;

  // Make sure navData.value exists before trying to access properties
  if (dataSource && navData.value && navData.value[dataSource]) {
    return navData.value[dataSource];
  }

  // Fallback to props.data if NavData doesn't have the data
  return props.data || {};
});

// Computed properties for battery values with fallbacks for display logic only
const batteryValue = computed(() => {
  return batteryData.value?.value !== null && batteryData.value?.value !== undefined
    ? batteryData.value.value
    : 0;
});

// Display values with proper formatting
const displayValue = computed(() => {
  return batteryData.value?.value !== null && batteryData.value?.value !== undefined
    ? batteryData.value.value
    : "--";
});

const displayVoltage = computed(() => {
  return batteryData.value?.voltage !== null && batteryData.value?.voltage !== undefined
    ? batteryData.value.voltage
    : "--";
});

const displayAmperage = computed(() => {
  return batteryData.value?.amperage !== null && batteryData.value?.amperage !== undefined
    ? batteryData.value.amperage
    : "--";
});

const batteryTitle = computed(() => {
  return (
    props.widget?.widgetTitle || props.label || batteryData.value?.label || "Battery"
  );
});

/* ****************************************
   refences the clipPath that gets moved up and down
   for fluid level animation
   **************************************** */
const titleRef = useTemplateRef("title");
const metricRef = useTemplateRef("metric");
const power1 = useTemplateRef("power-1");
const power2 = useTemplateRef("power-2");
const power3 = useTemplateRef("power-3");
const power4 = useTemplateRef("power-4");
const power5 = useTemplateRef("power-5");
const power6 = useTemplateRef("power-6");
const power7 = useTemplateRef("power-7");
const power8 = useTemplateRef("power-8");
const power9 = useTemplateRef("power-9");
const power10 = useTemplateRef("power-10");

const powerMarkers = [
  power1,
  power2,
  power3,
  power4,
  power5,
  power6,
  power7,
  power8,
  power9,
  power10,
];

// Handle both color formats (string or object)
const widgetColor = computed(() => {
  const color = props.widget?.color || props.color || "steelblue";
  if (typeof color === "object" && color !== null) {
    return `rgb(${color.r},${color.g},${color.b})`;
  }
  return color;
});

const setPowerMarker = () => {
  // Reverse the array so power1 is at bottom (0%) and power10 is at top (100%)
  const reversedMarkers = [...powerMarkers].reverse();

  // Get battery value from computed property
  const batteryVal = batteryValue.value;

  reversedMarkers.forEach((marker, index) => {
    // Each segment represents 10% (100/10)
    // Index 0 = 0-10%, 1 = 10-20%, etc.
    const segmentStart = index * 10;

    if (!marker.value) return; // Skip if marker reference is not available

    let s = widgetColor.value; // Default to filled
    if (100 - batteryVal > segmentStart) {
      s = "none"; // Empty if we're below this level
    } else if (props.threshold > batteryVal) {
      s = "red"; // Red if in critical range
    }

    marker.value.setAttribute("fill", s);
  });
};

/* ****************************************
    Check font sizes 
   **************************************** */
let originalFontSize = null;

function checkFontSize(el, threshold = 0.7) {
  const actualWidth = el.getBBox().width;
  const widthThreshold = threshold * 300;
  const fontSize = parseFloat(window.getComputedStyle(el).fontSize);

  if (!originalFontSize) originalFontSize = fontSize;

  if (originalFontSize) {
    el.style.fontSize = `${originalFontSize}px`;
    return;
  }

  const newFontSize = Math.floor(fontSize * (widthThreshold / actualWidth));
  el.style.fontSize = `${newFontSize}px`;
}

function checkTitleSize(el, threshold = 0.9) {
  const actualWidth = el.getBBox().width;
  const widthThreshold = threshold * 300;
  const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
  if (actualWidth < widthThreshold) return;

  const newFontSize = Math.floor(fontSize * (widthThreshold / actualWidth));
  el.style.fontSize = `${newFontSize}px`;
}

/* ****************************************
    Watchers
   **************************************** */
watch(
  () => batteryValue.value,
  (newValue) => {
    if (newValue !== undefined) {
      setPowerMarker();
      if (metricRef.value) {
        checkFontSize(metricRef.value, 0.7, "metric");
      }
    }
  }
);

/* ****************************************
    Mounted
   **************************************** */
onMounted(() => {
  setTimeout(() => {
    if (titleRef.value) {
      checkTitleSize(titleRef.value, 0.9);
    }
    if (metricRef.value) {
      checkFontSize(metricRef.value, 0.7, "metric");
    }
    setPowerMarker();
    emit("mounted");
  }, 100);
});
</script>

<style scoped>
.instrument {
  height: 100% !important;
  width: 100% !important;
  aspect-ratio: 1 / 1 !important;
  background-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border: none;
  border-radius: 8px;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent !important; /* Disable iOS tap highlight */
  -webkit-touch-callout: none; /* Disable callout */
  user-select: none; /* Disable text selection */
}

text {
  font-weight: bold;
  fill: var(--ion-color-primary-contrast);
  text-anchor: middle;
}

.title {
  font-size: 2.75em;
  font-weight: bold;
  padding: 0.35em;
  padding-top: 0.6;
  text-anchor: middle;
}
.metric {
  font-size: 5.4em;
}
.metric2 {
  font-size: 2.75em;
}

.units {
  font-size: 0.6em;
}

.pulsating-text {
  font-size: 6.1em;
  font-weight: bolder;
  stroke: red;
  fill: red;
  animation: pulsate-text 1.5s ease-in-out infinite;
}

.critical {
  stroke: red;
}
.critical-border {
  border: none;
  border-radius: 8px;
  -webkit-box-shadow: 0px 0px 6px red, 0px 0px 6px rgb(241, 45, 45);
  -moz-box-shadow: 0px 0px 6px red, 0px 0px 6px rgb(241, 45, 45);
  box-shadow: 0px 0px 6px red, 0px 0px 6px rgb(241, 45, 45);
}

.battery-container {
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

.battery-component {
  pointer-events: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

.no-tap-highlight {
  -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  pointer-events: none;
  touch-action: manipulation;
  -webkit-user-drag: none;
  -webkit-appearance: none;
  appearance: none;
  outline: none !important;
}
</style>
