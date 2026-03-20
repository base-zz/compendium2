<template>
  <ion-page class="page-container">
    <GenericHeader title="Anchor"></GenericHeader>
    <!-- Location acquiring overlay -->
    <div v-if="showLocationModal" class="acquire-location-modal">
      <div class="acquire-location-content">
        <ion-spinner name="crescent" class="location-spinner"></ion-spinner>
        <div class="location-modal-message">Acquiring location...</div>
        <div v-if="locationRequestFailed" class="location-error-message">
          Unable to get your location. Please check your browser permissions.
          <ion-button @click="requestLocationPermission" class="location-retry-button">
            Request Location Access
          </ion-button>
        </div>
        <ion-button 
          @click="dismissLocationModal" 
          fill="clear" 
          class="dismiss-location-button"
        >
          Continue Without Location
        </ion-button>
      </div>
    </div>

    <!-- Modal dialogs -->
    <SetAnchorModal
      v-model:isOpen="showSetAnchorDialog"
      :anchorState="anchorState"
      :isMetric="isMetric"
      :rodeRangeMax="rodeRangeMax"
      :criticalRangeMax="criticalRangeMax"
      :warningRangeMax="warningRangeMax"
      :anchorDropDepthMax="anchorDropDepthMax"
      :customAnchorDropDepthLabel="customAnchorDropDepthLabel"
      :customAnchorDropDepthValue="customAnchorDropDepthValue"
      :fenceConnectorLinesVisible="fenceConnectorLinesVisible"
      :deviceHeadingDegrees="deviceHeadingDegrees"
      :hasTriedPhoneBearing="hasTriedPhoneBearing"
      :recommendedScope="recommendedScope"
      :serverValidationError="dropNowValidationError"
      @save="isDropNowDeploying ? handleFinalizeDropNow() : (anchorState?.anchorDeployed ? handleSaveAnchorParameters() : handleSetAnchor())"
      @cancel="handleSetAnchorModalCancel"
      @update:customAnchorDropDepthValue="customAnchorDropDepthValue = $event"
      @update:fenceConnectorLinesVisible="fenceConnectorLinesVisible = $event"
      @apply-phone-bearing="applyPhoneBearing"
    />
    <DropAnchorModal
      v-model:isOpen="showDropAnchorDialog"
      :preview="dropAnchorPreview"
      :recommendedScope="recommendedScope"
      :lowTideClearance="dropAnchorLowTideClearance"
      @confirm="confirmDropAnchor"
    />
    <UpdateDropModal
      v-model:isOpen="showUpdateDialog"
      @confirm="handleUpdateDropLocation"
    />

    <FenceListModal
      v-model:isOpen="showFenceListModal"
      :fences="anchorState?.fences || []"
      @remove-fence="removeFence"
      @add-fence="startFenceSelectionFromList"
    />
    <CancelAnchorModal
      v-model:isOpen="showCancelDialog"
      :showUpdateDropConfirm="showUpdateDropConfirm"
      @update:showUpdateDropConfirm="showUpdateDropConfirm = $event"
      @cancel-anchor="handleCancelAnchor"
      @update-drop-location="showUpdateDropConfirm = true"
      @confirm-update-drop="confirmUpdateDropLocation"
    />

    <FenceConfigModal
      v-model:isOpen="showFenceConfigModal"
      :selectedFenceTarget="selectedFenceTarget"
      v-model:fenceName="fenceName"
      v-model:fenceRangeInput="fenceRangeInput"
      v-model:fenceReferenceType="fenceReferenceType"
      :validationError="fenceValidationError"
      :isMetric="isMetric"
      @save="handleFenceSave"
      @cancel="handleFenceModalCancel"
      @reference-change="handleFenceReferenceChange"
    />

    <TideModal
      v-model:isOpen="showTideModal"
      :anchorDepth="anchorDepthWithUnits.depth"
      :depthUnits="anchorDepthWithUnits.units"
    />

    <AISModal
      v-model:isOpen="showAISModal"
      :target="selectedAISTarget"
    />

    <!-- Anchor Inspector Modal -->
    <AnchorInspectorModal
      v-model:isOpen="showAnchorInspectorModal"
      :anchorState="anchorState"
      :navigationState="navigationState"
      :aisAlertTargets="aisAlertTargets"
      :anchorStatusText="anchorStatusText"
      :driftDisplay="driftDisplay"
      :isMetric="isMetric"
      :calculateDistanceBoatFromDrop="calculateDistanceBoatFromDrop"
      :calculateDistanceAnchorFromDrop="calculateDistanceAnchorFromDrop"
      :calculateRodeLengthMeters="calculateRodeLengthMeters"
      :calculateDropDepthMeters="calculateDropDepthMeters"
      :calculateEffectiveRodeRadiusMeters="calculateEffectiveRodeRadiusMeters"
      :calculateAnchorHasMoved="calculateAnchorHasMoved"
      :calculateRodeCircleViolated="calculateRodeCircleViolated"
      @reset-anchor="confirmUpdateDropLocation"
    />

    <div class="anchor-view-container" :class="{ 'dark-mode': isDarkMode }">
      <div ref="anchorInfoContainer" class="anchor-info-section">
        <AnchorInfoGrid
          @anchor-dropped="handleAnchorDropped"
          @update-drop-location="handleUpdateDropLocation"
          @cancel-anchor="handleCancelAnchor"
        />
      </div>

      <!-- Tide Extremes Overlay - shown when not anchored -->
      <div v-if="!anchorState?.anchorDeployed && tideExtremesTable" class="tide-extremes-overlay">
        <div class="tide-extremes-card">
          <h4 class="tide-extremes-title">Tide Extremes</h4>
          <table class="tide-extremes-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Low</th>
                <th>High</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in tideExtremesTable" :key="row.label">
                <td class="period-cell">{{ row.label }}</td>
                <td :class="row.lowClass">{{ row.low }}</td>
                <td class="high-cell">{{ row.high }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Floating anchor status under the grid -->
      <div 
        class="floating-anchor-status" 
        :class="anchorStatusClass"
        @click="handleAnchorStatusClick"
      >
        {{ anchorStatusText }}
      </div>
      <div class="map-section">
        <div ref="mapElement" class="openlayers-map"></div>
      </div>

      <!-- Map footer toolbar -->
      <AnchorToolbar
        :measureModeEnabled="measureModeEnabled"
        :fenceModeEnabled="fenceModeEnabled"
        :anchorDeployed="anchorState?.anchorDeployed"
        @recenter-map="recenterMap"
        @toggle-measure-mode="toggleMeasureMode"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @toggle-fence-mode="toggleFenceMode"
        @show-tides="showTideModal = true"
        @set-anchor="showSetAnchorDialog = true"
        @cancel-anchor="showCancelDialog = true"
      />
    </div>
  </ion-page>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { createLogger } from "@/services/logger";
import {
  useStateDataStore,
  calculateDistanceMeters,
  calculateDestinationLatLon,
} from "@/stores/stateDataStore";
import { usePreferencesStore } from "@/stores/preferences";
import { UnitConversion } from "@/shared/unitConversion";
import { debounce, throttle } from "lodash-es";
import { getComputedAnchorLocation } from "@/stores/stateDataStore";
import { useDeviceHeading } from "@/composables/useDeviceHeading.js";

// Component imports
import AnchorInfoGrid from "@/components/AnchorInfoGrid.vue";
import GenericHeader from "@/components/GenericHeader.vue";
import AnchorInspectorModal from "@/components/anchor/AnchorInspectorModal.vue";
import AnchorToolbar from "@/components/anchor/AnchorToolbar.vue";
import UpdateDropModal from "@/components/anchor/UpdateDropModal.vue";
import CancelAnchorModal from "@/components/anchor/CancelAnchorModal.vue";
import FenceListModal from "@/components/anchor/FenceListModal.vue";
import FenceConfigModal from "@/components/anchor/FenceConfigModal.vue";
import AISModal from "@/components/anchor/AISModal.vue";
import TideModal from "@/components/anchor/TideModal.vue";
import SetAnchorModal from "@/components/anchor/SetAnchorModal.vue";
import DropAnchorModal from "@/components/anchor/DropAnchorModal.vue";

// Router setup

// Ionic imports
import {
  IonPage,
  IonButton,
  IonSpinner,
  toastController,
} from "@ionic/vue";

// OpenLayers imports
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { Style, Stroke, Fill } from "ol/style";
import CircleStyle from "ol/style/Circle";
import { fromLonLat, toLonLat } from "ol/proj";
import { Point } from "ol/geom";
import Polygon from "ol/geom/Polygon";
import LineString from "ol/geom/LineString";

import { useMapTools } from "@/utils/mapUtils.js";
import { useAnchorFeatureRegistry } from "@/composables/anchor/useAnchorFeatureRegistry.js";
import { useAnchorAnimation } from "@/composables/anchor/useAnchorAnimation.js";
import { useAnchorMeasureMode } from "@/composables/anchor/useAnchorMeasureMode.js";
import { useAnchorFenceMode } from "@/composables/anchor/useAnchorFenceMode.js";
import { useAnchorFencePersistence } from "@/composables/anchor/useAnchorFencePersistence.js";
import { useAnchorFenceFeatures } from "@/composables/anchor/useAnchorFenceFeatures.js";
import { useAnchorDropNowFlow } from "@/composables/anchor/useAnchorDropNowFlow.js";
import { useAnchorResetCommands } from "@/composables/anchor/useAnchorResetCommands.js";
import { useAnchorUpdateAcks } from "@/composables/anchor/useAnchorUpdateAcks.js";
import { useAnchorMapClickActions } from "@/composables/anchor/useAnchorMapClickActions.js";
import { useAnchorViewWatchers } from "@/composables/anchor/useAnchorViewWatchers.js";
import { useAnchorMapInitialization } from "@/composables/anchor/useAnchorMapInitialization.js";
import { useAnchorViewLifecycle } from "@/composables/anchor/useAnchorViewLifecycle.js";
import { useAnchorDepthResolution } from "@/composables/anchor/useAnchorDepthResolution.js";
import { useAnchorCommands } from "@/composables/anchor/useAnchorCommands.js";
import { useAisModalTarget } from "@/composables/anchor/useAisModalTarget.js";
import { useMapManagement } from "@/composables/useMapManagement.js";
import { useMapInteractions } from "@/composables/useMapInteractions.js";
import { STYLES, createWindIndicatorStyle } from "@/utils/mapStyles";
import { relayConnectionBridge } from "@/relay/client/RelayConnectionBridge.js";
import { directConnectionAdapter } from "@/services/directConnectionAdapter.js";

const logger = createLogger("AnchorView");
logger.info("Initializing AnchorView component...");

// Constants
const FEATURE_TYPES = {
  BOAT: "boat",
  AIS: "ais",
  BREADCRUMB: "breadcrumb",
  CIRCLE: "circle",
  BOAT_RANGE: "boat-range",
  ANCHOR_DROP_LOCATION: "anchor-drop-location",
  ANCHOR_LOCATION: "anchor-location",
  RODE: "rode",
  WIND: "wind",
  MEASURE_PIN_A: "measure-pin-a",
  MEASURE_PIN_B: "measure-pin-b",
  MEASURE_LINE: "measure-line",
  MEASURE_LABEL: "measure-label",
  FENCE_TARGET: "fence-target",
  FENCE_RANGE: "fence-range",
  FENCE_LINK: "fence-link",
};

// Store integration
const stateStore = useStateDataStore();
const { state, breadcrumbs: storeBreadcrumbs } = storeToRefs(stateStore);
const preferencesStore = usePreferencesStore();
const { preferences } = storeToRefs(preferencesStore);
const navigationState = computed(() => state.value.navigation);
const anchorState = computed(() => state.value.anchor);
const alertState = computed(() => state.value.alerts?.active);

const dropNowSessionActive = ref(false);
const dropNowCapturedDepth = ref(null);
const dropNowValidationError = ref("");
const pendingAnchorUpdateAction = ref(null);
const hasAppliedDropNowMeasuredPrefill = ref(false);
const showSetAnchorDialog = ref(false);
const showDropAnchorDialog = ref(false);

const isLengthUnits = (unitsCandidate) => unitsCandidate === "m" || unitsCandidate === "ft";

const resolveRealtimeDropDepthDatum = () => {
  const preferredUnits = isMetric.value ? "m" : "ft";
  if (preferredUnits !== "m" && preferredUnits !== "ft") {
    return null;
  }

  const rawDepth = navigationState.value?.depth?.belowTransducer?.value;
  const rawUnits = navigationState.value?.depth?.belowTransducer?.units;
  if (typeof rawDepth !== "number" || Number.isNaN(rawDepth)) {
    return null;
  }
  if (rawUnits !== "m" && rawUnits !== "ft") {
    return null;
  }

  let value = rawDepth;
  if (rawUnits === "m" && preferredUnits === "ft") {
    value = rawDepth * 3.28084;
  }
  if (rawUnits === "ft" && preferredUnits === "m") {
    value = rawDepth * 0.3048;
  }

  return {
    value,
    units: preferredUnits,
  };
};

const resolveDropNowDepthForFinalize = () => {
  const captured = dropNowCapturedDepth.value;
  if (
    captured &&
    typeof captured === "object" &&
    typeof captured.value === "number" &&
    Number.isFinite(captured.value) &&
    isLengthUnits(captured.units)
  ) {
    return captured;
  }

  const stateDepth = anchorState.value?.anchorDropLocation?.depth;
  if (
    stateDepth &&
    typeof stateDepth === "object" &&
    typeof stateDepth.value === "number" &&
    Number.isFinite(stateDepth.value) &&
    isLengthUnits(stateDepth.units)
  ) {
    return stateDepth;
  }

  return null;
};

const normalizeBearingToDegrees = (bearingCandidate) => {
  if (typeof bearingCandidate === "number" && Number.isFinite(bearingCandidate)) {
    if (Math.abs(bearingCandidate) <= Math.PI * 2) {
      return ((bearingCandidate * 180) / Math.PI + 360) % 360;
    }
    return bearingCandidate;
  }

  if (!bearingCandidate || typeof bearingCandidate !== "object") {
    return null;
  }

  if (typeof bearingCandidate.degrees === "number" && Number.isFinite(bearingCandidate.degrees)) {
    return bearingCandidate.degrees;
  }

  const value = bearingCandidate.value;
  const units = bearingCandidate.units;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (typeof units === "string") {
    const normalizedUnits = units.toLowerCase();
    if (normalizedUnits === "rad" || normalizedUnits === "radian" || normalizedUnits === "radians") {
      return ((value * 180) / Math.PI + 360) % 360;
    }
    if (normalizedUnits === "deg" || normalizedUnits === "degree" || normalizedUnits === "degrees") {
      return value;
    }
  }

  if (Math.abs(value) <= Math.PI * 2) {
    return ((value * 180) / Math.PI + 360) % 360;
  }

  return value;
};

const resolveCoordinateDegrees = (coordinateCandidate) => {
  if (typeof coordinateCandidate === "number" && Number.isFinite(coordinateCandidate)) {
    return coordinateCandidate;
  }

  if (!coordinateCandidate || typeof coordinateCandidate !== "object") {
    return null;
  }

  const value = coordinateCandidate.value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
};

const calculateBoatToAnchorBearingDegrees = () => {
  const boatPosition = navigationState.value?.position;
  const anchorPosition =
    anchorState.value?.anchorDropLocation?.position ||
    anchorState.value?.anchorLocation?.position;

  const boatLat = resolveCoordinateDegrees(boatPosition?.latitude);
  const boatLon = resolveCoordinateDegrees(boatPosition?.longitude);
  const anchorLat = resolveCoordinateDegrees(anchorPosition?.latitude);
  const anchorLon = resolveCoordinateDegrees(anchorPosition?.longitude);

  if (
    typeof boatLat !== "number" ||
    !Number.isFinite(boatLat) ||
    typeof boatLon !== "number" ||
    !Number.isFinite(boatLon) ||
    typeof anchorLat !== "number" ||
    !Number.isFinite(anchorLat) ||
    typeof anchorLon !== "number" ||
    !Number.isFinite(anchorLon)
  ) {
    return null;
  }

  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const boatLatRad = toRad(boatLat);
  const anchorLatRad = toRad(anchorLat);
  const deltaLonRad = toRad(anchorLon - boatLon);

  const y = Math.sin(deltaLonRad) * Math.cos(anchorLatRad);
  const x =
    Math.cos(boatLatRad) * Math.sin(anchorLatRad) -
    Math.sin(boatLatRad) * Math.cos(anchorLatRad) * Math.cos(deltaLonRad);

  const bearingDegrees = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  if (typeof bearingDegrees === "number" && Number.isFinite(bearingDegrees)) {
    return bearingDegrees;
  }

  return null;
};

const resolveFinalizeBearingDegrees = () => {
  const candidates = [
    anchorState.value?.anchorDropLocation?.bearing,
    anchorState.value?.anchorDropLocation?.originalBearing,
    anchorState.value?.anchorLocation?.bearing,
    anchorState.value?.setBearing,
    anchorState.value?.dropSession?.measured?.currentBearing,
    anchorState.value?.dropSession?.measured?.bearing,
    anchorState.value?.dropSession?.measured?.current?.bearing,
    anchorState.value?.dropSession?.measured?.bearingDegrees,
    anchorState.value?.dropSession?.measured?.current?.bearingDegrees,
  ];

  for (const candidate of candidates) {
    const normalizedDegrees = normalizeBearingToDegrees(candidate);
    if (typeof normalizedDegrees === "number" && Number.isFinite(normalizedDegrees)) {
      return normalizedDegrees;
    }
  }

  const vectorBearingDegrees = calculateBoatToAnchorBearingDegrees();
  if (typeof vectorBearingDegrees === "number" && Number.isFinite(vectorBearingDegrees)) {
    return vectorBearingDegrees;
  }

  return null;
};

const applyDropNowMeasuredPrefill = () => {
  const measured = anchorState.value?.dropSession?.measured;
  if (!measured || typeof measured !== "object") {
    return false;
  }

  const measuredRodeAmount = measured?.rode?.amount;
  const measuredRodeUnits = measured?.rode?.units;
  if (
    typeof measuredRodeAmount === "number" &&
    Number.isFinite(measuredRodeAmount) &&
    isLengthUnits(measuredRodeUnits) &&
    anchorState.value?.rode
  ) {
    anchorState.value.rode.amount = measuredRodeAmount;
    anchorState.value.rode.units = measuredRodeUnits;
  }

  const measuredWarningRange = measured?.warningRange?.r;
  const measuredWarningUnits = measured?.warningRange?.units;
  if (
    typeof measuredWarningRange === "number" &&
    Number.isFinite(measuredWarningRange) &&
    isLengthUnits(measuredWarningUnits) &&
    anchorState.value?.warningRange
  ) {
    anchorState.value.warningRange.r = measuredWarningRange;
    anchorState.value.warningRange.units = measuredWarningUnits;
  }

  const measuredCriticalRange = measured?.criticalRange?.r;
  const measuredCriticalUnits = measured?.criticalRange?.units;
  if (
    typeof measuredCriticalRange === "number" &&
    Number.isFinite(measuredCriticalRange) &&
    isLengthUnits(measuredCriticalUnits) &&
    anchorState.value?.criticalRange
  ) {
    anchorState.value.criticalRange.r = measuredCriticalRange;
    anchorState.value.criticalRange.units = measuredCriticalUnits;
  }

  return true;
};

const {
  isDropNowDeploying,
  confirmDropAnchor,
  handleFinalizeDropNow,
  handleSetAnchorModalCancel,
} = useAnchorDropNowFlow({
  logger,
  stateStore,
  anchorState,
  showSetAnchorDialog,
  showDropAnchorDialog,
  dropNowSessionActive,
  dropNowCapturedDepth,
  dropNowValidationError,
  pendingAnchorUpdateAction,
  hasAppliedDropNowMeasuredPrefill,
  isLengthUnits,
  resolveRealtimeDropDepthDatum,
  applyDropNowMeasuredPrefill,
  resolveFinalizeBearingDegrees,
  resolveDropNowDepthForFinalize,
});

const hasLoggedFramingDebugThisEntry = ref(false);
const hasAppliedDefaultFramingThisEntry = ref(false);
const isMapRenderReady = ref(false);
const isAnchorViewActive = ref(false);

// FAB fade state
const fabsFaded = ref(false);
let fadeTimeout = null;

// Reset fade timer
function resetFadeTimer() {
  fabsFaded.value = false;
  if (fadeTimeout) {
    clearTimeout(fadeTimeout);
  }
  fadeTimeout = setTimeout(() => {
    fabsFaded.value = true;
  }, 3000); // Fade after 3 seconds
}

const attachDefaultFramingListener = () => {
  if (!map.value) return;
  if (isMapRenderReadyFromComposable.value !== true) return;
  if (hasAppliedDefaultFramingThisEntry.value === true) return;

  const attemptApply = () => {
    if (hasAppliedDefaultFramingThisEntry.value === true) {
      map.value?.un?.("postrender", attemptApply);
      return;
    }

    const applied = applyDefaultFramingOnEnter();
    if (applied === true) {
      map.value?.un?.("postrender", attemptApply);
    }
  };

  map.value.on("postrender", attemptApply);
  attemptApply();
  if (typeof map.value.render === "function") {
    map.value.render();
  }
};

const fenceConnectorLinesVisible = computed(() => {
  if (!anchorState.value) {
    return false;
  }
  const configured = anchorState.value.fenceConnectorLinesVisible;
  if (typeof configured === "boolean") {
    return configured;
  }
  return true;
});

const isDarkMode = computed(() => preferences.value?.display?.darkMode || false);

// Map Management - Simple approach for testing
const { 
  map, 
  mapElement, 
  isMapRenderReady: isMapRenderReadyFromComposable,
  initializeMap: initializeMapComposable,
} = useMapManagement('openstreetmap', isDarkMode, { destroyOnUnmount: false });

// Keep a mutable vectorSource reference so we can swap to provider source after map init
let vectorSource = new VectorSource();

const {
  updateFeature,
  updateFeatureGroup,
  clearFeature,
  clearAll,
  getFeatureByType,
  resetCache: resetFeatureRegistry,
} = useAnchorFeatureRegistry(() => vectorSource);

// Map Interactions
const {
  setupInteractions,
} = useMapInteractions(map, vectorSource);

// Calculate anchor depth in preferred units for tide component
// Returns depth in user's preferred units (ft or m) and the unit label
const anchorDepthWithUnits = computed(() => {
  const depth = navigationState.value?.depth?.belowTransducer?.value;
  const depthUnit = navigationState.value?.depth?.belowTransducer?.units;
  
  if (typeof depth !== 'number' || Number.isNaN(depth)) return { depth: null, units: null };
  
  // Determine preferred units
  const preferredUnit = isMetric.value ? 'm' : 'ft';
  
  // Convert to preferred units
  if (depthUnit === 'm' && preferredUnit === 'ft') {
    return { depth: depth * 3.28084, units: 'ft' };
  } else if (depthUnit === 'ft' && preferredUnit === 'm') {
    return { depth: depth * 0.3048, units: 'm' };
  }
  return { depth, units: depthUnit }; // Already in preferred units
});

// Helper function to format time
function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

// Get current tide level from hourly data (interpolated)
const getCurrentTideLevel = () => {
  const tideData = stateStore.state.tides;
  const hourlyTimes = tideData?.hourly?.time;
  const hourlyLevels = tideData?.hourly?.values?.seaLevelHeightMsl;
  if (!Array.isArray(hourlyTimes) || !Array.isArray(hourlyLevels)) return null;
  
  const minLen = Math.min(hourlyTimes.length, hourlyLevels.length);
  if (minLen < 1) return null;
  
  const now = new Date();
  const nowMs = now.getTime();
  
  const points = [];
  for (let i = 0; i < minLen; i++) {
    const t = new Date(hourlyTimes[i]);
    const v = hourlyLevels[i];
    if (Number.isNaN(t.getTime()) || typeof v !== 'number' || Number.isNaN(v)) continue;
    points.push({ time: t.getTime(), level: v });
  }
  
  if (points.length === 0) return null;
  points.sort((a, b) => a.time - b.time);
  
  const first = points[0];
  const last = points[points.length - 1];
  
  if (nowMs <= first.time) return first.level;
  if (nowMs >= last.time) return last.level;
  
  // Linear interpolation
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (nowMs >= a.time && nowMs <= b.time) {
      const dt = b.time - a.time;
      if (dt === 0) return a.level;
      const ratio = (nowMs - a.time) / dt;
      return a.level + (b.level - a.level) * ratio;
    }
  }
  return null;
};
const boatDimensions = computed(() => {
  const id = localStorage.getItem("activeBoatId");
  if (!id) return { draft: null, safeAnchoringDepth: null };
  
  try {
    const raw = localStorage.getItem(`boatInfo:${id}`);
    if (!raw) return { draft: null, safeAnchoringDepth: null };
    const parsed = JSON.parse(raw);
    return {
      draft: typeof parsed.draft === 'number' ? parsed.draft : null,
      safeAnchoringDepth: typeof parsed.safeAnchoringDepth === 'number' ? parsed.safeAnchoringDepth : null
    };
  } catch (error) {
    return { draft: null, safeAnchoringDepth: null };
  }
});

