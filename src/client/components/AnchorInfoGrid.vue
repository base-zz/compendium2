<template>
  <div class="anchor-grid-div">
    <div v-if="anchorState && !anchorState.anchorDeployed" class="info-rect-div drop-anchor-rect"
      style="cursor:pointer;width:90%;height:48px;display:flex;flex-direction:row;align-items:center;justify-content:center;border-radius:8px;margin:16px auto 20px auto;padding:0;background:rgba(0,0,0,0.10);"
      @click="handleDropAnchor">
      <img src="/img/anchor2.svg" alt="Anchor Icon" style="height:1.7em;width:1.7em;margin-right:12px;vertical-align:middle;filter:var(--ion-color-primary-filter, none);" />
      <span style="font-size:1.25em;font-weight:600;color:var(--ion-color-primary)">Drop Anchor</span>
    </div>
    <h2 v-else class="title-div" :class="titleClass">
      {{ title }}
    </h2>
    <div class="grid-container">
      <div class="grid-row">
        <div class="info-rect-div">
          <div class="label-div larger">Range</div>
          <div class="metric-div larger clickable" @click="showEditRadiusModal = true">{{ anchorState?.criticalRange?.r }}</div>
        </div>
        <div class="info-rect-div">
          <div class="label-div larger">Rode</div>
          <div class="metric-div larger">{{ anchorState?.rode?.amount }}</div>
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
      
      <!-- Recommended Scope Section -->
      <div v-if="recommendedScope && anchorState?.anchorDeployed" class="scope-suggestion">
        <div class="suggestion-title">Recommended Scope</div>
        <div class="suggestion-detail">
          <span class="label">Current (5:1):</span>
          <span class="value">{{ Math.round(recommendedScope.currentDepth * 5) }} {{ isMetric ? 'm' : 'ft' }}</span>
        </div>
        <div class="suggestion-detail">
          <span class="label">With tide (5:1):</span>
          <span class="value highlight">{{ Math.round(recommendedScope.recommendedChain) }} {{ isMetric ? 'm' : 'ft' }}</span>
        </div>
        <div class="suggestion-note">
          Accounts for {{ recommendedScope.depthIncrease.toFixed(1) }}{{ isMetric ? 'm' : 'ft' }} tide rise
        </div>
      </div>
    </div>
    <!-- anchor-btn-row removed: no extra action buttons needed when anchor is deployed -->
    <ion-modal :is-open="showEditRadiusModal" @didDismiss="showEditRadiusModal = false">
      <div class="modal-content enhanced-modal">
        <h3>Edit Anchor Alarm Radius</h3>
        <div class="slider-label">
          <strong>Radius:</strong> <span class="slider-value">{{ editRadiusValue }} m</span>
        </div>
        <ion-range
          v-model="editRadiusValue"
          :min="5"
          :max="150"
          :step="1"
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
import { ref, watch, computed, defineEmits, onUnmounted } from 'vue';
import { IonModal, IonButton, IonRange } from '@ionic/vue';
import { useStateDataStore } from '@/client/stores/stateDataStore.js';
import { storeToRefs } from 'pinia';
import { createLogger } from '@/client/services/logger';

const logger = createLogger('AnchorInfoGrid');

const emit = defineEmits(['anchor-dropped']);

// Note: validateCoordinates function removed as it's no longer used

const showEditRadiusModal = ref(false);
const editRadiusValue = ref(0);

watch(showEditRadiusModal, (val) => {
  if (val && anchorState.value?.criticalRange?.r) {
    editRadiusValue.value = anchorState.value.criticalRange.r;
  }
});

function confirmEditRadius() {
  if (anchorState.value && anchorState.value.criticalRange) {
    anchorState.value.criticalRange.r = editRadiusValue.value;
  }
  showEditRadiusModal.value = false;
}


const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);
const anchorState = computed(() => state.value.anchor);
  
// Alert cycling state
const currentAlertIndex = ref(0);
const alertCycleInterval = ref(null);

