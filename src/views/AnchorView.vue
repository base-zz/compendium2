<template>
  <ion-page class="page-container">
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
      @save="anchorState?.anchorDeployed ? handleSaveAnchorParameters() : handleSetAnchor()"
      @update:customAnchorDropDepthValue="customAnchorDropDepthValue = $event"
      @update:fenceConnectorLinesVisible="fenceConnectorLinesVisible = $event"
      @apply-phone-bearing="applyPhoneBearing"
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
    <GenericHeader title="Anchor"></GenericHeader>
  </ion-page>
</template>

<script setup>
console.log("=== ANCHOR VIEW SCRIPT SETUP STARTING ===");
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { createLogger } from "@/services/logger";
import { useRouter } from "vue-router";
import {
  useStateDataStore,
  calculateDistanceMeters,
  calculateDestinationLatLon,
} from "@/stores/stateDataStore";
import { usePreferencesStore } from "@/stores/preferences";
import { UnitConversion } from "@/shared/unitConversion";
import { debounce, throttle } from "lodash-es";
import { getComputedAnchorLocation } from "@/stores/stateDataStore";
import { createAisProximityAlert } from "@/utils/anchorAlerts";
import { useDeviceHeading } from "@/composables/useDeviceHeading.js";

// Component imports
import AnchorInfoGrid from "@/components/AnchorInfoGrid.vue";
import GenericHeader from "@/components/GenericHeader.vue";
import TideComponent from "@/components/TideComponent.vue";
import AnchorInspectorModal from "@/components/anchor/AnchorInspectorModal.vue";
import AnchorToolbar from "@/components/anchor/AnchorToolbar.vue";
import UpdateDropModal from "@/components/anchor/UpdateDropModal.vue";
import CancelAnchorModal from "@/components/anchor/CancelAnchorModal.vue";
import FenceListModal from "@/components/anchor/FenceListModal.vue";
import FenceConfigModal from "@/components/anchor/FenceConfigModal.vue";
import AISModal from "@/components/anchor/AISModal.vue";
import TideModal from "@/components/anchor/TideModal.vue";
import SetAnchorModal from "@/components/anchor/SetAnchorModal.vue";

// Router setup
const router = useRouter();

// Ionic imports
import {
  IonPage,
  IonModal,
  IonButton,
  IonContent,
  IonRange,
  IonSpinner,
  IonIcon,
  IonFooter,
  IonToolbar,
  IonHeader,
  IonTitle,
  onIonViewDidEnter,
  onIonViewDidLeave,
  toastController,
} from "@ionic/vue";
import { chevronUpOutline, navigate, resizeOutline, addOutline, removeOutline, closeOutline, shieldOutline } from "ionicons/icons";

// OpenLayers imports
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { Style, Stroke, Fill, Text } from "ol/style";
import CircleStyle from "ol/style/Circle";
import { fromLonLat, toLonLat } from "ol/proj";
import { Point } from "ol/geom";
import Polygon from "ol/geom/Polygon";
import LineString from "ol/geom/LineString";
import { defaults as defaultControls } from "ol/control";
import { defaults as defaultInteractions } from "ol/interaction";
import Collection from "ol/Collection";
import Translate from "ol/interaction/Translate";
import DragPan from "ol/interaction/DragPan";
import DragRotate from "ol/interaction/DragRotate";
import PinchRotate from "ol/interaction/PinchRotate";

import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import { useMapTools } from "@/utils/mapUtils.js";
import { useMapFeatures } from "@/utils/mapFeatures";
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
  if (isMapRenderReady.value !== true) return;
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

const toggleFenceMode = () => {
  if (fenceModeEnabled.value === true) {
    fenceModeEnabled.value = false;
    return;
  }

  if (Array.isArray(anchorState.value?.fences) && anchorState.value.fences.length > 0) {
    showFenceListModal.value = true;
    return;
  }

  fenceModeEnabled.value = true;
  if (fenceModeEnabled.value === true) {
    measureModeEnabled.value = false;
  }
};

const startFenceSelectionFromList = () => {
  showFenceListModal.value = false;
  fenceModeEnabled.value = true;
  measureModeEnabled.value = false;
};

const resetFenceDraft = () => {
  selectedFenceTarget.value = null;
  fenceName.value = "";
  fenceRangeInput.value = "";
  fenceReferenceType.value = "";
  fenceValidationError.value = null;
};

const handleFenceModalCancel = () => {
  showFenceConfigModal.value = false;
  resetFenceDraft();
};

const handleFenceReferenceChange = (event) => {
  const value = event?.target?.value;
  if (typeof value !== "string") {
    return;
  }
  fenceReferenceType.value = value;
  fenceValidationError.value = null;
};

const handleFenceSave = async () => {
  if (!anchorState.value) {
    logger.warn("Cannot save fence: anchorState is undefined");
    fenceValidationError.value = "Anchor state is unavailable.";
    return;
  }
  if (!selectedFenceTarget.value) {
    logger.warn("Cannot save fence: selectedFenceTarget is undefined");
    fenceValidationError.value = "Select a fence target first.";
    return;
  }
  if (!fenceReferenceType.value) {
    logger.warn("Cannot save fence: reference type is not selected");
    fenceValidationError.value = "Select a reference (Boat or Anchor Drop).";
    return;
  }

  const parsedRange = Number(fenceRangeInput.value);
  if (!Number.isFinite(parsedRange) || parsedRange <= 0) {
    logger.warn("Cannot save fence: invalid alert range", { value: fenceRangeInput.value });
    fenceValidationError.value = "Enter a valid alert range.";
    return;
  }

  fenceValidationError.value = null;

  if (!Array.isArray(anchorState.value.fences)) {
    anchorState.value.fences = [];
  }

  const units = isMetric.value ? "m" : "ft";
  const target = selectedFenceTarget.value;
  const fallbackName = target.targetType === "ais" ? "AIS Fence" : "Point Fence";
  const nextFence = {
    id: `fence-${Date.now()}`,
    name: fenceName.value && fenceName.value.trim() ? fenceName.value.trim() : fallbackName,
    enabled: true,
    targetType: target.targetType,
    targetRef: target.targetRef,
    referenceType: fenceReferenceType.value,
    alertRange: parsedRange,
    units,
    currentDistance: null,
    currentDistanceUnits: units,
    minimumDistance: null,
    minimumDistanceUnits: units,
    minimumDistanceUpdatedAt: null,
    distanceHistory: [],
    inAlert: false,
    createdAt: Date.now(),
  };

  anchorState.value.fences.push(nextFence);

  try {
    await stateStore.sendMessageToServer("anchor:update", anchorState.value, {
      source: "AnchorView.handleFenceSave",
      timeout: 5000,
    });
  } catch (error) {
    logger.error("Failed to persist fence to server", error);
  }

  updateFenceFeatures();
  showFenceConfigModal.value = false;
  fenceModeEnabled.value = false;
  resetFenceDraft();
};

const removeFence = async (fenceId) => {
  if (!anchorState.value || !Array.isArray(anchorState.value.fences)) {
    return;
  }
  anchorState.value.fences = anchorState.value.fences.filter((fence) => fence.id !== fenceId);
  updateFenceFeatures();

  try {
    await stateStore.sendMessageToServer("anchor:update", anchorState.value, {
      source: "AnchorView.removeFence",
      timeout: 5000,
    });
  } catch (error) {
    logger.error("Failed to persist fence removal", error);
  }
};

const getFenceTargetLonLat = (fence) => {
  if (!fence || !fence.targetType || !fence.targetRef) {
    return null;
  }

  if (fence.targetType === "point") {
    const lat = fence.targetRef.latitude;
    const lon = fence.targetRef.longitude;
    if (typeof lat !== "number" || typeof lon !== "number") {
      return null;
    }
    return [lon, lat];
  }

  if (fence.targetType === "ais") {
    const mmsi = fence.targetRef.mmsi;
    if (mmsi == null) {
      return null;
    }
    const rawTarget = state.value?.aisTargets?.[String(mmsi)];
    const lat = rawTarget?.position?.latitude?.value ?? rawTarget?.position?.latitude;
    const lon = rawTarget?.position?.longitude?.value ?? rawTarget?.position?.longitude;
    if (typeof lat !== "number" || typeof lon !== "number") {
      return null;
    }
    return [lon, lat];
  }

  return null;
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

const handleFenceConnectorLinesVisibilityChange = async (event) => {
  if (!anchorState.value) {
    return;
  }
  const nextVisible = event?.target?.checked === true;
  anchorState.value.fenceConnectorLinesVisible = nextVisible;
  updateFenceFeatures();

  try {
    await stateStore.sendMessageToServer("anchor:update", anchorState.value, {
      source: "AnchorView.handleFenceConnectorLinesVisibilityChange",
      timeout: 5000,
    });
  } catch (error) {
    logger.error("Failed to persist fence connector line visibility", error);
  }
};

const toFenceCoordinateNumber = (value) => {
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
};

const getFenceReferenceLonLat = (fence) => {
  if (!fence || !fence.referenceType) {
    return null;
  }

  if (fence.referenceType === "boat") {
    const navPosition = state.value?.navigation?.position;
    let lat = toFenceCoordinateNumber(navPosition?.latitude);
    let lon = toFenceCoordinateNumber(navPosition?.longitude);
    if (lat == null || lon == null) {
      const topPosition = state.value?.position;
      lat = toFenceCoordinateNumber(topPosition?.latitude);
      lon = toFenceCoordinateNumber(topPosition?.longitude);
    }
    if (lat == null || lon == null) {
      return null;
    }
    return [lon, lat];
  }

  if (fence.referenceType === "anchor_drop") {
    const drop = anchorState.value?.anchorDropLocation;
    const lat = toFenceCoordinateNumber(drop?.latitude);
    const lon = toFenceCoordinateNumber(drop?.longitude);
    if (lat == null || lon == null) {
      return null;
    }
    return [lon, lat];
  }

  return null;
};

const updateFenceDistanceStats = (fence, targetLonLat) => {
  if (!fence || !Array.isArray(targetLonLat) || targetLonLat.length < 2) {
    return;
  }

  const referenceLonLat = getFenceReferenceLonLat(fence);
  if (!Array.isArray(referenceLonLat) || referenceLonLat.length < 2) {
    if (fence.currentDistance !== null) {
      fence.currentDistance = null;
    }
    return;
  }

  const distanceMeters = calculateDistanceMeters(
    referenceLonLat[1],
    referenceLonLat[0],
    targetLonLat[1],
    targetLonLat[0],
    true
  );

  if (!Number.isFinite(distanceMeters)) {
    if (fence.currentDistance !== null) {
      fence.currentDistance = null;
    }
    return;
  }

  const distanceInFenceUnits = fence.units === "ft" ? distanceMeters * 3.28084 : distanceMeters;
  const nowMs = Date.now();
  
  if (Number.isFinite(distanceInFenceUnits) && distanceInFenceUnits !== fence.currentDistance) {
    fence.currentDistance = distanceInFenceUnits;
    fence.currentDistanceUnits = fence.units;
    
    // Push to distance history for sparkline
    if (!Array.isArray(fence.distanceHistory)) {
      fence.distanceHistory = [];
    }
    fence.distanceHistory.push({
      t: nowMs,
      v: distanceInFenceUnits
    });
    // Keep only last 100 readings to prevent memory bloat
    if (fence.distanceHistory.length > 100) {
      fence.distanceHistory = fence.distanceHistory.slice(-100);
    }
  }

  const existingMinimum =
    typeof fence.minimumDistance === "number" && Number.isFinite(fence.minimumDistance)
      ? fence.minimumDistance
      : null;

  let normalizedExistingMinimum = existingMinimum;
  if (
    normalizedExistingMinimum != null
    && typeof fence.minimumDistanceUnits === "string"
    && fence.minimumDistanceUnits !== fence.units
  ) {
    if (fence.minimumDistanceUnits === "ft" && fence.units !== "ft") {
      normalizedExistingMinimum = normalizedExistingMinimum / 3.28084;
    } else if (fence.minimumDistanceUnits !== "ft" && fence.units === "ft") {
      normalizedExistingMinimum = normalizedExistingMinimum * 3.28084;
    }
  }

  if (normalizedExistingMinimum == null || distanceInFenceUnits < normalizedExistingMinimum) {
    fence.minimumDistance = distanceInFenceUnits;
    fence.minimumDistanceUnits = fence.units;
    fence.minimumDistanceUpdatedAt = nowMs;
  }
};

const updateFenceFeatures = () => {
  clearFeature(FEATURE_TYPES.FENCE_TARGET);
  clearFeature(FEATURE_TYPES.FENCE_RANGE);
  clearFeature(FEATURE_TYPES.FENCE_LINK);

  const fences = anchorState.value?.fences;
  if (!Array.isArray(fences) || fences.length === 0) {
    return;
  }

  fences.forEach((fence) => {
    if (!fence || fence.enabled === false) {
      return;
    }

    const lonLat = getFenceTargetLonLat(fence);
    if (!Array.isArray(lonLat) || lonLat.length < 2) {
      return;
    }

    updateFenceDistanceStats(fence, lonLat);

    if (fenceConnectorLinesVisible.value === true) {
      const referenceLonLat = getFenceReferenceLonLat(fence);
      if (Array.isArray(referenceLonLat) && referenceLonLat.length >= 2) {
        const lineGeometry = new LineString([
          fromLonLat(referenceLonLat),
          fromLonLat(lonLat),
        ]);
        const lineFeature = new Feature({ geometry: lineGeometry });
        lineFeature.set("type", FEATURE_TYPES.FENCE_LINK);
        lineFeature.setStyle(
          new Style({
            stroke: new Stroke({
              color: "rgba(250, 204, 21, 0.22)",
              width: 2,
              lineDash: [8, 8],
            }),
            zIndex: 118,
          })
        );
        vectorSource.addFeature(lineFeature);
      }
    }

    const mapCoord = fromLonLat(lonLat);
    const labelText = fence.name || "Fence";

    const marker = new Feature({ geometry: new Point(mapCoord) });
    marker.set("type", FEATURE_TYPES.FENCE_TARGET);
    marker.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({ color: "rgba(250, 204, 21, 0.95)" }),
          stroke: new Stroke({ color: "rgba(17, 24, 39, 0.95)", width: 2 }),
        }),
        text: new Text({
          text: labelText,
          font: "600 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          fill: new Fill({ color: "#f9fafb" }),
          stroke: new Stroke({ color: "rgba(17,24,39,0.8)", width: 3 }),
          offsetY: -14,
        }),
        zIndex: 140,
      })
    );
    vectorSource.addFeature(marker);

    const rangeValue = Number(fence.alertRange);
    if (!Number.isFinite(rangeValue) || rangeValue <= 0) {
      return;
    }
    const rangeMeters = fence.units === "ft" ? rangeValue / 3.28084 : rangeValue;

    const circleGeometry = createCircleWithRadius(lonLat, rangeMeters);
    const rangeFeature = new Feature({ geometry: circleGeometry });
    rangeFeature.set("type", FEATURE_TYPES.FENCE_RANGE);
    rangeFeature.setStyle(
      new Style({
        stroke: new Stroke({
          color: "rgba(250, 204, 21, 0.65)",
          width: 2,
        }),
        fill: new Fill({
          color: "rgba(250, 204, 21, 0.12)",
        }),
        zIndex: 120,
      })
    );
    vectorSource.addFeature(rangeFeature);
  });
};

