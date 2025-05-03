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
      </div>
    </div>

    <!-- Modal dialogs -->
    <ion-modal :is-open="showSetAnchorDialog" @didDismiss="showSetAnchorDialog = false">
      <div class="modal-content enhanced-modal">
        <h3>Set Anchor</h3>
        <div class="slider-label">
          <strong>Range:</strong>
          <span class="slider-value"
            >{{
              anchorState.criticalRange && typeof anchorState.criticalRange.r === "number"
                ? anchorState.criticalRange.r
                : 0
            }}m</span
          >
        </div>
        <ion-range
          v-if="anchorState.criticalRange"
          v-model="anchorState.criticalRange.r"
          :min="0"
          :max="100"
          :step="1"
          ticks="true"
          color="primary"
          class="modal-range modal-range-center"
          style="margin-bottom: 18px; width: 80%"
        />
        <div v-else class="text-danger">Critical range not initialized</div>
        <div class="slider-label">
          <strong>Rode:</strong>
          <span class="slider-value">{{ anchorState.rode.amount }} m</span>
        </div>
        <ion-range
          v-model="anchorState.rode.amount"
          :min="0"
          :max="100"
          :step="1"
          ticks="true"
          color="secondary"
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
        <div class="modal-actions">
          <IonButton color="primary" @click="handleSetAnchor">Set Anchor</IonButton>
          <IonButton @click="showSetAnchorDialog = false">Cancel</IonButton>
        </div>
      </div>
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
      <!-- <AnchorInfoGrid @drop-anchor="handleDropAnchor" /> -->
      <AnchorInfoGrid />
      <div ref="mapElement" class="openlayers-map"></div>
      
      <!-- Custom zoom controls -->
      <div class="custom-zoom-controls">
        <button @click="zoomIn" class="zoom-button zoom-in" data-label="Zoom In">+</button>
        <button @click="zoomOut" class="zoom-button zoom-out" data-label="Zoom Out">−</button>
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
import { ref, reactive, computed, watch, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useStateDataStore, calculateDistanceMeters } from "@/client/stores/stateDataStore";
import { debounce } from "lodash-es";
import { getComputedAnchorLocation } from "@/client/stores/stateDataStore";

// Component imports
import AnchorInfoGrid from "@/client/components/AnchorInfoGrid.vue";
import GenericHeader from "@/client/components/GenericHeader.vue";

// Router setup
const router = useRouter();

// Ionic imports
import {
  IonPage,
  IonModal,
  IonButton,
  IonRange,
  IonSpinner,
  IonFabButton,
  IonIcon,
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
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { Style, Fill, Stroke } from "ol/style";
import Polygon from "ol/geom/Polygon";
import LineString from "ol/geom/LineString";
// Circle is imported but now only used in comments
// import Circle from "ol/geom/Circle";
import { defaults as defaultControls } from "ol/control";
import { defaults as defaultInteractions } from "ol/interaction";
import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import ScaleLine from "ol/control/ScaleLine";
import { useMapTools } from "@client/utils/mapUtils.js";
import { useMapFeatures } from "@client/utils/mapFeatures";
import { STYLES, createStyle } from "@/client/utils/mapStyles";
import { useMapPersist } from "@client/utils/mapPersist";

// Constants
const FEATURE_TYPES = {
  BOAT: 'boat',
  AIS: 'ais',
  BREADCRUMB: 'breadcrumb',
  CIRCLE: 'circle',
  BOAT_RANGE: 'boat-range',
  ANCHOR_DROP_LOCATION: 'anchor-drop-location',
  ANCHOR_LOCATION: 'anchor-location',
  RODE: 'rode'
};

const DEBUG_WHEEL_EVENTS = true; // Set to false in production

// Main component setup
const mapElement = ref(null);
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
const { state, breadcrumbs } = storeToRefs(stateStore);
const navigationState = computed(() => state.value.navigation);
const anchorState = computed(() => state.value.anchor);
const aisTargets = computed(() => {
  const targets = state.value.anchor?.aisTargets || [];
  return targets;
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
    anchorLon
  );
  
  // If distance exceeds 10 meters, consider it dragging
  return distance > 2;
});

const criticalRange = computed(() => anchorState.value?.criticalRange?.r);

console.log("------STATE :  ", state.value);
console.log("+++++++++[ANCHOR STATE]", anchorState.value);


// View persistence
const { saveViewState, restoreViewState } = useMapPersist(map);
const savedView = restoreViewState();

