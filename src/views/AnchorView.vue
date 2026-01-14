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
    <ion-modal
      :is-open="showSetAnchorDialog"
      @didDismiss="showSetAnchorDialog = false"
      css-class="set-anchor-modal-root"
    >
      <ion-content class="set-anchor-modal">
        <div class="modal-body">
          <h3>{{ anchorState?.anchorDeployed ? "Edit Anchor Parameters" : "Set Anchor" }}</h3>
          <div class="slider-label">
          <strong>Rode:</strong>
          <span class="slider-value"
            >{{ anchorState.rode.amount }} {{ isMetric.value ? "m" : "ft" }}</span
          >
        </div>
        <ion-range
          v-model="anchorState.rode.amount"
          :min="0"
          :max="rodeRangeMax"
          :step="isMetric.value ? 1 : 5"
          ticks="true"
          color="secondary"
          class="modal-range modal-range-center"
          style="margin-bottom: 18px; width: 80%"
        />
        <div class="slider-label">
          <strong>Anchor Range:</strong>
          <span class="slider-value"
            >{{
              anchorState.criticalRange && typeof anchorState.criticalRange.r === "number"
                ? anchorState.criticalRange.r
                : 0
            }}
            {{ isMetric.value ? "m" : "ft" }}</span
          >
        </div>
        <ion-range
          v-if="anchorState.criticalRange"
          v-model="anchorState.criticalRange.r"
          :min="0"
          :max="criticalRangeMax"
          :step="isMetric.value ? 1 : 5"
          ticks="true"
          color="danger"
          class="modal-range modal-range-center"
          style="margin-bottom: 18px; width: 80%"
        />
        <div v-else class="text-danger">Critical range not initialized</div>
        <div class="slider-label">
          <strong>AIS Alert Range:</strong>
          <span class="slider-value"
            >{{
              anchorState.warningRange && typeof anchorState.warningRange.r === "number"
                ? anchorState.warningRange.r
                : 0
            }}
            {{ isMetric.value ? "m" : "ft" }}</span
          >
        </div>
        <ion-range
          v-if="anchorState.warningRange"
          v-model="anchorState.warningRange.r"
          :min="0"
          :max="warningRangeMax"
          :step="isMetric.value ? 1 : 5"
          ticks="true"
          color="warning"
          class="modal-range modal-range-center"
          style="margin-bottom: 18px; width: 80%"
        />

          <template v-if="!anchorState?.anchorDeployed">
            <div class="slider-label">
              <strong>Bearing:</strong>
              <span class="slider-value"
                >{{ anchorState.anchorDropLocation.bearing?.degrees || "--" }}°</span
              >
            </div>
            <ion-range
              v-model="anchorState.anchorDropLocation.bearing.degrees"
              :min="0"
              :max="360"
              :step="1"
              ticks="true"
              color="primary"
              class="modal-range modal-range-center"
              style="margin-bottom: 18px; width: 80%"
            />
          </template>

          <!-- Scope Recommendation -->
          <div v-if="recommendedScope" class="scope-recommendation">
            <div class="recommendation-header">
              <span>Cable Calculator</span>
            </div>
            <div class="recommendation-details">
              <div class="recommendation-row">
                <span>Current Depth:</span>
                <span
                  >{{ recommendedScope.currentDepth.toFixed(1) }}
                  {{ recommendedScope.unit }}</span
                >
              </div>
              <div class="recommendation-row">
                <span>Max Tide Rise (72h):</span>
                <span
                  >+{{ recommendedScope.depthIncrease.toFixed(1) }}
                  {{ recommendedScope.unit }}</span
                >
              </div>
              <div class="recommendation-row highlight">
                <span>Max Depth (Projected):</span>
                <span
                  >{{ recommendedScope.maxDepth.toFixed(1) }}
                  {{ recommendedScope.unit }}</span
                >
              </div>

              <!-- Scope Ratios -->
              <div class="scope-ratio">
                <div class="ratio-row">
                  <span class="ratio-label">3:1 Scope</span>
                  <span class="ratio-value"
                    >{{ Math.round(recommendedScope.scopeLength3to1) }}
                    {{ recommendedScope.unit }}</span
                  >
                </div>
                <div class="ratio-row active">
                  <span class="ratio-label">5:1 Scope (Recommended)</span>
                  <span class="ratio-value"
                    >{{ Math.round(recommendedScope.scopeLength5to1) }}
                    {{ recommendedScope.unit }}</span
                  >
                </div>
                <div class="ratio-row">
                  <span class="ratio-label">7:1 Scope (Storm)</span>
                  <span class="ratio-value"
                    >{{ Math.round(recommendedScope.scopeLength7to1) }}
                    {{ recommendedScope.unit }}</span
                  >
                </div>
              </div>
            </div>
            <div class="suggestion-note">
              Based on projected max depth of {{ recommendedScope.maxDepth.toFixed(1)
            }}{{ recommendedScope.unit }} (current depth
            {{ recommendedScope.currentDepth.toFixed(1)
            }}{{ recommendedScope.unit }} +
            {{ recommendedScope.depthIncrease.toFixed(1)
            }}{{ recommendedScope.unit }} tide rise)
            </div>
          </div>
        </div>
      </ion-content>
      <ion-footer class="set-anchor-footer">
        <ion-toolbar class="modal-toolbar">
          <div class="modal-actions">
            <IonButton
              color="primary"
              @click="anchorState?.anchorDeployed ? handleSaveAnchorParameters() : handleSetAnchor()"
            >
              {{ anchorState?.anchorDeployed ? "Save Changes" : "Set Anchor" }}
            </IonButton>
            <IonButton @click="showSetAnchorDialog = false">Cancel</IonButton>
          </div>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>
    <IonModal :is-open="showUpdateDialog" @didDismiss="showUpdateDialog = false">
      <div class="modal-content">
        <h3>Update Drop Location</h3>
        <p>Set the current location as the new anchor drop location?</p>
        <div class="modal-actions">
          <IonButton color="primary" @click="handleUpdateDropLocation"
            >Yes, Update</IonButton
          >
          <IonButton @click="showUpdateDialog = false">Cancel</IonButton>
        </div>
      </div>
    </IonModal>
    <IonModal :is-open="showCancelDialog" @didDismiss="showCancelDialog = false">
      <div class="modal-content">
        <h3>Cancel Anchor</h3>

        <!-- Primary action card: retrieve/cancel anchor -->
        <div
          style="margin-top: 8px; padding: 12px 10px; border-radius: 10px; border: 1px solid var(--app-border-color); display: flex; flex-direction: column; gap: 8px;"
        >
          <p style="margin: 0; font-size: 0.9em;">
            Are you sure you want to cancel the anchor and clear all anchor-related data?
          </p>
          <div class="modal-actions" style="margin-top: 6px;">
            <IonButton color="danger" @click="handleCancelAnchor">Yes, Cancel</IonButton>
            <IonButton @click="showCancelDialog = false">No</IonButton>
          </div>
        </div>

        <!-- Secondary action card: reset anchor here -->
        <div
          style="margin-top: 16px; padding: 12px 10px; border-radius: 10px; border: 1px solid var(--app-border-color); display: flex; flex-direction: column; gap: 8px;"
        >
          <p style="margin: 0; font-size: 0.9em;">
            Update Anchor to Current Position
          </p>
          <p style="font-size: 0.85em; opacity: 0.8; margin: 0;">
            Treat the anchor's current position as the new anchor drop location. Rode length and alarm radius stay the same.
          </p>
          <div class="modal-actions" style="margin-top: 6px;">
            <IonButton color="secondary" @click="showUpdateDropConfirm = true">
              Use Current Position
            </IonButton>
          </div>
        </div>
      </div>
    </IonModal>
    <!-- Confirmation modal for updating anchor drop location -->
    <IonModal
      :is-open="showUpdateDropConfirm"
      @didDismiss="showUpdateDropConfirm = false"
    >
      <div class="modal-content">
        <h3>Update Anchor Drop Location</h3>
        <p>
          Treat the anchor's current position as the new anchor drop location.
          Rode length and alarm radius stay the same.
        </p>
        <div class="modal-actions">
          <IonButton color="primary" @click="confirmUpdateDropLocation"
            >Yes, Update</IonButton
          >
          <IonButton @click="showUpdateDropConfirm = false">Cancel</IonButton>
        </div>
      </div>
    </IonModal>

    <div class="map-wrapper" :class="{ 'dark-mode': isDarkMode }">
      <div ref="anchorInfoContainer" class="anchor-info-grid">
        <AnchorInfoGrid
          @anchor-dropped="handleAnchorDropped"
          @update-drop-location="handleUpdateDropLocation"
          @cancel-anchor="handleCancelAnchor"
        />
      </div>
      <div ref="mapElement" class="openlayers-map"></div>
      <div ref="attributionContainer" class="map-attribution"></div>

      <!-- Custom zoom controls -->
      <div class="custom-zoom-controls">
        <button @click="recenterMap" class="zoom-button recenter-button" data-label="Recenter">
          <ion-icon :icon="navigate" size="small" />
        </button>

        <button
          @click="toggleMeasureMode"
          class="zoom-button measure-toggle"
          :class="{ 'measure-toggle-active': measureModeEnabled }"
          :data-label="measureModeEnabled ? 'Measure (On)' : 'Measure (Off)'"
        >
          <ion-icon :icon="resizeOutline" size="small" aria-hidden="true" />
        </button>

        <div class="zoom-compact" aria-label="Zoom Controls">
          <button @click="zoomIn" class="zoom-compact-button zoom-compact-in" data-label="Zoom In">
            +
          </button>
          <button @click="zoomOut" class="zoom-compact-button zoom-compact-out" data-label="Zoom Out">
            −
          </button>
        </div>
      </div>

      <div class="anchor-fab-container">
        <ion-fab-button
          color="secondary"
          @click="showSetAnchorDialog = true"
          class="custom-fab-size"
        >
          <img
            src="/img/anchor2.svg"
            alt="Set Anchor"
            class="custom-icon anchor-fab-icon"
            style="width: 24px; height: 24px"
          />
        </ion-fab-button>
        <ion-fab-button
          color="danger"
          @click="showCancelDialog = true"
          class="custom-fab-size"
          :disabled="!anchorState?.anchorDeployed"
        >
          <ion-icon :icon="chevronUpOutline" size="large" />
        </ion-fab-button>
      </div>
    </div>
    <GenericHeader title="Anchor"></GenericHeader>
  </ion-page>
