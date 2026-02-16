<template>
  <div class="anchor-widget">
    <svg
      class="anchor-canvas"
      :viewBox="`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`"
      role="img"
      aria-label="Anchor status"
    >
      <rect
        class="canvas-background"
        x="0"
        y="0"
        :width="VIEWBOX_SIZE"
        :height="VIEWBOX_SIZE"
        rx="18"
      />

      <circle
        :class="criticalRangeClass"
        :cx="CENTER"
        :cy="CENTER"
        :r="criticalRadiusPx"
        v-if="showGeometry"
      />

      <g v-if="showGeometry">
        <circle
          v-for="(crumb, index) in breadcrumbPoints"
          :key="`crumb-${index}`"
          class="breadcrumb-point"
          :cx="crumb.x"
          :cy="crumb.y"
          :r="crumb.radius"
          :fill="crumb.fill"
          :stroke="crumb.stroke"
          :stroke-width="crumb.strokeWidth"
        />
      </g>

      <line
        v-if="showGeometry && boatPoint"
        class="rode-line"
        :x1="CENTER"
        :y1="CENTER"
        :x2="boatPoint.x"
        :y2="boatPoint.y"
      />

      <circle
        class="anchor-drop-location-point"
        :cx="CENTER"
        :cy="CENTER"
        r="5"
      />

      <circle
        class="anchor-location-point"
        :cx="CENTER"
        :cy="CENTER"
        r="3"
      />

      <g v-if="showGeometry">
        <circle
          v-for="target in aisPoints"
          :key="target.id"
          :class="target.class"
          :cx="target.x"
          :cy="target.y"
          r="4"
          :opacity="target.opacity"
        />
      </g>

      <circle
        v-if="showGeometry && boatPoint"
        class="boat-point"
        :cx="boatPoint.x"
        :cy="boatPoint.y"
        r="7"
      />

      <g v-if="showGeometry && windIndicator">
        <g :transform="`translate(${windIndicator.x} ${windIndicator.y}) rotate(${windIndicator.rotation})`">
          <path
            class="wind-indicator"
            :fill="windIndicatorFill"
            d="M0 -12 L9 7.5 L-9 7.5 Z"
          />
          <text
            v-if="windSpeedLabel"
            class="wind-indicator-text"
            x="0"
            y="1"
            text-anchor="middle"
            :fill="windIndicatorTextFill"
            :transform="`rotate(${-windIndicator.rotation})`"
          >
            {{ windSpeedLabel }}
          </text>
        </g>
      </g>

      <text
        v-if="!showGeometry"
        class="placeholder"
        :x="CENTER"
        :y="CENTER"
      >
        {{ placeholderMessage }}
      </text>
    </svg>

    <div class="corner corner-top-left">
      <span class="label">Rode</span>
      <span class="value">{{ rodeDisplay }}</span>
    </div>
    <div class="corner corner-top-right">
      <span class="label">Range</span>
      <span class="value">{{ criticalRangeDisplay }}</span>
    </div>
    <div class="corner corner-bottom-left">
      <span class="label">Depth</span>
      <span class="value">{{ depthDisplay }}</span>
    </div>
    <div class="corner corner-bottom-right">
      <span class="label">AWS</span>
      <span class="value">{{ awsDisplay }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  useStateDataStore,
  calculateDistanceMeters,
} from "@/stores/stateDataStore";
import { usePreferencesStore } from "@/stores/preferences";

const VIEWBOX_SIZE = 300;
const CENTER = VIEWBOX_SIZE / 2;
const CRITICAL_DIAMETER_RATIO = 0.8;
const CRITICAL_RADIUS = (VIEWBOX_SIZE * CRITICAL_DIAMETER_RATIO) / 2;

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);
const preferencesStore = usePreferencesStore();
const anchorState = computed(() => state.value.anchor || {});
const navigationState = computed(() => state.value.navigation || {});
const alertState = computed(() => state.value.alerts?.active || []);

const isDarkMode = computed(() => preferencesStore.darkMode === true);
let stopStateLogging = null;

// Wind indicator animation state
const currentWindX = ref(CENTER);
const currentWindY = ref(CENTER - CRITICAL_RADIUS);
const currentWindRotation = ref(180);
let windAnimationFrame = null;
let isWindInitialLoad = true;