// Map tools
const { fitToFeatures, validateCoordinates, formatPosition } = useMapTools(
  map,
  vectorSource
);

// Feature Updates
const updateBoatPosition = debounce(() => {
  if (!validateCoordinates(boatPosition.value)) {
    return clearFeature(FEATURE_TYPES.BOAT);
  }

  // Safely extract coordinates using same logic as validateCoordinates
  const coord = boatPosition.value;
  const lon = coord.longitude?.value ?? coord.longitude;
  const lat = coord.latitude?.value ?? coord.latitude;

  updateFeature(
    FEATURE_TYPES.BOAT,
    new Point(fromLonLat([lon, lat])), // Use extracted values
    STYLES.BOAT
  );
}, 100);

// Computed property for location modal visibility
const showLocationModal = computed(() => {
  const pos = navigationState.value?.position;
  return !(pos?.latitude?.value && pos?.longitude?.value);
});

const updateAnchorPoints = () => {
  // Clear all anchor-related features
  clearFeature(FEATURE_TYPES.CIRCLE);
  clearFeature(FEATURE_TYPES.ANCHOR_DROP_LOCATION);
  clearFeature(FEATURE_TYPES.ANCHOR_LOCATION);
  clearFeature(FEATURE_TYPES.RODE);

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

// Helper function to create a circle with an accurate radius in meters
const createCircleWithRadius = (centerLonLat, radiusInMeters) => {
  // In Web Mercator (EPSG:3857), the scale factor varies with latitude
  // At the equator, 1 degree is approximately 111,320 meters
  // The scale factor is approximately cos(latitude in radians)
  
  // Get the latitude in radians
  const latRad = (centerLonLat[1] * Math.PI) / 180;
  
  // Calculate the scale factor at this latitude
  // This compensates for the distortion in the Web Mercator projection
  const scaleFactor = Math.cos(latRad);
  
  // Adjust the radius to account for the distortion
  // At higher latitudes, we need a larger radius in projected coordinates
  // to represent the same physical distance
  const adjustedRadius = radiusInMeters / scaleFactor;
  
  console.log('Circle radius adjustment:', {
    latitude: centerLonLat[1],
    originalRadius: radiusInMeters,
    scaleFactor: scaleFactor,
    adjustedRadius: adjustedRadius
  });
  
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
  console.log('Updating critical range circle:', {
    anchorDeployed: anchorState.value.anchorDeployed,
    anchorLocation: anchorState.value.anchorLocation,
    criticalRange: anchorState.value.criticalRange
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
  
  console.log('CRITICAL RANGE DEBUG - Creating circle with:', {
    anchorLocation: [
      anchorState.value.anchorLocation.longitude,
      anchorState.value.anchorLocation.latitude
    ],
    criticalRange: anchorState.value.criticalRange.value
  });

  const position = anchorState.value.anchorLocation.position;
  const latitude = position.latitude?.value ?? position.latitude;
  const longitude = position.longitude?.value ?? position.longitude;
  const radiusInMeters = anchorState.value.criticalRange.r;

  console.log('Drawing circle at:', {
    center: [longitude, latitude],
    radius: radiusInMeters
  });
  
  // Create a circle with the correct radius in meters
  const circleGeometry = createCircleWithRadius([longitude, latitude], radiusInMeters);
  
  // Use the circle for the feature
  updateFeature(
    FEATURE_TYPES.CIRCLE,
    circleGeometry,
    STYLES.CRITICAL_RANGE
  );
  
  // Calculate distance between boat and anchor for verification
  if (boatPosition.value) {
    const boatLat = boatPosition.value.latitude;
    const boatLon = boatPosition.value.longitude;
    const distanceToAnchor = calculateDistanceMeters(
      boatLat,
      boatLon,
      latitude,
      longitude
    );
    
    console.log('CRITICAL RANGE DEBUG - Distance verification:', {
      boatPosition: [boatLon, boatLat],
      anchorPosition: [longitude, latitude],
      criticalRange: radiusInMeters,
      actualDistance: distanceToAnchor,
      difference: Math.abs(distanceToAnchor - radiusInMeters),
      percentError: (Math.abs(distanceToAnchor - radiusInMeters) / radiusInMeters) * 100
    });
  }
  
  console.log('Circle created with radius:', radiusInMeters, 'meters at latitude', latitude);
}, 50);

const updateRodeLine = debounce(() => {
  console.log('RODE LINE DEBUG - Starting updateRodeLine function');
  
  // First, clear any existing rode line
  clearFeature(FEATURE_TYPES.RODE);
  
  // Exit if anchor is not deployed
  if (!anchorState.value.anchorDeployed) {
    console.log('RODE LINE DEBUG - Anchor not deployed, exiting');
    return;
  }
  
  // Get positions
  const boatPos = boatPosition.value;
  const anchorPos = anchorState.value.anchorLocation?.position;
  
  // Validate positions
  if (!boatPos || !anchorPos) {
    console.log('RODE LINE DEBUG - Missing position data');
    return;
  }
  
  // Extract coordinates
  const boatLon = boatPos.longitude?.value ?? boatPos.longitude;
  const boatLat = boatPos.latitude?.value ?? boatPos.latitude;
  const anchorLon = anchorPos.longitude?.value ?? anchorPos.longitude;
  const anchorLat = anchorPos.latitude?.value ?? anchorPos.latitude;
  
  // Validate coordinates
  if (typeof boatLon !== 'number' || typeof boatLat !== 'number' || 
      typeof anchorLon !== 'number' || typeof anchorLat !== 'number') {
    console.log('RODE LINE DEBUG - Invalid coordinates');
    return;
  }
  
  try {
    // Create a direct feature without using the helper functions
    const startCoord = fromLonLat([boatLon, boatLat]);
    const endCoord = fromLonLat([anchorLon, anchorLat]);
    
    console.log('RODE LINE DEBUG - Transformed coordinates:', {
      start: startCoord,
      end: endCoord
    });
    
    // Calculate the actual distance between boat and anchor
    const actualDistance = calculateDistanceMeters(
      boatLat,
      boatLon,
      anchorLat,
      anchorLon
    );
    
    // Get the rode length from the state
    const rodeLength = anchorState.value.rode?.value || 0;
    
    console.log('RODE LINE DEBUG - Distance verification:', {
      boatPosition: [boatLon, boatLat],
      anchorPosition: [anchorLon, anchorLat],
      rodeLength: rodeLength,
      actualDistance: actualDistance,
      difference: Math.abs(actualDistance - rodeLength),
      percentError: rodeLength > 0 ? (Math.abs(actualDistance - rodeLength) / rodeLength) * 100 : 0
    });
    
    // Create a custom style with high visibility
    const rodeStyle = new Style({
      stroke: new Stroke({
        color: '#FF5722', // Deep orange
        width: 4,
        lineDash: [10, 5],
      }),
      zIndex: 100 // Ensure it's on top
    });
    
    // Create a line feature directly
    const rodeFeature = new Feature({
      geometry: new LineString([startCoord, endCoord])
    });
    
    // Set the feature type and style
    rodeFeature.set('type', FEATURE_TYPES.RODE);
    rodeFeature.setStyle(rodeStyle);
    
    // Add the feature directly to the source
    vectorSource.addFeature(rodeFeature);
    
    // We don't need to store the feature reference manually
    
    // Inspect the vector source
    console.log('RODE LINE DEBUG - Vector source:', vectorSource);
    console.log('RODE LINE DEBUG - Vector source features:', vectorSource.getFeatures().length);
    console.log('RODE LINE DEBUG - Vector source feature types:', vectorSource.getFeatures().map(f => f.get('type')));
    
    // Force the map to render
    if (map.value) {
      console.log('RODE LINE DEBUG - Map object:', map.value);
      map.value.renderSync();
      
      // Get the layers and check their visibility
      const layers = map.value.getLayers().getArray();
      console.log('RODE LINE DEBUG - Map layers:', layers);
      layers.forEach((layer, i) => {
        console.log(`RODE LINE DEBUG - Layer ${i} visible:`, layer.getVisible());
      });
    }
    
    console.log('RODE LINE DEBUG - Rode line created with direct approach');
  } catch (error) {
    console.error('RODE LINE DEBUG - Error creating rode line:', error);
  }
}, 100);

// Function to select the appropriate AIS style based on target type
const getAisStyle = (target) => {
  // Determine target type based on shipType or name
  if (target.shipType === 36 || target.shipType === 37) {
    // Pleasure craft
    return STYLES.AIS_VESSEL;
  } else if (target.shipType >= 70 && target.shipType <= 79) {
    // Cargo vessels
    return STYLES.AIS_HAZARD;
  } else if (target.name && target.name.includes("LION")) {
    // Example of name-based classification - for demo purposes
    return STYLES.AIS_VESSEL;
  } else {
    // Default style for all other vessels
    return STYLES.AIS_DEFAULT;
  }
};

const updateAisTargets = debounce(() => {
  console.log("updateAisTargets called", {
    hasTargets: !!aisTargets.value,
    targetsLength: aisTargets.value?.length || 0,
    featureType: FEATURE_TYPES.AIS,
  });

  // Skip if no targets
  if (!aisTargets.value || aisTargets.value.length === 0) {
    console.log("No AIS targets, clearing feature");
    clearFeature(FEATURE_TYPES.AIS);
    return;
  }

  console.log("Updating AIS targets:", aisTargets.value.length, aisTargets.value);

  // Filter for valid targets and create features
  const validTargets = aisTargets.value
    .filter((target) => {
      // Check if target has valid coordinates
      if (!target || !target.position) return false;

      const lat = target.position.latitude;
      const lon = target.position.longitude;

      const isValid = typeof lat === "number" && typeof lon === "number";
      if (!isValid) {
        console.log("Invalid AIS target coordinates:", target);
      }
      return isValid;
    })
    .map((target) => {
      // Extract coordinates from the position structure
      const lon = target.position.longitude;
      const lat = target.position.latitude;

      // Create a feature with the target's data
      const feature = new Feature({
        geometry: new Point(fromLonLat([lon, lat])),
        mmsi: target.mmsi,
        name: target.name || 'Unknown Vessel',
        type: FEATURE_TYPES.AIS
      });
      
      // Set the style
      feature.setStyle(getAisStyle(target));
      
      return feature;
    });

  console.log("Valid AIS targets:", validTargets.length);

  // Clear existing AIS features
  clearFeature(FEATURE_TYPES.AIS);
  
  // Add each feature to the source directly
  validTargets.forEach(feature => {
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

  console.log("Updating breadcrumbs:", breadcrumbs.value.length);

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

  console.log("Valid breadcrumbs:", validCrumbs.length);

  // Update the feature group
  updateFeatureGroup(FEATURE_TYPES.BREADCRUMB, validCrumbs);
}, 300);

// Map Initialization
const initializeMap = () => {
  const pos = navigationState.value?.position;
  const defaultCenter =
    pos?.latitude?.value && pos?.longitude?.value
      ? fromLonLat([pos.longitude.value, pos.latitude.value])
      : fromLonLat([0, 0]);

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
    controls: defaultControls({ zoom: true }),
    interactions: defaultInteractions({
      // Start with minimal interactions
      dragPan: true,
      pinchZoom: true,
      mouseWheelZoom: false // Disable default and add our custom one below
    }),
    pixelRatio: window.devicePixelRatio,
  });

  // Set willReadFrequently attribute on the canvas for better performance
  const canvas = map.value.getViewport().querySelector('canvas');
  if (canvas) {
    canvas.getContext('2d', { willReadFrequently: true });
  }

  // Add mouse wheel zoom interaction manually with custom options
  const mouseWheelZoom = new MouseWheelZoom({
    duration: 250,
    timeout: 80,
    useAnchor: true
  });
  map.value.addInteraction(mouseWheelZoom);

  map.value.addControl(new ScaleLine({ units: "metric" }));
  map.value.on("moveend", saveViewState);
  
  // Add click handler for features
  map.value.on('click', handleMapClick);
  
  // Add debug logging for interactions
  if (DEBUG_WHEEL_EVENTS) {
    console.log('Map interactions:', map.value.getInteractions().getArray());
    console.log('MouseWheelZoom interaction exists:', 
      map.value.getInteractions().getArray().some(i => i instanceof MouseWheelZoom));
  }

  // Add both passive and non-passive event listeners as fallback
  mapElement.value.addEventListener('wheel', handleWheelEvent, { passive: false });
  document.addEventListener('wheel', handleWheelEvent, { passive: false, capture: true });
  
  // Focus management
  mapElement.value.tabIndex = 0; // Make focusable
  mapElement.value.style.outline = 'none';
  mapElement.value.focus();
  
  console.log('Map initialized with enhanced wheel zoom handling');
};

// Watchers
watch(boatPosition, updateBoatPosition, { immediate: true });

// Watch for anchor state changes
watch(anchorState, () => {
  console.log('WATCH DEBUG - Anchor state changed:', anchorState.value);
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
}, { deep: true, immediate: true });

// Watch boat position to update rode line when anchor is deployed
watch(boatPosition, () => {
  console.log('WATCH DEBUG - Boat position changed');
  if (anchorState.value.anchorDeployed) {
    updateRodeLine();
  }
}, { deep: true });

// Removed duplicate watch as it's now handled by the anchor state watch

// Auto-center map when position updates
watch(
  () => navigationState.value?.position,
  (newPos) => {
    if (map.value && newPos?.latitude?.value && newPos?.longitude?.value) {
      const center = fromLonLat([newPos.longitude.value, newPos.latitude.value]);
      map.value.getView().setCenter(center);
    }
  },
  { immediate: true }
);

// Watch for critical anchor state changes
watch(
  [criticalRange, () => anchorState.value?.dragging],
  ([range, isDragging]) => {
    console.log('WATCH DEBUG - Critical anchor state changed:', {
      criticalRange: range,
      isDragging: isDragging
    });
    
    // If anchor is deployed, fit the map to show both boat and anchor
    if (anchorState.value.anchorDeployed) {
      fitToFeatures([FEATURE_TYPES.BOAT, FEATURE_TYPES.ANCHOR_LOCATION]);
    }
    
    // Get the anchor location from the state (not the drop location)
    // This is where the anchor is currently located, which should be the center of the circle
    const anchorLoc = anchorState.value.anchorLocation;
    
    console.log("CIRCLE DEBUG - Circle center:", [
      anchorLoc?.position?.longitude?.value,
      anchorLoc?.position?.latitude?.value,
    ]);
    console.log("CIRCLE DEBUG - Radius:", range);
    console.log("CIRCLE DEBUG - Anchor deployed:", anchorState.value.anchorDeployed);
    console.log("CIRCLE DEBUG - Anchor dragging:", isDragging);

    if (!anchorState.value.anchorDeployed || range === undefined || !anchorLoc?.position) {
      console.log("CIRCLE DEBUG - Missing required data, clearing circle");
      clearFeature(FEATURE_TYPES.CIRCLE);
      return;
    }

    // Make sure we have valid coordinates
    if (!validateCoordinates(anchorLoc.position)) {
      console.log("CIRCLE DEBUG - Invalid coordinates for circle");
      clearFeature(FEATURE_TYPES.CIRCLE);
      return;
    }

    // Get the position coordinates
    const position = anchorLoc.position;
    const latitude = position.latitude?.value || position.latitude;
    const longitude = position.longitude?.value || position.longitude;

    // Create the center point
    const center = fromLonLat([longitude, latitude]);
    console.log("Processed center:", center);

    // Get the radius value (range is already the r value from the computed property)
    const radius = range;
    console.log("Processed radius:", radius);

    // Choose the appropriate style based on the dragging state
    const rangeStyle = isAnchorDragging.value ? STYLES.CRITICAL_RANGE : STYLES.NORMAL_RANGE;
    console.log(
      "Using style:",
      isDragging ? "CRITICAL_RANGE (red)" : "NORMAL_RANGE (blue)"
    );

    // Clear any existing critical range circle
    clearFeature(FEATURE_TYPES.CIRCLE);
    
    // Create a circle with the correct radius in meters using our accurate function
    const circleGeometry = createCircleWithRadius([longitude, latitude], radius);
    
    // Create a new feature with the circle geometry
    const feature = new Feature({
      geometry: circleGeometry
    });
    feature.set('type', 'critical-range');
    feature.setStyle(rangeStyle);
    
    // Add the feature to the vector source
    vectorSource.addFeature(feature);
    
    console.log('Range circle created with radius:', radius, 'meters at latitude', latitude);
    
    // Also update the boat-centered range circle
    updateBoatRangeCircle();
  },
  { immediate: true, deep: true }
);

// Function to update the boat-centered normal range circle
const updateBoatRangeCircle = debounce(() => {
  console.log('BOAT RANGE DEBUG - Function called');
  
  // Clear any existing boat range circle
  clearFeature(FEATURE_TYPES.BOAT_RANGE);
  
  // Exit if anchor is not deployed or we don't have boat position
  if (!anchorState.value.anchorDeployed || !boatPosition.value || !anchorState.value.criticalRange) {
    console.log('BOAT RANGE DEBUG - Early exit:', {
      anchorDeployed: anchorState.value.anchorDeployed,
      hasBoatPosition: !!boatPosition.value,
      hasCriticalRange: !!anchorState.value.criticalRange
    });
    return;
  }
  
  // Get boat position - properly extract numeric values from potentially nested objects
  const boatLat = boatPosition.value.latitude?.value ?? boatPosition.value.latitude;
  const boatLon = boatPosition.value.longitude?.value ?? boatPosition.value.longitude;
  
  console.log('BOAT RANGE DEBUG - Extracted boat position:', {
    rawLatitude: boatPosition.value.latitude,
    rawLongitude: boatPosition.value.longitude,
    extractedLatitude: boatLat,
    extractedLongitude: boatLon,
    isLatitudeNumber: typeof boatLat === 'number',
    isLongitudeNumber: typeof boatLon === 'number'
  });
  
  // Use the same radius as the critical range
  const radius = anchorState.value.criticalRange.r;
  
  console.log('BOAT RANGE DEBUG - Creating circle with:', {
    boatPosition: [boatLon, boatLat],
    radius: radius
  });
  
  // Create a circle with the correct radius in meters using our accurate function
  const circleGeometry = createCircleWithRadius([boatLon, boatLat], radius);
  
  // Use the updateFeature function to create and add the feature
  updateFeature(
    FEATURE_TYPES.BOAT_RANGE,
    circleGeometry,
    STYLES.NORMAL_RANGE
  );
  
  console.log('Boat range circle created with radius:', radius, 'meters at latitude', boatLat);
}, 50);

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
    console.log("Critical range changed:", newVal);
    console.log("Anchor drop location:", anchorDropLocation.value);
    console.log("Anchor deployed:", anchorDeployed.value);
  },
  { immediate: true }
);