// Main component setup
const mapElement = ref(null);
const map = ref(null);
const vectorSource = new VectorSource();
const {
  updateFeature,
  updateFeatureGroup,
  clearFeature,
  clearAll,
} = useMapFeatures(vectorSource);

// Store integration
const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);
const preferencesStore = usePreferencesStore();
const { preferences } = storeToRefs(preferencesStore);
const navigationState = computed(() => state.value.navigation);
const anchorState = computed(() => state.value.anchor);
const alertState = computed(() => state.value.alerts?.active);

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

const isDarkMode = computed(() => preferences.value?.display?.darkMode || false);

// Floating anchor status computed properties
const anchorStatusText = computed(() => {
  if (!anchorState.value) return 'Not Anchored';
  if (anchorState.value.dragging) return 'DRAGGING';
  if (anchorState.value.aisWarning) return 'AIS PROXIMITY WARNING';
  if (anchorState.value.anchorDeployed) return 'Anchored';
  return 'Not Anchored';
});

const anchorStatusClass = computed(() => {
  if (!anchorState.value) return 'status-not-anchored';
  if (anchorState.value.dragging) return 'status-dragging';
  if (anchorState.value.aisWarning) return 'status-ais-warning';
  if (anchorState.value.anchorDeployed) return 'status-anchored';
  return 'status-not-anchored';
});

const measureModeEnabled = ref(false);
const measurePinAFollowsBoat = ref(false);
const measurePinBFollowsBoat = ref(false);
const measurePinA = ref(null);
const measurePinB = ref(null);
const measureLine = ref(null);
const measureLabel = ref(null);

const fenceModeEnabled = ref(false);
const showFenceConfigModal = ref(false);
const showFenceListModal = ref(false);
const selectedFenceTarget = ref(null);
const fenceName = ref("");
const fenceRangeInput = ref("");
const fenceReferenceType = ref("");
const fenceValidationError = ref(null);

const measureSnapDistanceMeters = 5;

let modifyInteraction;
let dragPanInteraction;

const getMeasurePinStyle = (labelText, isSnappedToBoat) => {
  const darkMode = isDarkMode.value === true;
  const alpha = isSnappedToBoat === true ? 0.2 : 0.95;
  const fillColor = (() => {
    if (labelText === "A") return `rgba(239,68,68,${alpha})`;
    if (labelText === "B") return `rgba(34,197,94,${alpha})`;
    return darkMode ? `rgba(248,250,252,${alpha})` : `rgba(99,102,241,${alpha})`;
  })();
  const strokeColor = (() => {
    if (isSnappedToBoat === true) {
      return darkMode ? "rgba(15,23,42,0.2)" : "rgba(255,255,255,0.2)";
    }
    return darkMode ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.95)";
  })();
  const textColor = isSnappedToBoat === true ? "rgba(255,255,255,0.2)" : "#ffffff";

  return new Style({
    image: new CircleStyle({
      radius: 10,
      fill: new Fill({ color: fillColor }),
      stroke: new Stroke({ color: strokeColor, width: 3 }),
    }),
    text: new Text({
      text: labelText,
      font: "700 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      fill: new Fill({ color: textColor }),
      offsetY: 0,
    }),
    zIndex: 120,
  });
};

const MEASURE_LINE_STYLE = new Style({
  stroke: new Stroke({
    color: "rgba(250,204,21,0.95)",
    width: 4,
  }),
  zIndex: 110,
});

const getMeasureLabelStyle = (labelText) => {
  const darkMode = isDarkMode.value === true;
  const textColor = darkMode ? "#111827" : "#f9fafb";
  const bgColor = darkMode ? "rgba(248,250,252,0.92)" : "rgba(17,24,39,0.85)";
  const borderColor = darkMode ? "rgba(15,23,42,0.35)" : "rgba(248,250,252,0.25)";

  return new Style({
    text: new Text({
      text: labelText,
      font: "600 13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      fill: new Fill({ color: textColor }),
      backgroundFill: new Fill({ color: bgColor }),
      backgroundStroke: new Stroke({ color: borderColor, width: 2 }),
      padding: [6, 8, 6, 8],
      offsetY: -14,
    }),
    zIndex: 130,
  });
};

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

const clearMeasurementFeatures = () => {
  clearFeature(FEATURE_TYPES.MEASURE_PIN_A);
  clearFeature(FEATURE_TYPES.MEASURE_PIN_B);
  clearFeature(FEATURE_TYPES.MEASURE_LINE);
  clearFeature(FEATURE_TYPES.MEASURE_LABEL);
  measurePinA.value = null;
  measurePinB.value = null;
  measureLine.value = null;
  measureLabel.value = null;
  measurePinAFollowsBoat.value = false;
  measurePinBFollowsBoat.value = false;
};

const ensureTranslateInteraction = () => {
  if (!map.value) return;
  if (modifyInteraction) return;

  modifyInteraction = new Translate({
    features: new Collection(),
    hitTolerance: 12,
  });

  modifyInteraction.on("translatestart", (evt) => {
    if (dragPanInteraction && typeof dragPanInteraction.setActive === "function") {
      dragPanInteraction.setActive(false);
    }
    const moved = evt?.features;
    if (!moved || typeof moved.forEach !== "function") return;
    moved.forEach((feature) => {
      const type = feature?.get?.("type");
      if (type === FEATURE_TYPES.MEASURE_PIN_A) {
        measurePinAFollowsBoat.value = false;
        if (typeof feature?.setStyle === "function") {
          feature.setStyle(getMeasurePinStyle("A", false));
        }
      }
      if (type === FEATURE_TYPES.MEASURE_PIN_B) {
        measurePinBFollowsBoat.value = false;
        if (typeof feature?.setStyle === "function") {
          feature.setStyle(getMeasurePinStyle("B", false));
        }
      }
    });
  });

  modifyInteraction.on("translateend", (evt) => {
    if (dragPanInteraction && typeof dragPanInteraction.setActive === "function") {
      dragPanInteraction.setActive(true);
    }

    const boatLonLat = getBoatLonLatForMeasure();
    if (boatLonLat) {
      const boatLon = boatLonLat[0];
      const boatLat = boatLonLat[1];
      const tryResnap = (feature) => {
        const type = feature?.get?.("type");
        if (type !== FEATURE_TYPES.MEASURE_PIN_A && type !== FEATURE_TYPES.MEASURE_PIN_B) {
          return;
        }
        const geom = feature?.getGeometry?.();
        const coord = geom?.getCoordinates?.();
        if (!Array.isArray(coord)) return;
        const lonLat = toLonLat(coord);
        if (!Array.isArray(lonLat) || lonLat.length < 2) return;
        const lon = lonLat[0];
        const lat = lonLat[1];
        if (typeof lon !== "number" || typeof lat !== "number") return;
        if (Number.isNaN(lon) || Number.isNaN(lat)) return;

        const d = calculateDistanceMeters(lat, lon, boatLat, boatLon, true);
        if (typeof d !== "number" || Number.isNaN(d)) return;
        if (d > measureSnapDistanceMeters) return;

        if (type === FEATURE_TYPES.MEASURE_PIN_A) {
          applyBoatFollowToPin("A", measurePinA, measurePinAFollowsBoat);
        }
        if (type === FEATURE_TYPES.MEASURE_PIN_B) {
          applyBoatFollowToPin("B", measurePinB, measurePinBFollowsBoat);
        }
      };

      const moved = evt?.features;
      if (moved && typeof moved.forEach === "function") {
        moved.forEach((feature) => {
          tryResnap(feature);
        });
      }
    }

    syncTranslateFeatures();
    updateMeasurementLineAndLabel();
  });

  const interactions = map.value.getInteractions?.();
  if (interactions && typeof interactions.insertAt === "function") {
    interactions.insertAt(0, modifyInteraction);
  } else {
    map.value.addInteraction(modifyInteraction);
  }
};

const syncTranslateFeatures = () => {
  if (!modifyInteraction) return;
  const collection = modifyInteraction.getFeatures?.();
  if (!collection) return;

  collection.clear();
  if (measurePinA.value) {
    collection.push(measurePinA.value);
  }
  if (measurePinB.value) {
    collection.push(measurePinB.value);
  }
};

const updateMeasurementLineAndLabel = () => {
  if (!measurePinA.value || !measurePinB.value) {
    clearFeature(FEATURE_TYPES.MEASURE_LINE);
    clearFeature(FEATURE_TYPES.MEASURE_LABEL);
    measureLine.value = null;
    measureLabel.value = null;
    return;
  }

  const geomA = measurePinA.value.getGeometry?.();
  const geomB = measurePinB.value.getGeometry?.();
  const coordA = geomA?.getCoordinates?.();
  const coordB = geomB?.getCoordinates?.();
  if (!Array.isArray(coordA) || !Array.isArray(coordB)) return;

  const lineGeom = new LineString([coordA, coordB]);
  if (!measureLine.value) {
    const lineFeature = new Feature({ geometry: lineGeom });
    lineFeature.set("type", FEATURE_TYPES.MEASURE_LINE);
    lineFeature.setStyle(MEASURE_LINE_STYLE);
    vectorSource.addFeature(lineFeature);
    measureLine.value = lineFeature;
  } else {
    measureLine.value.setGeometry(lineGeom);
  }

  const lonLatA = toLonLat(coordA);
  const lonLatB = toLonLat(coordB);
  const distanceValue = calculateDistanceMeters(lonLatA[1], lonLatA[0], lonLatB[1], lonLatB[0], isMetric.value);
  const unitLabel = isMetric.value ? "m" : "ft";
  const distanceText = typeof distanceValue === "number" ? `${Math.round(distanceValue)} ${unitLabel}` : "--";

  const midCoord = [(coordA[0] + coordB[0]) / 2, (coordA[1] + coordB[1]) / 2];
  const labelGeom = new Point(midCoord);

  if (!measureLabel.value) {
    const labelFeature = new Feature({ geometry: labelGeom });
    labelFeature.set("type", FEATURE_TYPES.MEASURE_LABEL);
    labelFeature.setStyle(getMeasureLabelStyle(distanceText));
    vectorSource.addFeature(labelFeature);
    measureLabel.value = labelFeature;
  } else {
    measureLabel.value.setGeometry(labelGeom);
    measureLabel.value.setStyle(getMeasureLabelStyle(distanceText));
  }
};

const applyBoatFollowToPin = (pinType, pinRef, followsRef) => {
  const boatLonLat = getBoatLonLatForMeasure();
  if (!boatLonLat) return;
  const coord = fromLonLat(boatLonLat);
  if (!pinRef.value) {
    const feature = new Feature({ geometry: new Point(coord) });
    feature.set(
      "type",
      pinType === "A" ? FEATURE_TYPES.MEASURE_PIN_A : FEATURE_TYPES.MEASURE_PIN_B
    );
    feature.setStyle(getMeasurePinStyle(pinType, true));
    vectorSource.addFeature(feature);
    pinRef.value = feature;
  } else {
    pinRef.value.setGeometry(new Point(coord));
    pinRef.value.setStyle(getMeasurePinStyle(pinType, true));
  }
  followsRef.value = true;
};

