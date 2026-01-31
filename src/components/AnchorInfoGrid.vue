<template>
  <div class="anchor-grid-div">
    <div
      v-if="anchorState && !anchorState.anchorDeployed"
      class="info-rect-div drop-anchor-rect"
      @click="handleDropAnchor">
      <img
        src="/img/anchor2.svg"
        alt="Anchor Icon"
        class="drop-anchor-icon"
      />
      <span class="drop-anchor-label">Drop Anchor</span>
    </div>
    <h2 v-else class="title-div" :class="titleClass">
      {{ title }}
    </h2>
    <div class="grid-container">
      <div class="grid-row">
        <div class="info-rect-div">
          <div class="label-div larger">Rode</div>
          <div class="metric-div larger">{{ anchorState?.rode?.amount }}</div>
        </div>
        <div class="info-rect-div">
          <div class="label-div larger">Range</div>
          <div class="metric-div larger clickable" @click="showEditRadiusModal = true">{{ anchorState?.criticalRange?.r }}</div>
        </div>
        <div class="info-rect-div" @click="handleHeadingClick">
          <div class="label-div larger">Heading</div>
          <div class="metric-div larger">
            {{ anchorState && anchorState.anchorDeployed
              ? (anchorState?.anchorDropLocation?.bearing?.degrees == null ? '--' : `${anchorState.anchorDropLocation.bearing.degrees}°`)
              : (deviceHeadingDegrees == null ? '--' : `${deviceHeadingDegrees}°`)
            }}
          </div>
        </div>
      </div>
      <div class="grid-row">
        <div class="info-rect-div">
          <div class="label-div">Depth</div>
          <div class="metric-div">{{ stateStore.state.navigation?.depth?.belowTransducer?.value || '--' }}</div>
        </div>
        <div class="info-rect-div">
          <div class="label-div">Wind Speed</div>
          <div class="metric-div">{{ stateStore.state.navigation?.wind?.apparent?.speed?.value || '--' }}</div>
        </div>
        <div class="info-rect-div">
          <div class="label-div">Current Speed</div>
          <div class="metric-div">{{ stateStore.state.environment?.current?.speed?.value || '--' }}</div>
        </div>
      </div>
    </div>
    <!-- anchor-btn-row removed: no extra action buttons needed when anchor is deployed -->
    <ion-modal :is-open="showEditRadiusModal" @didDismiss="showEditRadiusModal = false">
      <div class="modal-content enhanced-modal">
        <h3>Edit Anchor Alarm Radius</h3>
        <div class="slider-label">
          <strong>Radius:</strong>
          <span class="slider-value">
            {{ formattedRadius }} {{ isMetric ? 'm' : 'ft' }}
          </span>
        </div>
        <ion-range
          v-model="editRadiusValue"
          :min="radiusMin"
          :max="radiusMax"
          :step="radiusStep"
          ticks="true"
          color="primary"
          class="modal-range modal-range-center"
          style="margin-bottom: 18px; width: 80%"
        />
        <div class="modal-actions">
          <ion-button color="primary" @click="confirmEditRadius">Confirm</ion-button>
          <ion-button @click="showEditRadiusModal = false">Cancel</ion-button>
        </div>
      </div>
    </ion-modal>
  </div>
</template>

<script setup>
import { ref, watch, computed, onUnmounted } from 'vue';
import { IonModal, IonButton, IonRange } from '@ionic/vue';
import { useStateDataStore } from '@/stores/stateDataStore.js';
import { storeToRefs } from 'pinia';
import { usePreferencesStore } from '@/stores/preferences';
import { UnitConversion } from '@/shared/unitConversion';
import { useDeviceHeading } from '@/composables/useDeviceHeading.js';

const emit = defineEmits(['anchor-dropped']);

// Note: validateCoordinates function removed as it's no longer used

const showEditRadiusModal = ref(false);
const editRadiusValue = ref(0);

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);
const anchorState = computed(() => state.value.anchor);

const { headingDegrees: deviceHeadingDegrees, start: startDeviceHeading } = useDeviceHeading();

const handleHeadingClick = async () => {
  if (!anchorState.value || anchorState.value.anchorDeployed) {
    return;
  }
  await startDeviceHeading();
};

const preferencesStore = usePreferencesStore();
const { preferences } = storeToRefs(preferencesStore);

const preferredLengthUnit = computed(() => {
  const unit = preferences.value?.units?.length;
  if (unit === 'm' || unit === 'ft') {
    return unit;
  }
  const current = anchorState.value?.criticalRange?.units;
  if (current === 'm' || current === 'ft') {
    return current;
  }
  return 'm';
});