// Watch for AIS targets changes
watch(
  aisTargets,
  (newTargets) => {
    console.log("AIS targets changed:", newTargets?.length || 0);
    updateAisTargets();
  },
  { immediate: true, deep: true }
);

// Watch for breadcrumbs changes
watch(breadcrumbs, updateBreadcrumbs, { immediate: true });

// Modal State
const showSetAnchorDialog = ref(false);
const showUpdateDialog = ref(false);
const showCancelDialog = ref(false);
const showUpdateDropConfirm = ref(false);
const locationRequestFailed = ref(false);

// Modal Handlers
const handleSetAnchor = () => {
  if (!validateCoordinates(boatPosition.value)) {
    console.log("Cannot set anchor: Invalid boat position");
    return;
  }

  try {
    // Extract values safely
    const boatLat = boatPosition.value.latitude?.value ?? boatPosition.value.latitude;
    const boatLon = boatPosition.value.longitude?.value ?? boatPosition.value.longitude;
    
    // Use a default bearing of 180 degrees (south) if not set
    // This ensures the anchor is placed in a different location than the boat
    const bearing = anchorState.value.bearing?.value ?? 180;
    
    // IMPORTANT: The bearing needs to be in radians for the calculation
    // The bearing is the direction FROM the boat TO the anchor
    const bearingRad = bearing * Math.PI / 180; // Convert degrees to radians
    
    // Make sure we have a non-zero rode length (default to 50m if not set)
    const rode = anchorState.value.rode?.amount ?? 50;
    const depth = navigationState.value?.depth?.value ?? 0; // Use 0 as default if no depth

    // Debug the values being passed to getComputedAnchorLocation
    console.log('ANCHOR DEBUG - Computing anchor location with:', {
      dropLocation: { latitude: boatLat, longitude: boatLon },
      rode: rode,
      bearing: bearingRad,
      depth: depth
    });
    
    // Calculate anchor position using the state store's function
    const computedAnchorLocation = getComputedAnchorLocation(
      { latitude: boatLat, longitude: boatLon },
      rode,
      bearingRad,
      depth
    );
    
    console.log('ANCHOR DEBUG - Computed anchor location:', computedAnchorLocation);
    
    // Calculate the distance between boat and anchor positions
    const distanceToAnchor = calculateDistanceMeters(
      boatLat,
      boatLon,
      computedAnchorLocation.latitude,
      computedAnchorLocation.longitude
    );
    
    console.log('ANCHOR DEBUG - Distance calculations:', {
      boatPosition: [boatLon, boatLat],
      anchorPosition: [computedAnchorLocation.longitude, computedAnchorLocation.latitude],
      rodeLength: rode,
      calculatedDistance: distanceToAnchor,
      difference: Math.abs(rode - distanceToAnchor)
    });

    // Update the anchor state in the store
    state.value.anchor = {
      anchorDropLocation: {
        position: {
          latitude: { value: boatLat, units: "deg" },
          longitude: { value: boatLon, units: "deg" },
        },
        time: new Date().toISOString(),
        depth: navigationState.value?.depth || { value: null, units: "m", feet: null },
        bearing: { value: bearing, units: "rad", degrees: bearing * 180 / Math.PI }
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
          units: "m",
          nauticalMiles: null,
        },
        distancesFromDrop: {
          value: 0,
          units: "m",
          nauticalMiles: null,
        },
        originalBearing: { value: bearing, units: "rad", degrees: bearing * 180 / Math.PI },
        bearing: { value: bearing, units: "rad", degrees: bearing * 180 / Math.PI }
      },
      aisTargets: state.value.anchor.aisTargets || [], // Preserve existing AIS targets,
      rode: {
        amount: rode,
        units: "m",
      },
      criticalRange: {
        r: anchorState.value.criticalRange?.r || rode, // Use the value from the range slider, or rode as fallback
        units: "m",
      },
      warningRange: {
        r: rode * 0.75, // 75% of rode length as warning range
        units: "m",
      },
      defaultScope: {
        value: 5,
        units: "ratio",
      },
      dragging: false,
      anchorDeployed: true,
      history: [],
      useDeviceGPS: true
    };

    // Create a clean object for localStorage
    const storageState = {
      anchorDeployed: true,
      anchorDropLocation: state.value.anchor.anchorDropLocation,
      anchorLocation: state.value.anchor.anchorLocation,
      criticalRange: state.value.anchor.criticalRange,
      warningRange: state.value.anchor.warningRange,
      rode: state.value.anchor.rode,
    };

    // Log the state for debugging
    console.log("Anchor deployed status:", anchorState.value.anchorDeployed);
    console.log("Full anchor state:", anchorState.value);

    try {
      // Save to local storage
      localStorage.setItem("anchorState", JSON.stringify(storageState));
      console.log("Anchor state saved to local storage");
    } catch (e) {
      console.error("Failed to save anchor state:", e);
    }

    // Close the dialog
    showSetAnchorDialog.value = false;

    // Update the map - force immediate updates in the correct order
    updateAnchorPoints();
    updateCriticalRangeCircle();
    
    // Force update the rode line with a slight delay to ensure other updates are complete
    console.log('FORCE UPDATE - Calling updateRodeLine directly');
    updateRodeLine();
    
    // Force update the boat range circle
    console.log('FORCE UPDATE - Calling updateBoatRangeCircle directly');
    updateBoatRangeCircle();

    // Close the modal
    showSetAnchorDialog.value = false;
  } catch (error) {
    console.error("Failed to save anchor state:", error);
    alert("Error saving anchor position. See console for details.");
    // Close the modal even if there's an error
    showSetAnchorDialog.value = false;
  }
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
  handleUpdateDropLocation();
  showUpdateDropConfirm.value = false;
};

