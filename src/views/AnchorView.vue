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
          <h3>Set Anchor</h3>
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
            <IonButton color="primary" @click="handleSetAnchor">Set Anchor</IonButton>
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
        <p>Are you sure you want to cancel the anchor?</p>
        <div class="modal-actions">
          <IonButton color="danger" @click="handleCancelAnchor">Yes, Cancel</IonButton>
          <IonButton @click="showCancelDialog = false">No</IonButton>
        </div>
        <div class="modal-actions" style="margin-top: 18px">
          <IonButton color="secondary" @click="showUpdateDropConfirm = true">
            Update Anchor to Current Position
          </IonButton>
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
          Are you sure you want to update the anchor drop location to the current
          position?
        </p>
        <div class="modal-actions">
          <IonButton color="primary" @click="confirmUpdateDropLocation"
            >Yes, Update</IonButton
          >
          <IonButton @click="showUpdateDropConfirm = false">Cancel</IonButton>
        </div>
      </div>
    </IonModal>
    <!-- Cancel Anchor Dialog -->
    <ion-modal :is-open="showCancelDialog" @didDismiss="showCancelDialog = false">
      <div class="modal-content">
        <h3>Confirm Anchor Retrieval</h3>
        <p>This will clear all anchor-related data. Continue?</p>
        <div class="modal-button-group">
          <ion-button @click="showCancelDialog = false" fill="clear">Cancel</ion-button>
          <ion-button @click="handleCancelAnchor" color="danger">Retrieve</ion-button>
        </div>
      </div>
    </ion-modal>

    <div class="map-wrapper">
      <AnchorInfoGrid
        class="anchor-info-grid"
        @anchor-dropped="handleAnchorDropped"
        @update-drop-location="handleUpdateDropLocation"
        @cancel-anchor="handleCancelAnchor"
      />
      <div ref="mapElement" class="openlayers-map"></div>
      <div ref="attributionContainer" class="map-attribution"></div>

      <!-- Custom zoom controls -->
      <div class="custom-zoom-controls">
        <button @click="zoomIn" class="zoom-button zoom-in" data-label="Zoom In">
          +
        </button>
        <button @click="zoomOut" class="zoom-button zoom-out" data-label="Zoom Out">
          −
        </button>
      </div>

      <div class="anchor-fab-container">
        <ion-fab-button
          color="secondary"
          @click="showSetAnchorDialog = true"
          class="custom-fab-size"
          :disabled="anchorState?.anchorDeployed"
        >
          <img
            src="/img/anchor2.svg"
            alt="Set Anchor"
            class="custom-icon"
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
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
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
// Alert creation is now handled server-side via the rule engine
import { debounce } from "lodash-es";
import { getComputedAnchorLocation } from "@/stores/stateDataStore";

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
} from "@ionic/vue";
import { chevronUpOutline } from "ionicons/icons";

// OpenLayers imports
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { Style, Stroke } from "ol/style";
import { fromLonLat } from "ol/proj";
import { Point } from "ol/geom";
import Polygon from "ol/geom/Polygon";
import LineString from "ol/geom/LineString";
// Circle is imported but now only used in comments
// import Circle from "ol/geom/Circle";
import { defaults as defaultControls } from "ol/control";
import Attribution from "ol/control/Attribution";
import { defaults as defaultInteractions } from "ol/interaction";
import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import ScaleLine from "ol/control/ScaleLine";
import { useMapTools } from "@/utils/mapUtils.js";
import { useMapFeatures } from "@/utils/mapFeatures";
import { STYLES, createStyle } from "@/utils/mapStyles";
import { useMapPersist } from "@/utils/mapPersist";

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
  perfStats,
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

// Derived state
const boatPosition = computed(() => navigationState.value?.position);
const anchorDeployed = computed(() => anchorState.value?.anchorDeployed);
const anchorDropLocation = computed(() => anchorState.value?.anchorDropLocation);
const anchorLocation = computed(() => anchorState.value?.anchorLocation?.position);