// Tide extremes table for display when not anchored
const tideExtremesTable = computed(() => {
  const tideData = stateStore.state.tides;
  const predictions = tideData?.tideEvents?.predictions;
  if (!Array.isArray(predictions) || predictions.length === 0) return null;
  
  const now = new Date();
  const nowMs = now.getTime();
  
  // Time windows in milliseconds
  const windows = [
    { label: 'Next', hours: Infinity, endMs: Infinity },
    { label: '24h', hours: 24, endMs: nowMs + (24 * 60 * 60 * 1000) },
    { label: '48h', hours: 48, endMs: nowMs + (48 * 60 * 60 * 1000) },
    { label: '72h', hours: 72, endMs: nowMs + (72 * 60 * 60 * 1000) },
  ];
  
  const rows = [];
  
  for (const window of windows) {
    // Filter predictions within this window
    const windowPreds = predictions.filter(p => {
      const t = new Date(p.time);
      if (Number.isNaN(t.getTime())) return false;
      const tMs = t.getTime();
      return tMs >= nowMs && tMs <= window.endMs;
    });
    
    if (windowPreds.length === 0) {
      rows.push({
        label: window.label,
        high: '--',
        low: '--'
      });
      continue;
    }
    
    // Find highest high and lowest low
    let maxHigh = null;
    let minLow = null;
    
    for (const p of windowPreds) {
      if (p.type === 'H') {
        if (maxHigh == null || p.height > maxHigh.height) {
          maxHigh = p;
        }
      } else if (p.type === 'L') {
        if (minLow == null || p.height < minLow.height) {
          minLow = p;
        }
      }
    }
    
    // Format values - calculate actual water depth at anchor position
    // Formula: currentDepth - currentTide + predictedTide = future water depth
    // NOAA tide data is always in feet
    const formatValue = (predictedTideHeight, time) => {
      if (predictedTideHeight == null) return '--';
      const t = time ? formatTime(time) : '';
      
      // Get current depth below transducer
      const depth = anchorDepthWithUnits.value?.depth;
      const depthUnits = anchorDepthWithUnits.value?.units || 'ft';
      
      if (depth != null) {
        // Get current tide level and convert to depth units
        const currentTideHeightFt = getCurrentTideLevel();
        
        // Convert predicted tide height to depth units
        let predictedInDepthUnits = predictedTideHeight;
        let currentInDepthUnits = currentTideHeightFt;
        
        if (depthUnits === 'm') {
          predictedInDepthUnits = predictedTideHeight * 0.3048;
          if (currentInDepthUnits != null) {
            currentInDepthUnits = currentInDepthUnits * 0.3048;
          }
        }
        
        // Calculate water depth: currentDepth - currentTide + predictedTide
        // This accounts for where we are on the tide curve
        let waterDepth;
        if (currentInDepthUnits != null) {
          waterDepth = (depth - currentInDepthUnits + predictedInDepthUnits).toFixed(1);
        } else {
          // Fallback if no current tide data
          waterDepth = (depth + predictedInDepthUnits).toFixed(1);
        }
        
        return `${waterDepth}${depthUnits} -- ${t}`;
      } else {
        // Fallback: show tide height relative to chart datum
        return `${predictedTideHeight.toFixed(1)}ft -- ${t}`;
      }
    };
    
    const highText = formatValue(maxHigh?.height, maxHigh?.time ? new Date(maxHigh.time) : null);
    const lowText = formatValue(minLow?.height, minLow?.time ? new Date(minLow.time) : null);
    
    // Get current depth and current tide for accurate calculation
    const currentDepth = anchorDepthWithUnits.value?.depth;
    const depthUnits = anchorDepthWithUnits.value?.units || 'ft';
    const currentTideHeightFt = getCurrentTideLevel();
    
    // Determine low tide color based on calculated water depth vs boat dimensions
    let lowClass = 'low-cell-safe'; // default green
    if (minLow && currentDepth != null) {
      // Convert predicted tide height to depth units
      let predictedTideInDepthUnits = minLow.height;
      let currentTideInDepthUnits = currentTideHeightFt;
      
      if (depthUnits === 'm') {
        predictedTideInDepthUnits = minLow.height * 0.3048;
        if (currentTideInDepthUnits != null) {
          currentTideInDepthUnits = currentTideInDepthUnits * 0.3048;
        }
      }
      
      // Calculate water depth at low tide: currentDepth - currentTide + predictedTide
      let waterDepthAtLowTide;
      if (currentTideInDepthUnits != null) {
        waterDepthAtLowTide = currentDepth - currentTideInDepthUnits + predictedTideInDepthUnits;
      } else {
        // Fallback
        waterDepthAtLowTide = currentDepth + predictedTideInDepthUnits;
      }
      
      const { draft, safeAnchoringDepth } = boatDimensions.value;
      
      if (typeof draft === 'number' && waterDepthAtLowTide < draft) {
        // Water depth less than draft = red (danger)
        lowClass = 'low-cell-danger';
      } else if (typeof safeAnchoringDepth === 'number' && waterDepthAtLowTide < safeAnchoringDepth) {
        // Water depth less than safe anchoring depth (but >= draft) = orange (warning)
        lowClass = 'low-cell-warning';
      }
    }
    
    rows.push({
      label: window.label,
      high: highText,
      low: lowText,
      lowClass
    });
  }
  
  return rows;
});

const { headingDegrees: deviceHeadingDegrees, start: startDeviceHeading } = useDeviceHeading();

const hasTriedPhoneBearing = ref(false);

// Custom anchor drop depth variable for user-entered depth
const customAnchorDropDepthValue = ref(null);

// Maximum depth for anchor drop slider (in user's preferred units)
const anchorDropDepthMax = computed(() => {
  const maxDepthMeters = 100; // 100 meters max (~330 feet)
  return isMetric.value ? maxDepthMeters : Math.round(maxDepthMeters * 3.28084);
});

// Label for custom anchor drop depth slider
const customAnchorDropDepthLabel = computed(() => {
  const depth = anchorDepthWithUnits.value?.depth;
  const units = anchorDepthWithUnits.value?.units;
  return depth != null && units ? `Depth at Anchor: ${depth.toFixed(1)}${units}` : 'Depth at Anchor: --';
});

const showPhoneBearingToast = async (message) => {
  try {
    const toast = await toastController.create({
      message,
      duration: 2500,
      position: "bottom",
      color: "warning",
      cssClass: "phone-bearing-toast",
    });
    await toast.present();
  } catch (e) {
    logger.error("Error showing phone bearing toast", e);
  }
};

const waitForDeviceHeading = async (timeoutMs) => {
  if (deviceHeadingDegrees.value != null) {
    return deviceHeadingDegrees.value;
  }

  return await new Promise((resolve) => {
    const stopWatch = watch(deviceHeadingDegrees, (val) => {
      if (val == null) {
        return;
      }
      stopWatch();
      clearTimeout(timeoutHandle);
      resolve(val);
    });

    const timeoutHandle = setTimeout(() => {
      stopWatch();
      resolve(null);
    }, timeoutMs);
  });
};

const applyPhoneBearing = async () => {
  hasTriedPhoneBearing.value = true;

  const started = await startDeviceHeading();
  if (!started) {
    await showPhoneBearingToast("Unable to access phone direction.");
    return;
  }

  const nextDegrees = await waitForDeviceHeading(1500);
  if (nextDegrees == null) {
    await showPhoneBearingToast("No phone direction available. Try moving the phone.");
    return;
  }

  if (!anchorState.value) {
    return;
  }

  if (!anchorState.value.anchorDropLocation) {
    return;
  }

  if (!anchorState.value.anchorDropLocation.bearing) {
    return;
  }

  anchorState.value.anchorDropLocation.bearing.degrees = nextDegrees;
};

const aisTargets = computed(() => {
  const targetsObj = state.value.aisTargets || {};
  // Convert object to array for component compatibility
  const result = Object.values(targetsObj);
  return result;
});

const hasActiveAisAlert = computed(() => stateStore.anchorAisWarning === true);

const aisAlertTargets = computed(() => {
  const warningRangeObj = anchorState.value?.warningRange;
  const warningRadiusRaw = warningRangeObj?.r;
  if (typeof warningRadiusRaw !== "number" || Number.isNaN(warningRadiusRaw) || warningRadiusRaw <= 0) {
    return [];
  }

  const boatLat = boatPosition.value?.latitude?.value ?? boatPosition.value?.latitude;
  const boatLon = boatPosition.value?.longitude?.value ?? boatPosition.value?.longitude;
  if (typeof boatLat !== "number" || typeof boatLon !== "number") {
    return [];
  }
  if (Number.isNaN(boatLat) || Number.isNaN(boatLon)) {
    return [];
  }

  const warningRadiusMeters = (() => {
    if (warningRangeObj?.units === "ft") {
      return warningRadiusRaw / 3.28084;
    }
    if (warningRangeObj?.units === "m") {
      return warningRadiusRaw;
    }
    return isMetric.value ? warningRadiusRaw : warningRadiusRaw / 3.28084;
  })();

  return aisTargets.value
    .filter((target) => {
      const lat = target?.position?.latitude;
      const lon = target?.position?.longitude;
      return typeof lat === "number" && typeof lon === "number" && !Number.isNaN(lat) && !Number.isNaN(lon);
    })
    .map((target) => {
      const lat = target.position.latitude;
      const lon = target.position.longitude;
      const distanceMeters = calculateDistanceMeters(boatLat, boatLon, lat, lon, true);
      return {
        mmsi: target.mmsi,
        name: typeof target.name === "string" && target.name.length > 0 ? target.name : "Unknown Vessel",
        distanceMeters,
      };
    })
    .filter(
      (target) =>
        typeof target.distanceMeters === "number" &&
        !Number.isNaN(target.distanceMeters) &&
        target.distanceMeters <= warningRadiusMeters
    );
});