const isMetric = computed(() => preferredLengthUnit.value === 'm');

const aisWarningEffective = computed(() => {
  const warningRange = anchorState.value?.warningRange;
  const warningRadius = warningRange?.r;
  if (warningRadius === 0) {
    return false;
  }
  return anchorState.value?.aisWarning === true;
});

function convertLengthToPreferred(value, units) {
  if (value == null) {
    return 0;
  }
  if (units === preferredLengthUnit.value) {
    return value;
  }
  if (units === 'm' && preferredLengthUnit.value === 'ft') {
    return UnitConversion.mToFt(value);
  }
  if (units === 'ft' && preferredLengthUnit.value === 'm') {
    return UnitConversion.ftToM(value);
  }
  return value;
}

function convertLengthFromPreferred(value, preferredUnits) {
  if (value == null) {
    return 0;
  }
  if (preferredUnits === 'm') {
    return value;
  }
  if (preferredUnits === 'ft') {
    return UnitConversion.ftToM(value);
  }
  return value;
}

watch(showEditRadiusModal, (val) => {
  if (val && anchorState.value?.criticalRange?.r) {
    const currentRadius = anchorState.value.criticalRange.r;
    const currentUnits = anchorState.value.criticalRange.units || 'm';
    editRadiusValue.value = convertLengthToPreferred(currentRadius, currentUnits);
  }
});

const formattedRadius = computed(() => Math.round(editRadiusValue.value));
const radiusStep = computed(() => (isMetric.value ? 1 : 5));
const radiusMin = computed(() => (isMetric.value ? 5 : 15));
const radiusMax = computed(() => (isMetric.value ? 150 : 500));

function confirmEditRadius() {
  if (anchorState.value && anchorState.value.criticalRange) {
    const preferredUnits = preferredLengthUnit.value;
    const baseValue = convertLengthFromPreferred(editRadiusValue.value, preferredUnits);
    anchorState.value.criticalRange.r = baseValue;
    anchorState.value.criticalRange.units = preferredUnits;
  }
  showEditRadiusModal.value = false;
}

// Alert cycling state
const currentAlertIndex = ref(0);
const alertCycleInterval = ref(null);

// Setup alert cycling when there are multiple alerts
watch(
  () => [anchorState.value?.dragging, aisWarningEffective.value],
  ([isDragging, hasAisWarning]) => {
    // Clear any existing interval
    if (alertCycleInterval.value) {
      clearInterval(alertCycleInterval.value);
      alertCycleInterval.value = null;
    }
    
    // If both alerts are active, start cycling
    if (isDragging && hasAisWarning) {
      currentAlertIndex.value = 0; // Start with dragging alert
      alertCycleInterval.value = setInterval(() => {
        // Toggle between 0 (dragging) and 1 (AIS warning)
        currentAlertIndex.value = currentAlertIndex.value === 0 ? 1 : 0;
      }, 3000); // Cycle every 3 seconds
    } else {
      // If only one or no alerts, reset to default
      currentAlertIndex.value = 0;
    }
  },
  { immediate: true }
);

// Clean up interval on component unmount
onUnmounted(() => {
  if (alertCycleInterval.value) {
    clearInterval(alertCycleInterval.value);
  }
});

const titleClass = computed(() => {
  if (!anchorState.value) return 'not-anchored-title';
  
  // If dragging is active and it's either the only alert or it's the current alert in the cycle
  if (anchorState.value.dragging && 
      (currentAlertIndex.value === 0 || !aisWarningEffective.value)) { 
    return 'dragging-title';
  }
  // If AIS warning is active and it's either the only alert or it's the current alert in the cycle
  else if (aisWarningEffective.value && 
           (currentAlertIndex.value === 1 || !anchorState.value.dragging)) {
    return 'ais-warning-title';
  }
  else if (anchorState.value.anchorDeployed) {
    return 'anchored-title';
  }
  else return 'not-anchored-title';
});

const title = computed(() => {
  if (!anchorState.value) return 'Not Anchored';
  
  // If dragging is active and it's either the only alert or it's the current alert in the cycle
  if (anchorState.value.dragging && 
      (currentAlertIndex.value === 0 || !aisWarningEffective.value)) { 
    return 'DRAGGING';
  }
  // If AIS warning is active and it's either the only alert or it's the current alert in the cycle
  else if (aisWarningEffective.value && 
           (currentAlertIndex.value === 1 || !anchorState.value.dragging)) {
    return 'AIS PROXIMITY WARNING';
  }
  else if (anchorState.value.anchorDeployed) {
    return 'Anchored';
  }
  else return 'Not Anchored';
});