// Setup alert cycling when there are multiple alerts
watch(
  () => [anchorState.value?.dragging, anchorState.value?.aisWarning],
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

// Calculate recommended scope based on tide data
const recommendedScope = computed(() => {
  try {
    const currentDepth = state.value.navigation?.depth?.belowTransducer?.value;
    const tideData = state.value.tides?.waterLevels;
    
    if (!currentDepth || !tideData?.length) return null;
    
    const now = new Date();
    const futureCutoff = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours from now
    
    // Find maximum water level in the next 72 hours
    const maxFutureLevel = tideData
      .filter(entry => {
        const entryTime = new Date(entry.time);
        return entryTime >= now && entryTime <= futureCutoff;
      })
      .reduce((max, entry) => Math.max(max, entry.value), 0);
    
    if (maxFutureLevel <= 0) return null;
    
    const depthIncrease = Math.max(0, maxFutureLevel - currentDepth);
    const targetDepth = currentDepth + depthIncrease;
    
    // Convert to feet if using imperial units
    const unitMultiplier = isMetric.value ? 1 : 3.28084;
    
    return {
      currentDepth: currentDepth * unitMultiplier,
      maxFutureDepth: targetDepth * unitMultiplier,
      recommendedChain: Math.ceil(targetDepth * 5 * unitMultiplier), // 5:1 scope
      depthIncrease: depthIncrease * unitMultiplier
    };
  } catch (error) {
    logger.error('Error calculating recommended scope:', error);
    return null;
  }
});

const titleClass = computed(() => {
  if (!anchorState.value) return 'not-anchored-title';
  
  // If dragging is active and it's either the only alert or it's the current alert in the cycle
  if (anchorState.value.dragging && 
      (currentAlertIndex.value === 0 || !anchorState.value.aisWarning)) { 
    return 'dragging-title';
  }
  // If AIS warning is active and it's either the only alert or it's the current alert in the cycle
  else if (anchorState.value.aisWarning && 
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
      (currentAlertIndex.value === 0 || !anchorState.value.aisWarning)) { 
    return 'DRAGGING';
  }
  // If AIS warning is active and it's either the only alert or it's the current alert in the cycle
  else if (anchorState.value.aisWarning && 
           (currentAlertIndex.value === 1 || !anchorState.value.dragging)) {
    return 'AIS PROXIMITY WARNING';
  }
  else if (anchorState.value.anchorDeployed) {
    return 'Anchored';
  }
  else return 'Not Anchored';
});




// Simple handler that just emits the event to the parent
const handleDropAnchor = () => {
  // Simply emit the event to the parent component (AnchorView)
  // AnchorView will handle all the state updates and map features
  emit('anchor-dropped');
  console.log("AnchorInfoGrid: Emitted anchor-dropped event");
};

</script>

<style scoped>
.anchor-grid-div {
  position: absolute;
  top: 3%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  width: 92vw;
  max-width: 420px;
  background: rgba(255,255,255,0.96);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  padding: 1px 8px 1px 8px;
  text-align: center;
}

.grid-row {
  display: flex;
  justify-content: space-between;
  gap: 2px;
  margin-bottom: 0;
}

.info-rect-div {
  flex: 1;
  background: #f4f4f4;
  border-radius: 4px;
  padding: 0 1px;
  margin: 0 1px;
  min-width: 32px;
  min-height: 22px;
}

.label-div, .metric-div {
  font-size: 0.88em;
}

.larger {
  font-size: 0.95em;
}

.title-div {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  margin-bottom: 4px;
  font-size: 1.07em;
  font-weight: 800;
  padding: 6px 20px;
  border-radius: 8px;
  letter-spacing: 0.01em;
  transition: background 0.2s, color 0.2s;
}
.anchored-title {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #81c784;
}
.not-anchored-title {
  background: #f5f5f5;
  color: #757575;
  border: 1px solid #e0e0e0;
}

.dragging-title {
  background: #e27b7b;
  color: #8c0909;
  border: 1px solid #2a0202;
}

.anchor-btn-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  margin: 2px 0 0 0;
}
.dual-btn-row {
  display: flex;
  flex-direction: row;
  gap: 6px;
  justify-content: stretch;
  align-items: center;
}