// Floating anchor status computed properties
const anchorStatusText = computed(() => {
  if (!anchorState.value) return 'Not Anchored';
  if (isDropNowDeploying.value) return 'Deploying';
  if (anchorState.value.dragging) return 'DRAGGING';
  if (hasActiveAisAlert.value) return 'AIS PROXIMITY WARNING';
  if (anchorState.value.anchorDeployed) return 'Anchored';
  return 'Not Anchored';
});

const anchorStatusClass = computed(() => {
  if (!anchorState.value) return 'status-not-anchored';
  if (isDropNowDeploying.value) return 'status-deploying';
  if (anchorState.value.dragging) return 'status-dragging';
  if (hasActiveAisAlert.value) return 'status-ais-warning';
  if (anchorState.value.anchorDeployed) return 'status-anchored';
  return 'status-not-anchored';
});

// Unit system handling
const isMetric = computed(() => {
  const useImperial = preferences.value?.units?.useImperial;
  if (useImperial === false) {
    return true; // Metric
  }
  if (useImperial === true) {
    return false; // Imperial
  }
  // Fallback to current rode units if preferences missing
  const rodeUnits = state.value.anchor?.rode?.units;
  if (rodeUnits === "m") {
    return true;
  }
  if (rodeUnits === "ft") {
    return false;
  }
  // Default to imperial (legacy behavior)
  return false;
});

const getBoatLonLatForMeasure = () => {
  const pos = stateStore.state?.navigation?.position;
  if (!pos || !pos.latitude || !pos.longitude) return null;
  const lat = pos.latitude.value;
  const lon = pos.longitude.value;
  if (lat == null || lon == null) return null;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return [lon, lat];
};

const {
  measureModeEnabled,
  toggleMeasureMode,
  handleMeasureMapClick,
  syncMeasurementWithBoat,
  cleanupMeasureMode,
} = useAnchorMeasureMode({
  map,
  isDarkMode,
  isMetric,
  getVectorSource: () => vectorSource,
  featureTypes: FEATURE_TYPES,
  clearFeature,
  calculateDistanceMeters,
  fromLonLat,
  toLonLat,
  getBoatLonLatForMeasure,
});

const disableMeasureModeForFence = () => {
  if (measureModeEnabled.value === true) {
    void toggleMeasureMode();
  }
};

const {
  fenceModeEnabled,
  showFenceConfigModal,
  showFenceListModal,
  selectedFenceTarget,
  fenceName,
  fenceRangeInput,
  fenceReferenceType,
  fenceValidationError,
  toggleFenceMode,
  startFenceSelectionFromList,
  handleFenceModalCancel,
  handleFenceReferenceChange,
  handleFenceMapClick,
  resetFenceDraft,
} = useAnchorFenceMode({
  map,
  toLonLat,
  featureTypes: FEATURE_TYPES,
  logger,
  getAnchorState: () => anchorState.value,
  disableMeasureMode: disableMeasureModeForFence,
});

const { buildAisModalTarget } = useAisModalTarget({
  isMetric,
  calculateDistanceMeters,
});

const {
  normalizeDepthDatum,
  resolveAnchorDropDepth,
} = useAnchorDepthResolution();

const boatPosition = computed(() => {
  const filtered = anchorState.value?.filteredBoatPosition?.position;
  const raw = navigationState.value?.position;

  if (
    filtered &&
    filtered.latitude?.value != null &&
    filtered.longitude?.value != null
  ) {
    return filtered;
  }

  return raw;
});
const anchorDeployed = computed(() => anchorState.value?.anchorDeployed);
const anchorDropLocation = computed(() => anchorState.value?.anchorDropLocation);

// console.log("anchorState.value:", anchorState.value);
// console.log("anchorState getter:", anchorState);

const breadcrumbs = computed(() => {
  const anchorHistory = anchorState.value?.history;
  if (Array.isArray(anchorHistory) && anchorHistory.length > 0) {
    return anchorHistory;
  }
  const trackedBreadcrumbs = storeBreadcrumbs.value;
  if (Array.isArray(trackedBreadcrumbs) && trackedBreadcrumbs.length > 0) {
    return trackedBreadcrumbs;
  }
  return [];
});

// ScaleLine watch removed - no longer using this control

// Dynamic range bounds based on unit system
const criticalRangeMax = computed(() => (isMetric.value ? 100 : 300)); // 300m ≈ 1000ft
const rodeRangeMax = computed(() => (isMetric.value ? 100 : 300)); // 100m ≈ 330ft
const warningRangeMax = computed(() => (isMetric.value ? 20 : 300)); // 20m ≈ 300ft

logger.debug("Current state:", state.value);
logger.debug("Anchor state:", anchorState.value);
logger.debug("Alert state:", alertState.value);

// // Log full state every minute for debugging
// const logFullStateInterval = setInterval(() => {
//   console.log("[AnchorView] Full state snapshot:", {
//     timestamp: new Date().toISOString(),
//     fullState: state.value
//   });
// }, 60000); // 60 seconds

// // Log immediately on component setup
// console.log("[AnchorView] Full state snapshot (initial):", {
//   timestamp: new Date().toISOString(),
//   fullState: state.value
// });

// Map tools
const { validateCoordinates } = useMapTools(map, vectorSource);

const anchorInfoContainer = ref(null);

const hasCenteredOnBoatThisEntry = ref(null);

const getAnchorTargetCoord = () => {
  const anchor = anchorState.value;
  if (anchor?.anchorDeployed !== true) return null;

  const dropPos = anchor?.anchorDropLocation?.position;
  const anchorPos = anchor?.anchorLocation?.position;
  const pos = anchorPos ?? dropPos;
  if (!pos) return null;

  const lat = pos.latitude?.value ?? pos.latitude;
  const lon = pos.longitude?.value ?? pos.longitude;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { lon, lat, coord: fromLonLat([lon, lat]) };
};

const applyDefaultFramingOnEnter = () => {
  if (!map.value) return false;
  const view = map.value.getView();
  if (!view) return false;

  map.value.updateSize();
  const size = map.value.getSize();

  // Validate map size
  if (!Array.isArray(size) || size.length !== 2) return false;
  if (typeof size[0] !== "number" || typeof size[1] !== "number") return false;
  if (!(size[0] >= 200) || !(size[1] >= 200)) return false;

  const anchor = anchorState.value;
  const isAnchorDeployed = anchor?.anchorDeployed === true;
  const anchorTarget = getAnchorTargetCoord();

  // If anchor deployed but no target coord yet, keep retrying
  if (isAnchorDeployed === true && !anchorTarget) return false;

  if (anchorTarget) {
    const critical = anchor?.criticalRange;
    const rawRadius = critical?.r ?? critical?.value;
    const units = critical?.units || anchor?.rode?.units;

    // Convert radius to meters
    let radiusMeters = null;
    if (typeof rawRadius === "number" && !Number.isNaN(rawRadius)) {
      const u = typeof units === "string" ? units.toLowerCase() : null;
      if (u && u.startsWith("m")) {
        radiusMeters = rawRadius;
      } else if (u && u.startsWith("ft")) {
        radiusMeters = rawRadius / 3.28084;
      }
    }

    if (typeof radiusMeters === "number" && radiusMeters > 0) {
      // Calculate zoom to fit critical range at 80% of smaller dimension
      const minDimPx = Math.min(size[0], size[1]);
      const targetRadiusPx = 0.8 * minDimPx / 2;

      // Account for latitude distortion in Web Mercator
      const latRad = (anchorTarget.lat * Math.PI) / 180;
      const scaleFactor = Math.cos(latRad);
      const projectedRadius = radiusMeters / scaleFactor;
      const resolution = projectedRadius / targetRadiusPx;

      if (resolution > 0 && Number.isFinite(resolution)) {
        // Get actual DOM element dimensions and force map to use them
        const mapEl = mapElement.value;
        const domRect = mapEl ? mapEl.getBoundingClientRect() : null;
        
        if (domRect && domRect.width > 0 && domRect.height > 0) {
          // Use DOM dimensions for calculations
          const domWidth = Math.round(domRect.width);
          const domHeight = Math.round(domRect.height);
          const domMinDim = Math.min(domWidth, domHeight);
          const domTargetRadiusPx = 0.8 * domMinDim / 2;
          const domResolution = projectedRadius / domTargetRadiusPx;

          // Force the map to use the correct size
          map.value.setSize([domWidth, domHeight]);
          
          view.setResolution(domResolution);
          view.setCenter(anchorTarget.coord);
          map.value.render();
          
          hasAppliedDefaultFramingThisEntry.value = true;
          return true;
        }
      }
    }

    // Couldn't calculate zoom, just center on anchor
    view.setCenter(anchorTarget.coord);
    if (isAnchorDeployed === true) return false;

    hasAppliedDefaultFramingThisEntry.value = true;
    return true;
  }

  // No anchor, center on boat with responsive zoom
  const boatCoord = getBoatCenterCoord();
  if (!boatCoord) return false;
  view.setCenter(boatCoord);
  view.setZoom(getResponsiveZoom()); // Set responsive zoom when no anchor
  hasAppliedDefaultFramingThisEntry.value = true;
  return true;
};

watch(
  anchorDeployed,
  (next, prev) => {
    if (prev === true) return;
    if (next !== true) return;
    if (!map.value) return;

    hasAppliedDefaultFramingThisEntry.value = false;
    const attempt = () => {
      if (!map.value) return;
      map.value.updateSize();
      attachDefaultFramingListener();
    };

    // In practice, anchor state can flip to deployed before the map is fully render-ready.
    // Queue a postrender attempt to ensure framing applies using the final map size.
    map.value.once?.("postrender", attempt);
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(attempt);
    }
    if (typeof map.value.render === "function") {
      map.value.render();
    }
  },
  { immediate: false }
);

// Feature Updates

const {
  animateBoatPosition,
  setCurrentBoatPositionFromLatLon,
  getAnimatedBoatLonLat,
  stopAnimations,
} = useAnchorAnimation({
  fromLonLat,
  toLonLat,
  getFeatureByType,
  featureTypes: FEATURE_TYPES,
  getState: () => stateStore.state,
  getAnchorState: () => anchorState.value,
  onRodeMissing: () => updateRodeLine(),
  onBoatAnimationFrame: () => {
    if (typeof updateFenceFeatures === "function") {
      updateFenceFeatures();
    }
  },
});

const updateBoatPosition = debounce(() => {
  // Get the raw state to ensure we're accessing the data directly
  const state = stateStore.state;
  const pos = state?.navigation?.position;

  logger.debug("updateBoatPosition called with position:", pos ? {
    latitude: pos.latitude?.value,
    longitude: pos.longitude?.value
  } : "No position data");

  // Skip the update if either latitude or longitude is null or undefined
  if (
    !pos ||
    !pos.latitude ||
    !pos.longitude ||
    pos.latitude.value === null ||
    pos.longitude.value === null
  ) {
    logger.debug("Skipping boat position update - invalid coordinates");
    return;
  }

  // Get coordinates directly from state
  const lat = pos.latitude.value;
  const lon = pos.longitude.value;

  // Additional validation to ensure we have numeric values
  if (typeof lat !== "number" || typeof lon !== "number" || isNaN(lat) || isNaN(lon)) {
    logger.debug("Skipping boat position update - non-numeric coordinates");
    return;
  }

  logger.debug("Updating boat position:", { lat, lon });

  // Check if boat feature exists
  const boatFeature = getFeatureByType(FEATURE_TYPES.BOAT);
  
  if (!boatFeature) {
    // First time - create the feature with full styling
    const point = new Point(fromLonLat([lon, lat]));
    
    // Clone style and set rotation
    const boatStyle = typeof STYLES.BOAT?.clone === "function" ? STYLES.BOAT.clone() : STYLES.BOAT;
    
    try {
      const img = boatStyle?.getImage?.();
      if (img && typeof img.setRotation === "function") {
        const iconOffset = -Math.PI / 4 + Math.PI; // Combined: rotate 135 degrees total to fix boat orientation
        const isAnchorDeployed = state?.anchor?.anchorDeployed === true;
        
        if (isAnchorDeployed) {
          const anchorPos = state?.anchor?.anchorLocation?.position;
          if (anchorPos) {
            const anchorLat = anchorPos.latitude?.value ?? anchorPos.latitude;
            const anchorLon = anchorPos.longitude?.value ?? anchorPos.longitude;
            if (typeof anchorLat === "number" && typeof anchorLon === "number") {
              const dLon = anchorLon - lon;
              const dLat = anchorLat - lat;
              const angleToAnchor = Math.atan2(dLon, dLat);
              img.setRotation(angleToAnchor + iconOffset + Math.PI);
            }
          }
        } else {
          const headingTrueDeg = state?.navigation?.course?.heading?.true?.value;
          const cogDeg = state?.navigation?.course?.cog?.value;
          const angleDeg = typeof headingTrueDeg === "number" ? headingTrueDeg 
            : typeof cogDeg === "number" ? cogDeg : null;
          
          if (typeof angleDeg === "number" && Number.isFinite(angleDeg)) {
            const headingRad = (angleDeg * Math.PI) / 180;
            img.setRotation(headingRad + iconOffset + Math.PI);
          }
        }
      }
    } catch (e) {
      // If rotation fails, continue without rotation
    }
    
    updateFeature(FEATURE_TYPES.BOAT, point, boatStyle);
    
    // Debug: Check if boat feature was added
    const addedBoatFeature = getFeatureByType(FEATURE_TYPES.BOAT);
    logger.debug("Boat feature added successfully:", {
      featureExists: !!addedBoatFeature,
      totalFeatures: vectorSource.getFeatures().length
    });
    
    // Initialize current boat position for future animations
    setCurrentBoatPositionFromLatLon(lat, lon);
  } else {
    // Feature exists - update rotation and animate position
    try {
      let style = boatFeature.getStyle();
      if (typeof style === 'function') {
        style = style(boatFeature, 0);
      }
      if (style) {
        const img = style.getImage?.();
        if (img && typeof img.setRotation === "function") {
          const iconOffset = -Math.PI / 4 + Math.PI;
          const isAnchorDeployed = state?.anchor?.anchorDeployed === true;
          
          if (isAnchorDeployed) {
            const anchorPos = state?.anchor?.anchorLocation?.position;
            if (anchorPos) {
              const anchorLat = anchorPos.latitude?.value ?? anchorPos.latitude;
              const anchorLon = anchorPos.longitude?.value ?? anchorPos.longitude;
              if (typeof anchorLat === "number" && typeof anchorLon === "number") {
                const dLon = anchorLon - lon;
                const dLat = anchorLat - lat;
                const angleToAnchor = Math.atan2(dLon, dLat);
                img.setRotation(angleToAnchor + iconOffset + Math.PI);
                boatFeature.changed();
              }
            }
          } else {
            const headingTrueDeg = state?.navigation?.course?.heading?.true?.value;
            const cogDeg = state?.navigation?.course?.cog?.value;
            const angleDeg = typeof headingTrueDeg === "number" ? headingTrueDeg 
              : typeof cogDeg === "number" ? cogDeg : null;
            
            if (typeof angleDeg === "number" && Number.isFinite(angleDeg)) {
              const headingRad = (angleDeg * Math.PI) / 180;
              img.setRotation(headingRad + iconOffset + Math.PI);
              boatFeature.changed();
            }
          }
        }
      }
    } catch (e) {
      // If rotation fails, continue
    }
    
    // Animate to new position
    animateBoatPosition(lat, lon, 500);
  }
}, 100);

const getBoatCenterCoord = () => {
  const pos = stateStore.state?.navigation?.position;
  
  if (!pos || !pos.latitude || !pos.longitude) return null;
  if (pos.latitude.value == null || pos.longitude.value == null) return null;

  const lat = pos.latitude.value;
  const lon = pos.longitude.value;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  
  return fromLonLat([lon, lat]);
};

const recenterMap = () => {
  hasAppliedDefaultFramingThisEntry.value = false;
  attachDefaultFramingListener();
};

// Track the last known valid position to prevent flickering
const lastKnownValidPosition = ref({
  hasPosition: false,
  timestamp: 0,
});

const resolveTopLevelPositionCoordinates = (positionState) => {
  if (!positionState || typeof positionState !== "object" || Array.isArray(positionState)) {
    return null;
  }

  if (
    Object.prototype.hasOwnProperty.call(positionState, "latitude") ||
    Object.prototype.hasOwnProperty.call(positionState, "longitude")
  ) {
    return positionState;
  }

  const sourceEntries = Object.values(positionState);
  if (!Array.isArray(sourceEntries) || sourceEntries.length === 0) {
    return null;
  }

  const matchedSource = sourceEntries.find((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return false;
    }
    const lat = candidate.latitude?.value ?? candidate.latitude;
    const lon = candidate.longitude?.value ?? candidate.longitude;
    return typeof lat === "number" && typeof lon === "number";
  });

  return matchedSource || null;
};