// Helper to get a safe, plain snapshot of the current navigation position
const getCurrentPositionSnapshot = () => {
  const nav = state.value?.navigation;
  const navPos = nav?.position;
  const topPos = state.value?.position;
  const source = navPos || topPos || null;

  if (!source) {
    return null;
  }

  const toScalar = (val) => {
    if (val == null) return null;
    if (typeof val === 'number') return Number.isFinite(val) ? val : null;
    if (typeof val === 'object' && typeof val.value === 'number') {
      return Number.isFinite(val.value) ? val.value : null;
    }
    return null;
  };

  const lat = toScalar(source.latitude);
  const lon = toScalar(source.longitude);

  // Return a plain object so we never log reactive proxies
  return { lat, lon };
};

// Simple distance helper (meters) using Haversine
const calculateDistanceMetersLocal = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 == null || lon1 == null ||
    lat2 == null || lon2 == null ||
    typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
    Number.isNaN(lat1) || Number.isNaN(lon1) ||
    Number.isNaN(lat2) || Number.isNaN(lon2)
  ) {
    return null;
  }

  const R = 6371000; // meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Watch for status/title changes and log previous/new positions
const lastPositionSnapshot = ref(getCurrentPositionSnapshot());

watch(
  title,
  (newStatus, oldStatus) => {
    if (newStatus === oldStatus) return;

    const newPos = getCurrentPositionSnapshot();

    if (lastPositionSnapshot.value && newPos) {
      calculateDistanceMetersLocal(
        lastPositionSnapshot.value.lat,
        lastPositionSnapshot.value.lon,
        newPos.lat,
        newPos.lon
      );
    }

    // try {
    //   console.log('[AnchorStatus] status change', {
    //     previousStatus: oldStatus,
    //     status: newStatus,
    //     previousPosition: lastPositionSnapshot.value,
    //     newPosition: newPos,
    //     deltaDistanceFeet,
    //     time: new Date().toISOString(),
    //   });
    // } catch (e) {
    //   // Swallow logging errors to avoid impacting UI
    // }

    lastPositionSnapshot.value = newPos;
  }
);

// Simple handler that just emits the event to the parent
const handleDropAnchor = () => {
  // Simply emit the event to the parent component (AnchorView)
  // AnchorView will handle all the state updates and map features
  emit('anchor-dropped');
};

</script>

<style scoped>
.anchor-grid-div {
  position: absolute;
  top: calc(var(--ion-safe-area-top, 0) + 56px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  width: 92vw;
  max-width: 420px;
  background: var(--app-surface-color);
  color: var(--app-text-color);
  border: 1px solid var(--app-border-color);
  border-radius: 14px;
  box-shadow: 0 18px 36px color-mix(in srgb, var(--app-text-color) 14%, transparent);
  padding: 16px 20px 14px;
  text-align: center;
}

.grid-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.grid-row {
  display: flex;
  gap: 10px;
}

.info-rect-div {
  flex: 1;
  background: color-mix(in srgb, var(--app-surface-color) 88%, var(--app-background-color) 12%);
  border: 1px solid var(--app-border-color);
  border-radius: 10px;
  padding: 10px 6px;
  min-width: 46px;
  min-height: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.label-div {
  font-size: 0.82em;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--app-muted-text-color);
  text-transform: uppercase;
}

.metric-div {
  font-size: 1.05em;
  font-weight: 600;
  color: var(--app-text-color);
}

.metric-div.clickable {
  cursor: pointer;
  color: var(--app-text-color);
}

.larger {
  font-size: 1.12em;
}

.drop-anchor-rect {
  cursor: pointer;
  width: 90%;
  height: 52px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  margin: 0 auto 18px auto;
  padding: 0 14px;
  background: color-mix(in srgb, var(--app-accent-soft-color) 85%, transparent);
  border: 1px solid var(--app-accent-color);
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.drop-anchor-label {
  white-space: nowrap;
}

.drop-anchor-rect:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px color-mix(in srgb, var(--app-accent-color) 18%, transparent);
}

.drop-anchor-icon {
  height: 1.7em;
  width: 1.7em;
  filter: var(--app-icon-filter, none);
}

.drop-anchor-label {
  font-size: 1.2em;
  font-weight: 600;
  color: var(--app-accent-color);
  letter-spacing: 0.02em;
}

.title-div {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 6px 20px;
  border-radius: 20px;
  font-size: 1.05em;
  font-weight: 700;
  letter-spacing: 0.03em;
  margin-bottom: 6px;
  border: 1px solid transparent;
}

.anchored-title {
  background: color-mix(in srgb, var(--app-accent-soft-color) 90%, transparent);
  color: var(--app-accent-color);
  border-color: var(--app-accent-color);
}

.not-anchored-title {
  background: color-mix(in srgb, var(--app-surface-color) 85%, var(--app-background-color) 15%);
  color: var(--app-muted-text-color);
  border-color: var(--app-border-color);
}

.dragging-title {
  background: color-mix(in srgb, var(--app-accent-color) 55%, var(--app-text-color) 45%);
  color: var(--app-accent-contrast-color);
  border-color: color-mix(in srgb, var(--app-accent-color) 70%, var(--app-text-color) 30%);
  animation: blink 1s infinite;
}

.ais-warning-title {
  background: #dc2626;
  color: #ffffff;
  border-color: #b91c1c;
  animation: blink 1s infinite;
}

.scope-suggestion {
  width: 100%;
  background: color-mix(in srgb, var(--app-accent-soft-color) 82%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-accent-color) 65%, transparent);
  border-radius: 12px;
  padding: 12px 14px;
  text-align: left;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--app-accent-color) 12%, transparent);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.suggestion-title {
  font-size: 0.95em;
  font-weight: 600;
  color: var(--app-accent-color);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.suggestion-detail {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 6px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--app-border-color) 65%, transparent);
}