.anchor-btn {
  flex: 1;
  padding: 4px 0;
  border: none;
  border-radius: 12px;
  font-size: 0.91em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(33,150,243,0.06);
  margin-bottom: 2px;
}
.anchor-btn.primary {
  background: linear-gradient(90deg, #2196f3 60%, #21cbf3 100%);
  color: #fff;
}
.anchor-btn.danger {
  background: linear-gradient(90deg, #e53935 60%, #ff7043 100%);
  color: #fff;
}
.anchor-btn.secondary {
  background: #fff;
  color: #2196f3;
  border: 2px solid #2196f3;
  margin-top: 1px;
}
.anchor-btn.full-width {
  width: 100%;
  border-radius: 12px;
}
.anchor-btn:active {
  opacity: 0.85;
}


.grid-row {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 0;
}

.info-rect-div {
  flex: 1;
  background: #f4f4f4;
  border-radius: 5px;
  padding: 1px 1px;
  margin: 0 1px;
  min-width: 38px;
  min-height: 30px;
}

.label-div, .metric-div {
  font-size: 0.93em;
}

.larger {
  font-size: 1em;
}

.title-div {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  margin-bottom: 2px;
  font-size: 1.01em;
  font-weight: 600;
  padding: 0;
}

.anchor-btn-row {
  display: flex;
  gap: 4px;
  margin: 4px 0 0 0;
}

.anchor-btn {
  flex: 1;
  padding: 4px 0;
  border: none;
  border-radius: 14px;
  font-size: 0.93em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(33,150,243,0.06);
  margin-bottom: 2px;
}
.anchor-btn.primary {
  background: linear-gradient(90deg, #2196f3 60%, #21cbf3 100%);
  color: #fff;
}
.anchor-btn.danger {
  background: linear-gradient(90deg, #e53935 60%, #ff7043 100%);
  color: #fff;
}
.anchor-btn.secondary {
  background: #fff;
  color: #2196f3;
  border: 2px solid #2196f3;
  margin-top: 1px;
}
.anchor-btn.full-width {
  width: 100%;
  border-radius: 14px;
}
.anchor-btn:active {
  opacity: 0.85;
}


.grid-row {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 0;
}

.info-rect-div {
  flex: 1;
  background: #f4f4f4;
  border-radius: 5px;
  padding: 2px 1px;
  margin: 0 1px;
  min-width: 38px;
}

.label-div, .metric-div {
  font-size: 0.93em;
}

.larger {
  font-size: 1em;
}

.title-div {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  margin-bottom: 3px;
  font-size: 1.01em;
  font-weight: 600;
  padding: 0;
}

.anchor-btn-row {
  display: flex;
  gap: 4px;
  margin: 7px 0 0 0;
}

.anchor-btn {
  flex: 1;
  padding: 6px 0;
  border: none;
  border-radius: 14px;
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(33,150,243,0.06);
  margin-bottom: 3px;
}
.anchor-btn.primary {
  background: linear-gradient(90deg, #2196f3 60%, #21cbf3 100%);
  color: #fff;
}
.anchor-btn.danger {
  background: linear-gradient(90deg, #e53935 60%, #ff7043 100%);
  color: #fff;
}
.anchor-btn.secondary {
  background: #fff;
  color: #2196f3;
  border: 2px solid #2196f3;
  margin-top: 2px;
}
.anchor-btn.full-width {
  width: 100%;
  border-radius: 14px;
}
.anchor-btn:active {
  opacity: 0.85;
}


.grid-container {
  width: 100%;
}

.grid-row {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 2px;
}

.info-rect-div {
  flex: 1;
  background: #f4f4f4;
  border-radius: 7px;
  padding: 4px 2px;
  margin: 0 1px;
  min-width: 48px;
}

.label-div {
  font-size: 0.85em;
  color: #555;
  margin-bottom: 2px;
}

.metric-div {
  font-size: 1em;
  font-weight: 600;
  color: #222;
}

.larger{
  font-size: 1.09em;
}

.title-div {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  margin-bottom: 4px;
  font-size: 1.08em;
  font-weight: 600;
  padding: 0;
}

.anchor-btn-row {
  display: flex;
  gap: 6px;
  margin: 10px 0 0 0;
}

.anchor-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 18px;
  font-size: 0.98em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(33,150,243,0.07);
  margin-bottom: 5px;
}
.anchor-btn.primary {
  background: linear-gradient(90deg, #2196f3 60%, #21cbf3 100%);
  color: #fff;
}
.anchor-btn.danger {
  background: linear-gradient(90deg, #e53935 60%, #ff7043 100%);
  color: #fff;
}
.anchor-btn.secondary {
  background: #fff;
  color: #2196f3;
  border: 2px solid #2196f3;
  margin-top: 2px;
}
.anchor-btn.full-width {
  width: 100%;
  border-radius: 18px;
}
.small-btn {
  font-size: 0.78em;
  padding: 4px 10px;
  min-width: unset;
}
.smallest-btn {
  font-size: 0.5em;
  padding: 2px 6px;
  transform: scale(0.7) translateX(-1rem);
}
.dual-btn-row .slide-to-confirm, .dual-btn-row .SlideToConfirm {
  border: 1.5px solid #bbb;
  border-radius: 18px;
  background: #fff;
  box-shadow: none;
  padding: 0;
  }

.dual-btn-row .slide-to-confirm .label, .dual-btn-row .SlideToConfirm .label {
  transform: translateX(22px);
}
.anchor-btn:active {
  opacity: 0.85;
}


.grid-container {
  width: 100%;
}

.grid-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.info-rect-div {
  flex: 1;
  background: #f4f4f4;
  border-radius: 8px;
  padding: 8px 4px;
  margin: 0 2px;
  min-width: 60px;
}

.label-div {
  font-size: 0.9em;
  color: #555;
  margin-bottom: 4px;
}

.metric-div {
  font-size: 1.1em;
  font-weight: bold;
  color: #222;
}

.larger{
  font-size: larger;
}

.title-div {
  margin-bottom: 10px;
  font-size: 1.2em;
  font-weight: 600;
}

.anchor-btn-row {
  display: flex;
  gap: 12px;
  margin: 18px 0 0 0;
}

.anchor-btn {
  flex: 1;
  padding: 14px 0;
  border: none;
  border-radius: 24px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(33,150,243,0.08);
  margin-bottom: 8px;
}
.anchor-btn.primary {
  background: linear-gradient(90deg, #2196f3 60%, #21cbf3 100%);
  color: #fff;
}
.anchor-btn.danger {
  background: linear-gradient(90deg, #e53935 60%, #ff7043 100%);
  color: #fff;
}
.anchor-btn.secondary {
  background: #fff;
  color: #2196f3;
  border: 2px solid #2196f3;
  margin-top: 4px;
}
.anchor-btn.full-width {
  width: 100%;
  border-radius: 24px;
}
.anchor-btn:active {
  opacity: 0.85;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.18);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-dialog {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.18);
  width: 340px;
  max-width: 94vw;
  padding: 20px 18px 18px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.modal-title {
  font-size: 1.18em;
  font-weight: bold;
  margin-bottom: 10px;
}
.modal-body {
  font-size: 1.35em;
  font-weight: 700;
  margin: 0;
}
.anchor-ion-modal .ion-modal-body {
  flex: 1;
  padding: 22px 20px 0 20px;
  overflow-y: auto;
}
.anchor-ion-modal .ion-modal-footer {
  padding: 18px 20px 28px 20px;
  display: flex;
  gap: 18px;
  justify-content: center;
  border-top: 1px solid #eaeaea;
  background: #fff;
}
.modal-btn {
  padding: 7px 16px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 600;
  background: #eee;
  color: #444;
  cursor: pointer;
  transition: background 0.2s;
}
.modal-btn.danger {
  background: #e53935;
  color: #fff;
}
.modal-btn:active {
  opacity: 0.85;
}

.dragging-title {
  color: #f44336 !important; /* Red color */
  animation: blink 1s infinite;
}

.ais-warning-title {
  color: #ff9800 !important; /* Orange color */
  animation: blink 1s infinite;
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>