// Computed property to check if we have a valid position
const hasValidPosition = computed(() => {
  const state = stateStore.state;
  
  // Try navigation.position first (this is what updateBoatPosition uses)
  const navPos = state?.navigation?.position;
  let lat = navPos?.latitude?.value;
  let lon = navPos?.longitude?.value;
  
  // If navigation.position doesn't have valid data, try top-level position
  if (lat == null || lon == null) {
    const topPos = resolveTopLevelPositionCoordinates(state?.position);
    lat = topPos?.latitude?.value;
    lon = topPos?.longitude?.value;
  }
  
  const isValid = lat != null && lon != null && typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon);
 
  return isValid;
});

// Watch for valid position and update last known state
// Use immediate: true to check on component mount
watch(hasValidPosition, (isValid) => {
  if (isValid) {
    lastKnownValidPosition.value = {
      hasPosition: true,
      timestamp: Date.now(),
    };
    logger.debug("Valid position acquired", { timestamp: Date.now() });
  }
}, { immediate: true });

// Modal visibility state
const showTideModal = ref(false);
const showLocationModal = computed(() => {
  // Only show the modal if we've never had a valid position OR
  // if we haven't had a valid position for more than 10 seconds
  const shouldShowModal =
    !lastKnownValidPosition.value.hasPosition ||
    (!hasValidPosition.value && Date.now() - lastKnownValidPosition.value.timestamp > 10000);

  return shouldShowModal;
});

// Function to manually dismiss the location modal
const dismissLocationModal = () => {
  logger.info("User manually dismissed location modal");
  // Mark as having position even without valid data to allow user to proceed
  lastKnownValidPosition.value = {
    hasPosition: true,
    timestamp: Date.now(),
  };
};

const updateAnchorPoints = () => {
  logger.debug("Updating anchor points...");
  // Clear all anchor-related features
  clearFeature(FEATURE_TYPES.ANCHOR_DROP_LOCATION);
  clearFeature(FEATURE_TYPES.ANCHOR_LOCATION);

  // Check if anchorState exists first
  if (!anchorState.value) return;

  // Exit if anchor is not deployed
  if (!anchorDeployed.value) return;

  // Draw the anchor drop location
  const dropPos = anchorState.value.anchorDropLocation.position;
  if (dropPos) {
    const dropLat = dropPos.latitude?.value || dropPos.latitude;
    const dropLon = dropPos.longitude?.value || dropPos.longitude;

    if (typeof dropLat === "number" && typeof dropLon === "number") {
      // Draw the anchor drop location
      updateFeature(
        FEATURE_TYPES.ANCHOR_DROP_LOCATION,
        new Point(fromLonLat([dropLon, dropLat])),
        STYLES.ANCHOR_DROP_LOCATION
      );

      // If we have a current anchor position, draw it
      const anchorPos = anchorState.value.anchorLocation.position;
      if (anchorPos) {
        const anchorLat = anchorPos.latitude?.value || anchorPos.latitude;
        const anchorLon = anchorPos.longitude?.value || anchorPos.longitude;

        if (typeof anchorLat === "number" && typeof anchorLon === "number") {
          // Draw the current anchor position
          updateFeature(
            FEATURE_TYPES.ANCHOR_LOCATION,
            new Point(fromLonLat([anchorLon, anchorLat])),
            STYLES.ANCHOR_LOCATION
          );
        }
      }
    }
  }
};

// Helper function to create a circle with an accurate radius based on user's unit preferences
const createCircleWithRadius = (centerLonLat, radius) => {
  // In Web Mercator (EPSG:3857), the scale factor varies with latitude
  // At the equator, 1 degree is approximately 111,320 meters
  // The scale factor is approximately cos(latitude in radians)

  // Convert radius to meters if it's in feet (when isMetric is false)
  const radiusInMeters = radius;

  // Get the latitude in radians
  const latRad = (centerLonLat[1] * Math.PI) / 180;

  // Calculate the scale factor at this latitude
  // This compensates for the distortion in the Web Mercator projection
  const scaleFactor = Math.cos(latRad);

  // Adjust the radius to account for the distortion
  // At higher latitudes, we need a larger radius in projected coordinates
  // to represent the same physical distance
  const adjustedRadius = radiusInMeters / scaleFactor;

  // Convert center from [lon, lat] to projected coordinates
  const centerCoord = fromLonLat(centerLonLat);

  // Create a simple circle with the adjusted radius
  const numPoints = 60; // More points = smoother circle
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    // Calculate angle for this point
    const angle = (i * 2 * Math.PI) / numPoints;

    // Calculate point on the circle in projected coordinates
    const x = centerCoord[0] + adjustedRadius * Math.cos(angle);
    const y = centerCoord[1] + adjustedRadius * Math.sin(angle);

    // Add to points array
    points.push([x, y]);
  }

  // Close the polygon
  points.push(points[0]);

  // Create a polygon from the points
  return new Polygon([points]);
};

const getRenderedBoatFenceReferenceLonLat = () => {
  const boatFeature = getFeatureByType(FEATURE_TYPES.BOAT);
  const boatGeometry = boatFeature?.getGeometry?.();
  const boatCoord =
    boatGeometry && typeof boatGeometry.getCoordinates === "function"
      ? boatGeometry.getCoordinates()
      : null;

  if (!Array.isArray(boatCoord) || boatCoord.length < 2) {
    return null;
  }

  const projectedLonLat = toLonLat(boatCoord);
  const lon = projectedLonLat?.[0];
  const lat = projectedLonLat?.[1];

  if (typeof lat !== "number" || !Number.isFinite(lat)) {
    return null;
  }
  if (typeof lon !== "number" || !Number.isFinite(lon)) {
    return null;
  }

  return [lon, lat];
};

const { updateFenceFeatures } = useAnchorFenceFeatures({
  state,
  anchorState,
  boatPosition,
  getRenderedBoatLonLat: getRenderedBoatFenceReferenceLonLat,
  isDarkMode,
  fenceConnectorLinesVisible,
  featureTypes: FEATURE_TYPES,
  clearFeature,
  fromLonLat,
  getVectorSource: () => vectorSource,
  Feature,
  Point,
  LineString,
  Style,
  Stroke,
  Fill,
  CircleStyle,
  createCircleWithRadius,
  calculateDistanceMeters,
});

const getTrueWindDirectionDegrees = () => {
  // Use True Wind Direction (TWD) - North-up reference, not relative to boat
  const windDirection = state.value?.navigation?.wind?.true?.direction;
  const raw = windDirection?.degrees ?? windDirection?.value ?? windDirection;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
};

let currentWindRotation = 0;
let windRotationAnimationFrame = null;
let currentWindPosition = null; // Track current position
let isWindInitialLoad = true;

// Track if this is the initial AIS update to prevent false warnings on load
let isAisInitialLoad = true;
let hadAisTargetsInWarningRange = false;

// Update wind feature with specific rotation value
function updateWindFeatureWithRotation(rotation) {
  const windFeature = getFeatureByType(FEATURE_TYPES.WIND);
  if (!windFeature) return;
  
  // Get style - could be a function, single style, or array of styles
  let style = windFeature.getStyle();
  if (typeof style === 'function') {
    style = style(windFeature, 0); // 0 is resolution
  }
  if (!style) return;
  
  // Handle array of styles
  const styles = Array.isArray(style) ? style : [style];
  if (styles.length === 0) return;
  
  // Get the first style's image
  const firstStyle = styles[0];
  if (!firstStyle || typeof firstStyle.getImage !== 'function') return;
  
  const image = firstStyle.getImage();
  if (!image) return;
  
  // Update rotation
  image.setRotation(rotation);
  windFeature.changed();
}

function updateWindIndicatorScale() {
  if (!map.value) return;

  const view = map.value.getView();
  const zoom = view?.getZoom?.();
  const resolution = view?.getResolution?.();
  if (typeof zoom !== "number" || !Number.isFinite(zoom)) return;
  if (typeof resolution !== "number" || !Number.isFinite(resolution) || resolution <= 0) return;

  const windFeature = getFeatureByType(FEATURE_TYPES.WIND);
  if (!windFeature) return;

  const nextScale = getWindIndicatorScaleForResolution(resolution);
  let style = windFeature.getStyle();
  if (typeof style === "function") {
    style = style(windFeature, resolution);
  }
  const styles = Array.isArray(style) ? style : [style];
  const image = styles?.[0]?.getImage?.();
  if (!image || typeof image.setScale !== "function") return;

  image.setScale(nextScale);
  windFeature.changed();
}

const getWindIndicatorScaleForResolution = (resolution) => {
  if (typeof resolution !== "number" || !Number.isFinite(resolution) || resolution <= 0) {
    return 0.44;
  }

  // Keep the icon at a consistent fraction of the anchor-circle perimeter size on screen.
  const radiusMeters = getWindIndicatorRadiusMeters();
  const circleRadiusPixels = radiusMeters / resolution;
  const targetIconPixels = circleRadiusPixels * 0.32;
  const iconBasePixels = 64;

  // Clamp for readability across devices.
  const minScale = 0.24;
  const maxScale = 1.44;
  return Math.max(minScale, Math.min(maxScale, targetIconPixels / iconBasePixels));
};

const getWindIndicatorRadiusMeters = () => {
  const rawCriticalRadius = anchorState.value?.criticalRange?.r;
  const criticalUnits = anchorState.value?.criticalRange?.units || anchorState.value?.rode?.units || "m";
  const isMetricUnits = !criticalUnits.toLowerCase().startsWith("ft");
  if (typeof rawCriticalRadius === "number" && Number.isFinite(rawCriticalRadius)) {
    const criticalMeters = isMetricUnits ? rawCriticalRadius : rawCriticalRadius / 3.28084;
    if (Number.isFinite(criticalMeters) && criticalMeters >= 10) {
      return criticalMeters;
    }
  }

  return 50;
};

const updateWindIndicator = (centerLat, centerLon, radiusInMeters) => {
  if (typeof centerLat !== "number" || typeof centerLon !== "number") return;
  if (typeof radiusInMeters !== "number" || !Number.isFinite(radiusInMeters) || radiusInMeters < 10) {
    radiusInMeters = 50; // Default minimum radius
  }

  const windFromDegrees = getTrueWindDirectionDegrees();
  if (windFromDegrees == null) return;

  // Calculate target rim position
  let rim;
  try {
    rim = calculateDestinationLatLon(centerLat, centerLon, radiusInMeters, windFromDegrees);
  } catch (e) {
    return;
  }

  const rimLat = rim?.latitude;
  const rimLon = rim?.longitude;
  if (typeof rimLat !== "number" || typeof rimLon !== "number") return;

  const targetCoord = fromLonLat([rimLon, rimLat]);

  // Calculate target rotation
  const dLon = centerLon - rimLon;
  const dLat = centerLat - rimLat;
  const targetRotation = Math.atan2(dLon, dLat);

  // Check if wind feature already exists
  const existingFeature = getFeatureByType(FEATURE_TYPES.WIND);
  
  if (existingFeature) {
    // Get current position for direct updates
    const geometry = existingFeature.getGeometry();
    if (currentWindPosition) {
      // Keep latest tracked position.
    } else if (geometry) {
      const existingCoord = geometry.getCoordinates();
      if (Array.isArray(existingCoord)) {
        currentWindPosition = { x: existingCoord[0], y: existingCoord[1] };
      }
    } else {
      currentWindPosition = { x: targetCoord[0], y: targetCoord[1] };
    }
    
    // On initial load, set position directly without animation
    if (isWindInitialLoad) {
      const geom = existingFeature.getGeometry();
      if (geom && typeof geom.setCoordinates === 'function') {
        geom.setCoordinates(targetCoord);
      }
      // Update rotation directly
      const styles = existingFeature.getStyle();
      if (styles && Array.isArray(styles) && styles[0]) {
        const image = styles[0].getImage();
        if (image && typeof image.setRotation === 'function') {
          image.setRotation(targetRotation);
          existingFeature.changed();
        }
      }
      currentWindPosition = { x: targetCoord[0], y: targetCoord[1] };
      currentWindRotation = targetRotation;
      isWindInitialLoad = false;
      return;
    }
    
    // Snap to the final position immediately to avoid visible slide-in/out.
    const geom = existingFeature.getGeometry();
    if (geom && typeof geom.setCoordinates === "function") {
      geom.setCoordinates(targetCoord);
      existingFeature.changed();
    }

    // Apply rotation immediately after position update.
    animateWindRotation(targetRotation);
    updateWindIndicatorScale();
    currentWindPosition = { x: targetCoord[0], y: targetCoord[1] };
  } else {
    // Create new direction-only wind feature
    const currentResolution = map.value?.getView?.()?.getResolution?.();
    const initialScale = getWindIndicatorScaleForResolution(currentResolution);
    const windStyles = createWindIndicatorStyle(isDarkMode.value, targetRotation, initialScale);

    const windFeature = new Feature({
      geometry: new Point(targetCoord),
    });
    windFeature.set("type", FEATURE_TYPES.WIND);
    windFeature.setStyle(windStyles);
    vectorSource.addFeature(windFeature);
    updateWindIndicatorScale();
    
    // Initialize position tracking
    currentWindPosition = { x: targetCoord[0], y: targetCoord[1] };
    currentWindRotation = targetRotation;
    isWindInitialLoad = false;
  }
};

function animateWindRotation(targetRotation, duration = 350) {
  if (typeof targetRotation !== "number" || !Number.isFinite(targetRotation)) {
    return;
  }

  if (windRotationAnimationFrame) {
    cancelAnimationFrame(windRotationAnimationFrame);
    windRotationAnimationFrame = null;
  }

  let rotationDiff = targetRotation - currentWindRotation;
  while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
  while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;

  const startRotation = currentWindRotation;
  const finalRotation = startRotation + rotationDiff;
  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const nextRotation = startRotation + (finalRotation - startRotation) * eased;
    updateWindFeatureWithRotation(nextRotation);
    currentWindRotation = nextRotation;

    if (progress < 1) {
      windRotationAnimationFrame = requestAnimationFrame(step);
      return;
    }

    currentWindRotation = finalRotation;
    windRotationAnimationFrame = null;
  };

  windRotationAnimationFrame = requestAnimationFrame(step);
}

// Track if critical circle was already drawn to prevent clearing on re-mount
// Use sessionStorage to persist across component re-mounts
const criticalCircleDrawn = ref(sessionStorage.getItem('criticalCircleDrawn') === 'true');

const updateCriticalRangeCircle = debounce(() => {
  // Check if anchorState exists first
  if (!anchorState.value) {
    if (criticalCircleDrawn.value) {
      return; // Don't clear if circle was drawn
    }
    clearFeature(FEATURE_TYPES.CIRCLE);
    clearFeature(FEATURE_TYPES.WIND);
    return;
  }

  if (
    !anchorState.value.anchorDeployed ||
    !anchorState.value.anchorLocation ||
    !anchorState.value.criticalRange
  ) {
    // Clear any existing critical range circle
    if (!criticalCircleDrawn.value) {
      clearFeature(FEATURE_TYPES.CIRCLE);
      clearFeature(FEATURE_TYPES.WIND);
    }
    return;
  }

  const position = anchorState.value.anchorLocation.position;
  const latitude = position.latitude?.value ?? position.latitude;
  const longitude = position.longitude?.value ?? position.longitude;
  
  // Convert critical range to meters to match AnchorWidget logic
  const rawRadius = anchorState.value.criticalRange?.r;
  const units = anchorState.value?.criticalRange?.units || anchorState.value?.rode?.units || "m";
  
  // Validate radius before drawing
  if (typeof rawRadius !== "number" || !Number.isFinite(rawRadius) || rawRadius <= 0) {
    clearFeature(FEATURE_TYPES.CIRCLE);
    return;
  }
  
  const isMetricUnits = units && typeof units === "string" && !units.toLowerCase().startsWith("ft");
  const radiusInMeters = isMetricUnits ? rawRadius : rawRadius / 3.28084;
  
  // Debug: Compare boat position with circle center
  const boatPos = boatPosition.value;
  if (boatPos) {
    const boatLat = boatPos.latitude?.value ?? boatPos.latitude;
    const boatLon = boatPos.longitude?.value ?? boatPos.longitude;
    const distanceToCircle = calculateDistanceMeters(boatLat, boatLon, latitude, longitude);
    console.log('Boat to circle center:', {
      distance: distanceToCircle.toFixed(1) + 'm',
      boat: [boatLon, boatLat],
      circle: [longitude, latitude],
      radius: radiusInMeters.toFixed(1) + 'm',
      outside: distanceToCircle > radiusInMeters
    });
  }

  // Create a circle with the correct radius in meters
  const circleGeometry = createCircleWithRadius([longitude, latitude], radiusInMeters);

  // Use the circle for the feature
  const activeAlerts = Array.isArray(alertState.value) ? alertState.value : [];
  const hasCriticalRangeAlert = activeAlerts.some(
    (alert) => alert?.trigger === "critical_range" && alert?.status !== "resolved"
  );
  const lightModeCriticalStyle = new Style({
    stroke: new Stroke({
      color: "#DC2626",
      width: 3,
    }),
    fill: new Fill({
      color: "rgba(255, 255, 255, 0.35)",
    }),
  });

  const lightModeNormalStyle = new Style({
    stroke: new Stroke({
      color: "#15803D",
      width: 2.5,
    }),
    fill: new Fill({
      color: "rgba(255, 255, 255, 0.30)",
    }),
  });

  const rangeStyle = isDarkMode.value
    ? hasCriticalRangeAlert
      ? STYLES.CRITICAL_RANGE
      : STYLES.NORMAL_RANGE
    : hasCriticalRangeAlert
      ? lightModeCriticalStyle
      : lightModeNormalStyle;
  
  updateFeature(FEATURE_TYPES.CIRCLE, circleGeometry, rangeStyle);
  
  // Mark that critical circle has been drawn
  criticalCircleDrawn.value = true;
  sessionStorage.setItem('criticalCircleDrawn', 'true');

  updateWindIndicator(latitude, longitude, getWindIndicatorRadiusMeters());

  // Calculate distance between boat and anchor for verification
  if (boatPosition.value) {
    const boatLat = boatPosition.value.latitude;
    const boatLon = boatPosition.value.longitude;
    const distanceToAnchor = calculateDistanceMeters(
      boatLat,
      boatLon,
      latitude,
      longitude,
      isMetricUnits
    );

    logger.debug("Distance verification:", {
      boatPosition: [boatLon, boatLat],
      anchorPosition: [longitude, latitude],
      criticalRange: radiusInMeters,
      actualDistance: distanceToAnchor,
      difference: Math.abs(distanceToAnchor - radiusInMeters),
      percentError: (Math.abs(distanceToAnchor - radiusInMeters) / radiusInMeters) * 100,
    });

    // Critical range alerts are now handled by the server-side rule engine
    // Just log for debugging purposes
    if (distanceToAnchor > radiusInMeters) {
      logger.debug(
        `Distance to anchor: ${distanceToAnchor}, Critical range: ${radiusInMeters}`
      );
    }
  }

  logger.debug(
    `Circle created with radius: ${radiusInMeters} meters at latitude ${latitude}`
  );
}, 50);

