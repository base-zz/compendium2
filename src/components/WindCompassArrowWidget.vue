<template>
  <div class="wind-compass-widget">
    <div class="instrument-surface">
      <svg
        class="wind-compass-svg"
        viewBox="0 0 200 220"
        role="img"
        aria-label="Wind compass with rotating arrow"
      >
        <text
          v-if="displayLabel"
          class="label-text"
          x="100"
          y="55"
        >
          {{ displayLabel }}
        </text>
        
        <!-- Fixed compass ring -->
        <circle class="compass-circle" cx="100" cy="110" :r="radius" />
        
        <!-- Cardinal directions (fixed) -->
        <text class="cardinal-text north" x="100" y="30">N</text>
        <text class="cardinal-text east" x="180" y="115">E</text>
        <text class="cardinal-text south" x="100" y="195">S</text>
        <text class="cardinal-text west" x="20" y="115">W</text>
        
        <!-- Degree markers every 30 degrees -->
        <g v-for="deg in degreeMarkers" :key="deg" class="degree-marker">
          <line
            :x1="getMarkerPoint(deg, radius - 2).x"
            :y1="getMarkerPoint(deg, radius - 2).y"
            :x2="getMarkerPoint(deg, radius - 12).x"
            :y2="getMarkerPoint(deg, radius - 12).y"
            class="marker-line"
            :class="{ 'major-marker': deg % 90 === 0 }"
          />
        </g>
        
        <!-- Small tick marks every 10 degrees -->
        <g v-for="deg in tickMarkers" :key="`tick-${deg}`" class="tick-marker">
          <line
            :x1="getMarkerPoint(deg, radius - 2).x"
            :y1="getMarkerPoint(deg, radius - 2).y"
            :x2="getMarkerPoint(deg, radius - 7).x"
            :y2="getMarkerPoint(deg, radius - 7).y"
            class="tick-line"
          />
        </g>
        
        <!-- Rotating arrow group pointing toward center -->
        <g class="arrow-group" :style="arrowGroupStyle">
          <polygon class="arrow" :points="arrowPoints" :style="arrowStyle" />
        </g>
        
        <!-- Center wind speed display -->
        <text class="speed-text" x="100" y="115">{{ formattedSpeed }}</text>
        <text class="units-text" x="100" y="140">{{ units }}</text>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useStateDataStore } from "@/stores/stateDataStore";
import { storeToRefs } from "pinia";

const props = defineProps({
  widgetData: {
    type: Object,
    required: true,
  },
});

// Get wind data directly from state
const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

// Use true wind data from navigation state
const windData = computed(() => state.value?.navigation?.wind?.true || null);
const apparentWindData = computed(() => state.value?.navigation?.wind?.apparent || null);

// Get heading data - prefer true heading, fallback to magnetic or COG
const headingData = computed(() => {
  const nav = state.value?.navigation;
  return nav?.course?.heading?.true || nav?.course?.heading?.magnetic || nav?.course?.cog || null;
});

const speedData = computed(() => windData.value?.speed || null);
const directionData = computed(() => windData.value?.direction || null);
const trueWindAngleData = computed(() => windData.value?.angle || null);
const apparentWindAngleData = computed(() => apparentWindData.value?.angle || null);

const speedValue = computed(() => {
  const explicit = speedData.value?.value ?? props.widgetData?.value;
  return typeof explicit === "number" ? explicit : null;
});

const units = computed(() => {
  const suppliedUnits =
    speedData.value?.units ||
    props.widgetData?.units ||
    props.widgetData?.dataConfig?.defaultUnits;
  return typeof suppliedUnits === "string" ? suppliedUnits : "";
});

const displayLabel = computed(() =>
  props.widgetData?.data?.label ||
  props.widgetData?.data?.widgetTitle ||
  props.widgetData?.widgetTitle ||
  props.widgetData?.widgetName ||
  props.widgetData?.label ||
  ""
);