</template>

<script setup>
console.log("=== ANCHOR VIEW SCRIPT SETUP STARTING ===");
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { createLogger } from "@/services/logger";

const logger = createLogger("AnchorView");
logger.info("Initializing AnchorView component...");
import { useRouter } from "vue-router";
import {
  useStateDataStore,
  calculateDistanceMeters,
} from "@/stores/stateDataStore";
import { usePreferencesStore } from "@/stores/preferences";
import { UnitConversion } from "@/shared/unitConversion";
import { debounce } from "lodash-es";
import { getComputedAnchorLocation } from "@/stores/stateDataStore";
import { createAisProximityAlert } from "@/utils/anchorAlerts";

// Component imports
import AnchorInfoGrid from "@/components/AnchorInfoGrid.vue";
import GenericHeader from "@/components/GenericHeader.vue";

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
  IonFabButton,
  IonIcon,
  IonFooter,
  IonToolbar,
  onIonViewDidEnter,
  toastController,
} from "@ionic/vue";
import { chevronUpOutline, navigate, resizeOutline } from "ionicons/icons";

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
import Circle from "ol/geom/Circle";
import { defaults as defaultControls } from "ol/control";
import Zoom from "ol/control/Zoom";
import Attribution from "ol/control/Attribution";
import { defaults as defaultInteractions } from "ol/interaction";
import Collection from "ol/Collection";
import Translate from "ol/interaction/Translate";
import DragPan from "ol/interaction/DragPan";

