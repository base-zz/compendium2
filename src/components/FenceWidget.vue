<template>
  <div class="fence-widget">
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
          v-if="row.sparklinePoints"
          class="fence-sparkline"
          viewBox="0 0 88 15"
          preserveAspectRatio="none"
          role="img"
          :aria-label="`${row.name} distance trend`"
        >
          <polyline class="fence-sparkline-line" :points="row.sparklinePoints" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useStateDataStore, calculateDistanceMeters } from "@/stores/stateDataStore";

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

const anchorState = computed(() => state.value?.anchor);
const navigationState = computed(() => state.value?.navigation);
const aisTargets = computed(() => state.value?.aisTargets);

const SPARKLINE_HISTORY_WINDOW_MS = 2 * 60 * 60 * 1000;
const SPARKLINE_MIN_INTERVAL_MS = 15 * 1000;
const localDistanceHistoryByFence = ref({});

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

function appendLocalDistanceHistory(fenceId, units, distanceValue, nowMs) {
  if (typeof fenceId !== "string" || !fenceId || typeof distanceValue !== "number" || !Number.isFinite(distanceValue)) {
    return;
  }

  const existingHistory = Array.isArray(localDistanceHistoryByFence.value[fenceId])
    ? localDistanceHistoryByFence.value[fenceId]
    : [];

  const cutoff = nowMs - SPARKLINE_HISTORY_WINDOW_MS;
  const prunedHistory = existingHistory.filter((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    return typeof entry.t === "number" && Number.isFinite(entry.t) && entry.t >= cutoff && typeof entry.v === "number" && Number.isFinite(entry.v);
  });

  const lastEntry = prunedHistory.length > 0 ? prunedHistory[prunedHistory.length - 1] : null;
  const minDelta = units === "ft" ? 1.5 : 0.5;
  const shouldAppend = !lastEntry
    || typeof lastEntry.t !== "number"
    || typeof lastEntry.v !== "number"
    || (nowMs - lastEntry.t) >= SPARKLINE_MIN_INTERVAL_MS
    || Math.abs(distanceValue - lastEntry.v) >= minDelta;

  if (!shouldAppend) {
    if (prunedHistory.length !== existingHistory.length) {
      localDistanceHistoryByFence.value[fenceId] = prunedHistory;
    }
    return;
  }

  localDistanceHistoryByFence.value[fenceId] = [...prunedHistory, { t: nowMs, v: distanceValue }];
}

function buildSparklineData(history) {
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
  const padding = 4;
  const values = samples.map((entry) => entry.v);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return { points: "", area: "" };
  }

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const normalizedY = range > 0 ? (value - minValue) / range : 0.5;
      const y = padding + (1 - normalizedY) * (height - padding * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const areaPath = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const normalizedY = range > 0 ? (value - minValue) / range : 0.5;
      const y = padding + (1 - normalizedY) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ") + ` L${width},${height} L0,${height} Z`;

  return { points, area: areaPath };
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

const liveFenceDistances = computed(() => {
  const fences = anchorState.value?.fences;
  if (!Array.isArray(fences)) {
    return [];
  }

  return fences
    .filter((fence) => fence && fence.enabled !== false)
    .map((fence) => {
      const units = typeof fence.units === "string" ? fence.units : null;
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
          : null;

      return {
        id: typeof fence.id === "string" ? fence.id : null,
        units,
        currentDistance,
      };
    });
});

watch(
  liveFenceDistances,
  (rows) => {
    const nowMs = Date.now();
    rows.forEach((row) => {
      if (row.id == null || row.units == null || !Number.isFinite(row.currentDistance)) {
        return;
      }
      appendLocalDistanceHistory(row.id, row.units, row.currentDistance, nowMs);
    });
  },
  { deep: true, immediate: true }
);

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

      const localHistory = typeof fence.id === "string" ? localDistanceHistoryByFence.value[fence.id] : null;
      const sparklineHistory =
        Array.isArray(localHistory) && localHistory.length > 0
          ? localHistory
          : Array.isArray(fence.distanceHistory) && fence.distanceHistory.length > 0
            ? fence.distanceHistory
          : Number.isFinite(currentDistance)
            ? [{ t: Date.now(), v: currentDistance }]
            : [];
      const sparklineData = buildSparklineData(sparklineHistory);

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
        sparklinePoints: sparklineData.points,
        sparklineArea: sparklineData.area,
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
  gap: 0.65rem;
  padding: 0.35rem 0.3rem;
  border-radius: 10px;
  background: var(--widget-surface-elevated-color);
}

.fence-row-left {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.fence-name {
  font-size: 0.9rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fence-name-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
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

.fence-sparkline-line {
  fill: none;
  stroke: var(--widget-accent-color, #3b82f6);
  stroke-width: 0.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fence-sparkline-area {
  opacity: 0.6;
}
</style>