const handleCancelAnchor = () => { 
  // First, identify all features we want to keep
  const boatFeatures = [];
  const aisFeatures = [];
  
  // Get all boat and AIS features
  vectorSource.forEachFeature(feature => {
    const featureType = feature.get('type');
    if (featureType === FEATURE_TYPES.BOAT) {
      boatFeatures.push(feature);
    } else if (featureType === FEATURE_TYPES.AIS) {
      aisFeatures.push(feature);
    }
  });
  
  console.log('Found features to preserve:', {
    boatFeatures: boatFeatures.length,
    aisFeatures: aisFeatures.length
  });
  
  // Clear ALL features from the vector source
  vectorSource.clear();
  
  // Re-add the boat features
  boatFeatures.forEach(feature => {
    vectorSource.addFeature(feature);
  });
  
  // Re-add the AIS features
  aisFeatures.forEach(feature => {
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
  
  console.log('All anchor-related features have been cleared from the map');
};

const degreesToRadians = (degrees) => degrees * (Math.PI / 180);

// Handle map clicks to detect feature clicks
const handleMapClick = (event) => {
  // Get features at the click position
  const clickedFeatures = map.value.getFeaturesAtPixel(event.pixel);
  
  if (clickedFeatures && clickedFeatures.length > 0) {
    // Check if any of the features is an AIS target
    const aisFeature = clickedFeatures.find(feature => feature.get('type') === FEATURE_TYPES.AIS);
    
    if (aisFeature) {
      const mmsi = aisFeature.get('mmsi');
      const name = aisFeature.get('name');
      
      console.log(`Clicked on AIS target: ${name} (MMSI: ${mmsi})`);
      
      // Navigate to the AIS target detail page
      if (mmsi) {
        router.push(`/aistarget/${mmsi}`);
      }
    }
  }
};

// Wheel event handler for map zooming
const handleWheelEvent = (event) => {
  if (DEBUG_WHEEL_EVENTS) {
    console.log('Wheel event detected', {
      target: event.target,
      deltaY: event.deltaY,
      isOverMap: mapElement.value?.contains(event.target)
    });
  }

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
  const newZoom = Math.min(Math.max(currentZoom + delta, view.getMinZoom()), view.getMaxZoom());
  
  view.animate({
    zoom: newZoom,
    duration: 250,
    center: view.getCenter() // Keep current center
  });
};

// Custom zoom functions
const zoomIn = () => {
  if (!map.value) return;
  const view = map.value.getView();
  if (!view) return;
  
  const currentZoom = view.getZoom();
  const newZoom = currentZoom + 1;
  
  // Get boat position for centering
  if (boatPosition.value?.latitude?.value && boatPosition.value?.longitude?.value) {
    const boatCoords = fromLonLat([
      boatPosition.value.longitude.value,
      boatPosition.value.latitude.value
    ]);
    
    // Animate to new zoom level centered on boat
    view.animate({
      zoom: newZoom,
      center: boatCoords,
      duration: 250
    });
    
    console.log('Zooming in to boat position:', { newZoom, boatCoords });
  } else {
    // If no boat position, just change zoom without changing center
    view.animate({
      zoom: newZoom,
      duration: 250
    });
  }
};

const zoomOut = () => {
  if (!map.value) return;
  const view = map.value.getView();
  if (!view) return;
  
  const currentZoom = view.getZoom();
  const newZoom = currentZoom - 1;
  
  // Get boat position for centering
  if (boatPosition.value?.latitude?.value && boatPosition.value?.longitude?.value) {
    const boatCoords = fromLonLat([
      boatPosition.value.longitude.value,
      boatPosition.value.latitude.value
    ]);
    
    // Animate to new zoom level centered on boat
    view.animate({
      zoom: newZoom,
      center: boatCoords,
      duration: 250
    });
    
    console.log('Zooming out to boat position:', { newZoom, boatCoords });
  } else {
    // If no boat position, just change zoom without changing center
    view.animate({
      zoom: newZoom,
      duration: 250
    });
  }
};

// Lifecycle hooks
onMounted(() => {
  initializeMap();

  // EXTREME DEBUG LOGGING
  console.log('WHEEL DEBUG - Starting wheel event setup');
  console.log('WHEEL DEBUG - Map element reference:', mapElement.value);
  console.log('WHEEL DEBUG - Map container query result:', document.querySelector('.openlayers-map'));
  
  // Using the built-in OpenLayers mouseWheelZoom interaction
  // No need for custom event handlers

  if (import.meta.env.DEV) {
    watch(
      () => perfStats.featureCounts,
      (counts) => console.log("[Perf] Feature counts:", counts),
      { deep: true }
    );
  }
});

onUnmounted(() => {
  clearAll();
  map.value?.dispose();
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
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
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

/* Anchor Modal Glassmorphism Styles */
.enhanced-modal {
  border-radius: 28px;
  padding: 44px 24px 32px 24px;
  max-width: 420px;
  margin: 48px auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2.5px solid rgba(255, 215, 0, 0.12);
  position: relative;
}

.enhanced-modal::before {
  content: "\2693"; /* Unicode anchor icon */
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 2.3em;
  opacity: 0.85;
  pointer-events: none;
}

.slider-label {
  width: 100%;
  font-weight: 600;
  font-size: 1.13em;
  margin-bottom: 12px;
  padding-left: 10px;
  letter-spacing: 0.5px;
}

.modal-range-center {
  margin: 0 auto 22px auto;
  width: 80%;
}

.modal-actions {
  width: 100%;
  display: flex;
  gap: 18px;
  margin-top: 34px;
}

.modal-actions IonButton {
  /* background: linear-gradient(90deg, #ffd700 60%, #ffe066 100%); */
  color: #12263a;
  border-radius: 12px;
  font-weight: 700;
  border: none;
}

h3 {
  /* color: #ffd700; */
  margin-bottom: 28px;
  letter-spacing: 1px;
  font-size: 2.3em;
  text-align: center;
}

/* Center slider label/value and enlarge modal card */
.acquire-location-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  z-index: 2000;
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

.slider-value {
  font-size: 3em;
  font-weight: bold;
  letter-spacing: 0.5px;
  margin: 2px 0 0 0;
}
</style>