const tryCreateOrUpdateMeasurePin = (pinType, lonLatClicked) => {
  const clickedCoord = fromLonLat(lonLatClicked);
  const boatLonLat = getBoatLonLatForMeasure();
  const shouldSnapToBoat = (() => {
    if (!boatLonLat) return false;
    const d = calculateDistanceMeters(lonLatClicked[1], lonLatClicked[0], boatLonLat[1], boatLonLat[0], true);
    return typeof d === "number" && d <= measureSnapDistanceMeters;
  })();

  if (pinType === "A") {
    if (shouldSnapToBoat) {
      applyBoatFollowToPin("A", measurePinA, measurePinAFollowsBoat);
    } else {
      measurePinAFollowsBoat.value = false;
      if (!measurePinA.value) {
        const feature = new Feature({ geometry: new Point(clickedCoord) });
        feature.set("type", FEATURE_TYPES.MEASURE_PIN_A);
        feature.setStyle(getMeasurePinStyle("A", false));
        vectorSource.addFeature(feature);
        measurePinA.value = feature;
      } else {
        measurePinA.value.setGeometry(new Point(clickedCoord));
        measurePinA.value.setStyle(getMeasurePinStyle("A", false));
      }
    }
  }

  if (pinType === "B") {
    if (shouldSnapToBoat) {
      applyBoatFollowToPin("B", measurePinB, measurePinBFollowsBoat);
    } else {
      measurePinBFollowsBoat.value = false;
      if (!measurePinB.value) {
        const feature = new Feature({ geometry: new Point(clickedCoord) });
        feature.set("type", FEATURE_TYPES.MEASURE_PIN_B);
        feature.setStyle(getMeasurePinStyle("B", false));
        vectorSource.addFeature(feature);
        measurePinB.value = feature;
      } else {
        measurePinB.value.setGeometry(new Point(clickedCoord));
        measurePinB.value.setStyle(getMeasurePinStyle("B", false));
      }
    }
  }

  syncTranslateFeatures();
  updateMeasurementLineAndLabel();
};

const toggleMeasureMode = async () => {
  measureModeEnabled.value = !measureModeEnabled.value;
  
  // Force DOM reflow to ensure iOS Safari applies CSS immediately
  if (measureModeEnabled.value) {
    await nextTick();
    // Force a reflow on the measure button specifically
    const measureButton = document.querySelector('.measure-toggle');
    if (measureButton) {
      measureButton.offsetHeight;
    }
    
    await new Promise((resolve) => requestAnimationFrame(resolve));
    setTimeout(() => {
      ensureTranslateInteraction();
      syncTranslateFeatures();
    }, 0);
    return;
  }

  clearMeasurementFeatures();
  if (modifyInteraction && map.value) {
    map.value.removeInteraction(modifyInteraction);
    modifyInteraction = null;
  }
};

const boatPosition = computed(() => navigationState.value?.position);
const anchorDeployed = computed(() => anchorState.value?.anchorDeployed);
const anchorDropLocation = computed(() => anchorState.value?.anchorDropLocation);

// console.log("anchorState.value:", anchorState.value);
// console.log("anchorState getter:", anchorState);

const breadcrumbs = computed(() => {
  const history = anchorState.value?.history || [];
  // console.log("=== BREADCRUMB COMPUTED ===");
  // console.log("anchorState.value?.history:", history);
  // console.log("anchorState.value?.history length:", history?.length);
  // console.log("========================");
  return history;
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

// ScaleLine watch removed - no longer using this control

// Dynamic range bounds based on unit system
const criticalRangeMax = computed(() => (isMetric.value ? 100 : 300)); // 300m ≈ 1000ft
const rodeRangeMax = computed(() => (isMetric.value ? 100 : 300)); // 100m ≈ 330ft
const warningRangeMax = computed(() => (isMetric.value ? 20 : 300)); // 20m ≈ 300ft

logger.debug("Current state:", state.value);
logger.debug("Anchor state:", anchorState.value);
logger.debug("Alert state:", alertState.value);

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

  // No anchor, center on boat
  const boatCoord = getBoatCenterCoord();
  if (!boatCoord) return false;
  view.setCenter(boatCoord);
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

// Boat position animation state
let currentBoatPosition = null; // { lat, lon, x, y } in map coordinates
let boatAnimationFrame = null;
let currentRodeLine = null; // { boat: {x, y}, anchor: {x, y} } in map coordinates
let rodeAnimationFrame = null;

// Animate boat position with interpolation - also updates rode line to keep them synced
function animateBoatPosition(targetLat, targetLon, duration = 500) {
  const targetCoord = fromLonLat([targetLon, targetLat]);
  
  // Get anchor position for rode line (anchor doesn't move during boat animation)
  const state = stateStore.state;
  const anchorPos = state?.anchor?.anchorLocation?.position;
  let anchorCoord = null;
  if (anchorPos) {
    const anchorLat = anchorPos.latitude?.value ?? anchorPos.latitude;
    const anchorLon = anchorPos.longitude?.value ?? anchorPos.longitude;
    if (typeof anchorLat === "number" && typeof anchorLon === "number") {
      anchorCoord = fromLonLat([anchorLon, anchorLat]);
    }
  }
  
  // If no current position, just set it directly
  if (!currentBoatPosition) {
    currentBoatPosition = { lat: targetLat, lon: targetLon, x: targetCoord[0], y: targetCoord[1] };
    updateBoatFeaturePosition(targetCoord[0], targetCoord[1]);
    // Also set rode line if anchor exists
    if (anchorCoord) {
      currentRodeLine = { 
        boat: { x: targetCoord[0], y: targetCoord[1] }, 
        anchor: { x: anchorCoord[0], y: anchorCoord[1] } 
      };
      const rodeFeature = vectorSource.getFeatures().find(
        (feature) => feature.get("type") === FEATURE_TYPES.RODE
      );
      if (!rodeFeature && anchorState.value?.anchorDeployed) {
        updateRodeLine();
      } else {
        updateRodeFeaturePosition(targetCoord[0], targetCoord[1], anchorCoord[0], anchorCoord[1]);
      }
    }
    return;
  }
  
  // Cancel any existing boat animation
  if (boatAnimationFrame) {
    cancelAnimationFrame(boatAnimationFrame);
    boatAnimationFrame = null;
  }
  
  // Cancel any existing rode animation to prevent conflicts
  if (rodeAnimationFrame) {
    cancelAnimationFrame(rodeAnimationFrame);
    rodeAnimationFrame = null;
  }
  
  const startX = currentBoatPosition.x;
  const startY = currentBoatPosition.y;
  const startTime = performance.now();
  
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-in-out easing
    const easeProgress = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    const currentX = startX + (targetCoord[0] - startX) * easeProgress;
    const currentY = startY + (targetCoord[1] - startY) * easeProgress;
    
    // Update current position
    currentBoatPosition.x = currentX;
    currentBoatPosition.y = currentY;
    currentBoatPosition.lat = targetLat;
    currentBoatPosition.lon = targetLon;
    
    // Update the boat feature
    updateBoatFeaturePosition(currentX, currentY);
    
    // Also update rode line in the same frame if anchor is deployed
    if (anchorState.value?.anchorDeployed && anchorCoord) {
      currentRodeLine = { 
        boat: { x: currentX, y: currentY }, 
        anchor: { x: anchorCoord[0], y: anchorCoord[1] } 
      };
      const rodeFeature = vectorSource.getFeatures().find(
        (feature) => feature.get("type") === FEATURE_TYPES.RODE
      );
      if (!rodeFeature) {
        updateRodeLine();
      } else {
        updateRodeFeaturePosition(currentX, currentY, anchorCoord[0], anchorCoord[1]);
      }
    }
    
    if (progress < 1) {
      boatAnimationFrame = requestAnimationFrame(step);
    }
  }
  
  boatAnimationFrame = requestAnimationFrame(step);
}

// Update boat feature position
function updateBoatFeaturePosition(x, y) {
  const boatFeature = vectorSource.getFeatures().find(f => f.get('type') === FEATURE_TYPES.BOAT);
  if (!boatFeature) return;
  
  const geometry = boatFeature.getGeometry();
  if (geometry && typeof geometry.setCoordinates === 'function') {
    geometry.setCoordinates([x, y]);
    boatFeature.changed();
  }
}

// Animate rode line position
function animateRodeLine(targetBoatX, targetBoatY, targetAnchorX, targetAnchorY, duration = 500) {
  // If no current rode line, just create it directly
  if (!currentRodeLine) {
    currentRodeLine = { 
      boat: { x: targetBoatX, y: targetBoatY }, 
      anchor: { x: targetAnchorX, y: targetAnchorY } 
    };
    updateRodeFeaturePosition(targetBoatX, targetBoatY, targetAnchorX, targetAnchorY);
    return;
  }
  
  // Cancel any existing animation
  if (rodeAnimationFrame) {
    cancelAnimationFrame(rodeAnimationFrame);
    rodeAnimationFrame = null;
  }
  
  const startBoatX = currentRodeLine.boat.x;
  const startBoatY = currentRodeLine.boat.y;
  const startAnchorX = currentRodeLine.anchor.x;
  const startAnchorY = currentRodeLine.anchor.y;
  const startTime = performance.now();
  
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-in-out easing
    const easeProgress = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    const currentBoatX = startBoatX + (targetBoatX - startBoatX) * easeProgress;
    const currentBoatY = startBoatY + (targetBoatY - startBoatY) * easeProgress;
    const currentAnchorX = startAnchorX + (targetAnchorX - startAnchorX) * easeProgress;
    const currentAnchorY = startAnchorY + (targetAnchorY - startAnchorY) * easeProgress;
    
    // Update current position
    currentRodeLine.boat.x = currentBoatX;
    currentRodeLine.boat.y = currentBoatY;
    currentRodeLine.anchor.x = currentAnchorX;
    currentRodeLine.anchor.y = currentAnchorY;
    
    // Update the rode feature
    updateRodeFeaturePosition(currentBoatX, currentBoatY, currentAnchorX, currentAnchorY);
    
    if (progress < 1) {
      rodeAnimationFrame = requestAnimationFrame(step);
    }
  }
  
  rodeAnimationFrame = requestAnimationFrame(step);
}

// Update rode feature position
function updateRodeFeaturePosition(boatX, boatY, anchorX, anchorY) {
  const rodeFeature = vectorSource.getFeatures().find(f => f.get('type') === FEATURE_TYPES.RODE);
  if (!rodeFeature) return;
  
  const geometry = rodeFeature.getGeometry();
  if (geometry && typeof geometry.setCoordinates === 'function') {
    geometry.setCoordinates([[boatX, boatY], [anchorX, anchorY]]);
    rodeFeature.changed();
  }
}

// Update rode line using animation (DEPRECATED - now handled in boat animation)
function updateRodeLineAnimated() {
  const state = stateStore.state;
  const boatPos = state?.navigation?.position;
  const anchorPos = state?.anchor?.anchorLocation?.position;
  
  if (!boatPos || !anchorPos) return;
  
  const toScalar = (value) => {
    if (value == null) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "object" && typeof value.value === "number") {
      return Number.isFinite(value.value) ? value.value : null;
    }
    return null;
  };
  
  const boatLat = toScalar(boatPos?.latitude);
  const boatLon = toScalar(boatPos?.longitude);
  const anchorLat = toScalar(anchorPos?.latitude);
  const anchorLon = toScalar(anchorPos?.longitude);
  
  if (!Number.isFinite(boatLat) || !Number.isFinite(boatLon) ||
      !Number.isFinite(anchorLat) || !Number.isFinite(anchorLon)) {
    return;
  }
  
  const boatCoord = fromLonLat([boatLon, boatLat]);
  const anchorCoord = fromLonLat([anchorLon, anchorLat]);
  
  // If rode feature doesn't exist yet, create it
  const rodeFeature = vectorSource.getFeatures().find(f => f.get('type') === FEATURE_TYPES.RODE);
  if (!rodeFeature) {
    // Fall back to full update
    updateRodeLine();
    return;
  }
  
  // Animate to new position
  animateRodeLine(boatCoord[0], boatCoord[1], anchorCoord[0], anchorCoord[1], 500);
}