// onMounted(() => {
//   clockTimer = window.setInterval(() => {
//     now.value = Date.now();
//   }, 50000);

//   stopStateLogging = watch(
//     state,
//     (latest) => {
//       console.log("[AnchorWidget] Full state snapshot:", latest);
//     },
//     { deep: true, immediate: true }
//   );
// });

onUnmounted(() => {
  if (stopStateLogging) {
    stopStateLogging();
    stopStateLogging = null;
  }
});

function toNumber(source) {
  if (source == null) return null;
  if (typeof source === "number") return Number.isFinite(source) ? source : null;
  if (typeof source === "string") {
    const parsed = Number(source);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof source === "object") {
    if (typeof source.value === "number") {
      return Number.isFinite(source.value) ? source.value : null;
    }
    if (typeof source.value === "string") {
      const parsed = Number(source.value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof source.latitude === "number" || typeof source.longitude === "number") {
      return null; // handled by caller
    }
    if (typeof source.latitude === "string" || typeof source.longitude === "string") {
      return null;
    }
  }
  return null;
}

function extractPosition(source) {
  if (!source) return null;
  return source.position ?? source;
}

function normalizeCoordinates(positionLike) {
  const position = extractPosition(positionLike);
  if (!position) return null;
  const lat = toNumber(position.latitude ?? position.lat);
  const lon = toNumber(position.longitude ?? position.lon);
  if (lat == null || lon == null) return null;
  return { lat, lon };
}

const anchorCoordinates = computed(() =>
  normalizeCoordinates(anchorState.value?.anchorLocation)
);

const boatCoordinates = computed(() =>
  normalizeCoordinates(navigationState.value?.position)
);

const criticalRangeMeters = computed(() => {
  const raw = anchorState.value?.criticalRange?.r;
  if (raw == null || !Number.isFinite(raw)) return null;
  
  // Check if we're using metric or imperial units
  const units = anchorState.value?.criticalRange?.units || anchorState.value?.rode?.units || "m";
  const isMetric = !units.toLowerCase().startsWith("ft");
  
  // Convert to meters if in feet (matching AnchorView line 1179)
  return isMetric ? raw : raw / 3.28084;
});

const scale = computed(() => {
  const range = criticalRangeMeters.value;
  if (!range || range <= 0) return 1;
  return CRITICAL_RADIUS / range;
});

function metersPerDegree(lat) {
  const latRad = (lat * Math.PI) / 180;
  const metersPerLat =
    111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
  const metersPerLon = 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);
  return { metersPerLat, metersPerLon };
}

const boatPoint = computed(() => {
  const boat = boatCoordinates.value;
  const anchor = anchorCoordinates.value;
  
  if (!boat || !anchor) return null;
  
  // Calculate actual distance in meters between boat and anchor
  const distanceMeters = calculateDistanceMeters(
    anchor.lat,
    anchor.lon,
    boat.lat,
    boat.lon,
    true
  );
  
  if (distanceMeters == null || !Number.isFinite(distanceMeters)) return null;
  
  // Calculate bearing from anchor to boat
  const { metersPerLat, metersPerLon } = metersPerDegree(anchor.lat);
  const dyMeters = (boat.lat - anchor.lat) * metersPerLat;
  const dxMeters = (boat.lon - anchor.lon) * metersPerLon;
  const bearingRad = Math.atan2(dxMeters, dyMeters);
  
  // Scale distance to pixels
  const currentScale = scale.value;
  const distancePx = distanceMeters * currentScale;
  
  // Position boat relative to center (anchor position)
  return {
    x: CENTER + Math.sin(bearingRad) * distancePx,
    y: CENTER - Math.cos(bearingRad) * distancePx,
  };
});
const aisPoints = computed(() => {
  const targets = state.value.aisTargets || {};
  const anchor = anchorCoordinates.value;
  const range = criticalRangeMeters.value;
  if (!anchor || !range || range <= 0) return [];

  const currentScale = CRITICAL_RADIUS / range;

  return Object.entries(targets)
    .map(([id, target]) => {
      const coords = normalizeCoordinates(target?.position);
      if (!coords) return null;

      const distance = calculateDistanceMeters(
        anchor.lat,
        anchor.lon,
        coords.lat,
        coords.lon,
        true
      );
      if (distance == null || !Number.isFinite(distance)) return null;

      // Calculate bearing from anchor to AIS target
      const { metersPerLat, metersPerLon } = metersPerDegree(anchor.lat);
      const dyMeters = (coords.lat - anchor.lat) * metersPerLat;
      const dxMeters = (coords.lon - anchor.lon) * metersPerLon;
      const bearingRad = Math.atan2(dxMeters, dyMeters);

      // Scale distance to pixels
      const distancePx = distance * currentScale;

      return {
        id,
        x: CENTER + Math.sin(bearingRad) * distancePx,
        y: CENTER - Math.cos(bearingRad) * distancePx,
        opacity: 0.75,
        class: hasAisAlert.value ? "ais-point-alert" : "ais-point",
      };
    })
    .filter(Boolean);
});