// Determine if anchor is dragging based on its position relative to drop location
const isAnchorDragging = computed(() => {
  if (!anchorDeployed.value || !anchorDropLocation.value?.position) return false;

  const dropLat = anchorDropLocation.value.position.latitude;
  const dropLon = anchorDropLocation.value.position.longitude;
  const anchorLat = anchorLocation.value?.position?.latitude;
  const anchorLon = anchorLocation.value?.position?.longitude;

  if (!dropLat || !dropLon || !anchorLat || !anchorLon) return false;

  // Calculate distance between drop location and current anchor position
  const distance = calculateDistanceMeters(
    dropLat,
    dropLon,
    anchorLat,
    anchorLon,
    isMetric.value
  );

  // If distance exceeds 10 meters, consider it dragging
  return distance > 2;
});

const anchorPosition = ref(null);
const anchorBearing = ref(0);
const rodeLength = ref(30); // Default rode length in meters
const criticalRange = ref(30); // Default critical range in meters
const isAnchorSet = ref(false);
const breadcrumbs = ref([]);

// Format rode length for display
const formatRodeLength = (value) => {
  return `${value} ${isMetric.value ? "m" : "ft"}`;
};

// Computed critical range from anchor state
const computedCriticalRange = computed(
  () => anchorState.value?.criticalRange?.r || criticalRange.value
);

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

// Dynamic range bounds based on unit system
const criticalRangeMax = computed(() => (isMetric.value ? 100 : 300)); // 300m ≈ 1000ft
const rodeRangeMax = computed(() => (isMetric.value ? 100 : 300)); // 100m ≈ 330ft
const warningRangeMax = computed(() => (isMetric.value ? 20 : 60)); // 20m ≈ 60ft
const anchorDragTriggerDistance = computed(() => (isMetric.value ? 1 : 3)); // 1m ≈~ 3ft

logger.debug("Current state:", state.value);
logger.debug("Anchor state:", anchorState.value);
logger.debug("Alert state:", alertState.value);

// View persistence
const { saveViewState, restoreViewState } = useMapPersist(map);
const savedView = restoreViewState();

