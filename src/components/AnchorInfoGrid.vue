<template>
  <div class="anchor-grid-div">
    <div class="values-row">
      <div class="info-cell" @click="showEditRodeModal = true">
        <div class="label-div">Rode</div>
        <div class="metric-div clickable">{{ stateStore.state.anchor?.rode?.amount != null ? stateStore.state.anchor.rode.amount : '--' }}</div>
      </div>
      <div class="info-cell" @click="showEditRadiusModal = true">
        <div class="label-div">Range</div>
        <div class="metric-div clickable">{{ stateStore.state.anchor?.criticalRange?.r != null ? stateStore.state.anchor.criticalRange.r : '--' }}</div>
      </div>
      <div class="info-cell" @click="showEditHeadingModal = true">
        <div class="label-div">Heading</div>
        <div class="metric-div clickable">{{ stateStore.state.anchor?.anchorDeployed ? (stateStore.state.anchor?.anchorDropLocation?.bearing?.value != null ? Math.round(stateStore.state.anchor.anchorDropLocation.bearing.value) + '°' : (deviceHeadingDegrees != null ? Math.round(deviceHeadingDegrees) + '°' : '--')) : (deviceHeadingDegrees != null ? Math.round(deviceHeadingDegrees) + '°' : '--') }}</div>
      </div>
      <div class="info-cell">
        <div class="label-div">Depth</div>
        <div class="metric-div">{{ stateStore.state.navigation?.depth?.belowTransducer?.value != null ? stateStore.state.navigation.depth.belowTransducer.value : '--' }}</div>
      </div>
      <div class="info-cell">
        <div class="label-div">Wind</div>
        <div class="metric-div">{{ stateStore.state.navigation?.wind?.apparent?.speed?.value != null ? stateStore.state.navigation.wind.apparent.speed.value : '--' }}</div>
      </div>
      <div class="info-cell">
        <div class="label-div">Drift</div>
        <div class="metric-div" :style="driftColorStyle">{{ driftDisplay }}</div>
      </div>
      <!--
      <div class="info-cell">
        <div class="label-div">Current</div>
        <div class="metric-div">{{ stateStore.state.environment?.current?.speed?.value ?? '--' }}</div>
      </div>
      -->
    </div>
    <!-- anchor-btn-row removed: no extra action buttons needed when anchor is deployed -->
    <ion-modal :is-open="showEditRadiusModal" @didDismiss="showEditRadiusModal = false" css-class="edit-radius-modal-root">
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
    <ion-modal :is-open="showEditRodeModal" @didDismiss="showEditRodeModal = false" css-class="edit-rode-modal-root">
      <div class="modal-content enhanced-modal">
        <h3>Edit Rode Length</h3>
        <div class="slider-label">
          <strong>Rode:</strong>
          <span class="slider-value">
            {{ formattedRode }} {{ isMetric ? 'm' : 'ft' }}
          </span>
        </div>
        <ion-range
          v-model="editRodeValue"
          :min="rodeMin"
          :max="rodeMax"
          :step="rodeStep"
          ticks="true"
          color="primary"
          class="modal-range modal-range-center"
          style="margin-bottom: 18px; width: 80%"
        />
        <div class="modal-actions">
          <ion-button color="primary" @click="confirmEditRode">Confirm</ion-button>
          <ion-button @click="showEditRodeModal = false">Cancel</ion-button>
        </div>
      </div>
    </ion-modal>
    <ion-modal :is-open="showEditHeadingModal" @didDismiss="showEditHeadingModal = false" css-class="edit-heading-modal-root">
      <div class="modal-content enhanced-modal">
        <h3>Edit Heading</h3>
        <div class="slider-label">
          <strong>Heading:</strong>
          <span class="slider-value">
            {{ formattedHeading }}°
          </span>
        </div>
        <ion-range
          v-model="editHeadingValue"
          :min="0"
          :max="359"
          :step="1"
          ticks="true"
          color="primary"
          class="modal-range modal-range-center"
          style="margin-bottom: 18px; width: 80%"
        />
        <div class="modal-actions">
          <ion-button color="primary" @click="confirmEditHeading">Confirm</ion-button>
          <ion-button @click="showEditHeadingModal = false">Cancel</ion-button>
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
import { calculateDistanceMeters } from '@/stores/stateDataStore';