.suggestion-detail:last-of-type {
  border-bottom: none;
}

.suggestion-detail .label {
  color: var(--app-muted-text-color);
  font-size: 0.85em;
  letter-spacing: 0.01em;
}

.suggestion-detail .value {
  color: var(--app-text-color);
  font-weight: 600;
}

.suggestion-detail .value.highlight {
  color: var(--app-accent-color);
}

.suggestion-note {
  margin-top: 4px;
  padding-top: 8px;
  font-size: 0.82em;
  font-style: italic;
  color: var(--app-muted-text-color);
  border-top: 1px dashed color-mix(in srgb, var(--app-border-color) 65%, transparent);
  text-align: center;
}

.slider-label {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85em;
  color: var(--app-muted-text-color);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.slider-value {
  font-size: 1.4em;
  font-weight: 600;
  color: var(--app-accent-color);
}

.modal-content {
  background: var(--app-surface-color);
  border-radius: 14px;
  border: 1px solid var(--app-border-color);
  box-shadow: 0 18px 32px color-mix(in srgb, var(--app-text-color) 16%, transparent);
  padding: 18px 16px;
  color: var(--app-text-color);
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
}

.modal-actions ion-button {
  --border-radius: 18px;
  --box-shadow: 0 10px 18px color-mix(in srgb, var(--app-text-color) 12%, transparent);
}

.modal-actions ion-button[color="primary"] {
  --background: var(--app-accent-color);
  --color: var(--app-accent-contrast-color);
}

.modal-actions ion-button[color="danger"] {
  --background: color-mix(in srgb, var(--app-text-color) 70%, var(--app-surface-color) 30%);
  --color: var(--app-background-color);
}

.modal-actions ion-button[color="secondary"] {
  --background: color-mix(in srgb, var(--app-accent-soft-color) 80%, transparent);
  --color: var(--app-accent-color);
}

.modal-range {
  margin: 12px auto;
  max-width: 520px;
}

.set-anchor-footer {
  --background: var(--app-surface-color);
  border-top: 1px solid var(--app-border-color);
}

.modal-toolbar {
  --background: var(--app-surface-color);
}

.enhanced-modal {
  background: var(--app-surface-color);
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.55; }
  100% { opacity: 1; }
}

@media (max-width: 480px) {
  .anchor-grid-div {
    top: calc(var(--ion-safe-area-top, 0) + 48px);
    width: 90vw;
    padding: 12px;
  }

  .grid-row {
    gap: 8px;
  }

  .info-rect-div {
    padding: 8px;
  }

  .drop-anchor-rect {
    height: 48px;
  }
}

@media (min-width: 768px) {
  .anchor-grid-div {
    top: calc(var(--ion-safe-area-top, 0) + 80px);
  }
}
</style>

<style>
/* Dark mode overrides for AnchorInfoGrid */
body.dark .drop-anchor-label {
  color: rgba(248, 250, 252, 0.85) !important;
}

body.dark .slider-value {
  color: #f8fafc !important;
}

body.dark .drop-anchor-icon {
  filter: brightness(0) invert(1) !important;
}

body.dark .metric-div.clickable {
  color: rgba(248, 250, 252, 0.85) !important;
}
</style>
