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
          y="62"
        >
          {{ displayLabel }}
        </text>
        
        <!-- Fixed compass ring -->
        <circle class="compass-circle" cx="100" cy="110" :r="radius" />
        
        <!-- Cardinal directions (fixed) -->
        <text class="cardinal-text north" x="100" y="38">N</text>
        <text class="cardinal-text cardinal-horizontal" x="172" y="110">E</text>
        <text class="cardinal-text south" x="100" y="187">S</text>
        <text class="cardinal-text cardinal-horizontal" x="28" y="110">W</text>
        
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
        <g
          v-if="arrowVisible"
          ref="arrowGroupRef"
          class="arrow-group"
          :style="arrowGroupStyle"
        >
          <polygon class="arrow" :points="arrowPoints" :style="arrowStyle" />
        </g>
        
        <!-- Center wind speed display -->
        <text class="speed-text" x="100" y="115">{{ windSpeed != null ? windSpeed.toFixed(1) : '--' }}</text>
        <text class="units-text" x="100" y="140">{{ windUnits }}</text>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from "vue";
import { useStateDataStore } from "@/stores/stateDataStore";

const props = defineProps({
  widgetData: {
    type: Object,
    required: true,
  },
});

const stateStore = useStateDataStore();

// Computed properties - these should be reactive
const windSpeed = computed(() => stateStore.state?.navigation?.wind?.apparent?.speed?.value);
const windUnits = computed(() => stateStore.state?.navigation?.wind?.apparent?.speed?.units || 'kts');
const windAngle = computed(() => stateStore.state?.navigation?.wind?.apparent?.angle?.degrees 
  ?? stateStore.state?.navigation?.wind?.apparent?.angle?.value 
  ?? stateStore.state?.navigation?.wind?.apparent?.direction?.value);

// Missing properties that template uses
const displayLabel = computed(() => props.widgetData?.displayLabel || props.widgetData?.label || 'Wind');
const tickMarkers = [10, 20, 40, 50, 70, 80, 100, 110, 130, 140, 160, 170, 190, 200, 220, 230, 250, 260, 280, 290, 310, 320, 340, 350];

const radius = 88;
const centerX = 100;
const centerY = 110;

const arrowPoints = `${0},${-(radius - 28)} ${-10},${-(radius - 4)} 10,${-(radius - 4)}`;

const arrowStyle = {
  fill: "#f87171",
  stroke: "rgba(185, 28, 28, 0.6)",
  strokeWidth: 1.4,
};

const arrowGroupRef = ref(null);
const currentArrowAngle = ref(0);
const arrowVisible = ref(false);
const arrowHasInitialPosition = ref(false);

function animateArrowRotation(targetAngle) {
  let normalizedTarget = targetAngle % 360;
  if (normalizedTarget < 0) normalizedTarget += 360;
  
  // Get current normalized angle
  let currentAngle = currentArrowAngle.value % 360;
  if (currentAngle < 0) currentAngle += 360;
  
  // Calculate shortest rotation direction
  let diff = normalizedTarget - currentAngle;
  
  // Take shortest path: if diff > 180, go the other way (negative)
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  // Apply the diff to current cumulative angle
  currentArrowAngle.value += diff;
}

const arrowGroupStyle = computed(() => ({
  transform: `translate(${centerX}px, ${centerY}px) rotate(${currentArrowAngle.value}deg)`,
  transition: 'transform 0.5s ease-in-out'
}));

onMounted(() => {
  requestAnimationFrame(() => {
    const windAngle = stateStore.state?.navigation?.wind?.apparent?.angle?.degrees 
      ?? stateStore.state?.navigation?.wind?.apparent?.angle?.value 
      ?? stateStore.state?.navigation?.wind?.apparent?.direction?.value;
    if (typeof windAngle === 'number') {
      currentArrowAngle.value = windAngle;
      arrowHasInitialPosition.value = true;
      arrowVisible.value = true;
    }
  });
});

watch(() => stateStore.state?.navigation?.wind?.apparent?.angle?.degrees ?? stateStore.state?.navigation?.wind?.apparent?.angle?.value ?? stateStore.state?.navigation?.wind?.apparent?.direction?.value, (newAngle) => {
  if (typeof newAngle !== 'number') {
    return;
  }

  if (!arrowHasInitialPosition.value) {
    currentArrowAngle.value = newAngle;
    arrowHasInitialPosition.value = true;
    arrowVisible.value = true;
    return;
  }

  animateArrowRotation(newAngle);
});

const degreeMarkers = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

function getMarkerPoint(degrees, r) {
  const radians = (degrees - 90) * Math.PI / 180;
  return {
    x: centerX + r * Math.cos(radians),
    y: centerY + r * Math.sin(radians)
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

.cardinal-horizontal {
  dominant-baseline: middle;
  alignment-baseline: middle;
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
  /* No CSS transition - using Web Animations API */
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
