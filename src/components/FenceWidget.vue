<template>
  <div class="fence-widget" :key="renderKey">
    <div class="fence-header">
      <span class="fence-title">Fences</span>
      <span class="fence-count">{{ fenceRows.length }}</span>
    </div>

    <div v-if="fenceRows.length === 0" class="fence-empty">No fences configured</div>

    <div v-else class="fence-list" role="list" aria-label="Fence status list">
      <div v-for="row in fenceRows" :key="row.id" class="fence-row" role="listitem">
        <div class="fence-row-left">
          <span class="fence-status-inline" :class="row.statusClass">{{ row.statusLabel }}</span>
          <span class="fence-reference-icon" :title="row.referenceLabel" aria-hidden="true">{{ row.referenceIcon }}</span>
          <div class="fence-name-block">
            <span class="fence-name">{{ row.name }}</span>
            <span class="fence-alert-inline">Alert {{ row.alertDistanceDisplay }}</span>
          </div>
        </div>

        <div class="fence-row-right">
          <span class="fence-current-distance">{{ row.currentDistanceDisplay }}</span>
          <span class="fence-min-distance">{{ row.minimumSummary }}</span>
        </div>

        <svg
          v-if="row.sparklineBars && row.sparklineBars.length"
          class="fence-sparkline"
          viewBox="0 0 88 15"
          preserveAspectRatio="none"
          role="img"
          :aria-label="`${row.name} distance trend`"
        >
          <rect
            v-for="bar in row.sparklineBars"
            :key="bar.index"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            :fill-opacity="bar.opacity"
            class="fence-sparkline-bar"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useStateDataStore, calculateDistanceMeters } from "@/stores/stateDataStore";

const stateStore = useStateDataStore();

// Use direct store access for reactivity (like AnchorInfoGrid)
const anchorState = computed(() => stateStore.state?.anchor);
const navigationState = computed(() => stateStore.state?.navigation);
const aisTargets = computed(() => stateStore.state?.aisTargets);