import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import ScaleLine from "ol/control/ScaleLine";
import { useMapTools } from "@/utils/mapUtils.js";
import { useMapFeatures } from "@/utils/mapFeatures";
import { STYLES } from "@/utils/mapStyles";
import { useMapPersist } from "@/utils/mapPersist";
import { relayConnectionBridge } from "@/relay/client/RelayConnectionBridge.js";
import { directConnectionAdapter } from "@/services/directConnectionAdapter.js";

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
  MEASURE_PIN_A: "measure-pin-a",
  MEASURE_PIN_B: "measure-pin-b",
  MEASURE_LINE: "measure-line",
  MEASURE_LABEL: "measure-label",
};

// Main component setup
const mapElement = ref(null);
const attributionContainer = ref(null);
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

const aisTargets = computed(() => {
  const targetsObj = state.value.aisTargets || {};
  // Convert object to array for component compatibility
  const result = Object.values(targetsObj);
  return result;
});

const isDarkMode = computed(() => preferences.value?.display?.darkMode || false);

const measureModeEnabled = ref(false);
const measurePinAFollowsBoat = ref(false);
const measurePinBFollowsBoat = ref(false);
const measurePinA = ref(null);
const measurePinB = ref(null);
const measureLine = ref(null);
const measureLabel = ref(null);

const measureSnapDistanceMeters = 5;

let modifyInteraction;
let scaleLineControl;
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

// Derived state
console.log("=== ANCHOR VIEW SETUP STARTING ===");

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

// Debug: Log what we're getting from stateStore
console.log("=== INITIAL BREADCRUMB STATE ===");
console.log("anchorState.value:", anchorState.value);
console.log("anchorState.value?.history:", anchorState.value?.history);
console.log("stateStore:", stateStore);
console.log("stateStore.state:", stateStore.state);
console.log("stateStore.state.anchor:", stateStore.state?.anchor);
console.log("stateStore.state.anchor?.history:", stateStore.state?.anchor?.history);
console.log("================================");