const updateBoatPosition = debounce(() => {
  // Get the raw state to ensure we're accessing the data directly
  const state = stateStore.state;
  const pos = state?.navigation?.position;

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
  const boatFeature = vectorSource.getFeatures().find(f => f.get('type') === FEATURE_TYPES.BOAT);
  
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
    
    // Initialize current boat position for future animations
    const coord = fromLonLat([lon, lat]);
    currentBoatPosition = { lat, lon, x: coord[0], y: coord[1] };
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

// Computed property to check if we have a valid position
const hasValidPosition = computed(() => {
  const state = stateStore.state;
  
  // Try navigation.position first (this is what updateBoatPosition uses)
  const navPos = state?.navigation?.position;
  let lat = navPos?.latitude?.value;
  let lon = navPos?.longitude?.value;
  
  // If navigation.position doesn't have valid data, try top-level position
  if (lat == null || lon == null) {
    const topPos = state?.position;
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
  const center = fromLonLat(centerLonLat);

  // Create a simple circle with the adjusted radius
  const numPoints = 60; // More points = smoother circle
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    // Calculate angle for this point
    const angle = (i * 2 * Math.PI) / numPoints;

    // Calculate point on the circle in projected coordinates
    const x = center[0] + adjustedRadius * Math.cos(angle);
    const y = center[1] + adjustedRadius * Math.sin(angle);

    // Add to points array
    points.push([x, y]);
  }

  // Close the polygon
  points.push(points[0]);

  // Create a polygon from the points
  return new Polygon([points]);
};

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

// Update wind feature with specific rotation value
function updateWindFeatureWithRotation(rotation) {
  const windFeature = vectorSource.getFeatures().find(f => f.get('type') === FEATURE_TYPES.WIND);
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

  const windFeature = vectorSource.getFeatures().find((f) => f.get("type") === FEATURE_TYPES.WIND);
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
    return 0.22;
  }

  // Keep the icon at a consistent fraction of the anchor-circle perimeter size on screen.
  const radiusMeters = getWindIndicatorRadiusMeters();
  const circleRadiusPixels = radiusMeters / resolution;
  const targetIconPixels = circleRadiusPixels * 0.16;
  const iconBasePixels = 64;

  // Clamp for readability across devices.
  const minScale = 0.12;
  const maxScale = 0.72;
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

  // Get apparent wind speed for display inside the triangle
  const windSpeed = state.value?.navigation?.wind?.apparent?.speed?.value ?? 
                   state.value?.navigation?.wind?.true?.speed?.value ?? '';

  // Check if wind feature already exists
  const existingFeature = vectorSource.getFeatures().find(f => f.get('type') === FEATURE_TYPES.WIND);
  
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
    // Create new feature with heads-up text
    const currentResolution = map.value?.getView?.()?.getResolution?.();
    const initialScale = getWindIndicatorScaleForResolution(currentResolution);
    const windStyles = createWindIndicatorStyle(windSpeed, isDarkMode.value, targetRotation, initialScale);

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
let criticalCircleDrawn = ref(sessionStorage.getItem('criticalCircleDrawn') === 'true');

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

  // Create a circle with the correct radius in meters
  const circleGeometry = createCircleWithRadius([longitude, latitude], radiusInMeters);

  // Use the circle for the feature
  const activeAlerts = Array.isArray(alertState.value) ? alertState.value : [];
  const hasCriticalRangeAlert = activeAlerts.some(
    (alert) => alert?.trigger === "critical_range" && alert?.status !== "resolved"
  );
  const rangeStyle = hasCriticalRangeAlert ? STYLES.CRITICAL_RANGE : STYLES.NORMAL_RANGE;
  
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

watch(
  isDarkMode,
  () => {
    // Only update style, don't redraw the entire circle
    // The circle will update its style automatically through the STYLES reference
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
  
  if (boatAnimationFrame && currentBoatPosition) {
    const coord = toLonLat([currentBoatPosition.x, currentBoatPosition.y]);
    boatLon = coord[0];
    boatLat = coord[1];
  } else if (pos?.latitude?.value != null && pos?.longitude?.value != null) {
    // Try to get boat position from state (same as initialization logic)
    boatLat = pos.latitude.value;
    boatLon = pos.longitude.value;
  } else {
    // Fallback: use anchor position if boat position is not available
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

    const existingRodeFeature = vectorSource.getFeatures().find(
      (feature) => feature.get("type") === FEATURE_TYPES.RODE
    );

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
  // IMMEDIATELY clear any server-sent AIS warning if conditions aren't met
  if (anchorState.value && anchorState.value.aisWarning) {
    const warningRangeObj = anchorState.value?.warningRange;
    const rawWarningRadius = warningRangeObj?.r;
    const isAnchorDeployed = anchorState.value && anchorState.value.anchorDeployed;
    const boatLat = boatPosition.value?.latitude?.value ?? boatPosition.value?.latitude;
    const boatLon = boatPosition.value?.longitude?.value ?? boatPosition.value?.longitude;
    const hasValidBoatPosition = typeof boatLat === "number" && typeof boatLon === "number";
    
    if (typeof rawWarningRadius !== "number" || rawWarningRadius <= 0 || !isAnchorDeployed || !hasValidBoatPosition) {
      anchorState.value.aisWarning = false;
      logger.debug("IMMEDIATELY cleared inappropriate server AIS warning", {
        hasWarningRange: typeof rawWarningRadius === "number" && rawWarningRadius > 0,
        isAnchorDeployed,
        hasValidBoatPosition
      });
    }
  }
  
  // Skip initial load to prevent false warnings before data is ready
  if (isAisInitialLoad) {
    logger.debug("Skipping initial AIS update - waiting for data to settle");
    isAisInitialLoad = false;
    // Clear any existing AIS warning flag on initial load
    if (anchorState.value && anchorState.value.aisWarning) {
      anchorState.value.aisWarning = false;
      logger.debug("Cleared AIS warning flag on initial load");
    }
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
    // Reset AIS warning flag when no targets
    if (anchorState.value && anchorState.value.aisWarning) {
      anchorState.value.aisWarning = false;
    }
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

  // Update the aisWarning flag in the anchor state
  if (anchorState.value) {
    logger.debug(`Setting aisWarning flag to: ${hasTargetsInWarningRange}`);

    // Check if the aisWarning state has changed from false to true
    if (!anchorState.value.aisWarning && hasTargetsInWarningRange) {
      // Send an AIS proximity warning alert to the server
      const targetsInRange = validTargets.filter((feature) =>
        feature.get("isInWarningRange")
      ).length;
      
      // Log detailed debug info about what's triggering this alert
      logger.error("AIS PROXIMITY ALERT TRIGGERED", {
        currentAisWarning: anchorState.value.aisWarning,
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
      
      // Log details of targets in range
      const targetsInRangeDetails = validTargets
        .filter((feature) => feature.get("isInWarningRange"))
        .map((feature) => ({
          mmsi: feature.get("mmsi"),
          name: feature.get("name"),
          position: feature.getGeometry().getCoordinates()
        }));
      logger.error("TARGETS DETECTED IN RANGE:", targetsInRangeDetails);
      
      createAisProximityAlert(targetsInRange, warningRadiusInMeters, isMetric.value);
    }

    // Update the state
    anchorState.value.aisWarning = hasTargetsInWarningRange;
  }

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

// Map Initialization
const initializeMap = () => {
  logger.info("Initializing map...");
  logger.debug("Starting map initialization");

  // Get position from state
  const state = stateStore.state;
  const pos = state?.navigation?.position;
  const anchor = state?.anchor;

  logger.debug("Position data:", pos ? pos : "No position data");
  logger.debug("Anchor state:", anchor);

  // Determine center coordinates based on anchor state
  let centerLat = 0;
  let centerLon = 0;
  let hasValidPosition = false;

  // If anchor is deployed, center on current anchor location (end of rode)
  if (anchor?.anchorDeployed) {
    const anchorLoc = anchor?.anchorLocation;
    const anchorPos = anchorLoc?.position ?? anchorLoc;
    const anchorLat = anchorPos?.latitude?.value ?? anchorPos?.latitude;
    const anchorLon = anchorPos?.longitude?.value ?? anchorPos?.longitude;

    if (anchorLat != null && anchorLon != null) {
      centerLat = anchorLat;
      centerLon = anchorLon;
      hasValidPosition = true;
      logger.debug("Centering on anchor location:", { lat: centerLat, lon: centerLon });
    } else {
      const dropLoc = anchor?.anchorDropLocation;
      const dropPos = dropLoc?.position ?? dropLoc;
      const dropLat = dropPos?.latitude?.value ?? dropPos?.latitude;
      const dropLon = dropPos?.longitude?.value ?? dropPos?.longitude;
      if (dropLat != null && dropLon != null) {
        centerLat = dropLat;
        centerLon = dropLon;
        hasValidPosition = true;
        logger.debug("Centering on anchor drop location:", { lat: centerLat, lon: centerLon });
      }
    }
  }
  
  // Otherwise, center on boat position
  if (!hasValidPosition && pos?.latitude?.value != null && pos?.longitude?.value != null) {
    centerLat = pos.latitude.value;
    centerLon = pos.longitude.value;
    hasValidPosition = true;
    logger.debug("Centering on boat position:", { lat: centerLat, lon: centerLon });
  }
  
  if (!hasValidPosition) {
    logger.debug("Using default position (0,0)");
  }

  const defaultCenter = fromLonLat([centerLon, centerLat]);
  const defaultZoom = 15;

  // Create the map with minimal interactions initially
  map.value = new Map({
    target: mapElement.value,
    layers: [
      new TileLayer({ 
        source: isDarkMode.value 
          ? new XYZ({
              url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              attributions: null
            })
          : new OSM({ attributions: null })
      }),
      new VectorLayer({ source: vectorSource, zIndex: 5 }),
    ],
    view: new View({
      center: defaultCenter,
      zoom: defaultZoom,
      rotation: 0,
      enableRotation: false,
      minZoom: 5,
      maxZoom: 22,
    }),
    controls: defaultControls({ zoom: false, attribution: false }),
    interactions: defaultInteractions({
      // Start with minimal interactions
      dragPan: true,
      pinchZoom: true,
      altShiftDragRotate: false,
      pinchRotate: false,
      mouseWheelZoom: false, // Disable default and add our custom one below
    }),
    pixelRatio: window.devicePixelRatio,
  });

  isMapRenderReady.value = false;
  map.value.once("postrender", () => {
    // Use requestAnimationFrame to ensure DOM layout is complete
    requestAnimationFrame(() => {
      map.value.updateSize();
      isMapRenderReady.value = true;
      hasAppliedDefaultFramingThisEntry.value = false;
      attachDefaultFramingListener();

      const view = map.value?.getView?.();
      if (view && typeof view.on === "function") {
        view.on("change:resolution", () => {
          updateWindIndicatorScale();
        });
      }

      // Keep wind icon scaling smooth during zoom by updating every render frame.
      map.value.on("postrender", () => {
        updateWindIndicatorScale();
      });
    });
  });

  if (mapElement.value) {
    mapElement.value.__ol_map__ = map.value;
  }
  window.__anchorMap = map.value;

  // Hard lock map rotation (iOS pinch gestures can still rotate under some conditions)
  try {
    const view = map.value.getView();
    if (view && typeof view.setRotation === "function") {
      view.setRotation(0);
    }

    map.value.getInteractions().forEach((interaction) => {
      if (interaction instanceof DragRotate || interaction instanceof PinchRotate) {
        map.value.removeInteraction(interaction);
      }
    });
  } catch (error) {
    // Ignore rotation lock failures
  }

  // Capture the default DragPan interaction so we can temporarily disable it while dragging measure pins.
  dragPanInteraction = null;
  map.value.getInteractions().forEach((interaction) => {
    if (interaction instanceof DragPan) {
      dragPanInteraction = interaction;
    }
  });

  // Disable DragPan when a gesture starts on a measurement pin so the Translate interaction can move the pin.
  let isDraggingMeasurePin = false;
  let draggedMeasureFeature = null;
  map.value.on("pointerdown", (evt) => {
    if (measureModeEnabled.value !== true) return;
    if (!dragPanInteraction || typeof dragPanInteraction.setActive !== "function") return;
    const pixel = evt?.pixel;
    if (!pixel) return;
    const featuresAtPixel = map.value.getFeaturesAtPixel(pixel, { hitTolerance: 18 });
    const measurePinFeature = Array.isArray(featuresAtPixel)
      ? featuresAtPixel.find((feature) => {
          const type = feature?.get?.("type");
          return type === FEATURE_TYPES.MEASURE_PIN_A || type === FEATURE_TYPES.MEASURE_PIN_B;
        })
      : null;
    if (measurePinFeature) {
      isDraggingMeasurePin = true;
      draggedMeasureFeature = measurePinFeature;
      dragPanInteraction.setActive(false);

      const draggedType = draggedMeasureFeature?.get?.("type");
      if (draggedType === FEATURE_TYPES.MEASURE_PIN_A) {
        measurePinAFollowsBoat.value = false;
        if (typeof draggedMeasureFeature?.setStyle === "function") {
          draggedMeasureFeature.setStyle(getMeasurePinStyle("A", false));
        }
      }
      if (draggedType === FEATURE_TYPES.MEASURE_PIN_B) {
        measurePinBFollowsBoat.value = false;
        if (typeof draggedMeasureFeature?.setStyle === "function") {
          draggedMeasureFeature.setStyle(getMeasurePinStyle("B", false));
        }
      }

      syncTranslateFeatures();
    }
  });

  // Manual drag fallback: move the pin geometry directly on pointerdrag.
  map.value.on("pointerdrag", (evt) => {
    if (measureModeEnabled.value !== true) return;
    if (!isDraggingMeasurePin) return;
    if (!draggedMeasureFeature) return;
    const coord = evt?.coordinate;
    if (!coord || coord.length < 2) return;
    const geom = draggedMeasureFeature.getGeometry?.();
    if (!geom || typeof geom.setCoordinates !== "function") return;
    geom.setCoordinates(coord);
    updateMeasurementLineAndLabel();
  });

  map.value.on("pointerup", () => {
    if (!dragPanInteraction || typeof dragPanInteraction.setActive !== "function") return;
    if (!isDraggingMeasurePin) return;

    const dragged = draggedMeasureFeature;
    if (dragged) {
      const boatLonLat = getBoatLonLatForMeasure();
      if (boatLonLat) {
        const boatLon = boatLonLat[0];
        const boatLat = boatLonLat[1];
        const draggedType = dragged?.get?.("type");
        const geom = dragged?.getGeometry?.();
        const coord = geom?.getCoordinates?.();
        if (Array.isArray(coord)) {
          const lonLat = toLonLat(coord);
          if (Array.isArray(lonLat) && lonLat.length >= 2) {
            const lon = lonLat[0];
            const lat = lonLat[1];
            if (
              typeof lon === "number" &&
              typeof lat === "number" &&
              !Number.isNaN(lon) &&
              !Number.isNaN(lat)
            ) {
              const d = calculateDistanceMeters(lat, lon, boatLat, boatLon, true);
              if (typeof d === "number" && !Number.isNaN(d) && d <= measureSnapDistanceMeters) {
                if (draggedType === FEATURE_TYPES.MEASURE_PIN_A) {
                  applyBoatFollowToPin("A", measurePinA, measurePinAFollowsBoat);
                }
                if (draggedType === FEATURE_TYPES.MEASURE_PIN_B) {
                  applyBoatFollowToPin("B", measurePinB, measurePinBFollowsBoat);
                }
              }
            }
          }
        }
      }
    }

    isDraggingMeasurePin = false;
    draggedMeasureFeature = null;
    dragPanInteraction.setActive(true);
    syncTranslateFeatures();
    updateMeasurementLineAndLabel();
  });

  // Add boat feature immediately if we have valid position
  if (hasValidPosition) {
    logger.debug("Adding initial boat feature");
    try {
      // Create a boat feature with the current position
      const boatFeature = new Feature({
        geometry: new Point(fromLonLat([centerLon, centerLat])),
        name: "Boat",
        type: FEATURE_TYPES.BOAT,
      });

      // Clone style and set rotation
      const boatStyle = typeof STYLES.BOAT?.clone === "function" ? STYLES.BOAT.clone() : STYLES.BOAT;
      
      try {
        const img = boatStyle?.getImage?.();
        if (img && typeof img.setRotation === "function") {
          const iconOffset = -Math.PI / 4 + Math.PI; // Same as in updateBoatPosition
          
          // Check if anchor is deployed for initial rotation
          const isAnchorDeployed = anchor?.anchorDeployed === true;
          
          if (isAnchorDeployed) {
            const anchorPos = anchor?.anchorLocation?.position;
            if (anchorPos) {
              const anchorLat = anchorPos.latitude?.value ?? anchorPos.latitude;
              const anchorLon = anchorPos.longitude?.value ?? anchorPos.longitude;
              if (typeof anchorLat === "number" && typeof anchorLon === "number") {
                const dLon = anchorLon - centerLon;
                const dLat = anchorLat - centerLat;
                const angleToAnchor = Math.atan2(dLon, dLat);
                img.setRotation(angleToAnchor + iconOffset + Math.PI);
              }
            }
          } else {
            // Use heading/COG if available
            const headingTrueDeg = pos?.course?.heading?.true?.value;
            const cogDeg = pos?.course?.cog?.value;
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
      
      boatFeature.setStyle(boatStyle);

      // Add the boat feature to the vector source
      vectorSource.addFeature(boatFeature);
      
      // Initialize current boat position for animations
      currentBoatPosition = { lat: centerLat, lon: centerLon, x: defaultCenter[0], y: defaultCenter[1] };

      logger.debug("Boat feature added successfully with rotation");
    } catch (error) {
      logger.error("Error adding boat feature", { error });
    }
  }

  // Set willReadFrequently attribute on the canvas for better performance
  // We need to wait for the map to be properly rendered before accessing the canvas
  setTimeout(() => {
    const canvas = map.value.getViewport().querySelector("canvas");
    if (canvas) {
      // The correct way to set willReadFrequently is to get a new context with the attribute
      canvas.getContext("2d", { willReadFrequently: true });
      logger.debug("Set willReadFrequently on map canvas for better performance");
    }
  }, 100);

  // Add mouse wheel zoom interaction manually with custom options
  const mouseWheelZoom = new MouseWheelZoom({
    duration: 250,
    timeout: 80,
    useAnchor: true,
  });
  map.value.addInteraction(mouseWheelZoom);

  // Hide OpenLayers attribution control
  setTimeout(() => {
    const attributionElements = document.querySelectorAll('.ol-attribution, .ol-attribution-button, .ol-attribution ul');
    attributionElements.forEach(el => {
      el.style.visibility = 'hidden';
      el.style.display = 'none';
    });
  }, 100);

  // Add click handler for features
  map.value.on("click", handleMapClick);

  // Add both passive and non-passive event listeners as fallback
  mapElement.value.addEventListener("wheel", handleWheelEvent, { passive: false });
  document.addEventListener("wheel", handleWheelEvent, { passive: false, capture: true });

  // Focus management
  mapElement.value.tabIndex = 0; // Make focusable
  mapElement.value.style.outline = "none";
  mapElement.value.focus();
};

// Watchers
// Watch for changes in the state's navigation position
watch(
  () => stateStore.state.navigation?.position,
  () => {
    updateBoatPosition();
    updateFenceFeatures();
    // Also update rode line when boat position changes and anchor is deployed
    if (anchorState.value?.anchorDeployed) {
      updateRodeLine();
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => stateStore.state.navigation?.course?.heading,
  () => {
    updateBoatPosition();
  },
  { immediate: true, deep: true }
);

// Watch for anchor state changes
watch(
  anchorState,
  () => {
    // Check if anchorState exists before accessing properties
    if (!anchorState.value) {
      return;
    }
    
    if (anchorState.value.anchorDeployed) {
      updateAnchorPoints();
      updateCriticalRangeCircle();
      updateRodeLine();
    } else {
      clearFeature(FEATURE_TYPES.ANCHOR_DROP_LOCATION);
      clearFeature(FEATURE_TYPES.ANCHOR_LOCATION);
      clearFeature(FEATURE_TYPES.RODE);
      clearFeature(FEATURE_TYPES.CIRCLE);
    }
  },
  { deep: true, immediate: true }
);

// Watch boat position to update rode line when anchor is deployed and detect anchor dragging
watch(
  boatPosition,
  (newPosition) => {
    logger.debug("Boat position updated", { position: newPosition });

    updateFenceFeatures();

    if (measureModeEnabled.value) {
      let updated = false;
      if (measurePinAFollowsBoat.value === true) {
        applyBoatFollowToPin("A", measurePinA, measurePinAFollowsBoat);
        updated = true;
      }
      if (measurePinBFollowsBoat.value === true) {
        applyBoatFollowToPin("B", measurePinB, measurePinBFollowsBoat);
        updated = true;
      }
      if (updated) {
        syncTranslateFeatures();
        updateMeasurementLineAndLabel();
      }
    }

    // Check if anchorState exists before accessing properties
    if (!anchorState.value) {
      return;
    }
    
    if (anchorState.value.anchorDeployed) {
      // The server now handles all dragging detection and anchor location updates
      // Client only needs to update the rode line visualization
      updateRodeLine();
    }
  },
  { deep: true }
);

// Watch for anchor state changes from the server
watch(
  anchorState,
  (newState, oldState) => {
    if (!newState) return;
    
    // If anchor location was updated by server, update the map visualization
    if (newState.anchorLocation?.position && 
        oldState?.anchorLocation?.position &&
        (newState.anchorLocation.position.latitude?.value !== oldState.anchorLocation.position.latitude?.value ||
         newState.anchorLocation.position.longitude?.value !== oldState.anchorLocation.position.longitude?.value)) {
      logger.debug("Anchor location updated by server", {
        oldPosition: oldState.anchorLocation.position,
        newPosition: newState.anchorLocation.position
      });
      
      // Update anchor visualization
      updateAnchorPoints();
      updateCriticalRangeCircle();
      updateRodeLine();
    }
    
    // If dragging state changed, update visualization
    if (newState.dragging !== oldState?.dragging) {
      logger.debug("Anchor dragging state changed", {
        isDragging: newState.dragging
      });
      
      // Update critical range circle style based on dragging state
      updateCriticalRangeCircle();
    }
  },
  { deep: true }
);

// Removed duplicate watch as it's now handled by the anchor state watch

// We've removed the auto-centering watch function to prevent the map from recentering
// on every position update, allowing users to maintain their chosen map view
//
// Original code:
// watch(
//   () => navigationState.value?.position,
//   (newPos) => {
//     if (map.value && newPos?.latitude?.value && newPos?.longitude?.value) {
//       const center = fromLonLat([newPos.longitude.value, newPos.latitude.value]);
//       map.value.getView().setCenter(center);
//     }
//   },
//   { immediate: true }
// );

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

// Watch for critical anchor state changes
watch(
  () => anchorState.value?.dragging,
  (isDragging) => {
    logger.debug("Anchor dragging state changed", {
      isDragging: isDragging,
    });
  },
  { immediate: true, deep: true }
);

// Watch for critical anchor state changes
watch(
  [() => anchorState.value?.criticalRange?.r, () => anchorState.value?.dragging],
  ([range, isDragging]) => {
    logger.debug("Critical anchor state changed:", {
      criticalRange: range,
      isDragging: isDragging,
    });

    // Check if anchorState exists before accessing properties
    if (!anchorState.value) {
      clearFeature(FEATURE_TYPES.CIRCLE);
      return;
    }

    // Ensure range visuals stay up to date (critical range circle is drawn in updateCriticalRangeCircle)
    updateCriticalRangeCircle();
    updateBoatRangeCircle();
  },
  { immediate: true, deep: true }
);

// Also watch for boat position changes to update the boat range circle
watch(
  () => state.value.aisTargets,
  () => {
    // Skip if this is initial load - let the other watcher handle it
    if (isAisInitialLoad) {
      logger.debug("Skipping raw AIS targets update on initial load");
      return;
    }
    updateAisTargets();
    updateFenceFeatures();
  },
  { deep: true }
);

watch(
  () => anchorState.value?.fences,
  () => {
    updateFenceFeatures();
  },
  { deep: true }
);

// Also watch for boat position changes to update the boat range circle
watch(
  () => boatPosition.value,
  () => {
    updateBoatRangeCircle();
  },
  { deep: true }
);

// Watch for critical range changes
watch(
  () => anchorState.value?.criticalRange?.r,
  (newVal) => {
    logger.debug("Critical range changed:", newVal);
    logger.debug("Anchor drop location:", anchorDropLocation.value);
    logger.debug("Anchor deployed:", anchorDeployed.value);
  },
  { immediate: true }
);

// Watch for AIS targets changes
watch(
  aisTargets,
  () => {
    updateAisTargets();
  },
  { immediate: true, deep: true }
);

// Watch for breadcrumbs changes
watch(breadcrumbs, () => {
  updateBreadcrumbs();
}, { immediate: true });

// Modal State
const showSetAnchorDialog = ref(false);

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
            if (isMetric.value) {
              if (seaLevelUnit === "ft") return rawLevel / 3.28084;
              return rawLevel;
            }
            if (seaLevelUnit === "m") return rawLevel * 3.28084;
            return rawLevel;
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
    const depthInMeters = isMetric.value ? reportedDepth : reportedDepth / 3.28084;

    const bowRollerToWaterMeters =
      bowRollerToWaterPayload.units === "ft"
        ? bowRollerToWaterPayload.value / 3.28084
        : bowRollerToWaterPayload.value;

    // Calculate depth increase from current level to max future level
    // If we couldn't determine current water level, use the first available data point
    const referenceLevel = currentLevel !== null ? currentLevel : seaLevels[0] || 0;
    const depthIncreaseMeters =
      maxFutureLevel !== -Infinity ? Math.max(0, maxFutureLevel - referenceLevel) : 0;
    const targetDepthMeters = depthInMeters + bowRollerToWaterMeters + depthIncreaseMeters;

    // Depth increase calculation details are no longer logged to console

    // Convert to feet if using imperial units
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

onIonViewDidEnter(() => {
  hasCenteredOnBoatThisEntry.value = null;
  hasLoggedFramingDebugThisEntry.value = false;
  hasAppliedDefaultFramingThisEntry.value = false;
  isAnchorViewActive.value = true;
  updateBoatPosition();
  if (map.value) {
    map.value.updateSize();

    isMapRenderReady.value = false;
    map.value.once("postrender", () => {
      isMapRenderReady.value = true;
      if (isAnchorViewActive.value === true) {
        hasAppliedDefaultFramingThisEntry.value = false;
        attachDefaultFramingListener();
      }
    });
    if (typeof map.value.render === "function") {
      map.value.render();
    }
  }

  nextTick(() => {
    if (!map.value) return;
    map.value.updateSize();

    attachDefaultFramingListener();
  });
});

onIonViewDidLeave(() => {
  isAnchorViewActive.value = false;
});

watch(map, (nextMap) => {
  if (!nextMap) return;
  if (isAnchorViewActive.value !== true) return;
  if (hasAppliedDefaultFramingThisEntry.value === true) return;
  nextTick(() => {
    attachDefaultFramingListener();
  });
});

onMounted(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible") return;
    if (!map.value) return;
    map.value.updateSize();
    attachDefaultFramingListener();
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  onUnmounted(() => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  });
});

const showUpdateDialog = ref(false);
const showCancelDialog = ref(false);
const showUpdateDropConfirm = ref(false);
const locationRequestFailed = ref(false);

const handleSaveAnchorParameters = () => {
  console.log("[AnchorView] handleSaveAnchorParameters called");
  if (!anchorState.value) {
    logger.warn("Cannot save anchor parameters - anchorState is missing");
    showSetAnchorDialog.value = false;
    return;
  }

  if (anchorState.value.anchorDeployed !== true) {
    logger.warn("Cannot save anchor parameters - anchor is not deployed");
    showSetAnchorDialog.value = false;
    return;
  }

  const rodeAmount = anchorState.value.rode?.amount;
  const critical = anchorState.value.criticalRange?.r;
  const warning = anchorState.value.warningRange?.r;

  logger.debug("Saving anchor parameters - raw values:", {
    rodeAmount,
    critical,
    warning,
    criticalUnits: anchorState.value.criticalRange?.units,
    preferredUnits: preferences.value?.units?.length || anchorState.value.rode?.units,
  });

  if (typeof rodeAmount !== "number" || Number.isNaN(rodeAmount)) {
    logger.warn("Cannot save anchor parameters - invalid rode amount", { rodeAmount });
    return;
  }
  if (typeof critical !== "number" || Number.isNaN(critical)) {
    logger.warn("Cannot save anchor parameters - invalid critical range", { critical });
    return;
  }
  if (typeof warning !== "number" || Number.isNaN(warning)) {
    logger.warn("Cannot save anchor parameters - invalid warning range", { warning });
    return;
  }

  const preferredUnits = isMetric.value ? "m" : "ft";
  if (preferredUnits !== "m" && preferredUnits !== "ft") {
    logger.warn("Cannot save anchor parameters - missing/invalid preferred length units", {
      preferredUnits,
    });
    return;
  }

  try {
    const updatedAnchorState = {
      ...anchorState.value,
      rode: {
        ...anchorState.value.rode,
        amount: rodeAmount,
        units: preferredUnits,
      },
      criticalRange: {
        ...anchorState.value.criticalRange,
        r: critical,
        units: preferredUnits,
      },
      warningRange: {
        ...anchorState.value.warningRange,
        r: warning,
        units: preferredUnits,
      },
    };

    if (updatedAnchorState.warningRange?.r === 0) {
      updatedAnchorState.aisWarning = false;
    }

    state.value.anchor = { ...updatedAnchorState };

    // Use nextTick to ensure all reactive updates are processed before calling updateAisTargets
    nextTick(() => {
      try {
        if (typeof updateAisTargets?.cancel === "function") {
          updateAisTargets.cancel();
        }
        if (typeof updateAisTargets === "function") {
          updateAisTargets();
        }
      } catch (e) {
        logger.error("Failed to update AIS targets after saving anchor parameters", e);
      }
    });

    try {
      const unitLabel = isMetric.value ? "m" : "ft";

      if (updatedAnchorState.warningRange?.r === 0) {
        if (typeof stateStore?.resolveAlertsByTrigger === "function") {
          stateStore.resolveAlertsByTrigger("ais_proximity", {
            warningRadius: updatedAnchorState.warningRange.r,
            units: unitLabel,
            source: "AnchorView.handleSaveAnchorParameters",
          });
        }

        if (state.value?.alerts?.active && Array.isArray(state.value.alerts.active)) {
          const shouldRemove = (alert) => {
            const trigger = alert?.trigger;
            const type = alert?.type;
            return trigger === "ais_proximity" || type === "ais_proximity";
          };

          const nextActive = state.value.alerts.active.filter((alert) => !shouldRemove(alert));
          state.value.alerts.active = nextActive;
        }

        if (anchorState.value) {
          anchorState.value.aisWarning = false;
        }
      }

      if (updatedAnchorState.criticalRange?.r === 0) {
        if (typeof stateStore?.resolveAlertsByTrigger === "function") {
          stateStore.resolveAlertsByTrigger("critical_range", {
            criticalRange: updatedAnchorState.criticalRange.r,
            units: unitLabel,
            source: "AnchorView.handleSaveAnchorParameters",
          });
        }

        if (state.value?.alerts?.active && Array.isArray(state.value.alerts.active)) {
          const shouldRemove = (alert) => {
            const trigger = alert?.trigger;
            const type = alert?.type;
            return trigger === "critical_range" || type === "critical_range";
          };

          const nextActive = state.value.alerts.active.filter((alert) => !shouldRemove(alert));
          state.value.alerts.active = nextActive;
        }
      }
    } catch (e) {
      logger.error("Failed to auto-resolve alerts after anchor parameter update", e);
    }

    try {
      const storageState = {
        anchorDeployed: true,
        anchorDropLocation: updatedAnchorState.anchorDropLocation,
        anchorLocation: updatedAnchorState.anchorLocation,
        criticalRange: updatedAnchorState.criticalRange,
        warningRange: updatedAnchorState.warningRange,
        rode: updatedAnchorState.rode,
        timestamp: Date.now(),
      };
      localStorage.setItem("anchorState", JSON.stringify(storageState));
    } catch (e) {
      logger.error("Failed to save anchor parameters to localStorage", e);
    }

    try {
      // Create payload following server protocol - only send allowed fields
      const payload = {
        type: "anchor:update",
        data: {
          // Only allowed parameters - NO position data
          rode: updatedAnchorState.rode,
          criticalRange: updatedAnchorState.criticalRange,
          warningRange: updatedAnchorState.warningRange,
          
          // Optional depth if present
          ...(updatedAnchorState.anchorDropLocation?.depth && {
            anchorDropLocation: {
              depth: updatedAnchorState.anchorDropLocation.depth,
              depthSource: updatedAnchorState.anchorDropLocation.depthSource || "user_entered"
            }
          }),
          
          // Bearing ONLY if user set it (not default value)
          // Check if bearing is different from default (180 degrees) or if user tried phone bearing
          ...(updatedAnchorState.anchorDropLocation?.bearing && 
            (updatedAnchorState.anchorDropLocation.bearing.degrees !== 180 || hasTriedPhoneBearing.value) && {
            setBearing: {
              value: updatedAnchorState.anchorDropLocation.bearing.degrees,
              units: "deg"
            }
          })
        }
      };
      
      console.log("[AnchorView] Sending to server - corrected payload:", payload);
      
      stateStore
        .sendMessageToServer("anchor:update", payload.data, {
          source: "AnchorView.handleSaveAnchorParameters",
          timeout: 5000,
        })
        .then((response) => {
          logger.info("Server acknowledged anchor parameter update", response);
          console.log("[AnchorView] Server response for anchor parameters:", {
            fullResponse: response,
            responseData: response.data,
            serverCriticalRange: response?.data?.criticalRange,
            serverWarningRange: response?.data?.warningRange,
            serverRode: response?.data?.rode,
            serverAnchorLocation: response?.data?.anchorLocation,
            serverDropLocation: response?.data?.anchorDropLocation
          });
          logger.debug("Server response data:", {
            responseCriticalRange: response?.data?.criticalRange,
            responseCriticalR: response?.data?.criticalRange?.r,
            responseCriticalUnits: response?.data?.criticalRange?.units,
            localCriticalR: updatedAnchorState.criticalRange?.r,
            localCriticalUnits: updatedAnchorState.criticalRange?.units,
          });
          const merged = { ...updatedAnchorState, ...(response?.data || {}) };

          if (merged?.warningRange?.r === 0) {
            merged.aisWarning = false;
          }

          state.value.anchor = merged;

          try {
            if (typeof updateAisTargets?.cancel === "function") {
              updateAisTargets.cancel();
            }
            if (typeof updateAisTargets === "function") {
              updateAisTargets();
            }
          } catch (e) {
            logger.error("Failed to update AIS targets after server ack", e);
          }
        })
        .catch((error) => {
          logger.error("Failed to send updated anchor parameters to server", error);
        });
    } catch (error) {
      logger.error("Error preparing anchor parameter update for server", error);
    }

    updateCriticalRangeCircle();
    updateBoatRangeCircle();
    updateRodeLine();
    showSetAnchorDialog.value = false;
  } catch (error) {
    logger.error("Failed to save anchor parameters", error);
  }
};

// Modal Handlers
const handleSetAnchor = () => {
  logger.info("Handling set anchor action...");
  if (!validateCoordinates(boatPosition.value)) {
    logger.warn("Cannot set anchor: Invalid boat position");
    return;
  }

  try {
    // Extract values safely
    const boatLat = boatPosition.value.latitude?.value ?? boatPosition.value.latitude;
    const boatLon = boatPosition.value.longitude?.value ?? boatPosition.value.longitude;

    // Get the bearing from the anchor drop location or use a default of 180 degrees (south)
    // This ensures the anchor is placed in a different location than the boat
    const bearingDegrees = anchorState.value.anchorDropLocation?.bearing?.degrees ?? 180;

    // IMPORTANT: The bearing needs to be in radians for the calculation
    // The bearing is the direction FROM the boat TO the anchor
    const bearingRad = (bearingDegrees * Math.PI) / 180; // Convert degrees to radians

    // Make sure we have a non-zero rode length (default to 50m if not set)
    const rodeAmount = anchorState.value.rode?.amount ?? 50;
    const currentRodeUnits = anchorState.value.rode?.units || "m";
    const preferredUnits = preferences.value?.units?.length || currentRodeUnits;
    let rode = rodeAmount;
    if (preferredUnits === "m" && currentRodeUnits === "ft") {
      rode = UnitConversion.ftToM(rodeAmount);
    } else if (preferredUnits === "ft" && currentRodeUnits === "m") {
      rode = UnitConversion.mToFt(rodeAmount);
    }
    const depth = navigationState.value?.depth?.value ?? 0; // Use 0 as default if no depth

    // Debug the values being passed to getComputedAnchorLocation
    logger.debug("Computing anchor location with:", {
      dropLocation: { latitude: boatLat, longitude: boatLon },
      rode: rode,
      bearing: bearingRad,
      depth: depth,
    });

    // Calculate anchor position using the state store's function
    const computedAnchorLocation = getComputedAnchorLocation(
      { latitude: boatLat, longitude: boatLon },
      rode,
      bearingRad,
      depth,
      isMetric.value
    );

    logger.debug("Computed anchor location:", computedAnchorLocation);

    // Calculate the distance between boat and anchor positions
    const distanceToAnchor = calculateDistanceMeters(
      boatLat,
      boatLon,
      computedAnchorLocation.latitude,
      computedAnchorLocation.longitude,
      isMetric.value
    );

    logger.debug("Distance calculations:", {
      boatPosition: [boatLon, boatLat],
      anchorPosition: [computedAnchorLocation.longitude, computedAnchorLocation.latitude],
      rodeLength: rode,
      calculatedDistance: distanceToAnchor,
      difference: Math.abs(rode - distanceToAnchor),
    });

    // Log the anchor state before updating
    const newAnchorState = {
      anchorDropLocation: {
        position: {
          latitude: { value: boatLat, units: "deg" },
          longitude: { value: boatLon, units: "deg" },
        },
        time: new Date().toISOString(),
        depth: navigationState.value?.depth || { value: null, units: "m", feet: null },
        bearing: { value: bearingRad, units: "rad", degrees: bearingDegrees },
      },
      anchorLocation: {
        position: {
          latitude: { value: computedAnchorLocation.latitude, units: "deg" },
          longitude: { value: computedAnchorLocation.longitude, units: "deg" },
        },
        originalPosition: {
          latitude: { value: computedAnchorLocation.latitude, units: "deg" },
          longitude: { value: computedAnchorLocation.longitude, units: "deg" },
        },
        time: new Date().toISOString(),
        depth: navigationState.value?.depth || { value: null, units: "m", feet: null },
        distancesFromCurrent: {
          value: 0,
        },
        distancesFromDrop: {
          value: 0,
        },
        originalBearing: { value: bearingRad, units: "rad", degrees: bearingDegrees },
        bearing: { value: bearingRad, units: "rad", degrees: bearingDegrees },
      },
      rode: {
        amount: rode,
        units: preferredUnits,
      },
      criticalRange: {
        r: anchorState.value.criticalRange?.r || rode,
        units: preferredUnits,
      },
      warningRange: {
        r: anchorState.value.warningRange?.r || 15,
        units: preferredUnits,
      },
      defaultScope: {
        value: 5,
        units: "ratio",
      },
      dragging: false,
      anchorDeployed: true,
      history: [],
      useDeviceGPS: true,
    };

    // Log the state that will be sent to the server
    logger.info(
      "Updating anchor state on server:",
      JSON.stringify(
        {
          type: "anchor:update",
          data: newAnchorState,
          timestamp: new Date().toISOString(),
          source: "AnchorView.handleSetAnchor",
        },
        null,
        2
      )
    );

    // Log the raw values being used
    logger.debug("Anchor state update details:", {
      boatPosition: { lat: boatLat, lon: boatLon },
      computedAnchorLocation,
      rode,
      depth: navigationState.value?.depth,
      bearing: { degrees: bearingDegrees, radians: bearingRad },
    });

    // Create a clean object for localStorage
    const storageState = {
      anchorDeployed: true,
      anchorDropLocation: newAnchorState.anchorDropLocation,
      anchorLocation: newAnchorState.anchorLocation,
      criticalRange: newAnchorState.criticalRange,
      warningRange: newAnchorState.warningRange,
      rode: newAnchorState.rode,
      timestamp: Date.now(),
    };

    // Update the local state first for immediate UI feedback
    state.value.anchor = { ...newAnchorState };

    try {
      // Save to local storage immediately for offline use
      localStorage.setItem("anchorState", JSON.stringify(storageState));
      logger.debug("Anchor state saved to local storage");
    } catch (e) {
      logger.error("Failed to save anchor state to localStorage", e);
      // Continue with server sync even if localStorage fails
    }

    // Send the anchor update to the server
    const stateStore = useStateDataStore();
    logger.info("Sending anchor update to server...");

    // Create payload following server protocol - only send allowed fields
    const payload = {
      type: "anchor:update",
      data: {
        action: "set_after_deploy",
        anchorDeployed: true,
        rode: newAnchorState.rode,
        criticalRange: newAnchorState.criticalRange,
        warningRange: newAnchorState.warningRange,
        
        // Depth: handle both user-entered and boat depth cases
        ...(customAnchorDropDepthValue.value != null ? {
          // User provided depth
          anchorDropLocation: {
            depth: { 
              value: customAnchorDropDepthValue.value, 
              units: isMetric.value ? "m" : "ft" 
            },
            depthSource: "user_entered"
          }
        } : newAnchorState.anchorDropLocation?.depth?.value != null ? {
          // Use boat depth from navigation
          anchorDropLocation: {
            depth: newAnchorState.anchorDropLocation.depth,
            depthSource: "assumed_from_boat"
          }
        } : {}),
        
        // Bearing as setBearing
        setBearing: {
          value: bearingDegrees,
          units: "deg"
        }
      }
    };

    console.log("[AnchorView] Sending to server - corrected payload:", payload);

    stateStore
      .sendMessageToServer("anchor:update", payload.data, {
        source: "AnchorView.handleSetAnchor",
        timeout: 5000, // 5 second timeout
      })
      .then((response) => {
        logger.info("Server acknowledged anchor update", response);
        console.log("[AnchorView] Server response for set anchor:", {
          fullResponse: response,
          responseType: typeof response,
          responseKeys: response ? Object.keys(response) : 'null',
          responseData: response?.data,
          responseDataType: typeof response?.data,
          serverCriticalRange: response?.data?.criticalRange,
          serverWarningRange: response?.data?.warningRange,
          serverRode: response?.data?.rode,
          serverAnchorLocation: response?.data?.anchorLocation,
          serverDropLocation: response?.data?.anchorDropLocation,
          serverAnchorDeployed: response?.data?.anchorDeployed
        });
        console.log("[AnchorView] RAW SERVER RESPONSE:", JSON.stringify(response, null, 2));
        // Update the local state with any server-side modifications
        state.value.anchor = { ...newAnchorState, ...(response.data || {}) };

        // Update local storage with the latest state from server
        try {
          const updatedStorageState = {
            ...storageState,
            ...(response.data || {}),
          };
          localStorage.setItem("anchorState", JSON.stringify(updatedStorageState));
          logger.info("Updated anchor state in localStorage with server response");
        } catch (e) {
          logger.error("Failed to update anchor state in localStorage", e);
        }
      })
      .catch((error) => {
        logger.error("Failed to send anchor update to server", error);
        // Don't show an alert here as it might be annoying for temporary network issues
        // The state is already saved locally
      });

    // Update the map UI
    updateAnchorPoints();
    updateCriticalRangeCircle();
    updateRodeLine();
    updateBoatRangeCircle();

    // Close the dialog
    showSetAnchorDialog.value = false;
  } catch (error) {
    logger.error("Failed to save anchor state", { error });
    console.error('Error in handleSetAnchor:', {
    error: error.message,
    stack: error.stack,
    name: error.name,
    cause: error.cause
  });
  logger.error("Failed to save anchor state", { 
    error: error.message,
    stack: error.stack,
    name: error.name,
    cause: error.cause
  });
  alert("Error saving anchor position. See console for details.");
  showSetAnchorDialog.value = false;
  }
};

// Handler for the anchor-dropped event from AnchorInfoGrid
const handleAnchorDropped = () => {
  logger.info("Handling anchor dropped event...");
  logger.debug("Received anchor-dropped event");

  // Call the handleSetAnchor method to perform all the necessary operations
  handleSetAnchor();
};

const handleUpdateDropLocation = () => {
  const anchorPos = anchorState.value?.anchorLocation?.position;
  if (!anchorPos) {
    logger.warn("Cannot update drop location - anchorLocation.position is missing");
    return;
  }

  const lat =
    typeof anchorPos.latitude === "object" ? anchorPos.latitude.value : anchorPos.latitude;
  const lon =
    typeof anchorPos.longitude === "object" ? anchorPos.longitude.value : anchorPos.longitude;

  if (
    lat === null ||
    lat === undefined ||
    lon === null ||
    lon === undefined ||
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    Number.isNaN(lat) ||
    Number.isNaN(lon)
  ) {
    logger.warn("Cannot update drop location - invalid anchorLocation.position coordinates", {
      latitude: anchorPos.latitude,
      longitude: anchorPos.longitude,
    });
    return;
  }

  anchorState.value.anchorDropLocation.position = {
    latitude: { value: lat, units: "deg" },
    longitude: { value: lon, units: "deg" },
  };

  showUpdateDialog.value = false;
};

const confirmUpdateDropLocation = () => {
  logger.info("Confirming update of drop location...");
  handleUpdateDropLocation();
  try {
    const updatedAnchor = anchorState.value;
    if (updatedAnchor) {
      // Create payload following server protocol - only send reset action
      const payload = {
        type: "anchor:update",
        data: {
          action: "reset_anchor_here"
        }
      };

      console.log("[AnchorView] Sending to server - reset anchor here payload:", payload);

      stateStore
        .sendMessageToServer("anchor:update", payload.data, {
          source: "AnchorView.confirmUpdateDropLocation",
          timeout: 5000,
        })
        .then((response) => {
          logger.info("Server acknowledged updated drop location", response);
          console.log("[AnchorView] Server response for reset anchor here:", {
            fullResponse: response,
            responseData: response.data,
            serverAnchorLocation: response?.data?.anchorLocation,
            serverDropLocation: response?.data?.anchorDropLocation,
            serverBearing: response?.data?.anchorDropLocation?.bearing,
            serverTimes: response?.data?.anchorDropLocation?.time
          });
        })
        .catch((error) => {
          logger.error("Failed to send updated drop location to server", error);
        });
    }
  } catch (error) {
    logger.error("Error preparing anchor update for server", error);
  }
  showUpdateDropConfirm.value = false;
  showCancelDialog.value = false;
};

const handleCancelAnchor = () => {
  logger.info("Handling cancel anchor action...");
  // First, identify all features we want to keep
  const boatFeatures = [];
  const aisFeatures = [];

  // Get all boat and AIS features
  vectorSource.forEachFeature((feature) => {
    const featureType = feature.get("type");
    if (featureType === FEATURE_TYPES.BOAT) {
      boatFeatures.push(feature);
    } else if (featureType === FEATURE_TYPES.AIS) {
      aisFeatures.push(feature);
    }
  });

  logger.debug("Found features to preserve", {
    boatFeatures: boatFeatures.length,
    aisFeatures: aisFeatures.length,
  });

  // Clear ALL features from the vector source
  vectorSource.clear();

  // Re-add the boat features
  boatFeatures.forEach((feature) => {
    vectorSource.addFeature(feature);
  });

  // Re-add the AIS features with neutral style (reset from warning state)
  aisFeatures.forEach((feature) => {
    feature.set("isInWarningRange", false);
    feature.setStyle(STYLES.AIS_VESSEL);
    vectorSource.addFeature(feature);
  });

  // If no boat feature was found, force an update of the boat position
  if (boatFeatures.length === 0 && boatPosition.value) {
    updateBoatPosition();
  }

  // Reset the anchor state in the store
  if (anchorState.value && Array.isArray(anchorState.value.fences)) {
    anchorState.value.fences = [];
  }
  stateStore.cancelAnchor();
  updateFenceFeatures();

  // Close the dialog
  showCancelDialog.value = false;

  // logger.debug('All anchor-related features have been cleared from the map');
};

// Toast for anchor reset acknowledgements
const showAnchorResetToast = async (ack) => {
  try {
    const success = ack && ack.success !== false;
    const message = success
      ? "Anchor reset on server"
      : ack && ack.error
        ? `Failed to reset anchor: ${ack.error}`
        : "Failed to reset anchor";

    const toast = await toastController.create({
      message,
      duration: 2500,
      position: "bottom",
      color: success ? "success" : "danger",
      cssClass: "anchor-reset-toast",
    });
    await toast.present();
  } catch (e) {
    logger.error("Error showing anchor reset toast", e);
  }
};

onMounted(() => {
  const handler = (msg) => {
    showAnchorResetToast(msg);
  };

  relayConnectionBridge.on("anchor:reset:ack", handler);
  directConnectionAdapter.on("anchor:reset:ack", handler);

  onUnmounted(() => {
    relayConnectionBridge.off("anchor:reset:ack", handler);
    directConnectionAdapter.off("anchor:reset:ack", handler);
  });
});

// Handle map clicks to detect feature clicks
const handleMapClick = (event) => {
  logger.debug("Map click detected", {
    coordinate: event.coordinate,
    pixel: event.pixel,
    type: event.type,
  });

  if (measureModeEnabled.value) {
    const lonLatClicked = toLonLat(event.coordinate);
    if (!measurePinA.value) {
      tryCreateOrUpdateMeasurePin("A", lonLatClicked);
      return;
    }
    if (!measurePinB.value) {
      tryCreateOrUpdateMeasurePin("B", lonLatClicked);
      return;
    }
    return;
  }

  if (fenceModeEnabled.value) {
    const clickedFeaturesForFence = map.value?.getFeaturesAtPixel?.(event.pixel);
    const aisFeatureForFence = Array.isArray(clickedFeaturesForFence)
      ? clickedFeaturesForFence.find((feature) => feature.get("type") === FEATURE_TYPES.AIS)
      : null;

    if (aisFeatureForFence) {
      const mmsi = aisFeatureForFence.get("mmsi");
      const name = aisFeatureForFence.get("name");
      if (mmsi != null) {
        selectedFenceTarget.value = {
          targetType: "ais",
          name: name || "AIS Target",
          targetRef: { mmsi },
        };
        fenceName.value = name || "";
        showFenceConfigModal.value = true;
        return;
      }
    }

    const lonLatClicked = toLonLat(event.coordinate);
    if (!Array.isArray(lonLatClicked) || lonLatClicked.length < 2) {
      logger.warn("Fence mode click ignored: invalid map coordinate", {
        coordinate: event.coordinate,
      });
      return;
    }

    const clickedLon = lonLatClicked[0];
    const clickedLat = lonLatClicked[1];
    if (typeof clickedLat !== "number" || typeof clickedLon !== "number") {
      logger.warn("Fence mode click ignored: non-numeric coordinate", {
        lonLatClicked,
      });
      return;
    }

    selectedFenceTarget.value = {
      targetType: "point",
      name: "Map Point",
      targetRef: {
        latitude: clickedLat,
        longitude: clickedLon,
      },
    };
    fenceName.value = "";
    showFenceConfigModal.value = true;
    return;
  }

  // Get features at the click position
  const clickedFeatures = map.value.getFeaturesAtPixel(event.pixel);

  if (clickedFeatures && clickedFeatures.length > 0) {
    // Check if any of the features is an AIS target
    const aisFeature = clickedFeatures.find(
      (feature) => feature.get("type") === FEATURE_TYPES.AIS
    );

    if (aisFeature) {
      const mmsi = aisFeature.get("mmsi");
      const name = aisFeature.get("name");

      logger.debug(
        `Clicked on AIS target: ${name || "Unnamed"} (MMSI: ${mmsi || "N/A"})`
      );

      // Open AIS target modal instead of navigating
      if (aisFeature) {
        openAISModal(aisFeature);
      }
    }
  }
};

// AIS Modal state
const showAISModal = ref(false);
const selectedAISTarget = ref(null);

// Anchor Inspector Modal state
const showAnchorInspectorModal = ref(false);

const openAISModal = (aisFeature) => {
  const mmsi = aisFeature.get("mmsi");
  const name = aisFeature.get("name");
  
  logger.debug(`[AIS Modal] Opening modal for MMSI: ${mmsi}, Name: ${name}`);
  
  // Look up the full AIS target data from the store
  const mmsiStr = String(mmsi);
  const raw = state.value.aisTargets?.[mmsiStr];
  
  if (!raw) {
    logger.warn(`[AIS Modal] No AIS target found in store for MMSI: ${mmsi}`);
    selectedAISTarget.value = {
      mmsi: mmsi,
      name: name || "Unknown Vessel",
    };
  } else {
    logger.debug(`[AIS Modal] Found raw target data:`, raw);
    
    // Helper functions matching AISTargetView
    const toNumericValue = (val) => {
      if (val == null) return null;
      if (typeof val === "number") return Number.isFinite(val) ? val : null;
      if (typeof val === "object" && val.value != null) {
        const numeric = Number(val.value);
        return Number.isFinite(numeric) ? numeric : null;
      }
      return null;
    };
    
    // Format to 1 decimal place
    const format1Dec = (val) => {
      if (val == null) return null;
      return Number(val).toFixed(1);
    };
    
    // Get position directly from raw.position (matching AISTargetView)
    const lat = toNumericValue(raw.position?.latitude);
    const lon = toNumericValue(raw.position?.longitude);
    
    // Get SOG from raw.sog or navigationDetails.speedOverGround (in knots from store)
    const sogKnots = toNumericValue(raw.sog) ?? toNumericValue(raw.navigationDetails?.speedOverGround);
    let sog = null;
    if (sogKnots != null) {
      if (isMetric.value) {
        // Convert knots to km/h (1 knot = 1.852 km/h)
        sog = format1Dec(sogKnots * 1.852) + " km/h";
      } else {
        // Convert knots to mph (1 knot = 1.15078 mph)
        sog = format1Dec(sogKnots * 1.15078) + " mph";
      }
    }
    
    // Get COG - use convertedValue if available (already in degrees)
    const cogObj = raw.cog || raw.navigationDetails?.courseOverGroundTrue;
    const cogDegrees = cogObj?.convertedValue ?? (toNumericValue(cogObj) != null ? (toNumericValue(cogObj) * 180 / Math.PI) : null);
    const cog = cogDegrees != null ? format1Dec(cogDegrees) + "°" : null;
    
    // Get vessel type from raw.shipType (matching AISTargetView)
    const vesselType = raw.shipType || raw.shipTypeDetails?.name || null;
    
    // Navigation status
    const navStatus = raw.status || raw.navigationDetails?.status || null;
    
    // Get callsign directly (matching AISTargetView)
    const callsign = raw.callsign || raw.communication?.callsignVhf || null;
    
    // Get destination
    const destination = raw.destination || null;
    
    // Get dimensions using same logic as AISTargetView (in meters)
    const lengthMeters = toNumericValue(raw.design?.length?.value?.overall) 
      ?? toNumericValue(raw.design?.length?.overall)
      ?? toNumericValue(raw.length?.value?.overall)
      ?? toNumericValue(raw.length?.overall)
      ?? toNumericValue(raw.length?.value)
      ?? toNumericValue(raw.length);
    
    const beamMeters = toNumericValue(raw.design?.beam?.value)
      ?? toNumericValue(raw.design?.beam)
      ?? toNumericValue(raw.beam?.value)
      ?? toNumericValue(raw.beam);
    
    const draftMeters = toNumericValue(raw.design?.draft?.value?.current)
      ?? toNumericValue(raw.design?.draft?.current)
      ?? toNumericValue(raw.draft?.value?.current)
      ?? toNumericValue(raw.draft?.current)
      ?? toNumericValue(raw.draft?.value)
      ?? toNumericValue(raw.draft);
    
    // Convert dimensions to user preference
    let length = null, beam = null, draft = null;
    if (lengthMeters != null) {
      if (isMetric.value) {
        length = format1Dec(lengthMeters) + " m";
      } else {
        // Convert to feet (1 m = 3.28084 ft)
        length = format1Dec(lengthMeters * 3.28084) + " ft";
      }
    }
    if (beamMeters != null) {
      if (isMetric.value) {
        beam = format1Dec(beamMeters) + " m";
      } else {
        beam = format1Dec(beamMeters * 3.28084) + " ft";
      }
    }
    if (draftMeters != null) {
      if (isMetric.value) {
        draft = format1Dec(draftMeters) + " m";
      } else {
        draft = format1Dec(draftMeters * 3.28084) + " ft";
      }
    }
    
    // Calculate distance and convert to user preference
    let distance = null;
    const ownPos = state.value?.navigation?.position;
    if (lat != null && lon != null && ownPos) {
      const ownLat = toNumericValue(ownPos.latitude);
      const ownLon = toNumericValue(ownPos.longitude);
      if (ownLat != null && ownLon != null) {
        const distanceMeters = calculateDistanceMeters(ownLat, ownLon, lat, lon, true);
        if (Number.isFinite(distanceMeters)) {
          if (isMetric.value) {
            // Convert to meters or km
            if (distanceMeters >= 1000) {
              distance = format1Dec(distanceMeters / 1000) + " km";
            } else {
              distance = format1Dec(distanceMeters) + " m";
            }
          } else {
            // Convert to feet or nautical miles
            const distanceNm = distanceMeters / 1852;
            if (distanceNm >= 0.1) {
              distance = format1Dec(distanceNm) + " nm";
            } else {
              const distanceFt = distanceMeters * 3.28084;
              distance = format1Dec(distanceFt) + " ft";
            }
          }
        }
      }
    }
    
    selectedAISTarget.value = {
      mmsi: raw.mmsi || mmsi,
      name: raw.name || name || "Unknown Vessel",
      latitude: lat,
      longitude: lon,
      sog: sog,
      cog: cog,
      vesselType: vesselType,
      navStatus: navStatus,
      callsign: callsign,
      destination: destination,
      length: length,
      beam: beam,
      draft: draft,
      distance: distance,
    };
  }
  
  showAISModal.value = true;
};

const closeAISModal = () => {
  console.log("[AIS Modal] Closing modal");
  showAISModal.value = false;
  selectedAISTarget.value = null;
};

const handleAnchorStatusClick = () => {
  // Only open Anchor Inspector when anchored
  if (anchorState.value?.anchorDeployed) {
    console.log("[AnchorView] Opening Anchor Inspector from anchor status");
    showAnchorInspectorModal.value = true;
  }
};

// Computed properties for AnchorInspectorModal
const driftDisplay = computed(() => {
  // Calculate drift distance from drop location
  if (!anchorState.value?.anchorDropLocation?.position || !navigationState.value?.position) {
    return 'N/A';
  }
  
  const dropLat = anchorState.value.anchorDropLocation.position.latitude?.value || anchorState.value.anchorDropLocation.position.latitude;
  const dropLon = anchorState.value.anchorDropLocation.position.longitude?.value || anchorState.value.anchorDropLocation.position.longitude;
  const boatLat = navigationState.value.position.latitude?.value || navigationState.value.position.latitude;
  const boatLon = navigationState.value.position.longitude?.value || navigationState.value.position.longitude;
  
  const distance = calculateDistanceMeters(dropLat, dropLon, boatLat, boatLon);
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

// Helper functions for AIS data formatting
const toNumericValue = (val) => {
  if (val == null) return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'object' && val.value != null) {
    const numeric = Number(val.value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
};

const formatCoordinate = (coord) => {
  if (coord == null) return 'N/A';
  const num = toNumericValue(coord);
  if (num == null) return 'N/A';
  return num.toFixed(4);
};

const formatSpeed = (speed) => {
  if (speed == null) return 'N/A';
  const num = toNumericValue(speed);
  if (num == null) return 'N/A';
  const unit = isMetric.value ? 'km/h' : 'mph';
  const converted = isMetric.value ? num : num * 0.621371;
  return `${converted.toFixed(1)} ${unit}`;
};

const formatCourse = (course) => {
  if (course == null) return 'N/A';
  const num = toNumericValue(course);
  if (num == null) return 'N/A';
  return `${Math.round(num)}°`;
};

const formatDistance = (distance) => {
  if (distance == null) return 'N/A';
  const num = toNumericValue(distance);
  if (num == null) return 'N/A';
  const unit = isMetric.value ? 'm' : 'ft';
  const converted = isMetric.value ? num : num * 3.28084;
  return `${Math.round(converted)} ${unit}`;
};

const getVesselTypeLabel = (type) => {
  if (!type) return 'Unknown';
  const types = {
    0: 'Not available',
    1: 'Reserved',
    2: 'WIG',
    4: 'Hazardous category A',
    5: 'Hazardous category B',
    6: 'Hazardous category C',
    7: 'Hazardous category D',
    8: 'Reserved',
    9: 'Reserved',
    10: 'Reserved',
    11: 'Reserved',
    12: 'Reserved',
    13: 'Reserved',
    14: 'Reserved',
    15: 'Reserved',
    16: 'Reserved',
    17: 'Reserved',
    18: 'Reserved',
    19: 'Reserved',
    20: 'Wing in ground (WIG)',
    21: 'Wing in ground (WIG)',
    22: 'Wing in ground (WIG)',
    23: 'Wing in ground (WIG)',
    24: 'Wing in ground (WIG)',
    25: 'Wing in ground (WIG)',
    26: 'Wing in ground (WIG)',
    27: 'Wing in ground (WIG)',
    28: 'Wing in ground (WIG)',
    29: 'SAR aircraft',
    30: 'Fishing',
    31: 'Towing',
    32: 'Towing',
    33: 'Dredging',
    34: 'Diving ops',
    35: 'Military ops',
    36: 'Sailing',
    37: 'Pleasure craft',
    38: 'Reserved',
    39: 'Reserved',
    40: 'High speed craft',
    41: 'High speed craft',
    42: 'High speed craft',
    43: 'High speed craft',
    44: 'High speed craft',
    45: 'High speed craft',
    46: 'High speed craft',
    47: 'High speed craft',
    48: 'High speed craft',
    49: 'High speed craft',
    50: 'Pilot vessel',
    51: 'SAR vessel',
    52: 'Tug',
    53: 'Port tender',
    54: 'Anti-pollution',
    55: 'Law enforcement',
    56: 'Spare',
    57: 'Spare',
    58: 'Medical transport',
    59: 'Noncombatant',
    60: 'Passenger',
    61: 'Passenger',
    62: 'Passenger',
    63: 'Passenger',
    64: 'Passenger',
    65: 'Passenger',
    66: 'Passenger',
    67: 'Passenger',
    68: 'Passenger',
    69: 'Passenger',
    70: 'Cargo',
    71: 'Cargo',
    72: 'Cargo',
    73: 'Cargo',
    74: 'Cargo',
    75: 'Cargo',
    76: 'Cargo',
    77: 'Cargo',
    78: 'Cargo',
    79: 'Cargo',
    80: 'Tanker',
    81: 'Tanker',
    82: 'Tanker',
    83: 'Tanker',
    84: 'Tanker',
    85: 'Tanker',
    86: 'Tanker',
    87: 'Tanker',
    88: 'Tanker',
    89: 'Tanker',
    90: 'Other',
    91: 'Other',
    92: 'Other',
    93: 'Other',
    94: 'Other',
    95: 'Other',
    96: 'Other',
    97: 'Other',
    98: 'Other',
    99: 'Other'
  };
  return types[type] || 'Unknown';
};

const getNavStatusLabel = (status) => {
  if (status == null) return 'Unknown';
  const statuses = {
    0: 'Under way using engine',
    1: 'At anchor',
    2: 'Not under command',
    3: 'Restricted maneuverability',
    4: 'Constrained by her draught',
    5: 'Moored',
    6: 'Aground',
    7: 'Engaged in fishing',
    8: 'Under way sailing',
    9: 'Reserved',
    10: 'Reserved',
    11: 'Reserved',
    12: 'Reserved',
    13: 'Reserved',
    14: 'AIS-SART',
    15: 'Not defined'
  };
  return statuses[status] || 'Unknown';
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

// Handler for the custom anchor-dropped event
const handleAnchorDroppedEvent = (event) => {
  logger.debug("Received anchor-dropped event", event.detail);

  // Update the map features
  updateAnchorPoints();
  updateCriticalRangeCircle();
  updateRodeLine();
  updateBoatRangeCircle();
};

// Function to calculate distance between two points based on unit preferences
function getDistanceFromLatLon(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the earth in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceInMeters = R * c; // Distance in meters

  // Return in meters if metric, feet if imperial
  return isMetric.value ? distanceInMeters : distanceInMeters * 3.28084;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Lifecycle hooks
let anchorStateLogInterval;
let fenceGraphLogInterval;

onMounted(() => {
  logger.info("Component mounted, initializing map...");
  try {
    initializeMap();
    // Add event listener for the anchor-dropped event
    window.addEventListener("anchor-dropped", handleAnchorDroppedEvent);
    logger.info("Map initialized and event listeners added");
    
    // Start fade timer for FAB buttons
    resetFadeTimer();
    
    // Reset fade timer on any touch/click
    document.addEventListener('touchstart', resetFadeTimer);
    document.addEventListener('click', resetFadeTimer);

    // fenceGraphLogInterval = setInterval(() => {
    //   console.log("Fence graph state snapshot", anchorState.value?.fences);
    // }, 60000);

  } catch (error) {
    logger.error("Error during component mount", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

onUnmounted(() => {
  if (anchorStateLogInterval) {
    clearInterval(anchorStateLogInterval);
  }
  if (fenceGraphLogInterval) {
    clearInterval(fenceGraphLogInterval);
  }
  clearAll();
  map.value?.dispose();
  window.removeEventListener("anchor-dropped", handleAnchorDroppedEvent);
  document.removeEventListener("anchor-dropped", handleAnchorDroppedEvent);
  
  // Clean up fade timer and event listeners
  if (fadeTimeout) {
    clearTimeout(fadeTimeout);
  }
  document.removeEventListener('touchstart', resetFadeTimer);
  document.removeEventListener('click', resetFadeTimer);
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