// Force update trigger
const renderKey = ref(0);
watch(() => stateStore.state?.navigation?.position, () => {
  renderKey.value++;
});

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  if (value && typeof value === "object") {
    if (typeof value.value === "number" && Number.isFinite(value.value)) {
      return value.value;
    }
    if (typeof value.value === "string") {
      const parsed = Number(value.value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function buildSparklineData(history, currentValue) {
  if (!Array.isArray(history)) {
    return { points: "", area: "" };
  }

  const samples = history
    .filter((entry) => entry && typeof entry.v === "number" && Number.isFinite(entry.v))
    .slice(-40);

  if (samples.length === 1) {
    return { points: "0,7.5 88,7.5", area: "M0,15 L0,7.5 L88,7.5 L88,15 Z" };
  }

  if (samples.length < 2) {
    return { points: "", area: "" };
  }

  const width = 88;
  const height = 15;
  const padding = 2;
  const values = samples.map((entry) => entry.v);
  
  // Include current value in min/max calculation to prevent truncation
  if (typeof currentValue === 'number' && Number.isFinite(currentValue)) {
    values.push(currentValue);
  }
  
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return { bars: [] };
  }

  // Calculate bar dimensions
  const maxBars = 24; // Limit number of bars for clarity
  const barCount = Math.min(samples.length, maxBars);
  const gap = 1;
  const barWidth = (width - (gap * (barCount - 1))) / barCount;
  
  const bars = samples.slice(-maxBars).map((entry, index) => {
    const value = entry.v;
    const normalizedY = range > 0 ? (value - minValue) / range : 0.5;
    const barHeight = Math.max(2, normalizedY * (height - padding * 2));
    const x = index * (barWidth + gap);
    const y = height - padding - barHeight;
    
    // Higher opacity for more recent bars (right side)
    const opacity = 0.3 + (0.7 * (index / (barCount - 1 || 1)));
    
    return {
      index,
      x: x.toFixed(2),
      y: y.toFixed(2),
      width: barWidth.toFixed(2),
      height: barHeight.toFixed(2),
      opacity: opacity.toFixed(2),
    };
  });

  return { bars };
}

function normalizeCoordinates(source) {
  if (!source) {
    return null;
  }

  const raw = source.position && typeof source.position === "object" ? source.position : source;
  const latitude = toFiniteNumber(raw.latitude ?? raw.lat);
  const longitude = toFiniteNumber(raw.longitude ?? raw.lon);

  if (latitude == null || longitude == null) {
    return null;
  }

  return { latitude, longitude };
}

function formatDistance(value, units) {
  if (!Number.isFinite(value) || !units) {
    return "--";
  }
  const decimals = value >= 100 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units}`;
}

function formatTimeOfDay(timestamp) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return "";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getFenceTargetCoordinates(fence) {
  if (!fence || !fence.targetType || !fence.targetRef) {
    return null;
  }

  if (fence.targetType === "point") {
    return normalizeCoordinates({
      latitude: fence.targetRef.latitude,
      longitude: fence.targetRef.longitude,
    });
  }

  if (fence.targetType === "ais") {
    const mmsi = fence.targetRef.mmsi;
    if (mmsi == null) {
      return null;
    }

    const targets = aisTargets.value;
    if (!targets || typeof targets !== "object") {
      return null;
    }

    const rawTarget = targets[String(mmsi)];
    if (!rawTarget) {
      return null;
    }

    return normalizeCoordinates(rawTarget.position);
  }

  return null;
}

function getReferenceCoordinates(fence) {
  if (!fence || !fence.referenceType) {
    return null;
  }

  if (fence.referenceType === "boat") {
    return normalizeCoordinates(navigationState.value?.position);
  }

  if (fence.referenceType === "anchor_drop") {
    return normalizeCoordinates(anchorState.value?.anchorDropLocation);
  }

  return null;
}

const fenceRows = computed(() => {
  const fences = anchorState.value?.fences;
  if (!Array.isArray(fences)) {
    return [];
  }

  return fences
    .filter((fence) => fence && fence.enabled !== false)
    .map((fence) => {
      const units = typeof fence.units === "string" ? fence.units : null;
      const alertRange = toFiniteNumber(fence.alertRange);
      const targetCoordinates = getFenceTargetCoordinates(fence);
      const referenceCoordinates = getReferenceCoordinates(fence);

      const currentDistanceMeters =
        targetCoordinates && referenceCoordinates
          ? calculateDistanceMeters(
              referenceCoordinates.latitude,
              referenceCoordinates.longitude,
              targetCoordinates.latitude,
              targetCoordinates.longitude,
              true
            )
          : null;

      const currentDistance =
        Number.isFinite(currentDistanceMeters) && units
          ? units === "ft"
            ? currentDistanceMeters * 3.28084
            : currentDistanceMeters
          : Number.isFinite(fence.currentDistance)
            ? fence.currentDistance
            : null;

      const persistedMinimum = toFiniteNumber(fence.minimumDistance);
      const minimumDistance =
        Number.isFinite(persistedMinimum) && units
          ? persistedMinimum
          : Number.isFinite(currentDistance)
            ? currentDistance
            : null;
      const minimumTimeDisplay = formatTimeOfDay(toFiniteNumber(fence.minimumDistanceUpdatedAt));
      const minimumDistanceDisplay = formatDistance(minimumDistance, units);
      const minimumSummary = minimumTimeDisplay
        ? `Min ${minimumDistanceDisplay} at ${minimumTimeDisplay}`
        : `Min ${minimumDistanceDisplay}`;

      const serverHistory = Array.isArray(fence.distanceHistory) ? fence.distanceHistory : [];
      const sparklineHistory = serverHistory.length > 0
        ? serverHistory
        : Number.isFinite(currentDistance)
          ? [{ t: Date.now(), v: currentDistance }]
          : [];
      const sparklineData = buildSparklineData(sparklineHistory, currentDistance);

      const isAlert =
        Number.isFinite(alertRange) &&
        Number.isFinite(currentDistance) &&
        currentDistance <= alertRange;

      const statusLabel =
        Number.isFinite(currentDistance) && Number.isFinite(alertRange)
          ? isAlert
            ? "ALERT"
            : "OK"
          : "UNKNOWN";

      const statusClass =
        statusLabel === "ALERT"
          ? "status-alert"
          : statusLabel === "OK"
            ? "status-ok"
            : "status-unknown";

      return {
        id: fence.id,
        name: typeof fence.name === "string" && fence.name.trim() ? fence.name.trim() : "Fence",
        referenceIcon: fence.referenceType === "anchor_drop" ? "⚓" : "🚤",
        referenceLabel:
          fence.referenceType === "anchor_drop"
            ? "Reference: Anchor Drop"
            : fence.referenceType === "boat"
              ? "Reference: Boat"
              : "Reference: Unknown",
        alertDistanceDisplay: formatDistance(alertRange, units),
        currentDistanceDisplay: formatDistance(currentDistance, units),
        minimumDistanceDisplay,
        minimumSummary,
        sparklineBars: sparklineData.bars,
        statusLabel,
        statusClass,
        currentDistanceValue: Number.isFinite(currentDistance) ? currentDistance : Number.POSITIVE_INFINITY,
      };
    })
    .sort((a, b) => a.currentDistanceValue - b.currentDistanceValue);
});
</script>

<style scoped>
.fence-widget {
  width: 100%;
  height: 100%;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.8rem;
  box-sizing: border-box;
  border-radius: 14px;
  background: var(--widget-surface-color);
  color: var(--widget-text-color);
}

.fence-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fence-title {
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--widget-muted-text-color);
}

.fence-count {
  min-width: 1.5rem;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.5rem;
  border-radius: 999px;
  background: var(--widget-surface-elevated-color);
  color: var(--widget-text-color);
  padding: 0 0.45rem;
}

.fence-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  color: var(--widget-muted-text-color);
}

.fence-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: auto;
  min-height: 0;
  padding-right: 0.15rem;
}

.fence-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.3rem;
  padding: 0.35rem 0.3rem;
  border-radius: 10px;
  background: var(--widget-surface-elevated-color);
}

.fence-row-left {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  overflow: hidden;
}

.fence-name {
  font-size: 0.85rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap !important;
  writing-mode: horizontal-tb !important;
  text-orientation: mixed !important;
  flex-shrink: 1;
  min-width: 0;
  max-width: 100%;
}

.fence-name-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  overflow: hidden;
  flex: 1;
}

.fence-alert-inline {
  font-size: 0.72rem;
  color: var(--widget-muted-text-color);
}

.fence-status-inline {
  font-size: 0.7rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.2rem 0.4rem;
  letter-spacing: 0.04em;
  line-height: 1.1;
  flex-shrink: 0;
}

.status-ok {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.status-alert {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.status-unknown {
  background: rgba(148, 163, 184, 0.22);
  color: #cbd5e1;
}

.fence-reference-icon {
  width: 1.35rem;
  height: 1.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  font-size: 0.82rem;
  line-height: 1;
  flex-shrink: 0;
}

.fence-row-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.05;
}

.fence-current-distance {
  font-size: 1.34rem;
  font-weight: 800;
  color: var(--widget-text-color);
  letter-spacing: 0.01em;
}

.fence-min-distance {
  font-size: 0.72rem;
  color: var(--widget-muted-text-color);
}

.fence-sparkline {
  grid-column: 1 / -1;
  width: 100%;
  height: 15px;
  margin-top: 0.08rem;
  margin-bottom: 0.08rem;
  opacity: 0.92;
}

.fence-sparkline-bar {
  fill: var(--widget-accent-color, #3b82f6);
  stroke: none;
}
</style>