// Unit system handling
const isMetric = computed(() => {
  const preferredLength = preferences.value?.units?.length;
  if (preferredLength === "m") {
    return true;
  }
  if (preferredLength === "ft") {
    return false;
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

watch(
  isMetric,
  (next) => {
    if (!scaleLineControl || typeof scaleLineControl.setUnits !== "function") {
      return;
    }
    scaleLineControl.setUnits(next ? "metric" : "imperial");
  },
  { immediate: true }
);

// Dynamic range bounds based on unit system
const criticalRangeMax = computed(() => (isMetric.value ? 100 : 300)); // 300m ≈ 1000ft
const rodeRangeMax = computed(() => (isMetric.value ? 100 : 300)); // 100m ≈ 330ft
const warningRangeMax = computed(() => (isMetric.value ? 20 : 300)); // 20m ≈ 300ft

logger.debug("Current state:", state.value);
logger.debug("Anchor state:", anchorState.value);
logger.debug("Alert state:", alertState.value);

// View persistence
const { saveViewState, restoreViewState } = useMapPersist(map);
const savedView = restoreViewState();

// Map tools
const { validateCoordinates } = useMapTools(map, vectorSource);

const anchorInfoContainer = ref(null);

const hasCenteredOnBoatThisEntry = ref(null);

// Feature Updates

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

  // Create the map point
  const point = new Point(fromLonLat([lon, lat]));

  // Calculate angle from boat to anchor to make boat point toward anchor
  const boatStyle = typeof STYLES.BOAT?.clone === "function" ? STYLES.BOAT.clone() : STYLES.BOAT;
  
  try {
    const img = boatStyle?.getImage?.();
    if (img && typeof img.setRotation === "function") {
      // Get anchor position
      const anchorPos = state?.anchor?.anchorLocation?.position;
      if (anchorPos) {
        const anchorLat = anchorPos.latitude?.value ?? anchorPos.latitude;
        const anchorLon = anchorPos.longitude?.value ?? anchorPos.longitude;
        
        if (typeof anchorLat === 'number' && typeof anchorLon === 'number') {
          // Calculate angle from boat to anchor
          const dLon = anchorLon - lon;
          const dLat = anchorLat - lat;
          const angleToAnchor = Math.atan2(dLon, dLat);
          
          // Subtract offset because icon naturally points upper-right (45 degrees)
          // We need to rotate it so it points toward the anchor
          const iconOffset = -Math.PI / 4; // -45 degrees to compensate for icon's natural orientation
          img.setRotation(angleToAnchor + iconOffset);
        }
      }
    }
  } catch (e) {
    // If rotation fails, keep rendering the boat marker without rotation.
  }

  updateFeature(FEATURE_TYPES.BOAT, point, boatStyle);

  // Center map on boat once each time the user enters this view
  const isAnchorDeployed = state?.anchor?.anchorDeployed === true;
  if (map.value && hasCenteredOnBoatThisEntry.value !== true && isAnchorDeployed !== true) {
    const view = map.value.getView();
    if (view) {
      const coord = fromLonLat([lon, lat]);
      if (!coord) {
        return;
      }
      // Ensure the map has an up-to-date size before computing pixel offsets.
      // Ionic view transitions can leave the map with a stale size for a moment.
      map.value.updateSize();
      const size = map.value.getSize();
      const overlayBottomPx = (() => {
        const wrapper = anchorInfoContainer.value;
        const mapEl = mapElement.value;
        if (!wrapper || !mapEl) return null;
        if (typeof wrapper.querySelector !== 'function') return null;
        if (typeof mapEl.getBoundingClientRect !== 'function') return null;

        const overlayEl = wrapper.querySelector('.anchor-grid-div');
        if (!overlayEl || typeof overlayEl.getBoundingClientRect !== 'function') return null;

        const overlayRect = overlayEl.getBoundingClientRect();
        const mapRect = mapEl.getBoundingClientRect();

        const bottom = overlayRect.bottom - mapRect.top;
        return typeof bottom === 'number' && !Number.isNaN(bottom) ? bottom : null;
      })();

      // If we can measure the overlay, center within the remaining visible map area.
      // AnchorInfoGrid is top-anchored, so the visible map area is the space below it.
      if (
        Array.isArray(size) &&
        size.length === 2 &&
        typeof size[0] === 'number' &&
        typeof size[1] === 'number' &&
        overlayBottomPx != null
      ) {
        const visibleStartY = overlayBottomPx;
        const visibleHeight = size[1] - visibleStartY;
        if (visibleStartY >= 0 && visibleHeight > 0) {
          const targetY = (() => {
            const centered = visibleStartY + visibleHeight / 2;
            const shifted = centered - visibleHeight * 0.1;
            return shifted < visibleStartY ? visibleStartY : shifted;
          })();
          view.centerOn(coord, size, [size[0] / 2, targetY]);
          hasCenteredOnBoatThisEntry.value = true;
          return;
        }
      }

      // Fallback to normal centering
      view.setCenter(coord);
      hasCenteredOnBoatThisEntry.value = true;
    }
  }
}, 100);

const recenterMap = () => {
  const pos = stateStore.state?.navigation?.position;
  if (!pos || !pos.latitude || !pos.longitude) return;
  if (pos.latitude.value == null || pos.longitude.value == null) return;

  const lat = pos.latitude.value;
  const lon = pos.longitude.value;
  if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) return;

  if (!map.value) return;
  const view = map.value.getView();
  if (!view) return;

  const coord = fromLonLat([lon, lat]);
  map.value.updateSize();
  const size = map.value.getSize();
  if (!Array.isArray(size) || size.length !== 2 || typeof size[0] !== 'number' || typeof size[1] !== 'number') {
    view.setCenter(coord);
    return;
  }

  const overlayBottomPx = (() => {
    const wrapper = anchorInfoContainer.value;
    const mapEl = mapElement.value;
    if (!wrapper || !mapEl) return null;
    if (typeof wrapper.querySelector !== 'function') return null;
    if (typeof mapEl.getBoundingClientRect !== 'function') return null;

    const overlayEl = wrapper.querySelector('.anchor-grid-div');
    if (!overlayEl || typeof overlayEl.getBoundingClientRect !== 'function') return null;

    const overlayRect = overlayEl.getBoundingClientRect();
    const mapRect = mapEl.getBoundingClientRect();
    const bottom = overlayRect.bottom - mapRect.top;
    return typeof bottom === 'number' && !Number.isNaN(bottom) ? bottom : null;
  })();

  if (overlayBottomPx == null) {
    view.setCenter(coord);
    return;
  }

  const visibleStartY = overlayBottomPx;
  const visibleHeight = size[1] - visibleStartY;
  if (!(visibleStartY >= 0) || !(visibleHeight > 0)) {
    view.setCenter(coord);
    return;
  }

  const targetY = (() => {
    const centered = visibleStartY + visibleHeight / 2;
    const shifted = centered - visibleHeight * 0.1;
    return shifted < visibleStartY ? visibleStartY : shifted;
  })();

  view.centerOn(coord, size, [size[0] / 2, targetY]);
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
  
  // Debug logging (uncomment if needed for troubleshooting)
  // console.log('[AnchorView] Position check:', {
  //   navLat: navPos?.latitude?.value,
  //   navLon: navPos?.longitude?.value,
  //   finalLat: lat,
  //   finalLon: lon,
  //   isValid
  // });
  
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

// Computed property for location modal visibility
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
  clearFeature(FEATURE_TYPES.CIRCLE);
  clearFeature(FEATURE_TYPES.ANCHOR_DROP_LOCATION);
  clearFeature(FEATURE_TYPES.ANCHOR_LOCATION);
  clearFeature(FEATURE_TYPES.RODE);

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

const updateCriticalRangeCircle = debounce(() => {
  // Check if anchorState exists first
  if (!anchorState.value) {
    clearFeature(FEATURE_TYPES.CIRCLE);
    return;
  }

  logger.debug("Updating critical range circle", {
    anchorDeployed: anchorState.value.anchorDeployed,
    anchorLocation: anchorState.value.anchorLocation,
    criticalRange: anchorState.value.criticalRange,
  });

  if (
    !anchorState.value.anchorDeployed ||
    !anchorState.value.anchorLocation ||
    !anchorState.value.criticalRange
  ) {
    // Clear any existing critical range circle
    clearFeature(FEATURE_TYPES.CIRCLE);
    return;
  }

  logger.debug("Creating circle with:", {
    anchorLocation: [
      anchorState.value.anchorLocation.longitude,
      anchorState.value.anchorLocation.latitude,
    ],
    criticalRange: anchorState.value.criticalRange.value,
  });

  const position = anchorState.value.anchorLocation.position;
  const latitude = position.latitude?.value ?? position.latitude;
  const longitude = position.longitude?.value ?? position.longitude;
  
  // Convert critical range to meters to match AnchorWidget logic
  const rawRadius = anchorState.value.criticalRange.r;
  const units = anchorState.value?.criticalRange?.units || anchorState.value?.rode?.units || "m";
  const isMetricUnits = !units.toLowerCase().startsWith("ft");
  const radiusInMeters = isMetricUnits ? rawRadius : rawRadius / 3.28084;

  logger.debug("Drawing circle at:", {
    center: [longitude, latitude],
    radius: radiusInMeters,
  });

  // Create a circle with the correct radius in meters
  const circleGeometry = createCircleWithRadius([longitude, latitude], radiusInMeters);

  // Use the circle for the feature
  const activeAlerts = Array.isArray(alertState.value) ? alertState.value : [];
  const hasCriticalRangeAlert = activeAlerts.some(
    (alert) => alert?.trigger === "critical_range" && alert?.status !== "resolved"
  );
  const rangeStyle = hasCriticalRangeAlert ? STYLES.CRITICAL_RANGE : STYLES.NORMAL_RANGE;
  updateFeature(FEATURE_TYPES.CIRCLE, circleGeometry, rangeStyle);

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

const updateRodeLine = debounce(() => {
  // logger.debug('Starting updateRodeLine function');

  // First, clear any existing rode line
  clearFeature(FEATURE_TYPES.RODE);

  // Check if anchorState exists first
  if (!anchorState.value) {
    return;
  }

  // Exit if anchor is not deployed
  if (!anchorState.value.anchorDeployed) {
    logger.debug("Anchor not deployed, skipping rode line update");
    return;
  }

  // Directly access the raw state data
  const state = stateStore.state;

  // Get positions directly from state with the correct structure
  const boatPos = state?.navigation?.position;
  const anchorPos = state?.anchor?.anchorLocation?.position;

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

  // Log the raw values for debugging
  logger.debug("Direct state access - Coordinates:", {
    boatPosition: { lat: boatLat, lon: boatLon },
    anchorPosition: { lat: anchorLat, lon: anchorLon },
    hasBoatPos: !!boatPos,
    hasAnchorPos: !!anchorPos,
    anchorDeployed: state?.anchor?.anchorDeployed,
  });

  // Simple validation
  if (
    !Number.isFinite(boatLon) ||
    !Number.isFinite(boatLat) ||
    !Number.isFinite(anchorLon) ||
    !Number.isFinite(anchorLat)
  ) {
    logger.warn("Invalid coordinates - using fallback values");
    return;
  }

  if (!map.value || !vectorSource) {
    logger.warn("Map not ready for rode line update");
    return;
  }

  try {
    // Create a direct feature without using the helper functions
    const startCoord = fromLonLat([boatLon, boatLat]);
    const endCoord = fromLonLat([anchorLon, anchorLat]);

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
        color: "#FF5722", // Deep orange
        width: 4,
        lineDash: [10, 5],
      }),
      zIndex: 100, // Ensure it's on top
    });

    // Create a line feature directly
    const rodeFeature = new Feature({
      geometry: new LineString([startCoord, endCoord]),
    });

    // Set the feature type and style
    rodeFeature.set("type", FEATURE_TYPES.RODE);
    rodeFeature.setStyle(rodeStyle);

    // Add the feature directly to the source
    vectorSource.addFeature(rodeFeature);

    // We don't need to store the feature reference manually

    // Inspect the vector source
    // logger.debug('Vector source:', vectorSource);
    // logger.debug(`Vector source features: ${vectorSource.getFeatures().length}`);
    // logger.debug('Vector source feature types:', vectorSource.getFeatures().map(f => f.get('type')));

    // Force the map to render
    if (map.value) {
      // logger.debug('Map object:', map.value);
      map.value.renderSync();

      // Uncomment to debug layer visibility
      // const layers = map.value.getLayers().getArray();
      // logger.debug('Map layers:', layers);
      // layers.forEach((layer, i) => {
      //   logger.debug(`Layer ${i} visible:`, layer.getVisible());
      // });
    }

    // logger.debug('Rode line created with direct approach');
  } catch (error) {
    logger.error("Error creating rode line", { error });
  }
}, 100);