const emit = defineEmits(['anchor-dropped']);

// Note: validateCoordinates function removed as it's no longer used

const showEditRadiusModal = ref(false);
const editRadiusValue = ref(0);
const showEditRodeModal = ref(false);
const editRodeValue = ref(0);
const showEditHeadingModal = ref(false);
const editHeadingValue = ref(0);

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);
const anchorState = computed(() => state.value.anchor);

const { headingDegrees: deviceHeadingDegrees, start: startDeviceHeading } = useDeviceHeading();
// eslint-disable-next-line no-unused-vars
const _unused = deviceHeadingDegrees;

const handleHeadingClick = async () => {
  if (!anchorState.value || anchorState.value.anchorDeployed) {
    return;
  }
  await startDeviceHeading();
};

const preferencesStore = usePreferencesStore();
const { preferences } = storeToRefs(preferencesStore);

const preferredLengthUnit = computed(() => {
  // Use useImperial boolean from preferences (length property doesn't exist)
  const useImperial = preferences.value?.units?.useImperial;
  if (useImperial === true) {
    return 'ft';
  }
  if (useImperial === false) {
    return 'm';
  }
  // Fallback to current criticalRange units if preferences not set
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
  // The value is already in preferred units, just return it
  // No conversion needed - we store in the user's preferred units
  return value;
}

watch(showEditRadiusModal, (val) => {
  if (val && anchorState.value?.criticalRange?.r) {
    const currentRadius = anchorState.value.criticalRange.r;
    const currentUnits = anchorState.value.criticalRange.units || 'm';
    editRadiusValue.value = convertLengthToPreferred(currentRadius, currentUnits);
  }
});

watch(showEditRodeModal, (val) => {
  if (val && anchorState.value?.rode?.amount) {
    const currentRode = anchorState.value.rode.amount;
    const currentUnits = anchorState.value.rode.units || 'm';
    editRodeValue.value = convertLengthToPreferred(currentRode, currentUnits);
  }
});

watch(showEditHeadingModal, (val) => {
  if (val) {
    if (anchorState.value?.anchorDeployed && anchorState.value.anchorDropLocation?.bearing?.value != null) {
      editHeadingValue.value = anchorState.value.anchorDropLocation.bearing.value;
    } else if (deviceHeadingDegrees.value != null) {
      editHeadingValue.value = deviceHeadingDegrees.value;
    } else {
      editHeadingValue.value = 0;
    }
  }
});

const formattedRadius = computed(() => Math.round(editRadiusValue.value));
const radiusStep = computed(() => (isMetric.value ? 1 : 5));
const radiusMin = computed(() => (isMetric.value ? 5 : 15));
const radiusMax = computed(() => (isMetric.value ? 150 : 500));

const formattedRode = computed(() => Math.round(editRodeValue.value));
const rodeStep = computed(() => (isMetric.value ? 1 : 5));
const rodeMin = computed(() => (isMetric.value ? 5 : 15));
const rodeMax = computed(() => (isMetric.value ? 100 : 330));

const formattedHeading = computed(() => Math.round(editHeadingValue.value));

function confirmEditRadius() {
  if (anchorState.value && anchorState.value.criticalRange) {
    const preferredUnits = preferredLengthUnit.value;
    const baseValue = convertLengthFromPreferred(editRadiusValue.value, preferredUnits);
    anchorState.value.criticalRange.r = baseValue;
    anchorState.value.criticalRange.units = preferredUnits;
    
    // Send update to server via state store
    const { sendMessageToServer } = stateStore;
    if (sendMessageToServer) {
      sendMessageToServer('anchor:update', anchorState.value);
    }
  }
  showEditRadiusModal.value = false;
}

function confirmEditRode() {
  if (anchorState.value && anchorState.value.rode) {
    const preferredUnits = preferredLengthUnit.value;
    const baseValue = convertLengthFromPreferred(editRodeValue.value, preferredUnits);
    anchorState.value.rode.amount = baseValue;
    anchorState.value.rode.units = preferredUnits;
    
    // Send update to server via state store
    const { sendMessageToServer } = stateStore;
    if (sendMessageToServer) {
      sendMessageToServer('anchor:update', anchorState.value);
    }
  }
  showEditRodeModal.value = false;
}

function confirmEditHeading() {
  if (anchorState.value) {
    if (!anchorState.value.anchorDropLocation) {
      anchorState.value.anchorDropLocation = {};
    }

    if (!anchorState.value.anchorDropLocation.bearing) {
      anchorState.value.anchorDropLocation.bearing = {};
    }
    anchorState.value.anchorDropLocation.bearing.value = editHeadingValue.value;
    
    // Send update to server via state store
    const { sendMessageToServer } = stateStore;
    if (typeof sendMessageToServer === 'function') {
      sendMessageToServer('anchor:update', anchorState.value);
    }
  }
  showEditHeadingModal.value = false;
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

// Calculate drift distance between current anchor location and original anchor location
const driftDisplay = computed(() => {
  if (!anchorState.value?.anchorDeployed) return '--';
  
  // Get original position (where anchor was initially calculated to be when dropped)
  const originalPos = anchorState.value?.anchorLocation?.originalPosition || 
                     anchorState.value?.anchorDropLocation?.position; // Fallback to drop position
  // Get current anchor position
  const currentPos = anchorState.value?.anchorLocation?.position;
  
  // Debug logging removed
  
  if (!originalPos || !currentPos) return '--';
  
  const origLat = originalPos.latitude?.value;
  const origLon = originalPos.longitude?.value;
  const currentLat = currentPos.latitude?.value;
  const currentLon = currentPos.longitude?.value;
  
  if (typeof origLat !== 'number' || typeof origLon !== 'number' ||
      typeof currentLat !== 'number' || typeof currentLon !== 'number') {
    return '--';
  }
  
  const distanceMeters = calculateDistanceMeters(origLat, origLon, currentLat, currentLon, true);
  if (distanceMeters == null || !Number.isFinite(distanceMeters)) return '--';
  
  // If drift is 0 or very close to 0, show "0" with units
  if (distanceMeters < 0.01) {
    return isMetric.value ? '0 m' : '0 ft';
  }
  
  // Convert to preferred units
  if (isMetric.value) {
    if (distanceMeters >= 1000) {
      return (distanceMeters / 1000).toFixed(2) + ' km';
    }
    return Math.round(distanceMeters) + ' m';
  } else {
    const distanceFt = distanceMeters * 3.28084;
    if (distanceFt >= 5280) {
      return (distanceFt / 5280).toFixed(2) + ' mi';
    }
    return Math.round(distanceFt) + ' ft';
  }
});

// Determine drift color based on thresholds: >5ft/1.5m = yellow, >10ft/3m = red
const driftColorStyle = computed(() => {
  if (!anchorState.value?.anchorDeployed) return '';
  
  const originalPos = anchorState.value?.anchorLocation?.originalPosition;
  const currentPos = anchorState.value?.anchorLocation?.position;
  
  if (!originalPos || !currentPos) return '';
  
  const origLat = originalPos.latitude?.value ?? originalPos.latitude;
  const origLon = originalPos.longitude?.value ?? originalPos.longitude;
  const currentLat = currentPos.latitude?.value ?? currentPos.latitude;
  const currentLon = currentPos.longitude?.value ?? currentPos.longitude;
  
  if (typeof origLat !== 'number' || typeof origLon !== 'number' ||
      typeof currentLat !== 'number' || typeof currentLon !== 'number') {
    return '';
  }
  
  const distanceMeters = calculateDistanceMeters(origLat, origLon, currentLat, currentLon, true);
  if (distanceMeters == null || !Number.isFinite(distanceMeters)) return '';
  
  // If drift is 0 or very close to 0, use normal text color
  if (distanceMeters < 0.01) {
    return 'color: var(--app-text-color); font-weight: 600;';
  }
  
  // Thresholds: 1.5m (yellow), 3m (red) for metric; 5ft (yellow), 10ft (red) for imperial
  let t;
  if (isMetric.value) {
    t = Math.max(0, Math.min(1, distanceMeters / 3)); // 0m = 0, 3m = 1
  } else {
    t = Math.max(0, Math.min(1, (distanceMeters * 3.28084) / 10)); // 0ft = 0, 10ft = 1
  }
  
  // Tween: white (0, 0, 1) → yellow (0.5, 1, 1) → red (1, 1, 1)
  let r, g, b;
  if (t <= 0.5) {
    // White → Yellow
    const localT = t * 2; // 0 to 1
    r = Math.round(255); // White r=255, Yellow r=255
    g = Math.round(255 - localT * (255 - 245)); // White g=255, Yellow g=245
    b = Math.round(255 - localT * 255); // White b=255, Yellow b=0
  } else {
    // Yellow → Red
    const localT = (t - 0.5) * 2; // 0 to 1
    r = Math.round(255 - localT * (255 - 220)); // Yellow r=255, Red r=220
    g = Math.round(245 - localT * 245); // Yellow g=245, Red g=0
    b = 0; // Yellow b=0, Red b=0
  }
  
  return `color: rgb(${r}, ${g}, ${b}); font-weight: ${t > 0.3 ? 700 : 600};`;
});
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
  width: 100%;
  background: var(--app-surface-color);
  color: var(--app-text-color);
  border-bottom: 1px solid var(--app-border-color);
  padding: 2px 4px;
  box-sizing: border-box;
}

.values-row {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 4px;
  padding: 2px 0;
}

.info-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 1;
  min-width: 55px;
  max-width: none;
  min-height: 44px;
  background: color-mix(in srgb, var(--app-surface-color) 88%, var(--app-background-color) 12%);
  border: 1px solid var(--app-border-color);
  border-radius: 8px;
  padding: 8px 4px;
  margin: 1px;
  text-align: center;
}

