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
        class="critical-range"
        :cx="CENTER"
        :cy="CENTER"
        :r="criticalRadiusPx"
        v-if="showGeometry"
      />

      <line
        v-if="showGeometry && boatPoint && anchorPoint"
        class="rode-line"
        :x1="anchorPoint.x"
        :y1="anchorPoint.y"
        :x2="boatPoint.x"
        :y2="boatPoint.y"
      />

      <circle
        v-if="showGeometry && anchorPoint"
        class="anchor-point"
        :cx="anchorPoint.x"
        :cy="anchorPoint.y"
        r="6"
      />

      <g v-if="showGeometry">
        <circle
          v-for="(crumb, index) in breadcrumbPoints"
          :key="`crumb-${index}`"
          class="breadcrumb-point"
          :cx="crumb.x"
          :cy="crumb.y"
          :r="crumb.radius"
          :opacity="crumb.opacity"
        />
      </g>

      <g v-if="showGeometry">
        <circle
          v-for="target in aisPoints"
          :key="target.id"
          class="ais-point"
          :cx="target.x"
          :cy="target.y"
          r="4"
          :opacity="target.opacity"
        />
      </g>

      <circle
        class="drop-point"
        :cx="CENTER"
        :cy="CENTER"
        r="6"
      />

      <circle
        v-if="showGeometry && boatPoint"
        class="boat-point"
        :cx="boatPoint.x"
        :cy="boatPoint.y"
        r="8"
      />

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

const VIEWBOX_SIZE = 300;
const CENTER = VIEWBOX_SIZE / 2;
const CRITICAL_DIAMETER_RATIO = 0.8;
const CRITICAL_RADIUS = (VIEWBOX_SIZE * CRITICAL_DIAMETER_RATIO) / 2;
const METERS_TO_FEET = 3.28084;
const BREADCRUMB_MAX_POINTS = 40;
const BREADCRUMB_MAX_AGE = 1000 * 60 * 30; // 30 minutes
const BREADCRUMB_MIN_OPACITY = 0.15;
const AIS_MAX_DISTANCE_FACTOR = 1.5; // allow AIS markers just outside of range

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);
const anchorState = computed(() => state.value.anchor || {});
const navigationState = computed(() => state.value.navigation || {});
const breadcrumbsRef = stateStore.breadcrumbs;
const now = ref(Date.now());
let stopStateLogging = null;
const initialHeadingOffset = ref(null);

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

const dropCoordinates = computed(() =>
  normalizeCoordinates(anchorState.value?.anchorDropLocation)
);

const anchorCoordinates = computed(() =>
  normalizeCoordinates(anchorState.value?.anchorLocation)
);

const boatCoordinates = computed(() =>
  normalizeCoordinates(navigationState.value?.position)
);

const rodeMeters = computed(() => {
  const raw = anchorState.value?.rode?.amount ?? anchorState.value?.rode?.value;
  if (raw == null || !Number.isFinite(raw)) return null;
  const units = normalizeUnits(
    anchorState.value?.rode?.units ?? anchorState.value?.rode?.unit,
    "m"
  );
  if (units === "ft") {
    return raw / METERS_TO_FEET;
  }
  return raw;
});

const distanceFromDropMeters = computed(() => {
  const drop = dropCoordinates.value;
  const boat = boatCoordinates.value;
  if (!drop || !boat) return null;
  const distance = calculateDistanceMeters(
    drop.lat,
    drop.lon,
    boat.lat,
    boat.lon,
    true
  );
  return Number.isFinite(distance) ? distance : null;
});

const displayDistanceMeters = computed(() => {
  if (rodeMeters.value != null && Number.isFinite(rodeMeters.value)) {
    return rodeMeters.value;
  }
  return distanceFromDropMeters.value;
});

const boatDistanceRatio = computed(() => {
  const distance = displayDistanceMeters.value;
  const range = criticalRangeMeters.value;
  if (distance == null || range == null || range <= 0) return null;
  const ratio = distance / range;
  if (!Number.isFinite(ratio)) return null;
  return Math.min(ratio, AIS_MAX_DISTANCE_FACTOR);
});