// Function to select the appropriate AIS style based on target type
const getAisStyle = () => {
  // All AIS targets are now green and smaller by default
  // We're keeping the function in case we want to add special styling for certain vessel types in the future
  return STYLES.AIS_VESSEL;
};

const updateAisTargets = debounce(() => {
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

  // Skip proximity check if anchor is not deployed
  const isAnchorDeployed = anchorState.value && anchorState.value.anchorDeployed;
  logger.debug(`Anchor deployed: ${isAnchorDeployed}`);

  // Get boat position for distance calculations
  const boatLat = boatPosition.value?.latitude?.value ?? boatPosition.value?.latitude;
  const boatLon = boatPosition.value?.longitude?.value ?? boatPosition.value?.longitude;
  const hasValidBoatPosition = typeof boatLat === "number" && typeof boatLon === "number";
  logger.debug(`Boat position valid: ${hasValidBoatPosition}`, { boatLat, boatLon });

  // Get warning range radius
  const warningRadius = anchorState.value?.warningRange?.r ?? 15; // Default to 15 if not set
  const warningUnits = anchorState.value?.warningRange?.units;
  const effectiveWarningRadius = (() => {
    if (typeof warningRadius !== "number" || Number.isNaN(warningRadius)) {
      return warningRadius;
    }
    if (warningUnits === "m" && isMetric.value === false) {
      return UnitConversion.mToFt(warningRadius);
    }
    if (warningUnits === "ft" && isMetric.value === true) {
      return UnitConversion.ftToM(warningRadius);
    }
    return warningRadius;
  })();
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
      if (!isValid) {
        logger.warn("Invalid AIS target coordinates:", target);
      }
      return isValid;
    })
    .map((target) => {
      // Extract coordinates from the position structure
      const lon = target.position.longitude;
      const lat = target.position.latitude;

      // Check if target is within warning range of boat
      let isInWarningRange = false;
      if (isAnchorDeployed && hasValidBoatPosition) {
        // Calculate distance based on unit preferences
        const distance = getDistanceFromLatLon(boatLat, boatLon, lat, lon);

        // Log details about this target with appropriate units
        // const unitLabel = isMetric.value ? 'm' : 'ft';
        // logger.debug(`AIS Target: ${target.name || 'Unknown'} (${target.mmsi || 'No MMSI'})`);
        // logger.debug(`  Position: ${lat}, ${lon}`);
        // logger.debug(`  Distance from boat: ${distance.toFixed(2)}${unitLabel}`);
        // logger.debug(`  Warning radius: ${warningRadius.toFixed(2)}${unitLabel}`);
        // logger.debug(`  In warning range? ${distance <= warningRadius}`);

        // Check if within warning range
        isInWarningRange = distance <= effectiveWarningRadius;

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
      createAisProximityAlert(targetsInRange, effectiveWarningRadius, isMetric.value);
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

  // If anchor is deployed, center on anchor location
  if (anchor?.anchorDeployed && anchor?.anchorLocation) {
    const anchorLoc = anchor.anchorLocation;
    const anchorPos = anchorLoc.position ?? anchorLoc;
    const anchorLat = anchorPos?.latitude?.value ?? anchorPos?.latitude;
    const anchorLon = anchorPos?.longitude?.value ?? anchorPos?.longitude;
    if (anchorLat != null && anchorLon != null) {
      centerLat = anchorLat;
      centerLon = anchorLon;
      hasValidPosition = true;
      logger.debug("Centering on anchor location:", { lat: centerLat, lon: centerLon });
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
  const defaultZoom = savedView?.zoom || 15;

  // Create the map with minimal interactions initially
  map.value = new Map({
    target: mapElement.value,
    layers: [
      new TileLayer({ 
        source: isDarkMode.value 
          ? new XYZ({
              url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              attributions: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>'
            })
          : new OSM()
      }),
      new VectorLayer({ source: vectorSource, zIndex: 5 }),
    ],
    view: new View({
      center: defaultCenter,
      zoom: defaultZoom,
      rotation: savedView?.rotation || 0,
      minZoom: 5,
      maxZoom: 22,
    }),
    controls: defaultControls({ zoom: false, attribution: false }).extend([
      new Zoom({ delta: 0.1 }),
    ]),
    interactions: defaultInteractions({
      // Start with minimal interactions
      dragPan: true,
      pinchZoom: true,
      mouseWheelZoom: false, // Disable default and add our custom one below
    }),
    pixelRatio: window.devicePixelRatio,
  });

  // Fit view to critical range circle when anchor is deployed
  if (anchor?.anchorDeployed && anchor?.criticalRange && hasValidPosition) {
    const criticalRangeValue = anchor.criticalRange.r ?? anchor.criticalRange.value;
    if (criticalRangeValue != null && Number.isFinite(criticalRangeValue)) {
      // Critical range in meters (convert from feet if needed)
      let criticalRangeMeters = criticalRangeValue;
      const units = anchor.criticalRange.units || 'm';
      if (units.toLowerCase().startsWith('ft')) {
        criticalRangeMeters = criticalRangeValue / 3.28084;
      }

      // Create a circle geometry representing the critical range
      const circleGeom = new Circle(defaultCenter, criticalRangeMeters);
      const extent = circleGeom.getExtent();
      
      // Fit to extent with padding
      // Top padding accounts for info grid, sides/bottom for 80% width target
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const infoGridHeight = 150;
      
      map.value.getView().fit(extent, {
        padding: [infoGridHeight, screenWidth * 0.1, screenHeight * 0.1, screenWidth * 0.1],
        duration: 0
      });
      
      logger.debug("Fitted view to critical range circle");
    }
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

      // Set the boat style
      boatFeature.setStyle(STYLES.BOAT);

      // Add the boat feature to the vector source
      vectorSource.addFeature(boatFeature);

      logger.debug("Boat feature added successfully");
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

  scaleLineControl = new ScaleLine({ units: isMetric.value ? "metric" : "imperial" });
  map.value.addControl(scaleLineControl);
  if (attributionContainer.value) {
    map.value.addControl(
      new Attribution({
        collapsible: false,
        target: attributionContainer.value,
      })
    );
  }
  map.value.on("moveend", saveViewState);

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
  (newPos) => {
    logger.debug("Navigation position updated", { position: newPos });
    logger.debug("Navigation position changed, updating boat position");
    updateBoatPosition();
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
    logger.debug("Anchor state changed:", anchorState.value);
    // Check if anchorState exists before accessing properties
    if (!anchorState.value) {
      logger.debug("Anchor state is undefined, skipping update");
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
  () => boatPosition.value,
  () => {
    updateBoatRangeCircle();
  },
  { deep: true }
);

// Watch for critical range changes
console.log("AnchorView setup - critical range watch loading...");
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

    // Debug logging removed for production

    if (reportedDepth == null) {
      return null;
    }

    if (!tideData) {
      return null;
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

    // Calculate depth increase from current level to max future level
    // If we couldn't determine current water level, use the first available data point
    const referenceLevel = currentLevel !== null ? currentLevel : seaLevels[0] || 0;
    const depthIncreaseMeters =
      maxFutureLevel !== -Infinity ? Math.max(0, maxFutureLevel - referenceLevel) : 0;
    const targetDepthMeters = depthInMeters + depthIncreaseMeters;

    // Depth increase calculation details are no longer logged to console

    // Convert to feet if using imperial units
    const unitMultiplier = isMetric.value ? 1 : 3.28084;
    const unit = isMetric.value ? "m" : "ft";

    return {
      currentDepth: depthInMeters * unitMultiplier,
      depthIncrease: depthIncreaseMeters * unitMultiplier,
      maxDepth: targetDepthMeters * unitMultiplier,
      scopeLength3to1: targetDepthMeters * 3 * unitMultiplier,
      scopeLength5to1: targetDepthMeters * 5 * unitMultiplier,
      scopeLength7to1: targetDepthMeters * 7 * unitMultiplier,
      recommendedCableLength: targetDepthMeters * 5 * unitMultiplier,
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
  updateBoatPosition();
});

const showUpdateDialog = ref(false);
const showCancelDialog = ref(false);
const showUpdateDropConfirm = ref(false);
const locationRequestFailed = ref(false);

const handleSaveAnchorParameters = () => {
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

  const preferredUnits = preferences.value?.units?.length || anchorState.value.rode?.units;
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
      stateStore
        .sendMessageToServer("anchor:update", updatedAnchorState, {
          source: "AnchorView.handleSaveAnchorParameters",
          timeout: 5000,
        })
        .then((response) => {
          logger.info("Server acknowledged anchor parameter update", response);
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

    //   timeout: 5000,
    // });

    stateStore
      .sendMessageToServer("anchor:update", newAnchorState, {
        source: "AnchorView.handleSetAnchor",
        timeout: 5000, // 5 second timeout
      })
      .then((response) => {
        logger.info("Server acknowledged anchor update", response);
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
      stateStore
        .sendMessageToServer("anchor:update", updatedAnchor, {
          source: "AnchorView.confirmUpdateDropLocation",
          timeout: 5000,
        })
        .then((response) => {
          logger.info("Server acknowledged updated drop location", response);
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
  stateStore.cancelAnchor();

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

      // Navigate to the AIS target detail page
      if (mmsi) {
        router.push(`/aistarget/${mmsi}`);
      }
    }
  }
};

// Wheel event handler for map zooming
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

    logger.debug("Zooming in to boat position", { newZoom, boatCoords });
  } else {
    // If no boat position, just change zoom without changing center
    view.animate({
      zoom: newZoom,
      duration: 250,
    });
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

    logger.debug("Zooming out to boat position", { newZoom, boatCoords });
  } else {
    // If no boat position, just change zoom without changing center
    view.animate({
      zoom: newZoom,
      duration: 250,
    });
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
onMounted(() => {
  logger.info("Component mounted, initializing map...");
  try {
    initializeMap();
    // Add event listener for the anchor-dropped event
    window.addEventListener("anchor-dropped", handleAnchorDroppedEvent);
    logger.info("Map initialized and event listeners added");
    
    // Remove OpenLayers attribution element
    setTimeout(() => {
      const attribution = document.querySelector('#app > ion-app > div > div > div.map-attribution > div');
      if (attribution) {
        attribution.remove();
        logger.info("Map attribution element removed");
      }
    }, 250);
  } catch (error) {
    logger.error("Error during component mount", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

onUnmounted(() => {
  clearAll();
  map.value?.dispose();
  window.removeEventListener("anchor-dropped", handleAnchorDroppedEvent);
  document.removeEventListener("anchor-dropped", handleAnchorDroppedEvent);
});

</script>

<style scoped>
.openlayers-map {
  width: 100vw;
  height: 100vh;
  min-height: 0;
  /* Ensure these properties are set */
  touch-action: none;
  overscroll-behavior: none;
  position: relative;
  z-index: 0;
}
.anchor-info-grid {
  padding-top: 20px; /* Add padding to move the grid down */
  position: relative;
  z-index: 2;
}

.map-wrapper {
  width: 100vw;
  height: 100vh;
  min-height: 0;
  position: fixed; /* Changed from relative to fixed */
  top: 0;
  left: 0;
  z-index: 1;
  /* Ensure these properties are set */
  touch-action: none;
  overscroll-behavior: none;
}

/* Custom zoom controls */
.custom-zoom-controls {
  position: fixed;
  left: 20px;
  bottom: 70px; /* Aligned with the anchor-fab-container */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 1000; /* Same z-index as anchor-fab-container */

  padding: 8px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--app-surface-color) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-border-color) 70%, transparent);
  box-shadow: 0 10px 22px color-mix(in srgb, var(--app-text-color) 18%, transparent);
}

.zoom-button {
  width: 44px;
  height: 44px;
  margin: 0;
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
}

.custom-fab-size {
  --size: 56px;
  margin: 5px;
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
  --padding-top: 24px;
  --padding-bottom: 24px;
  --padding-start: 0px;
  --padding-end: 0px;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

:deep(.set-anchor-modal-root::part(content)) {
  --max-width: 780px;
  --width: 96vw;
  --height: 94vh;
  --max-height: 94vh;
  --border-radius: 24px 24px 0 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  background: var(--app-surface-color);
}

.modal-body {
  flex: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 0 24px 160px;
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
  --padding-top: 4px !important; /* Increased from 2px */
  --padding-bottom: 4px !important; /* Increased from 2px */
  --padding-start: 6px !important; /* Increased from 4px */
  --padding-end: 6px !important; /* Increased from 4px */
  --height: 26.4px !important; /* 24px + 10% */
  margin: 0 !important;
  font-size: 0.66em !important; /* 0.6em + 10% */
  line-height: 1.1 !important; /* Slightly increased */
  min-height: 26.4px !important; /* 24px + 10% */
  height: 26.4px !important; /* 24px + 10% */
}

/* Target the inner button elements */
.modal-actions ion-button::part(native) {
  min-height: 22px !important; /* 20px + 10% */
  height: 22px !important; /* 20px + 10% */
  padding: 0 9px !important; /* 8px + ~10% */
}

/* Target the button text */
.modal-actions ion-button .button-text {
  font-size: 0.77em !important; /* 0.7em + 10% */
  line-height: 1.1 !important; /* Slightly increased */
  padding: 0 !important;
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
</style>

<style>
/* Dark mode overrides */
body.dark .slider-value {
  color: #f8fafc !important;
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

body.dark .zoom-button {
  background-color: #1f2933 !important;
  color: #f8fafc !important;
}

body.dark .zoom-button.measure-toggle-active {
  background-color: #facc15 !important;
  background: #facc15 !important;
  color: #111827 !important;
}

body.dark .zoom-button:hover {
  background-color: #2d3748 !important;
}

body.dark .zoom-button:active {
  background-color: #1a202c !important;
}
</style>