.label-div {
  font-size: 0.7em;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--app-muted-text-color);
  text-transform: uppercase;
  display: block;
  line-height: 1.2;
  visibility: visible;
  overflow: visible;
}

.metric-div {
  font-size: 1em;
  font-weight: 600;
  color: var(--app-text-color);
  display: block;
  line-height: 1.3;
  margin-top: 2px;
  visibility: visible;
  overflow: visible;
  min-height: 1em;
}

.metric-div.clickable {
  cursor: pointer;
}

.metric-div.drift-warning {
  color: #f59e0b;
  font-weight: 700;
}

.metric-div.drift-critical {
  color: #dc2626;
  font-weight: 700;
}

.status-row {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 8px;
}

.drop-anchor-btn {
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--app-accent-soft-color) 85%, transparent);
  border: 1px solid var(--app-accent-color);
  gap: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.drop-anchor-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px color-mix(in srgb, var(--app-accent-color) 18%, transparent);
}

.drop-anchor-icon {
  height: 1.4em;
  width: 1.4em;
  filter: var(--app-icon-filter, none);
}

.drop-anchor-label {
  font-size: 1em;
  font-weight: 600;
  color: var(--app-accent-color);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 16px;
  font-size: 0.9em;
  font-weight: 700;
  letter-spacing: 0.03em;
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

@media (min-width: 600px) {
  .anchor-grid-div {
    padding: 2px 8px;
  }
  
  .values-row {
    gap: 8px;
  }
  
  .info-cell {
    min-width: 90px;
    padding: 10px 8px;
  }
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

/* AnchorInfoGrid modals - safe area handling */
:deep(.edit-radius-modal-root::part(content)),
:deep(.edit-rode-modal-root::part(content)),
:deep(.edit-heading-modal-root::part(content)) {
  --max-width: 100%;
  --width: 100%;
  --height: 100%;
  --max-height: 100%;
  --border-radius: 0;
  margin: 0;
  padding-top: var(--ion-safe-area-top, 0);
  padding-bottom: var(--ion-safe-area-bottom, 0);
}

:deep(.edit-radius-modal-root .modal-content),
:deep(.edit-rode-modal-root .modal-content),
:deep(.edit-heading-modal-root .modal-content) {
  padding-top: 20px;
  padding-bottom: calc(var(--ion-safe-area-bottom, 0) + 16px);
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.55; }
  100% { opacity: 1; }
}

@media (max-width: 480px) {
  .anchor-grid-div {
    width: 100%;
    padding: 2px 2px;
  }

  .values-row {
    gap: 2px;
  }

  .info-cell {
    padding: 6px 2px;
    min-width: 50px;
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