const rawBoatAngleRadians = computed(() => {
  const drop = dropCoordinates.value;
  if (!drop) return null;

  const bearingRad = extractBearingRadians(
    anchorState.value?.anchorDropLocation?.bearing
  );
  if (bearingRad != null) return bearingRad;

  const reference = boatCoordinates.value || anchorCoordinates.value;
  const coordsAngle = computeAngleFromCoords(reference);
  if (coordsAngle != null) return coordsAngle;

  return null;
});

const boatDirectionRadians = computed(() => {
  const angle = rawBoatAngleRadians.value;
  return getAdjustedAngle(angle ?? 0);
});

const criticalRangeMeters = computed(() => {
  const raw = anchorState.value?.criticalRange?.r ?? anchorState.value?.criticalRange?.value;
  if (raw == null || !Number.isFinite(raw)) return null;
  const units = anchorState.value?.criticalRange?.units || "m";
  if (units.toLowerCase().startsWith("ft")) {
    return raw / METERS_TO_FEET;
  }
  return raw;
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

function normalizeAngle(angle) {
  if (!Number.isFinite(angle)) return 0;
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function extractBearingRadians(bearingSource) {
  if (bearingSource == null) return null;
  if (typeof bearingSource === "number" && Number.isFinite(bearingSource)) {
    return (bearingSource * Math.PI) / 180;
  }
  if (
    typeof bearingSource === "object" &&
    typeof bearingSource.degrees === "number" &&
    Number.isFinite(bearingSource.degrees)
  ) {
    return (bearingSource.degrees * Math.PI) / 180;
  }
  if (
    typeof bearingSource === "object" &&
    typeof bearingSource.value === "number" &&
    Number.isFinite(bearingSource.value)
  ) {
    return (bearingSource.value * Math.PI) / 180;
  }
  return null;
}

function computeAngleFromCoords(coords) {
  const drop = dropCoordinates.value;
  if (!drop || !coords) return null;
  const { metersPerLat, metersPerLon } = metersPerDegree(drop.lat);
  const dy = (coords.lat - drop.lat) * metersPerLat;
  const dx = (coords.lon - drop.lon) * metersPerLon;
  if (dx === 0 && dy === 0) return null;
  return Math.atan2(dx, dy);
}

function getAdjustedAngle(rawAngle) {
  const base = rawAngle == null ? 0 : rawAngle;
  const offset = initialHeadingOffset.value ?? 0;
  return normalizeAngle(base + offset);
}

function projectPoint(target) {
  const drop = dropCoordinates.value;
  if (!drop) return null;
  const coords = normalizeCoordinates(target);
  if (!coords) return null;

  const { metersPerLat, metersPerLon } = metersPerDegree(drop.lat);
  const dyMeters = (coords.lat - drop.lat) * metersPerLat;
  const dxMeters = (coords.lon - drop.lon) * metersPerLon;

  const currentScale = scale.value;
  const x = CENTER + dxMeters * currentScale;
  const y = CENTER - dyMeters * currentScale;

  const offsetX = x - CENTER;
  const offsetY = y - CENTER;
  const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

  const maxDistance = CRITICAL_RADIUS * AIS_MAX_DISTANCE_FACTOR;
  if (distance > maxDistance) {
    const clampFactor = maxDistance / distance;
    return {
      x: CENTER + offsetX * clampFactor,
      y: CENTER + offsetY * clampFactor,
    };
  }

  const offset = initialHeadingOffset.value;
  if (!offset || distance === 0) {
    return { x, y };
  }

  const rawAngle = Math.atan2(offsetX, -offsetY);
  const adjusted = getAdjustedAngle(rawAngle);
  const rotatedOffsetX = Math.sin(adjusted) * distance;
  const rotatedOffsetY = -Math.cos(adjusted) * distance;

  return {
    x: CENTER + rotatedOffsetX,
    y: CENTER + rotatedOffsetY,
  };
}

const boatPoint = computed(() => {
  const coordinatePoint = projectPoint(boatCoordinates.value);
  if (coordinatePoint) {
    return coordinatePoint;
  }

  const ratio = boatDistanceRatio.value;
  if (ratio == null) return null;
  const angle = boatDirectionRadians.value;
  if (angle == null) return null;

  const distancePx = ratio * CRITICAL_RADIUS;
  return {
    x: CENTER + Math.sin(angle) * distancePx,
    y: CENTER - Math.cos(angle) * distancePx,
  };
});
const anchorPoint = computed(() => {
  const source = anchorCoordinates.value || dropCoordinates.value;
  if (!source) return null;
  return projectPoint(source);
});

const aisPoints = computed(() => {
  const targets = state.value.aisTargets || {};
  const drop = dropCoordinates.value;
  const range = criticalRangeMeters.value;
  if (!drop || !range || range <= 0) return [];

  return Object.entries(targets)
    .map(([id, target]) => {
      const coords = normalizeCoordinates(target?.position);
      if (!coords) return null;

      const distance = calculateDistanceMeters(
        drop.lat,
        drop.lon,
        coords.lat,
        coords.lon,
        true
      );
      if (distance == null || !Number.isFinite(distance)) return null;

      const ratio = Math.min(distance / range, AIS_MAX_DISTANCE_FACTOR);
      if (!Number.isFinite(ratio)) return null;

      const rawAngle = computeAngleFromCoords(coords) ?? 0;
      const angle = getAdjustedAngle(rawAngle);

      const distancePx = ratio * CRITICAL_RADIUS;

      return {
        id,
        x: CENTER + Math.sin(angle) * distancePx,
        y: CENTER - Math.cos(angle) * distancePx,
        opacity: 0.75,
      };
    })
    .filter(Boolean);
});

watch(
  [
    () => anchorState.value?.anchorDeployed,
    () => dropCoordinates.value,
    rawBoatAngleRadians,
  ],
  ([deployed, drop, angle]) => {
    if (!deployed || !drop) {
      initialHeadingOffset.value = null;
      return;
    }

    if (initialHeadingOffset.value == null && angle != null) {
      initialHeadingOffset.value = normalizeAngle(Math.PI - angle);
    }
  },
  { immediate: true }
);

const breadcrumbPoints = computed(() => {
  const crumbs = breadcrumbsRef?.value || [];
  const drop = dropCoordinates.value;
  if (!drop || !crumbs.length) return [];

  const latest = crumbs
    .slice(-BREADCRUMB_MAX_POINTS)
    .map((entry) => {
      const projected = projectPoint(entry);
      if (!projected) return null;
      const age = now.value - (entry.time || 0);
      const ratio = Math.min(Math.max(age / BREADCRUMB_MAX_AGE, 0), 1);
      const opacity = Math.max(1 - ratio, BREADCRUMB_MIN_OPACITY);
      const radius = 2 + (1 - ratio) * 2;
      return { ...projected, opacity, radius };
    })
    .filter(Boolean);

  return latest;
});

const showGeometry = computed(() => {
  const drop = dropCoordinates.value;
  return !!drop;
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

const criticalRadiusPx = CRITICAL_RADIUS;

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
  fill: rgba(0, 150, 255, 0.08);
  stroke: rgba(0, 150, 255, 0.65);
  stroke-width: 2;
}

.rode-line {
  stroke: var(--widget-text-color);
  stroke-width: 2;
  stroke-dasharray: 6 4;
}

.drop-point {
  fill: #ffcc00;
  stroke: #ffffff;
  stroke-width: 2;
}

.anchor-point {
  fill: rgba(255, 255, 255, 0.85);
  stroke: #00d1ff;
  stroke-width: 2;
}

.boat-point {
  fill: #00ffa3;
  stroke: #003d26;
  stroke-width: 2;
}

.ais-point {
  fill: #ff5555;
  stroke: rgba(255, 255, 255, 0.6);
  stroke-width: 1;
}

.breadcrumb-point {
  fill: rgba(255, 255, 255, 0.9);
  stroke: none;
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
