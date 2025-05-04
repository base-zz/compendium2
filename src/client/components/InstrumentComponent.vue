<template>
  <div class="instrument-container no-tap-highlight" @touchstart.prevent>
    <svg
      height="100%"
      width="100%"
      ref="svg"
      class="instrument display-component no-tap-highlight"
      viewBox="0 0 300 300"
      preserveAspectRatio="xMidYMid meet"
    >
      <text class="title" x="150" y="45" ref="titleRef">
        {{ props.label || instrumentData.label || props.dataSource }}
      </text>
      <text class="units" x="266" y="95" ref="unitsRef">
        {{ instrumentData.units || "" }}
      </text>
      <text class="metric" x="150" y="165" ref="metric">
        {{ instrumentData.value || "--" }}
      </text>

      <InstrumentBarGraph v-if="props.graph === 'bar'" :data="history" />
      <InstrumentLineGraph v-else :data="history" />
    </svg>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from "vue";
import InstrumentBarGraph from "./InstrumentBarGraph.vue";
import InstrumentLineGraph from "./InstrumentLineGraph.vue";
// import { useAlertStore } from "../stores/alerts.js";

const svg = ref(null);
const metric = ref(null);
const titleRef = ref(null);
const unitsRef = ref(null);

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({
      value: "",
      units: "",
      label: "",
      // history is now managed locally
      history: [],
    }),
  },
  dataSource: {
    type: String,
    default: "",
  },
  size: {
    type: String,
    default: "medium",
  },
  layout: {
    type: Object,
    required: false,
  },
  graph: {
    type: String,
    required: false,
    default: () => "line",
  },
});

const emit = defineEmits(["mounted"]);

// Extract dataSource from the data object for display
const dataSource = computed(() => {
  return props.dataSource;
});

// Create a computed property that ensures history is always an array
const instrumentData = computed(() => {
  // If we have real-time data from the navigation store (via widget prop), use it
  if (props.data?.value !== undefined) {
    const data = {
      value: props.data.value !== null ? props.data.value : "--",
      units: props.data.units || "",
      label: props.data.label || props.dataSource || "",
      // Ensure history is always an array
      history: Array.isArray(props.data.history) ? props.data.history : [],
    };

    // console.log("Using real-time data:", data);
    return data;
  }

  // Fallback to empty data if no real-time data is available
  console.warn("No real-time data available for instrument:", props.dataSource);
  return {
    value: "--",
    units: "",
    label: props.dataSource || "",
    history: [],
  };
});

/**
 * Checks if the text element overflows its container and rescales the font size accordingly
 * @param {SVGTextElement} el - The text element to check
 */
function checkFontSize(el) {
  const actualWidth = el.getBBox().width;
  const widthThreshold = 0.9 * 300;
  if (actualWidth <= widthThreshold) return;

  const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
  const newFontSize = fontSize * (widthThreshold / actualWidth);
  el.style.fontSize = `${newFontSize}px`;
}

watch(
  () => instrumentData.value,
  () => {
    if (metric.value) {
      checkFontSize(metric.value);
    }
  }
);

watch(
  () => svg,
  () => {
    if (titleRef.value) {
      setTimeout(() => checkFontSize(titleRef.value), 520);
    }
  }
);

onMounted(() => {
  if (titleRef.value) {
    checkFontSize(titleRef.value);
  }
  setTimeout(() => {
    emit("mounted");
  }, 100);
});
// Local history tracking
const history = ref([]);

watch(
  () => props.data,
  (newVal, oldVal) => {
    console.log('InstrumentComponent data changed:', oldVal, '→', newVal);
  }
);

watch(
  () => props.data.value,
  (newVal) => {
    if (typeof newVal === 'number' && !isNaN(newVal)) {
      history.value.push(newVal);
      if (history.value.length > 100) history.value.shift();
      console.log("history", history.value);
    }
  },
  { immediate: true }
);

// Use local history for graphs
</script>

<style scoped>
.instrument-container {
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

.instrument {
  pointer-events: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

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
  alignment-baseline: middle;
  text-anchor: middle;
}
.title {
  font-size: 2.25em;
  font-weight: bold;
  padding: 0.35em;
  padding-top: 0.6;
}
.metric {
  font-size: 6.75em;
}
.units {
  font-size: 1.75em;
  transform: translate(0px, 5px);
}

.animable {
  transform-style: preserve-3d;
  transition: all 0.5s linear;
}
.no-tap-highlight {
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0) !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  -webkit-user-drag: none;
  -webkit-appearance: none;
  appearance: none;
  outline: none !important;
}
</style>