// Map tools
const { fitToFeatures, validateCoordinates } = useMapTools(map, vectorSource);

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

  try {
    // Create the map point
    const point = new Point(fromLonLat([lon, lat]));

    // Update the boat feature
    updateFeature(FEATURE_TYPES.BOAT, point, STYLES.BOAT);

    // Center map on boat if needed
    if (map.value && !map.value.getView().getCenter()) {
      map.value.getView().setCenter(fromLonLat([lon, lat]));
      map.value.getView().setZoom(15); // Set a reasonable zoom level
    }
  } catch (error) {
    logger.error("Error updating boat position", { error });
  }
}, 100);

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
  const radiusInMeters = isMetric.value ? radius : radius / 3.28084;

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
  const radiusInMeters = anchorState.value.criticalRange.r;

  logger.debug("Drawing circle at:", {
    center: [longitude, latitude],
    radius: radiusInMeters,
  });

  // Create a circle with the correct radius in meters
  const circleGeometry = createCircleWithRadius([longitude, latitude], radiusInMeters);

  // Use the circle for the feature
  updateFeature(FEATURE_TYPES.CIRCLE, circleGeometry, STYLES.CRITICAL_RANGE);

  // Calculate distance between boat and anchor for verification
  if (boatPosition.value) {
    const boatLat = boatPosition.value.latitude;
    const boatLon = boatPosition.value.longitude;
    const distanceToAnchor = calculateDistanceMeters(
      boatLat,
      boatLon,
      latitude,
      longitude,
      isMetric.value
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
  logger.debug(`Warning range radius: ${warningRadius}`);

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
        isInWarningRange = distance <= warningRadius;

        // Update the warning flag if any target is in range
        if (isInWarningRange) {
          hasTargetsInWarningRange = true;
          logger.warn("TARGET IN WARNING RANGE", target);
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
      const warningRadius = anchorState.value?.warningRange?.r ?? 15;
      createAisProximityAlert(targetsInRange, warningRadius, isMetric.value);
    }

    // Update the state
    anchorState.value.aisWarning = hasTargetsInWarningRange;

    // Log the current state of all relevant flags
    logger.debug("Current anchor state flags:", {
      anchorDeployed: anchorState.value.anchorDeployed,
      dragging: anchorState.value.dragging,
      aisWarning: anchorState.value.aisWarning,
    });
  }

  // Clear existing AIS features
  clearFeature(FEATURE_TYPES.AIS);

  // Add each feature to the source directly
  validTargets.forEach((feature) => {
    vectorSource.addFeature(feature);
  });

  // No need to store features manually - they're managed by the vectorSource
}, 200);

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
      if (!crumb) return false;
      const lat = crumb.latitude?.value ?? crumb.latitude;
      const lon = crumb.longitude?.value ?? crumb.longitude;
      return typeof lat === "number" && typeof lon === "number";
    })
    .map((crumb, idx, array) => {
      // Calculate age factor (0 = newest, 1 = oldest)
      const age = idx / Math.max(array.length - 1, 1);

      // Extract coordinates
      const lon = crumb.longitude?.value ?? crumb.longitude;
      const lat = crumb.latitude?.value ?? crumb.latitude;

      return {
        geometry: new Point(fromLonLat([lon, lat])),
        style: createStyle({
          circle: {
            radius: 3,
            fill: { color: `rgba(33,150,243,${0.9 - age * 0.8})` },
            stroke: {
              color: `rgba(21,101,192,${0.9 - age * 0.7})`,
              width: 1,
            },
          },
        }),
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

  logger.debug("Position data:", pos ? pos : "No position data");

  // Determine center coordinates
  let centerLat = 0;
  let centerLon = 0;
  let hasValidPosition = false;

  if (pos?.latitude?.value && pos?.longitude?.value) {
    centerLat = pos.latitude.value;
    centerLon = pos.longitude.value;
    hasValidPosition = true;
    logger.debug("Using valid position:", { lat: centerLat, lon: centerLon });
  } else {
    logger.debug("Using default position (0,0)");
  }

  const defaultCenter = fromLonLat([centerLon, centerLat]);

  // Create the map with minimal interactions initially
  map.value = new Map({
    target: mapElement.value,
    layers: [
      new TileLayer({ source: new OSM() }),
      new VectorLayer({ source: vectorSource, zIndex: 5 }),
    ],
    view: new View({
      center: savedView?.center || defaultCenter,
      zoom: savedView?.zoom || 15,
      rotation: savedView?.rotation || 0,
      minZoom: 5,
      maxZoom: 22,
    }),
    controls: defaultControls({ zoom: true, attribution: false }),
    interactions: defaultInteractions({
      // Start with minimal interactions
      dragPan: true,
      pinchZoom: true,
      mouseWheelZoom: false, // Disable default and add our custom one below
    }),
    pixelRatio: window.devicePixelRatio,
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

  map.value.addControl(new ScaleLine({ units: "metric" }));
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
    // Check if anchorState exists before accessing properties
    if (!anchorState.value) {
      return;
    }
    
    if (anchorState.value.anchorDeployed) {
      // Get current boat position
      const boatLat = boatPosition.value.latitude?.value ?? boatPosition.value.latitude;
      const boatLon = boatPosition.value.longitude?.value ?? boatPosition.value.longitude;

      // Get anchor location
      const anchorLat = anchorState.value.anchorLocation?.position?.latitude?.value;
      const anchorLon = anchorState.value.anchorLocation?.position?.longitude?.value;

      // Get rode length
      const rodeLength = anchorState.value.rode?.amount ?? 0;

      // Calculate distance from boat to anchor
      const distanceToAnchor = Math.round(
        calculateDistanceMeters(boatLat, boatLon, anchorLat, anchorLon, isMetric.value)
      );

      // logger.debug(`Distance to anchor: ${distanceToAnchor}, Rode length: ${rodeLength}`);

      // Check if the anchor is dragging (distance > rode length)
      if (distanceToAnchor > rodeLength + anchorDragTriggerDistance.value) {
        logger.warn("Anchor dragging detected - distance exceeds rode length", {
          distanceToAnchor,
          rodeLength,
        });

        // Send an anchor dragging alert to the server
        createAnchorDraggingAlert(distanceToAnchor, rodeLength, isMetric.value);

        // Calculate new anchor position based on boat position and bearing
        // We need to move the anchor in the direction from boat to anchor
        // First, calculate the bearing from boat to anchor
        const dx = anchorLon - boatLon;
        const dy = anchorLat - boatLat;
        const bearing = Math.atan2(dx, dy);
        const bearingDegrees = ((bearing * 180) / Math.PI + 360) % 360; // Convert to degrees (0-360)

        // Store the previous anchor location before updating it - useful for debugging
        // const previousAnchorLocation = {
        //   latitude: anchorLat,
        //   longitude: anchorLon,
        //   time: anchorState.value.anchorLocation.time
        // };

        // Calculate new anchor position that's exactly rode length away from boat
        const computedAnchorLocation = getComputedAnchorLocation(
          { latitude: boatLat, longitude: boatLon },
          rodeLength,
          bearing,
          anchorState.value.anchorLocation?.depth?.value ?? 0,
          isMetric.value
        );

        // Update anchor location
        anchorState.value.anchorLocation.position.latitude.value =
          computedAnchorLocation.latitude;
        anchorState.value.anchorLocation.position.longitude.value =
          computedAnchorLocation.longitude;

        // Update the bearing in the anchor state
        anchorState.value.anchorLocation.bearing = {
          value: bearing,
          units: "rad",
          degrees: bearingDegrees,
        };

        // Update the timestamp to reflect the change
        const currentTime = new Date().toISOString();
        anchorState.value.anchorLocation.time = currentTime;

        // Set dragging state
        anchorState.value.dragging = true;

        // Add the previous anchor location to breadcrumbs
        if (breadcrumbs.value) {
          breadcrumbs.value.push({
            latitude: { value: boatPosition.value.latitude },
            longitude: { value: boatPosition.value.longitude },
            time: currentTime,
            type: "anchor_drag",
          });

          // Limit the number of breadcrumbs to prevent performance issues
          if (breadcrumbs.value.length > 100) {
            // Keep the most recent 100 breadcrumbs
            breadcrumbs.value = breadcrumbs.value.slice(-100);
          }

          // Update breadcrumbs visualization
          updateBreadcrumbs();
        }

        // Persist to localStorage
        const storageState = {
          anchorDeployed: true,
          anchorDropLocation: anchorState.value.anchorDropLocation,
          anchorLocation: anchorState.value.anchorLocation,
          criticalRange: anchorState.value.criticalRange,
          warningRange: anchorState.value.warningRange,
          rode: anchorState.value.rode,
          dragging: true,
        };

        localStorage.setItem("anchorState", JSON.stringify(storageState));

        // Update all anchor-related features
        updateAnchorPoints();
        updateCriticalRangeCircle();
      }

      // Always update the rode line
      updateRodeLine();
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

  // Create a circle with the warning range radius centered on the boat
  const circleGeometry = createCircleWithRadius([lon, lat], radius);

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
  [criticalRange, () => anchorState.value?.dragging],
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

    // If anchor is deployed, fit the map to show both boat and anchor
    if (anchorState.value.anchorDeployed) {
      fitToFeatures([FEATURE_TYPES.BOAT, FEATURE_TYPES.ANCHOR_LOCATION]);
    }

    // Get the anchor location from the state (not the drop location)
    // This is where the anchor is currently located, which should be the center of the circle
    const anchorLoc = anchorState.value.anchorLocation;

    if (
      !anchorState.value.anchorDeployed ||
      range === undefined ||
      !anchorLoc?.position
    ) {
      clearFeature(FEATURE_TYPES.CIRCLE);
      return;
    }

    // Make sure we have valid coordinates
    if (!validateCoordinates(anchorLoc.position)) {
      clearFeature(FEATURE_TYPES.CIRCLE);
      return;
    }

    // Get the position coordinates
    const position = anchorLoc.position;
    const latitude = position.latitude?.value || position.latitude;
    const longitude = position.longitude?.value || position.longitude;

    // Create the center point
    const center = fromLonLat([longitude, latitude]);

    // Get the radius value (range is already the r value from the computed property)
    const radius = range;

    // Choose the appropriate style based on the dragging state
    const rangeStyle = isAnchorDragging.value
      ? STYLES.CRITICAL_RANGE
      : STYLES.NORMAL_RANGE;

    // Clear any existing critical range circle
    clearFeature(FEATURE_TYPES.CIRCLE);

    // Create a circle with the correct radius in meters using our accurate function
    const circleGeometry = createCircleWithRadius([longitude, latitude], radius);

    // Create a new feature with the circle geometry
    const feature = new Feature({
      geometry: circleGeometry,
    });
    feature.set("type", "critical-range");
    feature.setStyle(rangeStyle);

    // Add the feature to the vector source
    vectorSource.addFeature(feature);

    // Also update the boat-centered range circle
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
watch(
  criticalRange,
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
  (newTargets) => {
    updateAisTargets();
  },
  { immediate: true, deep: true }
);

// Watch for breadcrumbs changes
watch(breadcrumbs, updateBreadcrumbs, { immediate: true });

// Modal State
const showSetAnchorDialog = ref(false);

// Calculate recommended scope based on tide data
const recommendedScope = computed(() => {
  try {
    const reportedDepth = stateStore.state.navigation?.depth?.belowTransducer?.value;
    const tideData = stateStore.state.tides;

    // Debug logging
    console.log("Reported depth:", reportedDepth);
    console.log("Raw tide data:", JSON.parse(JSON.stringify(tideData)));

    if (!reportedDepth) {
      console.log("Missing current depth");
      return null;
    }

    if (!tideData) {
      console.log("No tide data available");
      return null;
    }

    const now = new Date();
    const futureCutoff = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours from now
    console.log("Looking for tide data between", now, "and", futureCutoff);

    // Get all sea level heights and their corresponding times
    let seaLevels = [];
    let timeStamps = [];

    // Try different possible data structures
    if (tideData.hourly?.values?.seaLevelHeightMsl) {
      // Format: { hourly: { values: { seaLevelHeightMsl: { [index]: value } } } }
      seaLevels = Object.values(tideData.hourly.values.seaLevelHeightMsl);
      timeStamps = tideData.hourly.time || [];
      console.log("Found seaLevelHeightMsl format with", seaLevels.length, "entries");
    } else if (tideData.hourly?.waterLevels) {
      // Format: { hourly: { waterLevels: [{ time, value }, ...] } }
      seaLevels = tideData.hourly.waterLevels.map((entry) => entry.value);
      timeStamps = tideData.hourly.waterLevels.map((entry) => entry.time);
      console.log("Found waterLevels format with", seaLevels.length, "entries");
    } else if (tideData.hourly?.length > 0 && tideData.hourly[0].value !== undefined) {
      // Format: { hourly: [{ time, value }, ...] }
      seaLevels = tideData.hourly.map((entry) => entry.value);
      timeStamps = tideData.hourly.map((entry) => entry.time);
      console.log("Found flat array format with", seaLevels.length, "entries");
    } else if (tideData.hourly?.time && Array.isArray(tideData.hourly.time)) {
      // Format: { hourly: { time: [...], values: { seaLevel: [...] } } }
      seaLevels = Object.values(tideData.hourly.values || {}).flat();
      timeStamps = tideData.hourly.time;
      console.log("Found time/values format with", seaLevels.length, "entries");
    }

    if (seaLevels.length === 0 || timeStamps.length === 0) {
      console.log("No sea level data or timestamps available in tide data");
      return null;
    }

    if (seaLevels.length !== timeStamps.length) {
      console.warn(
        `Mismatched data: ${seaLevels.length} sea levels vs ${timeStamps.length} timestamps`
      );
      // Try to handle the mismatch by using the minimum length
      const minLength = Math.min(seaLevels.length, timeStamps.length);
      seaLevels = seaLevels.slice(0, minLength);
      timeStamps = timeStamps.slice(0, minLength);
    }

    // Find maximum water level in the next 72 hours
    let maxFutureLevel = -Infinity;
    let maxFutureTime = null;
    let currentLevel = null;

    console.log("Processing tide data...");

    // Find current water level (closest to now)
    const currentTime = new Date();
    let closestTimeDiff = Infinity;

    for (let i = 0; i < timeStamps.length; i++) {
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
          const level = seaLevels[i];
          if (level !== undefined && level > maxFutureLevel) {
            maxFutureLevel = level;
            maxFutureTime = entryTime;
          }
        }
      } catch (error) {
        console.error("Error processing tide data at index", i, error);
      }
    }

    console.log("Current water level:", currentLevel, "at", new Date(timeStamps[0]));
    console.log("Max future level:", maxFutureLevel, "at", maxFutureTime);

    // Log the range of tide data we have
    if (timeStamps.length > 0) {
      console.log(
        "Tide data covers:",
        new Date(timeStamps[0]),
        "to",
        new Date(timeStamps[timeStamps.length - 1])
      );
    }

    if (maxFutureLevel === -Infinity) {
      console.log("No future tide data found in the next 72 hours");
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

    console.log("Depth increase calculation (meters):", {
      depthInMeters,
      currentWaterLevel: currentLevel,
      maxFutureLevel,
      depthIncreaseMeters,
      targetDepthMeters,
    });

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

// Apply the recommended scope to the anchor state
const setRodeLength = (length) => {
  rodeLength.value = Math.round(length);
  criticalRange.value = Math.round(length * 1.2);
};

const applyRecommendedScope = () => {
  if (!recommendedScope.value) {
    return;
  }

  setRodeLength(recommendedScope.value.recommendedCableLength);

  if (anchorState.value.criticalRange) {
    anchorState.value.criticalRange.r = Math.ceil(
      recommendedScope.value.recommendedCableLength / 5
    );
    anchorState.value.criticalRange.units = recommendedScope.value.unit;
  }
};
const showUpdateDialog = ref(false);
const showCancelDialog = ref(false);
const showUpdateDropConfirm = ref(false);
const locationRequestFailed = ref(false);

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


    console.log("Message being sent:", {
      type: "anchor:update",
      data: newAnchorState,
      source: "AnchorView.handleSetAnchor",
      timestamp: new Date().toISOString(),
    });

    // Then the existing send call
    // stateStore.sendMessageToServer("anchor:update", newAnchorState, {
    //   source: "AnchorView.handleSetAnchor",
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
  if (!validateCoordinates(boatPosition.value)) return;

  anchorState.value.anchorDropLocation.position = {
    latitude: boatPosition.value.latitude.value,
    longitude: boatPosition.value.longitude.value,
  };
  showUpdateDialog.value = false;
};

const confirmUpdateDropLocation = () => {
  logger.info("Confirming update of drop location...");
  handleUpdateDropLocation();
  showUpdateDropConfirm.value = false;
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

  // Re-add the AIS features
  aisFeatures.forEach((feature) => {
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

// Handle map clicks to detect feature clicks
const handleMapClick = (event) => {
  logger.debug("Map click detected", {
    coordinate: event.coordinate,
    pixel: event.pixel,
    type: event.type,
  });
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
  bottom: 80px; /* Aligned with the anchor-fab-container */
  display: flex;
  flex-direction: column;
  gap: 10px; /* Matched gap with anchor-fab-container */
  z-index: 1000; /* Same z-index as anchor-fab-container */
}

.zoom-button {
  width: 56px; /* Match --size: 56px from .custom-fab-size */
  height: 56px; /* Match --size: 56px from .custom-fab-size */
  margin: 5px; /* Match margin from .custom-fab-size */
  border-radius: 50%;
  background-color: rgba(0, 120, 215, 0.9); /* Blue background with slight transparency */
  color: white;
  font-size: 28px;
  font-weight: bold;
  border: none;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  -webkit-tap-highlight-color: transparent; /* Remove tap highlight on mobile */
}

.zoom-button:hover {
  background-color: rgba(0, 140, 240, 1);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.zoom-button:active {
  background-color: rgba(0, 100, 190, 1);
  transform: scale(0.95);
}

/* Add a subtle animation to draw attention to the buttons */
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.zoom-button.zoom-in {
  animation: pulse 2s infinite;
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

.map-attribution {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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
  background: #e6f7ff;
  border: 3px dashed #1890ff;
  border-radius: 10px;
  max-width: 500px;
  margin: 10px auto;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  transform: translateY(0);
}

.set-anchor-modal {
  --background: #e6f3ff;
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
  background: #e6f3ff;
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
  --background: #ffffff;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.modal-toolbar {
  --padding-start: 24px;
  --padding-end: 24px;
  --padding-top: 10px;
  --padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 14px);
  --background: transparent;
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
  background: rgba(0, 0, 0, 0.75);
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
  color: white;
  font-size: 1.25em;
  font-weight: 500;
  text-align: center;
}

.dismiss-location-button {
  margin-top: 20px;
  color: white;
  --color: white;
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
  background: rgba(24, 144, 255, 0.05);
  border-radius: 12px;
  border-left: 4px solid var(--ion-color-primary);
  text-align: left;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(24, 144, 255, 0.15);
}

.recommendation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(24, 144, 255, 0.15);

  span {
    font-size: 1.2em;
    font-weight: 600;
    color: var(--ion-color-primary);
  }
}

.recommendation-header span {
  font-size: 0.9em; /* Reduced from 1.1em */
  font-weight: 600;
  color: var(--ion-color-primary);
}

.recommendation-details {
  font-size: 0.95em;
}

.recommendation-row {
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);

  span:last-child {
    font-weight: 500;
    color: #2c3e50;
  }

  &.highlight {
    background-color: rgba(24, 144, 255, 0.05);
    margin: 12px -12px;
    padding: 10px 12px;
    border-radius: 8px;
    border-left: 3px solid var(--ion-color-primary);

    span:last-child {
      font-weight: 600;
      color: var(--ion-color-primary);
    }
  }
}

.recommendation-row:last-child {
  border-bottom: none;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(24, 144, 255, 0.2);
  font-size: 1.1em;
}

/* Scope Ratio Styles */
.scope-ratio {
  margin: 16px -8px 8px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.ratio-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &.active {
    background-color: rgba(24, 144, 255, 0.05);
    border-left: 3px solid var(--ion-color-primary);
  }

  .ratio-label {
    flex: 1;
    font-size: 0.95em;
    font-weight: 500;
    color: #2c3e50;
  }

  .ratio-value {
    margin: 0 12px;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
    color: #1a73e8;
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
    }
  }

  &.active .ratio-button {
    --background: var(--ion-color-primary);
    --color: white;
  }
}

.suggestion-note {
  margin-top: 12px;
  padding-top: 12px;
  font-size: 0.8em;
  color: #666;
  text-align: center;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
  font-style: italic;
}

.recommendation-row.highlight {
  font-weight: 600;
  color: var(--ion-color-primary);
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
  --box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.apply-button:active {
  transform: scale(0.96);
  --box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.suggestion-note {
  font-size: 0.85em;
  color: #666;
  margin-top: 8px;
  font-style: italic;
  text-align: center;
  padding-top: 8px;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

/* Modal background color */
.enhanced-modal {
  background-color: #e6f3ff;
}
</style>