watch(
  () => {
    // Use True Wind Direction (TWD) - North-up reference
    const windDirection = state.value?.navigation?.wind?.true?.direction;
    const raw = windDirection?.degrees ?? windDirection?.value ?? windDirection;
    return typeof raw === "number" ? raw : null;
  },
  () => {
    // Get anchor position from anchorLocation, not position
    const anchorPos = anchorState.value?.anchorLocation?.position;
    if (!anchorPos) return;
    const latitude = anchorPos.latitude?.value ?? anchorPos.latitude;
    const longitude = anchorPos.longitude?.value ?? anchorPos.longitude;
    if (typeof latitude !== "number" || typeof longitude !== "number") return;
    
    updateWindIndicator(latitude, longitude, getWindIndicatorRadiusMeters());
  }
);

watch(
  () => {
    const windSpeed = state.value?.navigation?.wind?.apparent?.speed;
    const raw = windSpeed?.value ?? windSpeed;
    return typeof raw === "number" ? raw : null;
  },
  () => {
    updateCriticalRangeCircle();
  }
);

// Watch for dark mode changes and update map tiles
watch(
  [isDarkMode, isMapRenderReadyFromComposable], // Watch both dark mode and map readiness
  ([newDarkMode, mapReady]) => {
    // Only update if map is ready
    if (mapReady && map.value) {
      const provider = map.value.__provider__;
      if (provider && typeof provider.updateTileSource === 'function') {
        provider.updateTileSource(newDarkMode);
      }
    }
  }
);

const updateRodeLine = throttle(() => {
  // Check if anchorState exists first
  if (!anchorState.value) {
    return;
  }

  // Exit if anchor is not deployed
  if (!anchorState.value.anchorDeployed) {
    clearFeature(FEATURE_TYPES.RODE);
    return;
  }

  // Get boat position using the same logic as boat initialization
  const state = stateStore.state;
  const pos = state?.navigation?.position;
  let boatLat, boatLon;

  const boatFeature = getFeatureByType(FEATURE_TYPES.BOAT);
  const boatGeometry = boatFeature?.getGeometry?.();
  const boatCoord =
    boatGeometry && typeof boatGeometry.getCoordinates === "function"
      ? boatGeometry.getCoordinates()
      : null;
  if (Array.isArray(boatCoord) && boatCoord.length >= 2) {
    const projectedLonLat = toLonLat(boatCoord);
    const featureLon = projectedLonLat?.[0];
    const featureLat = projectedLonLat?.[1];
    if (
      typeof featureLat === "number" &&
      Number.isFinite(featureLat) &&
      typeof featureLon === "number" &&
      Number.isFinite(featureLon)
    ) {
      boatLat = featureLat;
      boatLon = featureLon;
    }
  }

  const animatedBoatLonLat = getAnimatedBoatLonLat();
  if (
    (typeof boatLat !== "number" || typeof boatLon !== "number") &&
    animatedBoatLonLat
  ) {
    boatLon = animatedBoatLonLat.lon;
    boatLat = animatedBoatLonLat.lat;
  } else if (
    (typeof boatLat !== "number" || typeof boatLon !== "number") &&
    pos?.latitude?.value != null &&
    pos?.longitude?.value != null
  ) {
    boatLat = pos.latitude.value;
    boatLon = pos.longitude.value;
  } else if (typeof boatLat !== "number" || typeof boatLon !== "number") {
    const anchor = state?.anchor;
    if (anchor?.anchorLocation?.position) {
      const anchorPos = anchor.anchorLocation.position;
      boatLat = anchorPos.latitude?.value ?? anchorPos.latitude;
      boatLon = anchorPos.longitude?.value ?? anchorPos.longitude;
    } else if (anchor?.anchorDropLocation?.position) {
      const dropPos = anchor.anchorDropLocation.position;
      boatLat = dropPos.latitude?.value ?? dropPos.latitude;
      boatLon = dropPos.longitude?.value ?? dropPos.longitude;
    }
  }

  // Validate boat coordinates
  if (typeof boatLat !== "number" || typeof boatLon !== "number" || isNaN(boatLat) || isNaN(boatLon)) {
    return;
  }

  // Get anchor position
  const anchorPos = state?.anchor?.anchorLocation?.position;
  const anchorLat = anchorPos?.latitude?.value ?? anchorPos?.latitude;
  const anchorLon = anchorPos?.longitude?.value ?? anchorPos.longitude;

  // Validate anchor coordinates (no fallbacks)
  if (typeof anchorLat !== "number" || typeof anchorLon !== "number" || isNaN(anchorLat) || isNaN(anchorLon)) {
    return;
  }


  // Simple validation
  if (
    !Number.isFinite(boatLon) ||
    !Number.isFinite(boatLat) ||
    !Number.isFinite(anchorLon) ||
    !Number.isFinite(anchorLat)
  ) {
    return;
  }

  if (!map.value || !vectorSource) {
    return;
  }

  let startCoord;
  let endCoord;

  try {
    // Create a direct feature without using the helper functions
    startCoord = fromLonLat([boatLon, boatLat]);
    endCoord = fromLonLat([anchorLon, anchorLat]);

    // Calculate the actual distance between boat and anchor - useful for debugging
    // const actualDistance = calculateDistanceMeters(
    //   boatLat,
    //   boatLon,
    //   anchorLat,
    //   anchorLon,
    //   isMetric.value
    // );

    // Get the rode length from the state - useful for debugging
    // const rodeLength = anchorState.value.rode?.value || 0;

    // logger.debug('Distance verification:', {
    //   boatPosition: [boatLon, boatLat],
    //   anchorPosition: [anchorLon, anchorLat],
    //   rodeLength: rodeLength,
    //   actualDistance: actualDistance,
    //   difference: Math.abs(actualDistance - rodeLength),
    //   percentError: rodeLength > 0 ? (Math.abs(actualDistance - rodeLength) / rodeLength) * 100 : 0
    // });

    // Create a custom style with high visibility
    const rodeStyle = new Style({
      stroke: new Stroke({
        color: "rgba(255, 87, 34, 0.8)", // Deep orange with 0.8 opacity
        width: 3,
        lineDash: [10, 5],
      }),
      zIndex: 100, // Ensure it's on top
    });

    const existingRodeFeature = getFeatureByType(FEATURE_TYPES.RODE);

    if (existingRodeFeature) {
      const geometry = existingRodeFeature.getGeometry();
      if (geometry && typeof geometry.setCoordinates === "function") {
        geometry.setCoordinates([startCoord, endCoord]);
      } else {
        existingRodeFeature.setGeometry(new LineString([startCoord, endCoord]));
      }
      existingRodeFeature.setStyle(rodeStyle);
      existingRodeFeature.changed();
    } else {
      // Create a line feature directly
      const rodeFeature = new Feature({
        geometry: new LineString([startCoord, endCoord]),
      });

      // Set the feature type and style
      rodeFeature.set("type", FEATURE_TYPES.RODE);
      rodeFeature.setStyle(rodeStyle);

      // Add the feature directly to the source
      vectorSource.addFeature(rodeFeature);
    }

    // We don't need to store the feature reference manually

    // Inspect the vector source
    // logger.debug('Vector source:', vectorSource);
    // logger.debug(`Vector source features: ${vectorSource.getFeatures().length}`);
    // logger.debug('Vector source feature types:', vectorSource.getFeatures().map(f => f.get('type')));

    // Force the map to render
    if (map.value && map.value.getRenderer?.()) {
      // logger.debug('Map object:', map.value);
      // map.value.renderSync();

      // Uncomment to debug layer visibility
      // const layers = map.value.getLayers().getArray();
      // logger.debug('Map layers:', layers);
      // layers.forEach((layer, i) => {
      //   logger.debug(`Layer ${i} visible:`, layer.getVisible());
      // });
    }

    // logger.debug('Rode line created with direct approach');
  } catch (error) {
    logger.error("Error creating rode line", { 
      error: error.message,
      boatLat,
      boatLon,
      anchorLat,
      anchorLon,
      startCoord,
      endCoord
    });
  }
}, 100);

// Function to select the appropriate AIS style based on target type
const getAisStyle = () => {
  // All AIS targets are now green and smaller by default
  // We're keeping the function in case we want to add special styling for certain vessel types in the future
  return STYLES.AIS_VESSEL;
};

const updateAisTargets = debounce(() => {
  // Skip initial load to prevent false warnings before data is ready
  if (isAisInitialLoad) {
    logger.debug("Skipping initial AIS update - waiting for data to settle");
    isAisInitialLoad = false;
    hadAisTargetsInWarningRange = false;
    return;
  }
  
  // Warning range config controls alerts, not rendering
  const warningRangeObj = anchorState.value?.warningRange;
  const rawWarningRadius = warningRangeObj?.r;

  const isAnchorDeployed = anchorState.value && anchorState.value.anchorDeployed;
  const boatLat = boatPosition.value?.latitude?.value ?? boatPosition.value?.latitude;
  const boatLon = boatPosition.value?.longitude?.value ?? boatPosition.value?.longitude;
  const hasValidBoatPosition = typeof boatLat === "number" && typeof boatLon === "number";
  
  logger.debug(`Updating ${aisTargets.value?.length || 0} AIS targets`);

  // Skip if no targets
  if (!aisTargets.value || aisTargets.value.length === 0) {
    logger.debug("No AIS targets, clearing feature");
    clearFeature(FEATURE_TYPES.AIS);
    hadAisTargetsInWarningRange = false;
    return;
  }

  // Get warning range radius - require explicit non-zero value to enable proximity alerts
  const warningRadius = (typeof rawWarningRadius === "number" && rawWarningRadius > 0) ? rawWarningRadius : null;
  const warningUnits = warningRangeObj?.units;
  
  // Track if warning range is configured for proximity alerts
  const isWarningRangeConfigured = warningRadius !== null;
  
  const effectiveWarningRadius = isWarningRangeConfigured ? (() => {
    if (warningUnits === "m" && isMetric.value === false) {
      return UnitConversion.mToFt(warningRadius);
    }
    if (warningUnits === "ft" && isMetric.value === true) {
      return UnitConversion.ftToM(warningRadius);
    }
    return warningRadius;
  })() : null;
  
  // Convert effectiveWarningRadius to meters for distance comparison
  const warningRadiusInMeters = effectiveWarningRadius ? (() => {
    if (isMetric.value) {
      return effectiveWarningRadius; // Already in meters
    } else {
      return effectiveWarningRadius / 3.28084; // Convert feet to meters
    }
  })() : null;
  logger.debug(`Warning range radius: ${warningRadius}`, {
    warningUnits,
    effectiveWarningRadius,
    effectiveUnits: isMetric.value ? "m" : "ft",
  });

  // Track if any targets are within warning range
  let hasTargetsInWarningRange = false;

  // Filter for valid targets and create features
  const validTargets = aisTargets.value
    .filter((target) => {
      // Check if target has valid coordinates
      if (!target || !target.position) return false;

      const lat = target.position.latitude;
      const lon = target.position.longitude;

      const isValid = typeof lat === "number" && typeof lon === "number";
      return isValid;
    })
    .map((target) => {
      // Extract coordinates from the position structure
      const lon = target.position.longitude;
      const lat = target.position.latitude;

      // Check if target is within warning range of boat
      let isInWarningRange = false;
      if (isAnchorDeployed && hasValidBoatPosition && isWarningRangeConfigured && warningRadiusInMeters) {
        // Calculate distance in meters (always use meters for comparison)
        const distanceInMeters = (() => {
          const R = 6371000; // Radius of the earth in meters
          const dLat = deg2rad(lat - boatLat);
          const dLon = deg2rad(lon - boatLon);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(boatLat)) *
              Math.cos(deg2rad(lat)) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c; // Always return meters
        })();

        // Compare meters to meters
        isInWarningRange = distanceInMeters <= warningRadiusInMeters;

        // Update the warning flag if any target is in range
        if (isInWarningRange) {
          hasTargetsInWarningRange = true;
          // logger.warn("TARGET IN WARNING RANGE", target);
        }
      }

      // Create a feature with the target's data
      const feature = new Feature({
        geometry: new Point(fromLonLat([lon, lat])),
        mmsi: target.mmsi,
        name: target.name || "Unknown Vessel",
        type: FEATURE_TYPES.AIS,
        isInWarningRange: isInWarningRange,
      });

      // Set the style based on whether it's in warning range
      if (isInWarningRange) {
        // Use the AIS_WARNING style for targets in warning range
        feature.setStyle(STYLES.AIS_WARNING);
      } else {
        // Use normal style for other targets
        feature.setStyle(getAisStyle(target));
      }

      return feature;
    });

  const wasInWarningRange = hadAisTargetsInWarningRange;
  logger.debug(`AIS targets in warning range: ${hasTargetsInWarningRange}`);

  if (!wasInWarningRange && hasTargetsInWarningRange) {
    const targetsInRange = validTargets.filter((feature) =>
      feature.get("isInWarningRange")
    ).length;

    logger.error("AIS PROXIMITY ALERT TRIGGERED", {
      wasInWarningRange,
      hasTargetsInWarningRange,
      targetsInRange,
      effectiveWarningRadius,
      isMetric: isMetric.value,
      isAnchorDeployed,
      hasValidBoatPosition,
      boatPosition: { lat: boatLat, lon: boatLon },
      validTargetsCount: validTargets.length,
      totalAisTargets: aisTargets.value?.length,
      warningRangeConfigured: isWarningRangeConfigured
    });

    const targetsInRangeDetails = validTargets
      .filter((feature) => feature.get("isInWarningRange"))
      .map((feature) => ({
        mmsi: feature.get("mmsi"),
        name: feature.get("name"),
        position: feature.getGeometry().getCoordinates()
      }));
    logger.error("TARGETS DETECTED IN RANGE:", targetsInRangeDetails);

    // Server will trigger the alert - removed client-side trigger
  }

  hadAisTargetsInWarningRange = hasTargetsInWarningRange;

  updateFeatureGroup(FEATURE_TYPES.AIS, validTargets);
}, 300);