const angleValue = computed(() => {
  // Priority 1: Use True Wind Direction if available directly (already North-up)
  // Use .degrees if available, otherwise fall back to .value
  const twd = directionData.value?.degrees ?? directionData.value?.value ?? directionData.value;
  if (typeof twd === "number") {
    return twd;
  }

  // Priority 2: Calculate from Heading + True Wind Angle
  const heading = headingData.value?.degrees ?? headingData.value?.value ?? headingData.value;
  const twa = trueWindAngleData.value?.degrees ?? trueWindAngleData.value?.value ?? trueWindAngleData.value;
  if (typeof heading === "number" && typeof twa === "number") {
    return heading + twa;
  }

  // Priority 3: Calculate from Heading + Apparent Wind Angle (approximation)
  const awa = apparentWindAngleData.value?.degrees ?? apparentWindAngleData.value?.value ?? apparentWindAngleData.value;
  if (typeof heading === "number" && typeof awa === "number") {
    return (heading + awa) % 360;
  }

  return null;
});

const formattedSpeed = computed(() => {
  const speed = speedValue.value;
  if (speed === null || speed === undefined) {
    return "--";
  }
  return speed.toFixed(1);
});

const radius = 88;
const centerX = 100;
const centerY = 110;

// Normalize angle to 0-360 range
const normalizedAngle = computed(() => {
  if (typeof angleValue.value !== "number" || Number.isNaN(angleValue.value)) {
    return null;
  }
  const raw = angleValue.value % 360;
  return raw >= 0 ? raw : raw + 360;
});

// Arrow points outward from center, positioned on circumference
const arrowPoints = computed(() => {
  const tipRadius = radius - 4; // tip rides near circumference
  const baseRadius = radius - 28;
  const halfWidth = 10;
  const tipY = -tipRadius;
  const baseY = -baseRadius;
  return `0,${tipY} ${-halfWidth},${baseY} ${halfWidth},${baseY}`;
});

const arrowStyle = computed(() => ({
  fill: "#f87171",
  stroke: "rgba(185, 28, 28, 0.6)",
  strokeWidth: 1.4,
  transition: "fill 0.2s ease, stroke 0.2s ease",
}));

const arrowTransitionReady = ref(false);

onMounted(() => {
  requestAnimationFrame(() => {
    arrowTransitionReady.value = true;
  });
});

const arrowGroupStyle = computed(() => {
  const angle = normalizedAngle.value ?? 0;
  return {
    transform: `translate(${centerX}px, ${centerY}px) rotate(${angle}deg)`,
    transition: arrowTransitionReady.value ? "transform 0.6s ease-in-out" : "none",
  };
});

// Generate degree markers every 30 degrees
const degreeMarkers = computed(() => {
  return [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
});

// Generate tick markers every 10 degrees (excluding 30-degree markers)
const tickMarkers = computed(() => {
  const ticks = [];
  for (let i = 0; i < 360; i += 10) {
    if (i % 30 !== 0) {
      ticks.push(i);
    }
  }
  return ticks;
});

// Calculate marker position on circle
function getMarkerPoint(angleDeg, r) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: centerX + r * Math.cos(angleRad),
    y: centerY + r * Math.sin(angleRad),
  };
}
</script>

<style scoped>
.wind-compass-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--widget-text-color);
}

.instrument-surface {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: var(--widget-surface-color);
  color: var(--widget-text-color);
  border-radius: 8px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

.wind-compass-svg {
  width: 100%;
  height: 100%;
  max-width: 240px;
  max-height: 240px;
}

.compass-circle {
  fill: none;
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 2px;
}

.cardinal-text {
  fill: #ffffff;
  font-size: 16px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: middle;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.3);
  stroke-width: 0.5px;
}

.marker-line {
  stroke: rgba(255, 255, 255, 0.3);
  stroke-width: 1.5;
}

.marker-line.major-marker {
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 2;
}

.tick-line {
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 1;
}

.arrow-group {
  transform-origin: 0 0;
  transition: transform 0.6s ease-in-out;
}

.arrow {
  transform-origin: 100px 110px;
  transition: transform 0.4s ease-in-out;
  fill: #ffffff;
  stroke: rgba(0, 0, 0, 0.5);
  stroke-width: 1.5;
}

.label-text {
  fill: #ffffff;
  font-size: 22px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: middle;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.3);
  stroke-width: 0.5px;
}

.speed-text {
  font-size: 40px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: middle;
  fill: #ffffff;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.3);
  stroke-width: 0.5px;
}

.units-text {
  font-size: 16px;
  text-anchor: middle;
  dominant-baseline: middle;
  fill: rgba(255, 255, 255, 0.8);
}
</style>