const breadcrumbPoints = computed(() => {
  const history = anchorState.value?.history || [];
  const anchor = anchorCoordinates.value;
  const range = criticalRangeMeters.value;
  
  if (!anchor || !history.length || !range || range <= 0) return [];

  const currentScale = CRITICAL_RADIUS / range;

  const validCrumbs = history
    .filter((crumb) => {
      if (!crumb) return false;
      
      let lat, lon;
      if (crumb.position) {
        lat = crumb.position.latitude?.value ?? crumb.position.latitude;
        lon = crumb.position.longitude?.value ?? crumb.position.longitude;
      } else {
        lat = crumb.latitude?.value ?? crumb.latitude;
        lon = crumb.longitude?.value ?? crumb.longitude;
      }
      
      return typeof lat === "number" && typeof lon === "number";
    })
    .map((crumb, idx, array) => {
      let lat, lon;
      if (crumb.position) {
        lat = crumb.position.latitude?.value ?? crumb.position.latitude;
        lon = crumb.position.longitude?.value ?? crumb.position.longitude;
      } else {
        lat = crumb.latitude?.value ?? crumb.latitude;
        lon = crumb.longitude?.value ?? crumb.longitude;
      }
      
      // Calculate distance from anchor location
      const distanceMeters = calculateDistanceMeters(
        anchor.lat,
        anchor.lon,
        lat,
        lon,
        true
      );
      
      if (distanceMeters == null || !Number.isFinite(distanceMeters)) return null;
      
      // Calculate bearing from anchor to breadcrumb
      const { metersPerLat, metersPerLon } = metersPerDegree(anchor.lat);
      const dyMeters = (lat - anchor.lat) * metersPerLat;
      const dxMeters = (lon - anchor.lon) * metersPerLon;
      const bearingRad = Math.atan2(dxMeters, dyMeters);
      
      // Scale distance to pixels
      const distancePx = distanceMeters * currentScale;
      
      // Calculate position
      const x = CENTER + Math.sin(bearingRad) * distancePx;
      const y = CENTER - Math.cos(bearingRad) * distancePx;
      
      // Calculate opacity based on position in array (matching AnchorView)
      const age = array.length > 1 ? idx / (array.length - 1) : 0;
      const opacity = 1.0 - (age * 0.7); // Fade from 1.0 to 0.3
      
      // Dynamic color based on dark mode with age-based opacity (matching AnchorView line 1663)
      const isDark = preferencesStore.darkMode;
      const fillColor = isDark 
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(0, 0, 0, ${opacity})`;
      const strokeColor = isDark
        ? `rgba(200, 200, 200, ${opacity})`
        : `rgba(51, 51, 51, ${opacity})`;
      const strokeWidth = isDark ? 0.75 : 1;
      
      return { 
        x, 
        y, 
        radius: 0.5,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth
      };
    })
    .filter(Boolean);

  return validCrumbs;
});

const showGeometry = computed(() => {
  const anchor = anchorCoordinates.value;
  return !!anchor;
});

const placeholderMessage = computed(() =>
  anchorState.value?.anchorDeployed ? "No position" : "Anchor not deployed"
);

function formatMeasurement(value, units, options = {}) {
  if (value == null || !Number.isFinite(value)) return "--";
  const { decimals = 1 } = options;
  const fixed = value.toFixed(decimals);
  return units ? `${fixed} ${units}` : fixed;
}

function normalizeUnits(units, fallback = "m") {
  if (!units || typeof units !== "string") return fallback;
  const trimmed = units.trim();
  if (!trimmed) return fallback;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("ft") || lower.includes("foot") || lower.includes("feet")) {
    return "ft";
  }
  if (lower.startsWith("m")) {
    return "m";
  }
  return trimmed;
}

const rodeDisplay = computed(() => {
  const amount = anchorState.value?.rode?.amount ?? anchorState.value?.rode?.value;
  const rawUnits = anchorState.value?.rode?.units ?? anchorState.value?.rode?.unit;
  const units = normalizeUnits(rawUnits, "m");
  if (amount == null || !Number.isFinite(amount)) return "--";
  const decimals = amount >= 100 ? 0 : 1;
  return formatMeasurement(amount, units, { decimals });
});

const criticalRangeDisplay = computed(() => {
  const raw = toNumber(
    anchorState.value?.criticalRange?.r ?? anchorState.value?.criticalRange?.value
  );
  const rawUnits =
    anchorState.value?.criticalRange?.units ??
    anchorState.value?.criticalRange?.unit ??
    anchorState.value?.rode?.units ??
    anchorState.value?.rode?.unit;
  const units = normalizeUnits(rawUnits, "m");
  if (raw == null || !Number.isFinite(raw)) return "--";
  const decimals = raw >= 100 ? 0 : 1;
  return formatMeasurement(raw, units, { decimals });
});

const depthDisplay = computed(() => {
  const datum = navigationState.value?.depth?.belowTransducer;
  const value = datum?.value;
  const units = normalizeUnits(datum?.units, "m");
  if (value == null || !Number.isFinite(value)) return "--";
  const decimals = value >= 100 ? 0 : 1;
  return formatMeasurement(value, units, { decimals });
});

const awsDisplay = computed(() => {
  const datum = navigationState.value?.wind?.apparent?.speed;
  const value = datum?.value;
  const units = normalizeUnits(datum?.units, "kn");
  if (value == null || !Number.isFinite(value)) return "--";
  const decimals = value >= 100 ? 0 : 1;
  return formatMeasurement(value, units, { decimals });
});

const hasCriticalRangeAlert = computed(() => {
  const alerts = alertState.value;
  if (!Array.isArray(alerts)) return false;
  return alerts.some(
    (alert) => alert?.trigger === "critical_range" && alert?.status !== "resolved"
  );
});

const hasAisAlert = computed(() => {
  const alerts = alertState.value;
  if (!Array.isArray(alerts)) return false;
  return alerts.some(
    (alert) => alert?.trigger === "ais_proximity" && alert?.status !== "resolved"
  );
});

const criticalRadiusPx = computed(() => CRITICAL_RADIUS);

const windFromDegrees = computed(() => {
  const windDirection = navigationState.value?.wind?.true?.direction;
  const raw = windDirection?.degrees ?? windDirection?.value ?? windDirection;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
});

const windSpeedValue = computed(() => {
  const apparent = navigationState.value?.wind?.apparent?.speed;
  const trueWind = navigationState.value?.wind?.true?.speed;
  const raw = apparent?.value ?? apparent ?? trueWind?.value ?? trueWind;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
});

const windSpeedLabel = computed(() => {
  const value = windSpeedValue.value;
  return value == null ? null : String(Math.round(value));
});

const windIndicatorFill = computed(() => (isDarkMode.value ? "#FFFFFF" : "#007BFF"));
const windIndicatorTextFill = computed(() => (isDarkMode.value ? "#000000" : "#FFFFFF"));

// Calculate target wind position from direction
const targetWindIndicator = computed(() => {
  const degrees = windFromDegrees.value;
  const radius = criticalRadiusPx.value;
  if (degrees == null) return null;
  if (typeof radius !== "number" || !Number.isFinite(radius) || radius <= 0) return null;

  const rad = (degrees * Math.PI) / 180;
  const x = CENTER + Math.sin(rad) * radius;
  const y = CENTER - Math.cos(rad) * radius;
  const rotation = degrees + 180;
  return { x, y, rotation };
});

// Animated wind indicator using refs
const windIndicator = computed(() => {
  if (targetWindIndicator.value == null) return null;
  return {
    x: currentWindX.value,
    y: currentWindY.value,
    rotation: currentWindRotation.value,
  };
});

// Watch for wind direction changes and animate
watch(targetWindIndicator, (target) => {
  if (!target) return;
  
  // On initial load, set position directly without animation
  if (isWindInitialLoad) {
    currentWindX.value = target.x;
    currentWindY.value = target.y;
    currentWindRotation.value = target.rotation;
    isWindInitialLoad = false;
    return;
  }
  
  // Cancel any existing animation
  if (windAnimationFrame) {
    cancelAnimationFrame(windAnimationFrame);
  }
  
  const startX = currentWindX.value;
  const startY = currentWindY.value;
  const startRotation = currentWindRotation.value;
  const targetX = target.x;
  const targetY = target.y;
  const targetRotation = target.rotation;
  
  // Calculate shortest rotation path
  let rotDiff = targetRotation - startRotation;
  while (rotDiff > 180) rotDiff -= 360;
  while (rotDiff < -180) rotDiff += 360;
  const finalTargetRotation = startRotation + rotDiff;
  
  const startTime = performance.now();
  const duration = 500; // ms
  
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-in-out easing
    const easeProgress = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    // Interpolate position
    currentWindX.value = startX + (targetX - startX) * easeProgress;
    currentWindY.value = startY + (targetY - startY) * easeProgress;
    
    // Interpolate rotation
    currentWindRotation.value = startRotation + (finalTargetRotation - startRotation) * easeProgress;
    
    if (progress < 1) {
      windAnimationFrame = requestAnimationFrame(step);
    } else {
      windAnimationFrame = null;
    }
  }
  
  windAnimationFrame = requestAnimationFrame(step);
}, { immediate: true });

const criticalRangeClass = computed(() => {
  return hasCriticalRangeAlert.value ? "critical-range-alert" : "critical-range";
});

</script>

<style scoped>
.anchor-widget {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: var(--widget-surface-color);
  border-radius: 16px;
  overflow: hidden;
  color: var(--widget-text-color);
  font-family: "Inter", "Segoe UI", sans-serif;
}

.anchor-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.canvas-background {
  fill: var(--widget-surface-color);
}

.critical-range {
  fill: rgba(76, 175, 80, 0.15);
  stroke: rgba(76, 175, 80, 0.85);
  stroke-width: 2;
}

.critical-range-alert {
  fill: rgba(239, 68, 68, 0.15);
  stroke: rgba(239, 68, 68, 0.9);
  animation: pulse-stroke 1s ease-in-out infinite;
}

@keyframes pulse-stroke {
  0%, 100% {
    stroke-width: 2;
  }
  50% {
    stroke-width: 4;
  }
}

.ais-point {
  fill: #4caf50;
  stroke: rgba(255, 255, 255, 0.6);
  stroke-width: 1;
}

.ais-point-alert {
  fill: #ef4444;
  stroke: rgba(255, 255, 255, 0.8);
  stroke-width: 2;
  animation: pulse-ais 1s ease-in-out infinite;
}

@keyframes pulse-ais {
  0%, 100% {
    r: 4;
    opacity: 0.75;
  }
  50% {
    r: 5;
    opacity: 1;
  }
}

.rode-line {
  stroke: var(--widget-text-color);
  stroke-width: 2;
  stroke-dasharray: 6 4;
}


.anchor-drop-location-point {
  fill: rgba(67, 160, 71, 0.5);
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 2;
}

.anchor-location-point {
  fill: #ffc107;
  stroke: #ffffff;
  stroke-width: 2;
}

.boat-point {
  fill: #ef4444;
  stroke: #111827;
  stroke-width: 2;
}

.wind-indicator-text {
  font-size: 11px;
  font-weight: 700;
  dominant-baseline: middle;
}

.placeholder {
  fill: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  font-weight: 500;
  text-anchor: middle;
  dominant-baseline: middle;
}

.corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  letter-spacing: 0.3px;
}

.corner .label {
  text-transform: uppercase;
  color: var(--widget-muted-text-color);
  font-weight: 600;
}

.corner .value {
  font-size: 16px;
  font-weight: 600;
  color: var(--widget-text-color);
}

.corner-top-left {
  top: 12px;
  left: 12px;
  align-items: flex-start;
}

.corner-top-right {
  top: 12px;
  right: 12px;
  align-items: flex-end;
}

.corner-bottom-left {
  bottom: 12px;
  left: 12px;
  align-items: flex-start;
}

.corner-bottom-right {
  bottom: 12px;
  right: 12px;
  align-items: flex-end;
}
</style>
