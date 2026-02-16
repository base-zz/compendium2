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
          <span class="fence-name">{{ row.name }}</span>
        </div>

        <div class="fence-row-right">
          <span class="fence-current-distance">{{ row.currentDistanceDisplay }}</span>
          <span class="fence-alert-distance">Alert {{ row.alertDistanceDisplay }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useStateDataStore, calculateDistanceMeters } from "@/stores/stateDataStore";

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

const anchorState = computed(() => state.value?.anchor);
const navigationState = computed(() => state.value?.navigation);
const aisTargets = computed(() => state.value?.aisTargets);

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
          : null;

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
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.6rem;
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
  font-size: 1.16rem;
  font-weight: 800;
  color: var(--widget-text-color);
  letter-spacing: 0.01em;
}

.fence-alert-distance {
  font-size: 0.72rem;
  color: var(--widget-muted-text-color);
}
</style>