const updateBreadcrumbs = debounce(() => {
  // Skip if no breadcrumbs
  if (!breadcrumbs.value || breadcrumbs.value.length === 0) {
    clearFeature(FEATURE_TYPES.BREADCRUMB);
    return;
  }

  logger.debug(`Updating ${breadcrumbs.value.length} breadcrumbs`);

  // Filter for valid breadcrumbs and create features
  const validCrumbs = breadcrumbs.value
    .filter((crumb) => {
      // Check if crumb has valid coordinates
      if (!crumb) {
        return false;
      }
      
      // Handle both coordinate structures: direct lat/lon or nested in position
      let lat, lon;
      
      if (crumb.position) {
        // New format: coordinates in position object
        lat = crumb.position.latitude?.value ?? crumb.position.latitude;
        lon = crumb.position.longitude?.value ?? crumb.position.longitude;
      } else {
        // Old format: direct coordinates
        lat = crumb.latitude?.value ?? crumb.latitude;
        lon = crumb.longitude?.value ?? crumb.longitude;
      }
      
      const isValid = typeof lat === "number" && typeof lon === "number";
      return isValid;
    })
    .map((crumb, idx, array) => {
      // Extract coordinates (handle both formats)
      let lon, lat;
      
      if (crumb.position) {
        // New format: coordinates in position object
        lon = crumb.position.longitude?.value ?? crumb.position.longitude;
        lat = crumb.position.latitude?.value ?? crumb.position.latitude;
      } else {
        // Old format: direct coordinates
        lon = crumb.longitude?.value ?? crumb.longitude;
        lat = crumb.latitude?.value ?? crumb.latitude;
      }

      const geometry = new Point(fromLonLat([lon, lat]));
      
      // Calculate age-based opacity (0 = newest, 1 = oldest)
      const age = array.length > 1 ? idx / (array.length - 1) : 0;
      const opacity = 1.0 - (age * 0.7); // Fade from 1.0 to 0.3
      
      // Dynamic color based on dark mode with age-based opacity
      const isDark = preferencesStore.darkMode;
      const fillColor = isDark 
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(0, 0, 0, ${opacity})`;
      const strokeColor = isDark
        ? `rgba(200, 200, 200, ${opacity})`
        : `rgba(51, 51, 51, ${opacity})`;
      
      const breadcrumbStyle = new Style({
        image: new CircleStyle({
          radius: 0.5,
          fill: new Fill({ color: fillColor }),
          stroke: new Stroke({ 
            color: strokeColor, 
            width: isDark ? 0.75 : 1 
          }),
        }),
        zIndex: 80,
      });

      return {
        geometry: geometry,
        style: breadcrumbStyle,
      };
    });

  logger.debug(`Found ${validCrumbs.length} valid breadcrumbs`);

  // Update the feature group
  updateFeatureGroup(FEATURE_TYPES.BREADCRUMB, validCrumbs);
}, 300);

const { initializeMap } = useAnchorMapInitialization({
  logger,
  stateStore,
  map,
  mapElement,
  isDarkMode,
  isMapRenderReadyFromComposable,
  initializeMapComposable,
  getResponsiveZoom: () => getResponsiveZoom(),
  getVectorSource: () => vectorSource,
  setVectorSource: (nextSource) => {
    vectorSource = nextSource;
  },
  resetFeatureRegistry,
  setupInteractions,
  attachDefaultFramingListener,
  hasAppliedDefaultFramingThisEntry,
  updateWindIndicatorScale,
  handleMapClick: () => handleMapClick,
  handleWheelEvent: () => handleWheelEvent,
});

// Function to update the boat-centered normal range circle
const updateBoatRangeCircle = debounce(() => {
  // Clear any existing boat range circle
  clearFeature(FEATURE_TYPES.BOAT_RANGE);

  // Skip if anchorState doesn't exist
  if (!anchorState.value) {
    return;
  }

  // Skip if anchor is not deployed
  if (!anchorState.value.anchorDeployed) {
    return;
  }

  // Skip if no boat position
  if (!boatPosition.value) {
    return;
  }

  // Get the boat position
  const lat = boatPosition.value.latitude?.value ?? boatPosition.value.latitude;
  const lon = boatPosition.value.longitude?.value ?? boatPosition.value.longitude;

  // Skip if invalid coordinates
  if (!validateCoordinates({ latitude: lat, longitude: lon })) {
    logger.debug("Invalid boat coordinates, skipping boat range update");
    return;
  }

  // Get the warning range radius for the boat-centered circle
  const radius = anchorState.value.warningRange?.r ?? 15; // Default to 15 if not set

  const warningUnits = anchorState.value?.warningRange?.units || anchorState.value?.rode?.units || "m";
  const isWarningMetric = !warningUnits.toLowerCase().startsWith("ft");
  const warningRadiusMeters = isWarningMetric ? radius : radius / 3.28084;

  // Create a circle with the warning range radius centered on the boat
  const circleGeometry = createCircleWithRadius([lon, lat], warningRadiusMeters);

  // Create a feature with the circle geometry
  const feature = new Feature({
    geometry: circleGeometry,
  });
  feature.set("type", FEATURE_TYPES.BOAT_RANGE);
  feature.setStyle(STYLES.BOAT_RANGE);

  // Add the feature to the vector source
  vectorSource.addFeature(feature);
}, 200);

useAnchorViewWatchers({
  logger,
  map,
  stateStore,
  state,
  anchorState,
  boatPosition,
  anchorDropLocation,
  anchorDeployed,
  aisTargets,
  breadcrumbs,
  isAisInitialLoad: () => isAisInitialLoad,
  measureModeEnabled,
  hasAppliedDefaultFramingThisEntry,
  toLonLat,
  fromLonLat,
  featureTypes: FEATURE_TYPES,
  clearFeature,
  updateBoatPosition,
  updateFenceFeatures,
  updateRodeLine,
  updateAnchorPoints,
  updateCriticalRangeCircle,
  updateBoatRangeCircle,
  updateAisTargets,
  updateBreadcrumbs,
  syncMeasurementWithBoat,
});

const dropAnchorPreview = computed(() => {
  const boatPosition = navigationState.value?.position;
  const latitude = boatPosition?.latitude?.value;
  const longitude = boatPosition?.longitude?.value;

  const depthValue = navigationState.value?.depth?.belowTransducer?.value;
  const depthUnits = navigationState.value?.depth?.belowTransducer?.units;
  const depthSource = "assumed_from_boat";

  const units = isMetric.value ? "m" : "ft";
  const rode = anchorState.value?.rode?.amount;
  const criticalRange = anchorState.value?.criticalRange?.r;
  const warningRange = anchorState.value?.warningRange?.r;

  const normalizedDepth = (() => {
    if (typeof depthValue !== "number" || Number.isNaN(depthValue)) {
      return null;
    }
    if (depthUnits === units) {
      return depthValue;
    }
    if (depthUnits === "m" && units === "ft") {
      return depthValue * 3.28084;
    }
    if (depthUnits === "ft" && units === "m") {
      return depthValue * 0.3048;
    }
    return null;
  })();

  return {
    latitude: typeof latitude === "number" && !Number.isNaN(latitude) ? latitude : null,
    longitude: typeof longitude === "number" && !Number.isNaN(longitude) ? longitude : null,
    depth: normalizedDepth,
    depthSource,
    rode: typeof rode === "number" && !Number.isNaN(rode) ? rode : null,
    criticalRange:
      typeof criticalRange === "number" && !Number.isNaN(criticalRange) ? criticalRange : null,
    warningRange:
      typeof warningRange === "number" && !Number.isNaN(warningRange) ? warningRange : null,
    units,
  };
});

const dropAnchorLowTideClearance = computed(() => {
  const scope = recommendedScope.value;
  if (!scope || typeof scope !== "object") {
    return { status: "unknown", text: "N/A" };
  }

  if (scope.missingBowRollerToWater === true) {
    return { status: "unknown", text: "N/A" };
  }

  const projectedDepth = scope.maxDepth;
  const units = scope.unit;
  if (typeof projectedDepth !== "number" || Number.isNaN(projectedDepth)) {
    return { status: "unknown", text: "N/A" };
  }

  const draft = boatDimensions.value?.draft;
  const safeAnchoringDepth = boatDimensions.value?.safeAnchoringDepth;

  if (typeof draft === "number" && !Number.isNaN(draft)) {
    const clearance = projectedDepth - draft;
    if (clearance < 0) {
      return {
        status: "danger",
        text: `Risk (${Math.abs(clearance).toFixed(1)} ${units} below draft)`,
      };
    }
  }

  if (typeof safeAnchoringDepth === "number" && !Number.isNaN(safeAnchoringDepth)) {
    const clearance = projectedDepth - safeAnchoringDepth;
    if (clearance < 0) {
      return {
        status: "warning",
        text: `Caution (${Math.abs(clearance).toFixed(1)} ${units} below safe depth)`,
      };
    }
  }

  return { status: "safe", text: "Safe" };
});

// Calculate recommended scope based on tide data
const recommendedScope = computed(() => {
  try {
    const reportedDepth = stateStore.state.navigation?.depth?.belowTransducer?.value;
    const tideData = stateStore.state.tides;

    const activeBoatId =
      typeof window !== "undefined" ? localStorage.getItem("activeBoatId") : null;
    const storedBowRollerKey = activeBoatId
      ? `boatDimensions:${activeBoatId}:bowRollerToWater`
      : "boatDimensions:bowRollerToWater";
    const storedBowRollerRaw =
      typeof window !== "undefined" ? localStorage.getItem(storedBowRollerKey) : null;

    const bowRollerFromState =
      stateStore.state?.vessel?.info?.dimensions?.bowRollerToWater?.value;
    const bowRollerToWaterPayload = (() => {
      if (typeof bowRollerFromState === "number" && !Number.isNaN(bowRollerFromState)) {
        const units = stateStore.state?.vessel?.info?.dimensions?.bowRollerToWater?.units;
        if (units === "ft" || units === "m") {
          return { value: bowRollerFromState, units };
        }
      }

      if (storedBowRollerRaw) {
        try {
          const parsed = JSON.parse(storedBowRollerRaw);
          if (
            parsed &&
            typeof parsed === "object" &&
            typeof parsed.value === "number" &&
            !Number.isNaN(parsed.value) &&
            (parsed.units === "ft" || parsed.units === "m")
          ) {
            return { value: parsed.value, units: parsed.units };
          }
        } catch (error) {
          return null;
        }
      }

      return null;
    })();

    // Debug logging removed for production

    if (reportedDepth == null) {
      return null;
    }

    if (!tideData) {
      return null;
    }

    if (!bowRollerToWaterPayload) {
      return { missingBowRollerToWater: true };
    }

    const now = new Date();
    const futureCutoff = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours from now

    const timeStamps = tideData?.hourly?.time;
    const seaLevels = tideData?.hourly?.values?.seaLevelHeightMsl;
    const seaLevelUnit = tideData?.units?.seaLevelHeight;

    if (!Array.isArray(timeStamps) || !Array.isArray(seaLevels)) {
      return null;
    }

    if (seaLevels.length === 0 || timeStamps.length === 0) {
      return null;
    }

    const minLength = Math.min(seaLevels.length, timeStamps.length);

    // Find maximum water level in the next 72 hours
    let maxFutureLevel = -Infinity;
    let currentLevel = null;

    // Find current water level (closest to now)
    const currentTime = new Date();
    let closestTimeDiff = Infinity;

    for (let i = 0; i < minLength; i++) {
      try {
        const entryTime = new Date(timeStamps[i]);
        const timeDiff = Math.abs(entryTime - currentTime);

        // Track the closest time to now for current level
        if (timeDiff < closestTimeDiff) {
          closestTimeDiff = timeDiff;
          currentLevel = seaLevels[i];
        }

        // Check if this entry is within our future window
        if (entryTime >= currentTime && entryTime <= futureCutoff) {
          const rawLevel = seaLevels[i];
          if (typeof rawLevel !== "number" || Number.isNaN(rawLevel)) {
            continue;
          }

          const level = (() => {
            // ALWAYS WORK IN METERS INTERNALLY - CRITICAL UNIT HANDLING RULE:
            // All calculations must be done in meters to avoid unit conversion errors.
            // Only convert to user units (feet/meters) at the very end for display.
            // This prevents double conversions and ensures consistency across all measurements.
            // CRITICAL: Always check source data units before conversion!
            // seaLevelUnit tells us the units of the raw tide data
            if (seaLevelUnit === "ft") return rawLevel / 3.28084;
            return rawLevel; // Assume meters if not feet
          })();

          if (level > maxFutureLevel) {
            maxFutureLevel = level;
          }
        }
      } catch (error) {
        // Skip invalid entries
      }
    }

    // Detailed tide processing logs removed for production

    // Log the range of tide data we have
    if (timeStamps.length > 0) {
      // Range of tide data is available but no longer logged to console
    }

    if (maxFutureLevel === -Infinity) {
      // Fall back to current level if no future data
      maxFutureLevel = currentLevel;
    }

    // Convert depth to meters if it's in feet (assuming the raw depth is in feet if using imperial)
    // CRITICAL UNIT HANDLING RULE: All internal calculations must use meters
    // CRITICAL: Always check source data units before conversion!
    // reportedDepth comes from navigation.depth.belowTransducer - check its units
    // bowRollerToWaterPayload.units tells us the units of bow roller measurement
    const depthInMeters = isMetric.value ? reportedDepth : reportedDepth / 3.28084;

    const bowRollerToWaterMeters =
      bowRollerToWaterPayload.units === "ft"
        ? bowRollerToWaterPayload.value / 3.28084
        : bowRollerToWaterPayload.value;

    // Calculate depth increase from current level to max future level (both in meters)
    // CRITICAL UNIT HANDLING RULE: Both maxFutureLevel and currentLevel are in meters
    // If we couldn't determine current water level, use the first available data point
    const referenceLevel = currentLevel !== null ? currentLevel : seaLevels[0] || 0;
    const depthIncreaseMeters =
      maxFutureLevel !== -Infinity ? Math.max(0, maxFutureLevel - referenceLevel) : 0;
    const targetDepthMeters = depthInMeters + bowRollerToWaterMeters + depthIncreaseMeters;

    // Depth increase calculation details are no longer logged to console

    // Convert to feet if using imperial units - ONLY CONVERT AT THE END FOR DISPLAY
    // CRITICAL UNIT HANDLING RULE: Apply unit conversion only once at the very end
    // CRITICAL: Always verify source units before applying conversions!
    const unitMultiplier = isMetric.value ? 1 : 3.28084;
    const unit = isMetric.value ? "m" : "ft";

    return {
      missingBowRollerToWater: false,
      currentDepth: depthInMeters * unitMultiplier,
      depthIncrease: depthIncreaseMeters * unitMultiplier,
      maxDepth: targetDepthMeters * unitMultiplier,
      scopeLength3to1: targetDepthMeters * 3 * unitMultiplier,
      scopeLength5to1: targetDepthMeters * 5 * unitMultiplier,
      scopeLength7to1: targetDepthMeters * 7 * unitMultiplier,
      recommendedCableLength: targetDepthMeters * 5 * unitMultiplier,
      bowRollerToWater: bowRollerToWaterMeters * unitMultiplier,
      unit: unit,
    };
  } catch (error) {
    console.error("Error calculating recommended scope:", error);
    logger.error("Error calculating recommended scope:", error);
    return null;
  }
});

const showUpdateDialog = ref(false);
const showCancelDialog = ref(false);
const showUpdateDropConfirm = ref(false);
const locationRequestFailed = ref(false);

const {
  handleFenceSave,
  removeFence,
} = useAnchorFencePersistence({
  logger,
  stateStore,
  anchorState,
  navigationState,
  isMetric,
  selectedFenceTarget,
  fenceName,
  fenceRangeInput,
  fenceReferenceType,
  fenceValidationError,
  normalizeDepthDatum,
  updateFenceFeatures,
  onFenceSaved: () => {
    showFenceConfigModal.value = false;
    fenceModeEnabled.value = false;
    resetFenceDraft();
  },
});

const {
  handleSaveAnchorParameters,
  handleSetAnchor,
} = useAnchorCommands({
  logger,
  stateStore,
  state,
  anchorState,
  navigationState,
  boatPosition,
  preferences,
  isMetric,
  customAnchorDropDepthValue,
  hasTriedPhoneBearing,
  showSetAnchorDialog,
  updateAisTargets,
  updateCriticalRangeCircle,
  updateBoatRangeCircle,
  updateRodeLine,
  updateAnchorPoints,
  resolveAnchorDropDepth,
  normalizeDepthDatum,
  validateCoordinates,
  getComputedAnchorLocation,
  calculateDistanceMeters,
  UnitConversion,
  nextTick,
});

// Handler for the anchor-dropped event from AnchorInfoGrid
const handleAnchorDropped = () => {
  logger.info("Handling anchor dropped event...");
  logger.debug("Received anchor-dropped event");

  // Call the handleSetAnchor method to perform all the necessary operations
  handleSetAnchor();
};

const {
  handleUpdateDropLocation,
  confirmUpdateDropLocation,
  handleCancelAnchor,
} = useAnchorResetCommands({
  logger,
  stateStore,
  anchorState,
  boatPosition,
  vectorSource,
  featureTypes: FEATURE_TYPES,
  styles: STYLES,
  updateBoatPosition,
  updateFenceFeatures,
  dropNowSessionActive,
  dropNowCapturedDepth,
  showUpdateDialog,
  showUpdateDropConfirm,
  showCancelDialog,
});

useAnchorUpdateAcks({
  logger,
  toastController,
  relayConnectionBridge,
  directConnectionAdapter,
  pendingAnchorUpdateAction,
  dropNowValidationError,
  showSetAnchorDialog,
  dropNowSessionActive,
  dropNowCapturedDepth,
  showDropAnchorDialog,
});

// AIS Modal state
const showAISModal = ref(false);
const selectedAISTarget = ref(null);

// Anchor Inspector Modal state
const showAnchorInspectorModal = ref(false);

const {
  handleMapClick,
  handleAnchorDroppedEvent,
} = useAnchorMapClickActions({
  logger,
  map,
  featureTypes: FEATURE_TYPES,
  state,
  handleMeasureMapClick,
  handleFenceMapClick,
  buildAisModalTarget,
  showAISModal,
  selectedAISTarget,
  updateAnchorPoints,
  updateCriticalRangeCircle,
  updateRodeLine,
  updateBoatRangeCircle,
});

const handleAnchorStatusClick = () => {
  if (isDropNowDeploying.value === true) {
    showSetAnchorDialog.value = true;
    return;
  }

  if (hasActiveAisAlert.value === true) {
    showAnchorInspectorModal.value = true;
    return;
  }

  if (anchorState.value?.anchorDeployed === true) {
    showAnchorInspectorModal.value = true;
    return;
  }

  showDropAnchorDialog.value = true;
};

// Computed properties for AnchorInspectorModal
const driftDisplay = computed(() => {
  // Calculate drift distance from drop location to current anchor position
  if (!anchorState.value?.anchorDropLocation?.position || !anchorState.value?.anchorLocation?.position) {
    return 'N/A';
  }
  
  const dropLat = anchorState.value.anchorDropLocation.position.latitude?.value || anchorState.value.anchorDropLocation.position.latitude;
  const dropLon = anchorState.value.anchorDropLocation.position.longitude?.value || anchorState.value.anchorDropLocation.position.longitude;
  const anchorLat = anchorState.value.anchorLocation.position.latitude?.value || anchorState.value.anchorLocation.position.latitude;
  const anchorLon = anchorState.value.anchorLocation.position.longitude?.value || anchorState.value.anchorLocation.position.longitude;
  
  const distance = calculateDistanceMeters(dropLat, dropLon, anchorLat, anchorLon);
  const units = isMetric.value ? 'm' : 'ft';
  const displayDistance = isMetric.value ? distance : distance * 3.28084;
  
  return `${displayDistance.toFixed(1)} ${units}`;
});

// Calculation functions for AnchorInspectorModal
const calculateDistanceBoatFromDrop = () => {
  if (!anchorState.value?.anchorDropLocation?.position || !navigationState.value?.position) {
    return 'N/A';
  }
  
  const dropLat = anchorState.value.anchorDropLocation.position.latitude?.value || anchorState.value.anchorDropLocation.position.latitude;
  const dropLon = anchorState.value.anchorDropLocation.position.longitude?.value || anchorState.value.anchorDropLocation.position.longitude;
  const boatLat = navigationState.value.position.latitude?.value || navigationState.value.position.latitude;
  const boatLon = navigationState.value.position.longitude?.value || navigationState.value.position.longitude;
  
  const distance = calculateDistanceMeters(dropLat, dropLon, boatLat, boatLon);
  return `${distance.toFixed(1)} m`;
};

const calculateDistanceAnchorFromDrop = () => {
  if (!anchorState.value?.anchorDropLocation?.position || !anchorState.value?.anchorLocation?.position) {
    return 'N/A';
  }
  
  const dropLat = anchorState.value.anchorDropLocation.position.latitude?.value || anchorState.value.anchorDropLocation.position.latitude;
  const dropLon = anchorState.value.anchorDropLocation.position.longitude?.value || anchorState.value.anchorDropLocation.position.longitude;
  const anchorLat = anchorState.value.anchorLocation.position.latitude?.value || anchorState.value.anchorLocation.position.latitude;
  const anchorLon = anchorState.value.anchorLocation.position.longitude?.value || anchorState.value.anchorLocation.position.longitude;
  
  const distance = calculateDistanceMeters(dropLat, dropLon, anchorLat, anchorLon);
  return `${distance.toFixed(1)} m`;
};

const calculateRodeLengthMeters = () => {
  const rode = anchorState.value?.rode;
  if (!rode?.amount) return 'N/A';
  
  const meters = rode.units === 'm' ? rode.amount : rode.amount * 0.3048;
  return `${meters.toFixed(1)} m`;
};

const calculateDropDepthMeters = () => {
  const depth = anchorState.value?.anchorDropLocation?.depth;
  if (!depth?.value) return 'N/A';
  
  const meters = depth.units === 'm' ? depth.value : depth.value * 0.3048;
  return `${meters.toFixed(1)} m`;
};

const calculateEffectiveRodeRadiusMeters = () => {
  const rode = anchorState.value?.rode;
  const depth = anchorState.value?.anchorDropLocation?.depth;
  
  if (!rode?.amount || !depth?.value) return 'N/A';
  
  const rodeMeters = rode.units === 'm' ? rode.amount : rode.amount * 0.3048;
  const depthMeters = depth.units === 'm' ? depth.value : depth.value * 0.3048;
  
  // Simple Pythagorean calculation for effective radius
  const effectiveRadius = Math.sqrt(Math.max(0, rodeMeters * rodeMeters - depthMeters * depthMeters));
  return `${effectiveRadius.toFixed(1)} m`;
};

const calculateAnchorHasMoved = () => {
  const threshold = isMetric.value ? 5 : 1.524; // 5m or ~16.4ft
  const distance = calculateDistanceBoatFromDrop();
  
  if (distance === 'N/A') return false;
  
  const distanceMeters = parseFloat(distance);
  return distanceMeters > threshold;
};

const calculateRodeCircleViolated = () => {
  const effectiveRadius = calculateEffectiveRodeRadiusMeters();
  const distance = calculateDistanceAnchorFromDrop();
  
  if (effectiveRadius === 'N/A' || distance === 'N/A') return false;
  
  const radiusMeters = parseFloat(effectiveRadius);
  const distanceMeters = parseFloat(distance);
  
  return distanceMeters > radiusMeters;
};

const handleWheelEvent = (event) => {
  logger.debug("Mouse wheel event", { deltaY: event.deltaY });
  // Only handle events on the map element
  if (!mapElement.value?.contains(event.target)) {
    return;
  }

  event.preventDefault();

  if (!map.value) return;

  const view = map.value.getView();
  if (!view) return;

  const currentZoom = view.getZoom();
  const delta = event.deltaY < 0 ? 0.5 : -0.5;
  const newZoom = Math.min(
    Math.max(currentZoom + delta, view.getMinZoom()),
    view.getMaxZoom()
  );

  view.animate({
    zoom: newZoom,
    duration: 250,
    center: view.getCenter(), // Keep current center
  });
  updateWindIndicatorScale();
};

// Custom zoom functions

// Get responsive zoom level based on device type
const getResponsiveZoom = () => {
  const width = window.innerWidth;
  
  if (width <= 768) {
    return 16; // Phone
  } else if (width <= 1024) {
    return 14; // Tablet
  } else {
    return 12; // Desktop
  }
};

const zoomIn = () => {
  logger.debug("Zooming in...");
  if (!map.value) return;
  const view = map.value.getView();
  if (!view) return;

  const currentZoom = view.getZoom();
  const newZoom = currentZoom + 1;

  // Get boat position for centering
  if (boatPosition.value?.latitude?.value && boatPosition.value?.longitude?.value) {
    const boatCoords = fromLonLat([
      boatPosition.value.longitude.value,
      boatPosition.value.latitude.value,
    ]);

    // Animate to new zoom level centered on boat
    view.animate({
      zoom: newZoom,
      center: boatCoords,
      duration: 250,
    });
    updateWindIndicatorScale();

    logger.debug("Zooming in to boat position", { newZoom, boatCoords });
  } else {
    // If no boat position, just change zoom without changing center
    view.animate({
      zoom: newZoom,
      duration: 250,
    });
    updateWindIndicatorScale();
  }
};

const zoomOut = () => {
  logger.debug("Zooming out...");
  if (!map.value) return;
  const view = map.value.getView();
  if (!view) return;

  const currentZoom = view.getZoom();
  const newZoom = currentZoom - 1;

  // Get boat position for centering
  if (boatPosition.value?.latitude?.value && boatPosition.value?.longitude?.value) {
    const boatCoords = fromLonLat([
      boatPosition.value.longitude.value,
      boatPosition.value.latitude.value,
    ]);

    // Animate to new zoom level centered on boat
    view.animate({
      zoom: newZoom,
      center: boatCoords,
      duration: 250,
    });
    updateWindIndicatorScale();

    logger.debug("Zooming out to boat position", { newZoom, boatCoords });
  } else {
    // If no boat position, just change zoom without changing center
    view.animate({
      zoom: newZoom,
      duration: 250,
    });
    updateWindIndicatorScale();
  }
};

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

useAnchorViewLifecycle({
  logger,
  map,
  mapElement,
  anchorState,
  boatPosition,
  isAnchorViewActive,
  isMapRenderReady,
  isMapRenderReadyFromComposable,
  hasCenteredOnBoatThisEntry,
  hasLoggedFramingDebugThisEntry,
  hasAppliedDefaultFramingThisEntry,
  attachDefaultFramingListener,
  applyDefaultFramingOnEnter,
  updateBoatPosition,
  updateAnchorPoints,
  updateCriticalRangeCircle,
  updateRodeLine,
  initializeMap,
  handleAnchorDroppedEvent,
  resetFadeTimer,
  clearFadeTimer: () => {
    if (fadeTimeout) {
      clearTimeout(fadeTimeout);
      fadeTimeout = null;
    }
  },
  stopAnimations,
  cleanupMeasureMode,
  clearAll,
  handleWheelEvent,
  // onCleanup: () => {
  //   if (logFullStateInterval) {
  //     clearInterval(logFullStateInterval);
  //   }
  // },
});

</script>

<style scoped>
.openlayers-map {
  width: 100%;
  height: 100%;
  min-height: 0;
  touch-action: none;
  overscroll-behavior: none;
  position: relative;
  z-index: 0;
}

.openlayers-map canvas {
  display: block;
}
.anchor-view-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: calc(100vh - 56px);
  position: fixed;
  top: 56px;
  left: 0;
  z-index: 1;
  padding-top: env(safe-area-inset-top, 0);
}

.anchor-info-section {
  flex-shrink: 0;
  z-index: 2;
  overflow: visible;
  width: 100%;
  box-sizing: border-box;
  margin-top: 8px;
}

/* Floating anchor status under the grid */
.floating-anchor-status {
  position: fixed;
  top: calc(var(--ion-safe-area-top, 0) + 145px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 1.1em;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-align: center;
  white-space: nowrap;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--app-text-color) 15%, transparent);
  transition: all 0.3s ease;
}

.status-anchored {
  background: color-mix(in srgb, var(--app-accent-soft-color) 90%, transparent);
  color: var(--app-accent-color);
  border: 1px solid var(--app-accent-color);
}

.status-not-anchored {
  background: color-mix(in srgb, var(--app-surface-color) 85%, var(--app-background-color) 15%);
  color: var(--app-muted-text-color);
  border: 1px solid var(--app-border-color);
}

.status-deploying {
  background: color-mix(in srgb, #f59e0b 22%, var(--app-surface-color) 78%);
  color: #fbbf24;
  border: 1px solid #f59e0b;
}

.status-dragging {
  background: color-mix(in srgb, var(--app-accent-color) 55%, var(--app-text-color) 45%);
  color: var(--app-accent-contrast-color);
  border: 1px solid color-mix(in srgb, var(--app-accent-color) 70%, var(--app-text-color) 30%);
  animation: blink 1s infinite;
}

.status-ais-warning {
  background: #dc2626;
  color: #ffffff;
  border: 1px solid #b91c1c;
  animation: blink 1s infinite;
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.55; }
  100% { opacity: 1; }
}

.map-section {
  flex: 1;
  position: relative;
  min-height: 0;
  touch-action: none;
  overscroll-behavior: none;
}

/* Map footer toolbar */
.map-footer-toolbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  z-index: 1000;
  background: var(--app-background-color);
  border-top: 1px solid color-mix(in srgb, var(--app-border-color) 50%, transparent);
  box-shadow: 0 -2px 10px color-mix(in srgb, var(--app-text-color) 8%, transparent);
}

.toolbar-button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: var(--app-accent-color);
  color: var(--app-accent-contrast-color);
  border: none;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--app-text-color) 18%, transparent);
  -webkit-tap-highlight-color: transparent; /* Remove tap highlight on mobile */
}

.zoom-button:hover {
  filter: brightness(1.08);
  transform: scale(1.1);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--app-text-color) 26%, transparent);
}

.zoom-button:active {
  filter: brightness(0.92);
  transform: scale(0.95);
}

.zoom-button.measure-toggle-active {
  background-color: #facc15 !important;
  background: #facc15 !important;
  color: #111827;
  box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.55),
    0 8px 18px rgba(250, 204, 21, 0.25);
}


.zoom-compact {
  width: 40px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--app-accent-color) 70%, transparent);
  background-color: var(--app-accent-color);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--app-text-color) 18%, transparent);
}

.zoom-compact-button {
  width: 40px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--app-accent-contrast-color);
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.zoom-compact-in {
  border-bottom: 1px solid color-mix(in srgb, var(--app-accent-contrast-color) 45%, transparent);
}

.zoom-compact-button:hover {
  filter: brightness(1.08);
}

.zoom-compact-button:active {
  filter: brightness(0.92);
}

.toolbar-zoom-group {
  display: flex;
  flex-direction: row;
  gap: 8px;
  background: color-mix(in srgb, var(--app-surface-color) 70%, transparent);
  border-radius: 22px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--app-border-color) 50%, transparent);
}

.toolbar-zoom-group .toolbar-button {
  width: 40px;
  height: 40px;
  background-color: transparent;
  color: var(--app-text-color);
  box-shadow: none;
}

.toolbar-zoom-group .toolbar-button:hover {
  background-color: color-mix(in srgb, var(--app-accent-color) 15%, transparent);
  filter: none;
}

.toolbar-zoom-group .toolbar-button:active {
  filter: brightness(0.9);
}

/* Hide zoom buttons on touch devices (phones/tablets) - pinch-to-zoom is available */
@media (hover: none) and (pointer: coarse) {
  .toolbar-zoom-group {
    display: none;
  }
}

/* Toolbar divider between map controls and anchor controls */
.toolbar-divider {
  width: 1px;
  height: 32px;
  background: color-mix(in srgb, var(--app-border-color) 70%, transparent);
  margin: 0 8px;
}

/* Toolbar icon image sizing */
.toolbar-icon {
  width: 22px;
  height: 22px;
  filter: brightness(0) invert(1);
}

/* Font Awesome icon in toolbar */
.toolbar-fa-icon {
  font-size: 20px;
  color: #ffffff;
}

.fence-modal-content {
  max-width: 420px;
}

:deep(.fence-modal-root::part(content)) {
  --max-width: 100%;
  --width: 100%;
  --height: 100%;
  --max-height: 100%;
  --border-radius: 0;
  margin: 0;
  padding-top: var(--ion-safe-area-top, 0);
  padding-bottom: var(--ion-safe-area-bottom, 0);
}

:deep(.fence-modal-root .fence-modal-content) {
  margin: 0 auto;
  width: min(100%, 420px);
  max-height: calc(100vh - var(--ion-safe-area-top, 0px) - var(--ion-safe-area-bottom, 0px) - 16px);
}

.fence-target-summary {
  margin: 0 0 12px;
}

.fence-form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  text-align: left;
}

.fence-form-row input,
.fence-form-row select {
  width: 100%;
  border: 1px solid var(--app-border-color);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--app-surface-color);
  color: var(--app-text-color);
}

.fence-empty-state {
  color: var(--app-muted-text-color);
  margin: 8px 0 16px;
}

.fence-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.fence-list-item {
  border: 1px solid var(--app-border-color);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.fence-list-title {
  font-weight: 600;
}

.fence-list-detail {
  color: var(--app-muted-text-color);
  font-size: 0.9em;
}

.toolbar-anchor-cancel:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

ion-page.page-container {
  width: 100vw;
  height: 100vh;
  min-height: 0;
  position: fixed;
  top: 0;
  left: 0;
  margin: 0;
  padding: 0;
  z-index: 0;
  overflow: hidden;
  background: var(--app-background-color);
  color: var(--app-text-color);
}
.map-wrapper {
  background: var(--app-background-color);
}

/* Zoom buttons removed - using native OpenLayers pinch-to-zoom functionality */

.anchor-fab-container {
  position: fixed;
  bottom: 80px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
  transition: opacity 0.5s ease;
  opacity: 1;
}

.anchor-fab-container.faded {
  opacity: 0.3;
}

.anchor-fab-container.faded:hover {
  opacity: 1;
}

.custom-fab-size {
  --size: 56px;
  margin: 5px;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.custom-fab-size[disabled] {
  opacity: 0.35;
}

.custom-icon {
  width: 24px;
  height: 24px;
}

.anchor-fab-icon {
  filter: brightness(0) invert(1);
}

.map-attribution {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 1000;
  background: color-mix(in srgb, var(--app-surface-color) 90%, transparent);
  color: var(--app-text-color);
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--app-border-color);
  box-shadow: 0 2px 4px color-mix(in srgb, var(--app-text-color) 16%, transparent);
  line-height: 1.4;
  opacity: 0.3;
  transition: opacity 0.5s ease;
}

.map-attribution.hidden {
  opacity: 0;
  pointer-events: none;
}

.map-attribution a {
  color: inherit;
  text-decoration: underline;
}

.map-wrapper .ol-scale-line {
  position: absolute !important;
  left: 50% !important;
  bottom: 12px !important;
  transform: translateX(-50%) !important;
  z-index: 1000 !important;
  pointer-events: none !important;
  display: block !important;
  text-align: center !important;
  float: none !important;
  width: auto !important;
}

.map-wrapper .ol-scale-bar,
.map-wrapper .ol-scale-line-inner {
  display: inline-block !important;
  margin: 0 auto !important;
  text-align: center !important;
  float: none !important;
}

.ol-scale-line-inner,
.ol-scale-bar {
  margin: 0 auto;
}

/* Modal Content */
.modal-content {
  padding: 20px;
  text-align: center;
  background: var(--app-surface-color);
  border: 1px solid var(--app-border-color);
  border-radius: 10px;
  max-width: 500px;
  margin: 10px auto;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  transform: translateY(0);
}

.set-anchor-modal {
  --background: var(--app-surface-color);
  --padding-top: calc(var(--ion-safe-area-top, 0px) + 12px);
  --padding-bottom: 24px;
  --padding-start: 0px;
  --padding-end: 0px;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

:deep(.set-anchor-modal-root::part(content)) {
  --max-width: 100%;
  --width: 100%;
  --height: 100%;
  --max-height: 100%;
  --border-radius: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  background: var(--app-surface-color);
  padding-bottom: var(--ion-safe-area-bottom, 0);
}

.modal-body {
  flex: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 0 24px 24px;
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.set-anchor-footer {
  --background: var(--app-surface-color);
  border-top: 1px solid var(--app-border-color);
}

.set-anchor-footer .set-anchor-toolbar {
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 2px;
  --padding-bottom: calc(var(--ion-safe-area-bottom, 0px) + 2px);
  --background: var(--app-surface-color);
  min-height: 0;
}

.set-anchor-footer .modal-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  width: 100%;
}

.set-anchor-footer .modal-actions ion-button {
  --padding-top: 10px !important;
  --padding-bottom: 10px !important;
  --padding-start: 20px !important;
  --padding-end: 20px !important;
  --border-radius: 8px !important;
  font-size: 1em !important;
  font-weight: 600 !important;
  height: 44px !important;
  margin: 0 !important;
  min-height: 44px !important;
}

.modal-toolbar {
  --padding-start: 24px;
  --padding-end: 24px;
  --padding-top: 10px;
  --padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 14px);
  --background: var(--app-surface-color);
}

.slider-label {
  width: 100%;
  font-weight: 600;
  font-size: 0.8em; /* Slightly smaller font */
  margin: 1px 0; /* Reduced margin */
  padding: 0 8px; /* Reduced padding */
  letter-spacing: 0.3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-range-center {
  width: 100%;
  max-width: 520px;
  margin: 0 auto 16px auto;
}

.modal-actions {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* Modal action buttons */
.modal-actions ion-button {
  margin: 0 !important;
}

.fence-visibility-setting {
  margin: 4px auto 14px;
  width: 100%;
  max-width: 520px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--app-border-color);
  background: color-mix(in srgb, var(--app-surface-color) 88%, var(--app-accent-soft-color) 12%);
}

.fence-visibility-setting label {
  font-size: 0.9em;
  font-weight: 600;
  color: var(--app-text-color);
}

.fence-visibility-setting input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

h3 {
  margin: 8px 0 12px; /* Reduced margins */
  letter-spacing: 0.4px;
  font-size: 1.6em; /* Slightly smaller heading */
  text-align: center;
  line-height: 1.2;
}

/* Center slider label/value and enlarge modal card */
.acquire-location-modal {
  position: fixed;
  top: 56px; /* Start below the header (typical header height) */
  left: 0;
  width: 100vw;
  height: calc(100vh - 56px); /* Full height minus header */
  background: color-mix(in srgb, var(--app-background-color) 25%, var(--app-text-color) 75%);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.acquire-location-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.location-spinner {
  margin-bottom: 18px;
}
.location-modal-message {
  color: var(--app-accent-contrast-color);
  font-size: 1.25em;
  font-weight: 500;
  text-align: center;
}

.dismiss-location-button {
  margin-top: 20px;
  color: var(--app-accent-contrast-color);
  --color: var(--app-accent-contrast-color);
}

.slider-value {
  font-size: 1.8em;
  font-weight: bold;
  letter-spacing: 0.4px;
  margin: 0;
  padding-left: 12px;
  min-width: 70px;
  text-align: right;
}

/* Scope Recommendation Styles */
.scope-recommendation {
  width: 100%;
  margin: 20px 0;
  padding: 16px;
  background: var(--app-accent-soft-color);
  border-radius: 12px;
  border-left: 4px solid var(--app-accent-color);
  text-align: left;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--app-text-color) 12%, transparent);
  border: 1px solid var(--app-accent-soft-color);
}

.recommendation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--app-accent-soft-color);

  span {
    font-size: 1.2em;
    font-weight: 600;
    color: var(--app-accent-color);
  }
}

.recommendation-header span {
  font-size: 0.9em; /* Reduced from 1.1em */
  font-weight: 600;
  color: var(--app-accent-color);
}

.recommendation-details {
  font-size: 0.95em;
}

.recommendation-row {
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
  padding: 8px 0;
  border-bottom: 1px solid var(--app-border-color);

  span:last-child {
    font-weight: 500;
    color: var(--app-text-color);
  }

  &.highlight {
    background-color: var(--app-accent-soft-color);
    margin: 12px -12px;
    padding: 10px 12px;
    border-radius: 8px;
    border-left: 3px solid var(--app-accent-color);

    span:last-child {
      font-weight: 600;
      color: var(--app-accent-color);
    }
  }
}

.recommendation-row:last-child {
  border-bottom: none;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--app-accent-soft-color);
  font-size: 1.1em;
}

/* Scope Ratio Styles */
.scope-ratio {
  margin: 16px -8px 8px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--app-text-color) 10%, transparent);
  border: 1px solid var(--app-border-color);
}

.ratio-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--app-surface-color);
  border-bottom: 1px solid var(--app-border-color);
  transition: all 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &.active {
    background-color: var(--app-accent-soft-color);
    border-left: 3px solid var(--app-accent-color);
  }

  .ratio-label {
    flex: 1;
    font-size: 0.95em;
    font-weight: 500;
    color: var(--app-text-color);
  }

  .ratio-value {
    margin: 0 12px;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
    color: var(--app-accent-color);
    min-width: 60px;
    text-align: right;
  }

  .ratio-button {
    --padding-start: 12px;
    --padding-end: 12px;
    --padding-top: 6px;
    --padding-bottom: 6px;
    height: 32px;
    font-size: 0.8em;
    font-weight: 600;
    --border-radius: 16px;
    --box-shadow: none;
    transition: all 0.2s ease;

    &:active {
      transform: scale(0.96);
      --box-shadow: 0 1px 2px color-mix(in srgb, var(--app-text-color) 12%, transparent);
    }
  }

  &.active .ratio-button {
    --background: var(--app-accent-color);
    --color: var(--app-accent-contrast-color);
  }
}

.suggestion-note {
  margin-top: 12px;
  padding-top: 12px;
  font-size: 0.8em;
  color: var(--app-muted-text-color);
  text-align: center;
  border-top: 1px dashed var(--app-border-color);
  font-style: italic;
}

.recommendation-row.highlight {
  font-weight: 600;
  color: var(--app-accent-color);
}

.apply-button {
  --padding-start: 14px;
  --padding-end: 14px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  height: auto;
  margin: 0;
  font-size: 0.9em;
  font-weight: 600;
  --border-radius: 20px;
  --background: var(--app-accent-color);
  --color: var(--app-accent-contrast-color);
  --box-shadow: 0 2px 4px color-mix(in srgb, var(--app-text-color) 15%, transparent);
  transition: all 0.2s ease;
}

.apply-button:active {
  transform: scale(0.96);
  --box-shadow: 0 1px 2px color-mix(in srgb, var(--app-text-color) 12%, transparent);
}

/* Modal background color */
.enhanced-modal {
  background-color: color-mix(in srgb, var(--app-surface-color) 85%, var(--app-accent-soft-color) 15%);
}

/* Tide Extremes Overlay - shown when not anchored */
.tide-extremes-overlay {
  position: fixed;
  top: calc(var(--ion-safe-area-top, 0) + 205px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

.tide-extremes-card {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  min-width: 260px;
  width: max-content;
}

.tide-extremes-title {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #f8fafc;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;
}

.tide-extremes-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tide-extremes-table th {
  color: #94a3b8;
  font-weight: 500;
  padding: 4px 6px;
  text-align: center;
  font-size: 12px;
}

.tide-extremes-table td {
  padding: 4px 6px;
  text-align: center;
  color: #f8fafc;
}

.tide-extremes-table .period-cell {
  color: #94a3b8;
  font-weight: 500;
}

.tide-extremes-table .high-cell {
  color: #22c55e;
  font-weight: 500;
}

.tide-extremes-table .low-cell {
  color: #ef4444;
  font-weight: 500;
}

.tide-extremes-table .low-cell-safe {
  color: #22c55e;
  font-weight: 500;
}

.tide-extremes-table .low-cell-warning {
  color: #f97316;
  font-weight: 500;
}

.tide-extremes-table .low-cell-danger {
  color: #ef4444;
  font-weight: 500;
}
</style>

<style>
/* Dark mode overrides */
body.dark .slider-value {
  color: #f8fafc !important;
}

/* Cancel anchor modal button styling */
:deep(.cancel-anchor-modal::part(content)) {
  --max-width: 100%;
  --width: 100%;
  --height: 100%;
  --max-height: 100%;
  --border-radius: 0;
  margin: 0;
  padding-top: var(--ion-safe-area-top, 0);
  padding-bottom: var(--ion-safe-area-bottom, 0);
}

:deep(.cancel-anchor-modal .modal-content) {
  padding-top: calc(var(--ion-safe-area-top, 0) + 20px);
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: var(--ion-safe-area-bottom, 0);
}

:deep(.cancel-anchor-modal .modal-actions) ion-button {
  --padding-top: 12px !important;
  --padding-bottom: 12px !important;
  --padding-start: 20px !important;
  --padding-end: 20px !important;
  --border-radius: 8px !important;
  font-size: 1em !important;
  font-weight: 600 !important;
  height: 44px !important;
  margin: 0 !important;
  min-height: 44px !important;
}
.ol-attribution,
.ol-attribution.ol-uncollapsible,
.ol-rotate {
  visibility: hidden !important;
  display: none !important;
}

/* Tide Modal Styles - Safe area handling */
:deep(.tide-modal-root::part(content)) {
  --max-width: 100%;
  --width: 100%;
  --height: 100%;
  --max-height: 100%;
  --border-radius: 0;
  margin: 0;
  padding-top: var(--ion-safe-area-top, 0);
  padding-bottom: var(--ion-safe-area-bottom, 0);
}

.tide-modal-header {
  --background: var(--app-surface-color);
  background: var(--app-surface-color);
}

.tide-modal-header-toolbar {
  --padding-start: 16px;
  --padding-end: 8px;
  --background: var(--app-surface-color);
  --border-color: var(--app-border-color);
  border-bottom: 1px solid var(--app-border-color);
  min-height: 54px;
}

.tide-modal-title {
  font-size: 1.1em;
  font-weight: 600;
  color: var(--app-text-color);
}

.tide-modal-content {
  --padding-top: 16px;
  --padding-bottom: var(--ion-safe-area-bottom, 0);
  --padding-start: 0;
  --padding-end: 0;
}

/* TideComponent layout overrides for modal: avoid clipping Current Conditions */
:deep(.tide-modal-content .marine-conditions) {
  flex: 0 0 auto;
  overflow: visible;
}

:deep(.tide-modal-content .conditions-grid) {
  overflow: visible;
}

body.dark ion-fab-button[color="secondary"] {
  --background: rgba(248, 250, 252, 0.85) !important;
  --color: #1f2933 !important;
  --background-activated: rgba(248, 250, 252, 0.7) !important;
  --background-hover: rgba(248, 250, 252, 0.9) !important;
}

body.dark .modal-actions ion-button[color="primary"] {
  --background: rgba(248, 250, 252, 0.85) !important;
  --color: #1f2933 !important;
  --background-activated: rgba(248, 250, 252, 0.7) !important;
  --background-hover: rgba(248, 250, 252, 0.9) !important;
}

body.dark .tide-modal-header-toolbar ion-button {
  --color: #f8fafc !important;
  color: #f8fafc !important;
}

body.dark .tide-modal-close-btn,
body.dark .tide-modal-close-btn ion-icon {
  --color: #f8fafc !important;
  color: #f8fafc !important;
}

body.dark .toolbar-button {
  background-color: #1f2933 !important;
  color: #f8fafc !important;
}

body.dark .toolbar-button.measure-toggle-active {
  background-color: #facc15 !important;
  background: #facc15 !important;
  color: #111827 !important;
}

body.dark .toolbar-button:hover {
  background-color: #2d3748 !important;
}

body.dark .toolbar-button:active {
  background-color: #1a202c !important;
}

body.dark .toolbar-zoom-group {
  background: color-mix(in srgb, #1f2933 70%, transparent) !important;
  border-color: color-mix(in srgb, #4a5568 50%, transparent) !important;
}

body.dark .toolbar-zoom-group .toolbar-button {
  background-color: transparent !important;
  color: #f8fafc !important;
}

body.dark .zoom-button {
  background-color: #1f2933 !important;
  color: #f8fafc !important;
}

body.dark .zoom-button:hover {
  background-color: #2d3748 !important;
}

body.dark .zoom-button:active {
  background-color: #1a202c !important;
}

body.dark .toolbar-icon {
  filter: brightness(0) invert(1);
}

/* Hide OpenLayers attribution control */
.ol-attribution,
.ol-attribution.ol-uncollapsible {
  visibility: hidden !important;
  display: none !important;
}

/* Update Drop Location Modal - Safe area handling */
:deep(.update-drop-modal::part(content)) {
  --max-width: 100%;
  --width: 100%;
  --height: 100%;
  --max-height: 100%;
  --border-radius: 0;
  margin: 0;
  padding-top: var(--ion-safe-area-top, 0);
  padding-bottom: var(--ion-safe-area-bottom, 0);
}

:deep(.update-drop-modal .modal-content) {
  padding-top: 20px;
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: calc(var(--ion-safe-area-bottom, 0) + 20px);
}

/* Update Drop Confirm Modal - Safe area handling */
:deep(.update-drop-confirm-modal::part(content)) {
  --max-width: 100%;
  --width: 100%;
  --height: 100%;
  --max-height: 100%;
  --border-radius: 0;
  margin: 0;
  padding-top: var(--ion-safe-area-top, 0);
  padding-bottom: var(--ion-safe-area-bottom, 0);
}

:deep(.update-drop-confirm-modal .modal-content) {
  padding-top: 20px;
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: calc(var(--ion-safe-area-bottom, 0) + 20px);
}

/* AIS Modal - Safe area handling */
:deep(.ais-modal-root::part(content)) {
  --width: 90%;
  --max-width: 500px;
  --height: auto;
  --max-height: 80%;
  --border-radius: 12px;
  --background: var(--app-surface-color, #fff);
  margin-top: var(--ion-safe-area-top, 0);
}

.ais-modal-body {
  --background: var(--app-surface-color, #fff);
  --padding-top: var(--ion-safe-area-top, 0);
}

.ais-modal-content {
  --background: var(--app-surface-color, #fff) !important;
  background: var(--app-surface-color, #fff) !important;
  min-height: 100%;
  padding: 20px;
  padding-top: calc(var(--ion-safe-area-top, 0) + 20px);
  color: var(--app-text-color, #000);
}

.ais-modal-header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--app-border-color, #e0e0e0);
}

.ais-vessel-name {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--app-text-color, #000);
}

.ais-vessel-mmsi {
  font-size: 14px;
  color: var(--app-muted-text-color, #666);
  margin: 0;
}

.ais-section {
  margin-bottom: 20px;
}

.ais-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-accent-color, #3880ff);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px 0;
}

.ais-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.ais-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ais-label {
  font-size: 12px;
  color: var(--app-muted-text-color, #666);
  font-weight: 500;
}

.ais-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-color, #000);
}

.ais-modal-footer {
  --background: var(--app-surface-color, #fff);
  background: var(--app-surface-color, #fff);
}

.ais-modal-toolbar {
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 4px;
  --padding-bottom: var(--ion-safe-area-bottom, 0);
  --background: var(--app-surface-color, #fff);
  min-height: 36px;
}

.ais-modal-toolbar ion-button {
  --padding-top: 8px !important;
  --padding-bottom: 8px !important;
  --padding-start: 16px !important;
  --padding-end: 16px !important;
  --border-radius: 8px !important;
  font-size: 0.95em !important;
  font-weight: 600 !important;
  height: 36px !important;
  margin: 0 !important;
  min-height: 36px !important;
}

/* Dark mode support for AIS modal */
:deep(body.dark .ais-modal-root::part(content)) {
  --background: var(--app-surface-color, #1f2933);
}

body.dark .ais-modal-content {
  --background: var(--app-surface-color, #1f2933) !important;
  background: var(--app-surface-color, #1f2933) !important;
  color: var(--app-text-color, #f8fafc);
}

body.dark .ais-modal-header {
  border-color: var(--app-border-color, #334155);
}

body.dark .ais-vessel-name,
body.dark .ais-value {
  color: var(--app-text-color, #f8fafc);
}

body.dark .ais-vessel-mmsi,
body.dark .ais-label {
  color: var(--app-muted-text-color, #94a3b8);
}

body.dark .ais-modal-footer,
body.dark .ais-modal-toolbar {
  --background: var(--app-surface-color, #1f2933);
  background: var(--app-surface-color, #1f2933);
}
</style>
