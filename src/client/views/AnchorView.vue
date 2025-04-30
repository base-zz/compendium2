<template>
  <ion-page class="page-container">
    <!-- Location acquiring overlay -->
    <div v-if="showLocationModal" class="acquire-location-modal">
      <div class="acquire-location-content">
        <ion-spinner name="crescent" class="location-spinner"></ion-spinner>
        <div class="location-modal-message">Acquiring Location...</div>
        <div v-if="locationRequestFailed" class="location-error-message">
          Unable to get your location. Please check your browser permissions.
          <ion-button @click="requestLocationPermission" class="location-retry-button">
            Request Location Access
          </ion-button>
        </div>
      </div>
    </div>

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
          :min="10"
          :max="150"
          :step="1"
          ticks="true"
          color="primary"
          class="modal-range modal-range-center"
          style="margin-bottom: 18px; width: 80%"
        />
        <div v-else class="text-danger">Critical range not initialized</div>
        <div class="slider-label">
          <strong>Rode:</strong>
          <span class="slider-value">{{ stateStore.anchorState.rode.amount }} m</span>
        </div>
        <ion-range
          v-model="stateStore.anchorState.rode.amount"
          :min="5"
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
            >{{ stateStore.anchorState.anchorDropLocation.originalBearing }}°</span
          >
        </div>
        <ion-range
          v-model="stateStore.anchorState.anchorDropLocation.originalBearing"
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

    <div class="map-wrapper">
      <AnchorInfoGrid @drop-anchor="handleDropAnchor" />
      <div ref="mapElement" class="openlayers-map"></div>
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
    <generic-header title="Anchor"></generic-header>
  </ion-page>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import GenericHeader from "@client/components/GenericHeader.vue";
import AnchorInfoGrid from "@client/components/AnchorInfoGrid.vue";
import debounce from "lodash/debounce";
import {
  IonPage,
  IonContent,
  IonFabButton,
  IonIcon,
  IonModal,
  IonButton,
  IonRange,
  IonSpinner,
} from "@ionic/vue";
import { chevronUpOutline } from "ionicons/icons";

import { useStateDataStore } from "@/client/stores/stateDataStore.js";
import { storeToRefs } from "pinia";
import "ol/ol.css";
import Map from "ol/Map";
import { defaults as defaultControls } from "ol/control";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Feature } from "ol";
import { Point, Circle as CircleGeom, Polygon } from "ol/geom";
import LineString from "ol/geom/LineString";
import { Style, Circle as CircleStyle, Fill, Stroke } from "ol/style";
import { fromLonLat } from "ol/proj";
import ScaleLine from "ol/control/ScaleLine";

const mapElement = ref(null);
const map = ref(null);
let vectorSource = null;
let vectorLayer = null;

function ensureVectorSourceAndLayer() {
  if (!vectorSource) {
    vectorSource = new VectorSource();
    console.log("[AnchorView] vectorSource initialized");
  }
  if (!vectorLayer) {
    vectorLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 10 // Ensure vector layer is on top of base layer
    });
    console.log("[AnchorView] vectorLayer initialized");
  }
}

// Store setup (must be before using anchorState)
const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);
const navigationState = computed(() => state.value.navigation);

// Location request state
const locationRequestFailed = ref(false);
const locationRequestAttempts = ref(0);

// Function to explicitly request location permission
function requestLocationPermission() {
  locationRequestAttempts.value++;
  console.log('[AnchorView] Requesting location permission, attempt:', locationRequestAttempts.value);
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[AnchorView] Browser geolocation success:', position);
        locationRequestFailed.value = false;
        // We don't need to update the state here as the Signal K server will do it
      },
      (error) => {
        console.error('[AnchorView] Browser geolocation error:', error);
        locationRequestFailed.value = true;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    console.error('[AnchorView] Browser does not support geolocation');
    locationRequestFailed.value = true;
  }
}
const anchorState = computed(() => state.value.anchor);
// const { navigationState, anchorState } = storeToRefs(stateStore);

console.log("stateStore", stateStore);
console.log("anchorState", anchorState.value);
console.log("anchorState.value.anchorDeployed", anchorState.value.anchorDeployed);
console.log("navigationState", navigationState);
console.log("navigationState.value", navigationState.value);
console.log("navigationState.value.position", navigationState.value.position);
console.log(
  "navigationState.value.position.longitude",
  navigationState.value.position.longitude
);
console.log(
  "navigationState.value.position.latitude.value",
  navigationState.value.position.latitude.value
);

const breadcrumbs = ref([]);
const AISTargets = ref([]);

// Watch breadcrumbs and update anchorLocation.bearing if anchor is set
watch(
  () => breadcrumbs.value.length,
  () => {
    console.log(
      "[WATCHER: breadcrumbs.length] fired:",
      breadcrumbs.value.length,
      "anchorDeployed:",
      anchorState.value.anchorDeployed
    );
    if (anchorState.value.anchorDeployed && breadcrumbs.value.length >= 2) {
      const prev = breadcrumbs.value[breadcrumbs.value.length - 2];
      const curr = breadcrumbs.value[breadcrumbs.value.length - 1];
      const bearing = calculateBearing(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
      anchorState.value.anchorLocation = {
        ...anchorState.value.anchorLocation,
        bearing,
      };
    }
  }
);

function handleDropAnchor() {
  // Get current position from navigationState
  const pos = navigationState.value?.position;
  if (!pos || typeof pos.latitude !== "number" || typeof pos.longitude !== "number") {
    console.warn("No valid position for dropping anchor");
    return;
  }
  // Set anchor drop location and anchor location
  anchorState.value.anchorDropLocation = {
    latitude: pos.latitude,
    longitude: pos.longitude,
    // Add other fields as needed
  };
  // Calculate bearing from breadcrumbs if possible
  let bearing = 0;
  if (breadcrumbs.value.length >= 2) {
    const prev = breadcrumbs.value[breadcrumbs.value.length - 2];
    const curr = breadcrumbs.value[breadcrumbs.value.length - 1];
    bearing = calculateBearing(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
  }
  anchorState.value.anchorLocation = {
    ...anchorState.value.anchorLocation,
    latitude: pos.latitude,
    longitude: pos.longitude,
    bearing,
    // Add other fields as needed
  };
  anchorState.value.anchorDeployed = true;
}

let outsideSince = null;
let alarmTimeout = null;
const showSetAnchorDialog = ref(false);

// Watch for position changes and add to breadcrumbs
watch(
  () => navigationState.value.position,
  (pos) => {
    if (pos && pos.latitude && pos.longitude) {
      breadcrumbs.value.push({ latitude: pos.latitude, longitude: pos.longitude });
      if (breadcrumbs.value.length > 50) breadcrumbs.value.shift();
    }
  },
  { immediate: true, deep: false }
);

const showUpdateDropConfirm = ref(false);
function confirmUpdateDropLocation() {
  updateAnchorDropLocation();
  showUpdateDropConfirm.value = false;
  showCancelDialog.value = false;
}

// Show modal if position is missing or at (0,0)
const showLocationModal = computed(() => {
  const pos = navigationState.value?.position;
  // Check if we have valid position data
  const hasValidPosition = 
    pos && 
    pos.latitude && 
    pos.longitude && 
    typeof pos.latitude.value === 'number' && 
    typeof pos.longitude.value === 'number' && 
    Math.abs(pos.latitude.value) > 0.0001 && 
    Math.abs(pos.longitude.value) > 0.0001;
  
  const result = !hasValidPosition;
  console.log("[COMPUTED: showLocationModal] evaluated:", { pos, hasValidPosition, result });
  return result;
});

function checkAnchorAlarm(boatPos, anchorPos, radiusMeters, delaySeconds) {
  if (
    !boatPos?.latitude ||
    !boatPos?.longitude ||
    !anchorPos?.latitude ||
    !anchorPos?.longitude
  ) {
    outsideSince = null;
    if (alarmTimeout) clearTimeout(alarmTimeout);
    anchorState.value.dragging = false;
    return;
  }
  const dist = calculateDistanceMeters(
    boatPos.latitude,
    boatPos.longitude,
    anchorPos.latitude,
    anchorPos.longitude
  );
  if (dist > radiusMeters) {
    if (!outsideSince) {
      outsideSince = Date.now();
      alarmTimeout = setTimeout(() => {
        if (outsideSince && Date.now() - outsideSince >= delaySeconds * 1000) {
          anchorState.value.dragging = true;
        }
      }, delaySeconds * 1000);
    }
  } else {
    outsideSince = null;
    if (alarmTimeout) clearTimeout(alarmTimeout);
    anchorState.value.dragging = false;
  }
}

// Watch boat position for anchor alarm
watch(
  () => navigationState.value.position,
  (pos) => {
    console.log(
      "[WATCHER: navigationState.position] fired:",
      JSON.parse(JSON.stringify(pos))
    );
    const anchorPos = anchorState.value.anchorDropLocation;
    const radius =
      anchorState.value.criticalRange &&
      typeof anchorState.value.criticalRange.r === "number"
        ? anchorState.value.criticalRange.r
        : 30;
    checkAnchorAlarm(
      { latitude: pos.latitude, longitude: pos.longitude },
      { latitude: anchorPos.latitude, longitude: anchorPos.longitude },
      radius,
      10 // seconds delay
    );
  },
  { deep: true }
);

// FAB dialog state
const showUpdateDialog = ref(false);
const showCancelDialog = ref(false);

function handleSetAnchor() {
  // Get current vessel position
  const pos = navigationState.value.position;
  console.log("[handleSetAnchor] navigationState.value.position:", pos);
  if (!pos || typeof pos.latitude !== "number" || typeof pos.longitude !== "number") {
    console.error("[handleSetAnchor] ERROR: Missing or invalid vessel position!", pos);
    return;
  }
  const { latitude, longitude } = pos;
  const now = Date.now();

  // Set anchorDropLocation
  Object.assign(anchorState.value.anchorDropLocation, {
    latitude,
    longitude,
    time: now,
    depth: navigationState.value.depth?.belowTransducer ?? null,
    distanceFromCurrentLocation: 0,
    distanceFromDropLocation: 0,
    originalBearing: 0,
  });
  console.log(
    "[handleSetAnchor] Set anchorDropLocation:",
    anchorState.value.anchorDropLocation
  );

  // Set anchorLocation to match anchorDropLocation
  // Calculate bearing from breadcrumbs if possible
  let bearing = 0;
  if (breadcrumbs.value.length >= 2) {
    const prev = breadcrumbs.value[breadcrumbs.value.length - 2];
    const curr = breadcrumbs.value[breadcrumbs.value.length - 1];
    console.log("[handleSetAnchor] Calculating bearing from breadcrumbs:", prev, curr);
    bearing = calculateBearing(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
    console.log("[handleSetAnchor] Calculated bearing:", bearing);
  } else {
    console.log("[handleSetAnchor] Not enough breadcrumbs to calculate bearing.");
  }
  Object.assign(anchorState.value.anchorLocation, anchorState.value.anchorDropLocation, {
    bearing,
  });
  anchorState.value.anchorDeployed = true;
  anchorState.value.dragging = false;
  showSetAnchorDialog.value = false;
}

function handleUpdateDropLocation() {
  // Replace with your update logic
  if (typeof updateAnchorDropLocation === "function") {
    updateAnchorDropLocation();
  }
  showUpdateDialog.value = false;
}

function handleCancelAnchor() {
  anchorState.value.anchorDeployed = false;
  anchorState.value.dragging = false;
  // Clear anchorDropLocation
  Object.assign(anchorState.value.anchorDropLocation, {
    latitude: null,
    longitude: null,
    time: null,
    depth: null,
    distanceFromCurrentLocation: 0,
    distanceFromDropLocation: 0,
    originalBearing: 0,
  });
  // Clear anchorLocation
  Object.assign(anchorState.value.anchorLocation, {
    latitude: null,
    longitude: null,
    time: null,
    depth: null,
    distanceFromCurrentLocation: 0,
    distanceFromDropLocation: 0,
    originalBearing: 0,
    bearing: 0,
  });
  showCancelDialog.value = false;
}

// Utility: Calculate destination lat/lon given start, distance (meters), and bearing (degrees)
function calculateDestinationLatLon(lat, lon, distanceMeters, bearingDegrees) {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;
  const θ = (bearingDegrees * Math.PI) / 180;
  const δ = distanceMeters / R;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );
  return {
    latitude: (φ2 * 180) / Math.PI,
    longitude: (λ2 * 180) / Math.PI,
  };
}

// Calculate distance between two lat/lon points in meters (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Draw a blue dot for current position
// --- Animated Boat Feature ---
let boatFeature = null;
let boatAnimationFrameId = null;

function animateBoatMove(from, to, duration = 500) {
  if (boatAnimationFrameId) {
    cancelAnimationFrame(boatAnimationFrameId);
  }
  const start = performance.now();
  function animate(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    const lon = from[0] + (to[0] - from[0]) * t;
    const lat = from[1] + (to[1] - from[1]) * t;
    boatFeature.getGeometry().setCoordinates([lon, lat]);
    if (t < 1) {
      boatAnimationFrameId = requestAnimationFrame(animate);
    }
  }
  boatAnimationFrameId = requestAnimationFrame(animate);
}

function drawPositionDot(lat, lon, animate = false) {
  // Debug logging for parameters
  console.log("[drawPositionDot] PARAMS:", {
    lat: lat,
    lon: lon,
    animate: animate,
    latType: typeof lat,
    lonType: typeof lon,
    latIsProxy: lat && typeof lat === 'object' && 'value' in lat,
    lonIsProxy: lon && typeof lon === 'object' && 'value' in lon,
    latValue: lat?.value,
    lonValue: lon?.value
  });
  
  // Handle proxy objects from Pinia store
  if (typeof lat === 'object' && lat?.value !== undefined) lat = lat.value;
  if (typeof lon === 'object' && lon?.value !== undefined) lon = lon.value;
  
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    console.warn(
      "[drawPositionDot] Skipping feature with invalid coordinates:",
      lat,
      lon
    );
    return;
  }
  
  console.log("[drawPositionDot] lat:", lat, "lon:", lon, "vectorSource:", vectorSource);
  
  // Ensure vector source exists
  if (!vectorSource) {
    console.error("[drawPositionDot] Vector source is null or undefined");
    ensureVectorSourceAndLayer();
    if (!vectorSource) return;
  }
  
  // Make sure the vector layer is added to the map
  if (map.value && vectorLayer && !map.value.getLayers().getArray().includes(vectorLayer)) {
    map.value.addLayer(vectorLayer);
    console.log("%c ADDING VECTOR LAYER TO MAP", "background: purple; color: white; font-size: 16px;");
  }
  
  const coords = fromLonLat([lon, lat]);
  console.log("[drawPositionDot] Transformed coords:", coords);
  
  // Create a visually appealing boat style
  const boatStyle = new Style({
    image: new CircleStyle({
      radius: 8, // Reasonable size for normal use
      fill: new Fill({ color: "#2196f3" }), // Blue
      stroke: new Stroke({ color: "#ffffff", width: 3 }), // White border
    }),
    zIndex: 100, // Ensure it's on top of other features
  });
  
  // Create a direct feature without using the boatFeature variable
  const newBoatFeature = new Feature({
    geometry: new Point(coords),
    name: 'boat-position-direct',
  });
  
  // Apply the style directly
  newBoatFeature.setStyle(boatStyle);
  
  // Only remove the existing boat feature, not all features
  if (vectorSource) {
    // Find and remove only the boat position feature
    const existingBoatFeatures = vectorSource.getFeatures()
      .filter(f => f.get('name') === 'boat-position-direct');
    
    existingBoatFeatures.forEach(f => vectorSource.removeFeature(f));
    vectorSource.addFeature(newBoatFeature);
    
    // Don't force a complete redraw during normal operations
    // This prevents the marker from disappearing during zoom
    if (map.value && animate) {
      // Only render if animation is explicitly requested
      map.value.render();
    }
  }
  
  // Store the new feature as the boatFeature for future reference
  boatFeature = newBoatFeature;
}

function drawAnchorDropLocationDot(lat, lon) {
  // Handle proxy objects from Pinia store
  if (typeof lat === 'object' && lat?.value !== undefined) lat = lat.value;
  if (typeof lon === 'object' && lon?.value !== undefined) lon = lon.value;
  
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    console.warn(
      "[drawAnchorDropLocationDot] Skipping feature with invalid coordinates:",
      lat,
      lon
    );
    return;
  }
  console.log("[drawAnchorDropLocationDot] lat:", lat, "lon:", lon);
  const feature = new Feature({
    geometry: new Point(fromLonLat([lon, lat])),
  });
  feature.setStyle(
    new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: "#43a047" }), // Green
        stroke: new Stroke({ color: "#fff", width: 2 }),
      }),
    })
  );
  vectorSource.addFeature(feature);
  console.log("[drawAnchorDropLocationDot] Added feature:", feature);
  console.log(
    "[drawAnchorDropLocationDot] vectorSource feature count:",
    vectorSource.getFeatures().length
  );
}

function drawAnchorLocationDot(lat, lon) {
  // Handle proxy objects from Pinia store
  if (typeof lat === 'object' && lat?.value !== undefined) lat = lat.value;
  if (typeof lon === 'object' && lon?.value !== undefined) lon = lon.value;
  
  console.log(
    "[drawAnchorLocationDot] lat:",
    lat,
    "lon:",
    lon,
    "vectorSource:",
    vectorSource
  );
  
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    console.warn(
      "[drawAnchorLocationDot] Skipping feature with invalid coordinates:",
      lat,
      lon
    );
    return;
  }
  
  // CURRENT ANCHOR LOCATION: Yellow dot
  const feature = new Feature({
    geometry: new Point(fromLonLat([lon, lat])),
  });
  feature.setStyle(
    new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: "#ffd600" }), // Yellow
        stroke: new Stroke({ color: "#fff", width: 2 }),
      }),
    })
  );
  vectorSource.addFeature(feature);
  console.log("[drawAnchorLocationDot] Added feature:", feature);
  console.log(
    "[drawAnchorLocationDot] vectorSource feature count:",
    vectorSource.getFeatures().length
  );
}

// Draw the anchor (orange) circle at a given lat/lon
function drawAnchorCircle(lat, lon, diameter, units = "meters") {
  drawCircleOnMap(lat, lon, diameter, units, {
    strokeColor: "orange",
    fillColor: "rgba(255,140,0,0.1)",
  });
}
// Draw a debug marker at the original position
function addDebugMarkers() {
  const originalPos = navigationState.value?.originalPosition;
  if (originalPos && originalPos.latitude && originalPos.longitude) {
    const feature = new Feature({
      geometry: new Point(fromLonLat([originalPos.longitude, originalPos.latitude])),
    });
    feature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: "red" }),
        }),
      })
    );
    vectorSource.addFeature(feature);
  }
}

// Draw a breadcrumb at a given lat/lon with a given radius and color
function addBreadcrumb(lon, lat, styleOpts = {}) {
  console.log("[addBreadcrumb] lat:", lat, "lon:", lon);
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    console.warn(
      "[addBreadcrumb] Skipping breadcrumb with invalid coordinates:",
      lat,
      lon
    );
    return;
  }
  console.log("[addBreadcrumb] lat:", lat, "lon:", lon);
  console.log("[addBreadcrumb] lon:", lon, "lat:", lat, "vectorSource:", vectorSource);
  const breadcrumb = new Feature({
    geometry: new Point(fromLonLat([lon, lat])),
  });
  breadcrumb.setStyle(
    new Style({
      image: new CircleStyle({
        radius: styleOpts.radius || 3,
        fill: new Fill({ color: styleOpts.fillColor || "white" }),
        stroke: new Stroke({
          color: styleOpts.strokeColor || "#888",
          width: styleOpts.strokeWidth || 1,
        }),
      }),
    })
  );
  vectorSource.addFeature(breadcrumb);
  console.log("[addBreadcrumb] Added breadcrumb feature:", breadcrumb);
  console.log(
    "[addBreadcrumb] vectorSource feature count:",
    vectorSource.getFeatures().length
  );
}

function drawCircleOnMap(lat, lon, radiusMeters, units = "meters", styleOpts = {}) {
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    console.warn("[drawCircleOnMap] Skipping circle with invalid coordinates:", lat, lon);
    return;
  }
  console.log(
    "[drawCircleOnMap] lat:",
    lat,
    "lon:",
    lon,
    "radius:",
    radiusMeters,
    "units:",
    units
  );
  console.log(
    "[drawCircleOnMap] lat:",
    lat,
    "lon:",
    lon,
    "radiusMeters:",
    radiusMeters,
    "vectorSource:",
    vectorSource
  );
  // Remove old anchor circle(s) first
  const featuresToRemove = vectorSource
    .getFeatures()
    .filter((f) => f.get("type") === "anchorCircle");
  featuresToRemove.forEach((f) => vectorSource.removeFeature(f));
  if (units === "feet") radiusMeters = diameter * 0.3048;

  // Geodesic circle as polygon
  const circlePoints = [];
  for (let i = 0; i <= 360; i += 5) {
    const dest = calculateDestinationLatLon(lat, lon, radiusMeters, i);
    circlePoints.push(fromLonLat([dest.longitude, dest.latitude]));
  }
  const circleFeature = new Feature({
    geometry: new Polygon([circlePoints]),
  });
  circleFeature.set("type", "anchorCircle");
  circleFeature.setStyle(
    new Style({
      stroke: new Stroke({ color: styleOpts.strokeColor || "#2196f3", width: 2 }),
      fill: new Fill({ color: styleOpts.fillColor || "rgba(33,150,243,0.1)" }),
    })
  );
  vectorSource.addFeature(circleFeature);
  console.log("[drawCircleOnMap] Added anchorCircle feature:", circleFeature);
  console.log(
    "[drawCircleOnMap] vectorSource feature count:",
    vectorSource.getFeatures().length
  );

  // Debug logging
  if (navigationState.value?.position) {
    const navPos = navigationState.value.position;
    const bearing = calculateBearing(lat, lon, navPos.latitude, navPos.longitude);
    // console.log('[drawCircleOnMap] Center:', lat, lon, 'Radius:', radiusMeters, 'm', 'Bearing to position:', bearing.toFixed(2));
  }
}

// Helper: Calculate initial bearing from (lat1, lon1) to (lat2, lon2)
function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180,
    φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let θ = Math.atan2(y, x);
  θ = (θ * 180) / Math.PI;
  return (θ + 360) % 360;
}

function drawRodeLine(fromLat, fromLon, toLat, toLon) {
  // Handle proxy objects from Pinia store
  if (typeof fromLat === 'object' && fromLat?.value !== undefined) fromLat = fromLat.value;
  if (typeof fromLon === 'object' && fromLon?.value !== undefined) fromLon = fromLon.value;
  if (typeof toLat === 'object' && toLat?.value !== undefined) toLat = toLat.value;
  if (typeof toLon === 'object' && toLon?.value !== undefined) toLon = toLon.value;
  
  if (
    fromLat == null ||
    fromLon == null ||
    toLat == null ||
    toLon == null ||
    isNaN(fromLat) ||
    isNaN(fromLon) ||
    isNaN(toLat) ||
    isNaN(toLon)
  ) {
    console.warn(
      "[drawRodeLine] Skipping line with invalid coordinates:",
      fromLat,
      fromLon,
      toLat,
      toLon
    );
    return;
  }
  console.log(
    "[drawRodeLine] fromLat:",
    fromLat,
    "fromLon:",
    fromLon,
    "toLat:",
    toLat,
    "toLon:",
    toLon
  );
  console.log(
    "[drawRodeLine] fromLat:",
    fromLat,
    "fromLon:",
    fromLon,
    "toLat:",
    toLat,
    "toLon:",
    toLon,
    "vectorSource:",
    vectorSource
  );
  // Remove old rode lines first
  const featuresToRemove = vectorSource
    .getFeatures()
    .filter((f) => f.get("type") === "rodeLine");
  featuresToRemove.forEach((f) => vectorSource.removeFeature(f));

  const line = new Feature({
    geometry: new LineString([
      fromLonLat([fromLon, fromLat]),
      fromLonLat([toLon, toLat]),
    ]),
  });
  line.set("type", "rodeLine");
  line.setStyle(
    new Style({
      stroke: new Stroke({ color: "#FFA500", width: 4, lineDash: [8, 8] }), // orange, dashed
    })
  );
  vectorSource.addFeature(line);
  console.log("[drawRodeLine] Added rodeLine feature:", line);
  console.log(
    "[drawRodeLine] vectorSource feature count:",
    vectorSource.getFeatures().length
  );
}

function addFeatures() {
  console.log("[addFeatures] vectorSource:", vectorSource);
  console.log("[addFeatures] navigationState:", navigationState.value);
  console.log("[addFeatures] anchorState:", anchorState.value);
  
  // Ensure vector source and layer exist
  if (!vectorSource || !vectorLayer) {
    console.warn("[addFeatures] Vector source or layer missing, reinitializing");
    ensureVectorSourceAndLayer();
    
    // Make sure the vector layer is added to the map
    if (map.value && vectorLayer && !map.value.getLayers().getArray().includes(vectorLayer)) {
      map.value.addLayer(vectorLayer);
      console.log("[addFeatures] Added vectorLayer to map");
    }
  }
  
  // CLEAR ALL old features before adding new ones
  if (vectorSource && typeof vectorSource.clear === "function") {
    vectorSource.clear();
    console.log("[addFeatures] vectorSource cleared");
  }
  try {
    // Draw debug markers for original position
    addDebugMarkers();
    // Debug logging
    const navPos = navigationState.value?.position;
    const anchorLoc = anchorState.value?.anchorLocation;
    const drop = anchorState.value?.anchorDropLocation;
    console.log("[addFeatures] navPos:", navPos);
    console.log("[addFeatures] anchorLoc:", anchorLoc);
    console.log("[addFeatures] drop:", drop);
    // Blue dot: current location from Pinia store
    if (navPos?.longitude?.value !== undefined && navPos?.latitude?.value !== undefined) {
      drawPositionDot(navPos.latitude.value, navPos.longitude.value, true); // Animate boat
    }
    // Green dot: anchor drop location
    if (drop && drop.latitude && drop.longitude) {
      // Access latitude and longitude correctly based on the actual structure
      const dropLat = typeof drop.latitude === 'object' ? drop.latitude.value : drop.latitude;
      const dropLon = typeof drop.longitude === 'object' ? drop.longitude.value : drop.longitude;
      
      drawAnchorDropLocationDot(dropLat, dropLon);
      
      // Use criticalRange.r as the only source of truth for the alarm circle radius
      const radiusMeters =
        anchorState.value.criticalRange &&
        typeof anchorState.value.criticalRange.r === "number"
          ? anchorState.value.criticalRange.r
          : 0;
      
      drawCircleOnMap(dropLat, dropLon, radiusMeters, "meters", {
        strokeColor: "#2196f3",
        fillColor: "rgba(33,150,243,0.1)",
      });
    }
    // Draw AISTargets (yellow, clickable)
    AISTargets.value.forEach((target, idx) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([target.lon, target.lat])),
        targetIdx: idx, // store index for click lookup
      });
      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: "yellow" }),
            stroke: new Stroke({ color: "#222", width: 2 }),
          }),
        })
      );
      vectorSource.addFeature(feature);
      console.log("[addFeatures] Added AISTarget feature:", feature);
      console.log(
        "[addFeatures] vectorSource feature count:",
        vectorSource.getFeatures().length
      );
    });
    // Yellow dot: anchor location from anchorState
    if (
      anchorLoc &&
      anchorLoc.position &&
      anchorLoc.position.latitude &&
      anchorLoc.position.longitude
    ) {
      // Access latitude and longitude correctly based on the actual structure
      const anchorLat = typeof anchorLoc.position.latitude === 'object' ? anchorLoc.position.latitude.value : anchorLoc.position.latitude;
      const anchorLon = typeof anchorLoc.position.longitude === 'object' ? anchorLoc.position.longitude.value : anchorLoc.position.longitude;
      drawAnchorLocationDot(anchorLat, anchorLon);
      // Draw rode (line) from current position to anchorLocation
      if (
        navPos?.latitude &&
        navPos?.longitude &&
        anchorLoc?.position?.latitude &&
        anchorLoc?.position?.longitude
      ) {
        // Access latitude and longitude correctly for both positions
        const boatLat = typeof navPos.latitude === 'object' ? navPos.latitude.value : navPos.latitude;
        const boatLon = typeof navPos.longitude === 'object' ? navPos.longitude.value : navPos.longitude;
        const anchorLat = typeof anchorLoc.position.latitude === 'object' ? anchorLoc.position.latitude.value : anchorLoc.position.latitude;
        const anchorLon = typeof anchorLoc.position.longitude === 'object' ? anchorLoc.position.longitude.value : anchorLoc.position.longitude;
        
        drawRodeLine(
          boatLat,
          boatLon,
          anchorLat,
          anchorLon
        );
        // Calculate and log distance in feet between your position and anchor drop
        const distanceMeters = calculateDistance(
          boatLat,
          boatLon,
          anchorLat,
          anchorLon
        );
        const distanceFeet = distanceMeters / 0.3048;
        console.log(
          `[AnchorView] Distance from position to anchorLoc: ${distanceFeet.toFixed(
            2
          )} feet (${distanceMeters.toFixed(2)} meters)`
        );
      }
    } else {
      if (anchorLoc) {
        console.warn(
          "[AnchorView] anchorLocation.position is missing or incomplete:",
          anchorLoc.position
        );
      }
    }
    // Draw breadcrumbs: older = lighter
    breadcrumbs.value.forEach((crumb, idx) => {
      console.log("[addFeatures] Drawing breadcrumb:", crumb);
      // Most recent is last, oldest is first
      const age = idx / breadcrumbs.value.length;
      // Fade from blue (recent) to transparent (old)
      const alpha = 0.8 * (1 - age) + 0.1; // 0.9 (new) to 0.1 (old)
      
      // Access latitude and longitude correctly based on the actual structure
      const lat = typeof crumb.latitude === 'object' ? crumb.latitude.value : crumb.latitude;
      const lon = typeof crumb.longitude === 'object' ? crumb.longitude.value : crumb.longitude;
      
      addBreadcrumb(lon, lat, {
        fillColor: `rgba(33,150,243,${alpha})`,
        radius: 4,
        strokeColor: `rgba(33,150,243,${alpha + 0.1})`,
      });
      
    });

  } catch (e) {
    console.error("[AnchorView] Exception inside addFeatures:", e);
    console.trace();
  }
}

// Zoom functions removed - using native OpenLayers pinch-to-zoom functionality

// Helper function to get initial zoom level from localStorage or use default
function getInitialZoom() {
  try {
    // console.log('[AnchorView][getInitialZoom] Checking for saved zoom level in localStorage');
    const savedZoom = localStorage.getItem("anchorMapZoom");
    // console.log('[AnchorView][getInitialZoom] Raw saved zoom value:', savedZoom);
    
    if (savedZoom !== null) {
      const parsedZoom = Number(savedZoom);
      // console.log('[AnchorView][getInitialZoom] Parsed zoom value:', parsedZoom);
      
      // Validate zoom level is reasonable (between 5 and 19.5)
      if (!isNaN(parsedZoom) && parsedZoom >= 5 && parsedZoom <= 22) {
        // console.log(`[AnchorView][getInitialZoom] Restoring saved zoom level: ${parsedZoom}`);
        return parsedZoom;
      } else {
        // console.log(`[AnchorView] Saved zoom level out of range: ${parsedZoom}, using default`);
        localStorage.removeItem("anchorMapZoom"); // Clear invalid value
      }
    } else {
      console.log('[AnchorView] No saved zoom level found in localStorage');
    }
  } catch (error) {
    console.error('[AnchorView] Error retrieving zoom level from localStorage:', error);
  }
  
  // Default zoom level if nothing valid in localStorage
  console.log('[AnchorView] Using default zoom level: 15');
  return 15; // Default zoom level
}

// Watch anchorDropLocation, rode, and bearing to update anchorLocation
watch(
  [
    () => anchorState.value.anchorDropLocation?.position?.latitude,
    () => anchorState.value.anchorDropLocation?.position?.longitude,
    () => anchorState.value.anchorDropLocation?.originalBearing,
    () => anchorState.value.rode?.amount,
    () => anchorState.value.rode?.units,
  ],
  ([latitude, longitude, bearing, rodeAmount, rodeUnits]) => {
    console.log("[WATCHER: anchorDropLocation/rode/originalBearing] fired:", {
      latitude,
      longitude,
      bearing,
      rodeAmount,
      rodeUnits,
    });
    if (latitude && longitude) {
      // Calculate bearing from breadcrumbs if possible
      let computedBearing = anchorState.value.anchorLocation?.bearing || 0;
      if (breadcrumbs.value.length >= 2) {
        const prev = breadcrumbs.value[breadcrumbs.value.length - 2];
        const curr = breadcrumbs.value[breadcrumbs.value.length - 1];
        // Fix: use correct property names (latitude/longitude)
        computedBearing = calculateBearing(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude
        );
      }
      anchorState.value.anchorLocation = {
        ...anchorState.value.anchorLocation,
        position: {
          latitude,
          longitude,
        },
        time: Date.now(),
        distanceFromCurrentLocation: 0,
        originalBearing: bearing,
        bearing: computedBearing,
      };
    }
  },
  { immediate: true }
);

onMounted(() => {
  ensureVectorSourceAndLayer();
  
  // Request location permission on mount
  setTimeout(() => {
    // Check if we already have location data
    const pos = navigationState.value?.position;
    const hasValidPosition = 
      pos && 
      pos.latitude && 
      pos.longitude && 
      typeof pos.latitude.value === 'number' && 
      typeof pos.longitude.value === 'number' && 
      Math.abs(pos.latitude.value) > 0.0001 && 
      Math.abs(pos.longitude.value) > 0.0001;
      
    if (!hasValidPosition) {
      console.log('[AnchorView] No valid position on mount, requesting location permission');
      requestLocationPermission();
      
      // Set a timeout to check if we got location data
      setTimeout(() => {
        const newPos = navigationState.value?.position;
        const nowHasValidPosition = 
          newPos && 
          newPos.latitude && 
          newPos.longitude && 
          typeof newPos.latitude.value === 'number' && 
          typeof newPos.longitude.value === 'number' && 
          Math.abs(newPos.latitude.value) > 0.0001 && 
          Math.abs(newPos.longitude.value) > 0.0001;
          
        if (!nowHasValidPosition) {
          console.log('[AnchorView] Still no valid position after delay, marking as failed');
          locationRequestFailed.value = true;
        }
      }, 5000); // Check after 5 seconds
    }
  }, 1000); // Small delay to allow any existing location data to load
  // Defensive: remove any old map instance
  if (map.value && typeof map.value.setTarget === "function") {
    map.value.setTarget(null);
    map.value = null;
    console.log("[AnchorView] Old map instance detached");
  }

  // Always ensure the map container exists
  if (!mapElement.value) {
    console.error("[AnchorView] mapElement ref is missing!");
    return;
  }

  // Re-initialize vectorSource/layer if needed
  ensureVectorSourceAndLayer();

  // Remove all features before re-adding
  if (vectorSource && typeof vectorSource.clear === "function") {
    vectorSource.clear();
    console.log("[AnchorView] vectorSource cleared on mount");
  }

  // Compose layers: base + vector
  const layers = [new TileLayer({ source: new OSM() })];
  
  // Make sure vectorLayer exists and is properly initialized
  if (vectorLayer) {
    layers.push(vectorLayer);
    console.log("[AnchorView] vectorLayer added to layers array");
  } else {
    console.error("[AnchorView] vectorLayer is not initialized!");
    // Re-initialize if needed
    ensureVectorSourceAndLayer();
    if (vectorLayer) {
      layers.push(vectorLayer);
      console.log("[AnchorView] vectorLayer re-initialized and added to layers");
    }
  }

  // Determine map center
  let mapCenter = [0, 0];
  const pos = navigationState.value?.position;
  if (pos?.longitude?.value !== undefined && pos?.latitude?.value !== undefined) {
    mapCenter = [pos.longitude.value, pos.latitude.value];
    console.log("[AnchorView] Using Pinia position for map center:", mapCenter);
  } else if (
    anchorState.value?.anchorLocation?.position?.longitude !== undefined &&
    anchorState.value?.anchorLocation?.position?.latitude !== undefined
  ) {
    mapCenter = [
      anchorState.value.anchorLocation.position.longitude,
      anchorState.value.anchorLocation.position.latitude,
    ];
    console.log("[AnchorView] Using anchorLocation.position for map center:", mapCenter);
  } else {
    console.log("[AnchorView] Using fallback [0,0] for map center");
  }

  // Create map
  map.value = new Map({
    target: mapElement.value,
    layers,
    view: new View({
      center: fromLonLat(mapCenter),
      zoom: getInitialZoom() || 18.9,
    }),
    controls: defaultControls({ zoom: false }),
  });
  console.log("[AnchorView] map created:", map.value);
  console.log(
    "[AnchorView] vectorLayer in map?",
    map.value.getLayers().getArray().includes(vectorLayer)
  );
  // --- DIAGNOSTIC LOGS ---
  if (vectorLayer) {
    console.log("[AnchorView] vectorLayer source:", vectorLayer.getSource());
    console.log(
      "[AnchorView] vectorSource === vectorLayer.getSource():",
      vectorSource === vectorLayer.getSource()
    );
  }
  if (map.value) {
    console.log("[AnchorView] map layers:", map.value.getLayers().getArray());
  }

  // Restore zoom level from localStorage
  const savedZoom = localStorage.getItem("anchorMapZoom");
  if (savedZoom && map.value && map.value.getView) {
    map.value.getView().setZoom(Number(savedZoom));
  }
  if (map.value && map.value.getView) {
    map.value.getView().on("change:resolution", () => {
      const currentZoom = map.value.getView().getZoom();
      localStorage.setItem("anchorMapZoom", currentZoom);
    });
  }

  // Remove default zoom control and add ScaleLine
  map.value.getControls().forEach((control) => {
    if (control && control.constructor && control.constructor.name === "Zoom") {
      map.value.removeControl(control);
    }
  });
  const scaleLineControl = new ScaleLine({
    units: "metric",
    bar: true,
    steps: 4,
    text: true,
  });
  map.value.addControl(scaleLineControl);

  // Always recenter map view when features are updated
  if (pos?.longitude?.value !== undefined && pos?.latitude?.value !== undefined) {
    map.value.getView().setCenter(fromLonLat([pos.longitude.value, pos.latitude.value]));
    console.log(
      "[AnchorView] map view recentered to:",
      pos.longitude.value,
      pos.latitude.value
    );
  }
  // Add features after map is ready
  nextTick(() => {
    // Ensure the map is fully rendered before adding features
    addFeatures();
    console.log("[AnchorView] Features added after nextTick");
    
    // Force refresh the map to ensure features are rendered
    if (map.value) {
      map.value.updateSize();
      console.log("[AnchorView] Map size updated");
    }
    
    // Verify features were added
    if (vectorSource) {
      console.log("[AnchorView] Feature count:", vectorSource.getFeatures().length);
      vectorSource.getFeatures().forEach(feature => {
        console.log("[AnchorView] Feature:", feature.get('name'), feature);
      });
    }
  });
  
  // Watch for position changes
  stateStore.$subscribe(() => {
    if (map.value && vectorLayer && vectorSource) {
      addFeatures();
    } else {
      console.error("[AnchorView] Map or vector components missing in subscription");
    }
  });

  // Add click handler for AIS target features
  map.value.on("singleclick", function (evt) {
    map.value.forEachFeatureAtPixel(evt.pixel, function (feature) {
      if (feature.get("targetIdx") !== undefined) {
        const idx = feature.get("targetIdx");
        const target = AISTargets.value[idx];
        if (target) {
          console.log("AISTarget clicked:", target);
        }
      }
    });
  });

  console.log("[AnchorView] onMounted complete");

  onUnmounted(() => {
    if (vectorSource && typeof vectorSource.clear === "function") {
      vectorSource.clear();
      console.log("[AnchorView] vectorSource cleared on unmount");
    }
    if (typeof boatAnimationFrameId !== "undefined" && boatAnimationFrameId) {
      cancelAnimationFrame(boatAnimationFrameId);
    }
    if (map.value && typeof map.value.setTarget === "function") {
      map.value.setTarget(null);
      map.value = null;
      console.log("[AnchorView] map instance detached on unmount");
    }
    console.trace("[AnchorView] onUnmounted called");
  });
});
// --- Watch for map disappearance and LOG if it happens (no patching) ---
// (Removed stray watcher and commented code to fix SFC parse error)
// If you need this watcher, place it INSIDE onMounted or another function, not at the root.

watch(
  () => anchorState.value.rode?.amount,
  (newRodeLength) => {
    if (newRodeLength) updateAnchorPosition();
  }
);

function updateAnchorPosition() {
  // TODO: Implement logic to update anchor/boat position based on anchor drag
  // This function should NOT update navigationState.value.position if it would cause recursion
  // Add your update logic here
}

function updateAnchorDropLocation() {
  // Update the anchor drop location. If anchor drags, user can use this location
  //  as the new drop location.
  anchorState.value.anchorDropLocation = anchorState.value.anchorLocation;
  anchorState.value.anchorDropLocation.time = Date.now();
}

// Utility to check if map is visible and log errors if not
function checkMapVisibility() {
  if (!map.value) {
    console.error("[ANCHOR MAP] Map instance is null!");
    console.trace("[AnchorView] map.value is null (checked in checkMapVisibility)");
    return false;
  }
  const el = mapElement.value;
  if (!el) {
    console.error("[ANCHOR MAP] Map DOM element is missing!");
    return false;
  }
  const style = window.getComputedStyle(el);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    el.offsetWidth === 0 ||
    el.offsetHeight === 0
  ) {
    console.error("[ANCHOR MAP] Map DOM element is not visible!");
    return false;
  }
  const canvas = el.querySelector("canvas");
  if (!canvas) {
    console.error("[ANCHOR MAP] Map canvas is missing!");
    return false;
  }
  return true;
}

// Watch for relevant state changes to update map features
watch(
  [
    () => navigationState.value.position,
    () => anchorState.value.anchorLocation,
    () => anchorState.value.anchorDropLocation,
  ],
  debounce(([pos, anchorLoc, anchorDropLoc]) => {
    console.log("[WATCHER: map features update] fired:", {
      navPos: pos,
      anchorLoc,
      anchorDropLoc,
    });
    try {
      if (map.value?.getTarget()) addFeatures();
    } catch (e) {
      console.error("[AnchorView] Exception in addFeatures:", e);
      console.trace();
    }
    checkMapVisibility();
  }, 100),
  { deep: true, immediate: true }
);

// Watch for changes to the critical radius and update the map immediately
watch(
  () =>
    anchorState.value.criticalRange &&
    typeof anchorState.value.criticalRange.r === "number"
      ? anchorState.value.criticalRange.r
      : 0,
  (newRadius) => {
    console.log("[WATCHER: criticalRange.r] fired:", newRadius);
    addFeatures();
    checkMapVisibility();
  }
);

onMounted(() => {
  // Watch for position changes to update breadcrumbs
  watch(
    () => navigationState.value?.position,
    (newPos, oldPos) => {
      if (oldPos && oldPos.latitude && oldPos.longitude) {
        // Add previous position to breadcrumbs
        // Log the structure of the position object for debugging
        console.log("[breadcrumb watcher] Adding position to breadcrumbs:", oldPos);
        breadcrumbs.value.push({
          latitude: oldPos.latitude,
          longitude: oldPos.longitude,
        });
        // Limit to 50
        if (breadcrumbs.value.length > 50) breadcrumbs.value.shift();
      }
    },
    { deep: true }
  );

  // Recenter map when current position changes
  watch(
    () => navigationState.value?.position,
    (newPos) => {
      if (map.value && newPos?.longitude && newPos?.latitude) {
        map.value.getView().setCenter(fromLonLat([newPos.longitude, newPos.latitude]));
      }
    },
    { immediate: false }
  );

  // Add click handler for AIS target features
  map.value?.on("singleclick", function (evt) {
    map.value.forEachFeatureAtPixel(evt.pixel, function (feature) {
      if (feature.get("targetIdx") !== undefined) {
        const idx = feature.get("targetIdx");
        const target = AISTargets.value[idx];
        if (target) {
          // For now, log info. Replace with navigation or event as needed.
          console.log("AISTarget clicked:", target);
        }
      }
    });
  });
  // Debug: log position from Pinia store at mount
  // console.log('[AnchorView] navigationState.position onMounted:', navigationState.value?.position);
  const pos = navigationState.value?.position;
  // Use anchorState.value.anchorLocation for fallback map center
  let mapCenter;
  if (pos?.longitude?.value !== undefined && pos?.latitude?.value !== undefined) {
    mapCenter = [pos.longitude.value, pos.latitude.value];
    console.log("[AnchorView] Using Pinia position for map center:", mapCenter);
    console.log("[AnchorView] fromLonLat result for map center:", fromLonLat(mapCenter));
  } else if (
    anchorState.value?.anchorLocation?.position?.longitude !== undefined &&
    anchorState.value?.anchorLocation?.position?.latitude !== undefined
  ) {
    mapCenter = [
      anchorState.value.anchorLocation.position.longitude,
      anchorState.value.anchorLocation.position.latitude,
    ];
    console.log("[AnchorView] Using anchorLocation.position for map center:", mapCenter);
    console.log(
      "[AnchorView] fromLonLat result for anchorLocation.position:",
      fromLonLat(mapCenter)
    );
  } else {
    mapCenter = [0, 0]; // fallback to (0,0) if nothing available
    console.log("[AnchorView] Using fallback [0,0] for map center");
  }
  // Only initialize the map if we have valid location data
  const hasValidLocation = 
    pos && 
    pos.latitude && 
    pos.longitude && 
    typeof pos.latitude.value === 'number' && 
    typeof pos.longitude.value === 'number' && 
    Math.abs(pos.latitude.value) > 0.0001 && 
    Math.abs(pos.longitude.value) > 0.0001;
  
  // Ensure we have a clean map initialization
  if (map.value && typeof map.value.setTarget === "function") {
    console.log("[AnchorView] Cleaning up existing map instance");
    map.value.setTarget(null);
    map.value = null;
  }

  if (hasValidLocation) {
    console.log("[AnchorView] Creating new map instance with valid location data");
    const initialZoom = getInitialZoom();
    console.log(`[AnchorView] Using initial zoom level: ${initialZoom}`);
    
    // Create the map with the initial zoom level
    map.value = new Map({
      target: mapElement.value,
      layers: [new TileLayer({ source: new OSM() }), vectorLayer],
      view: new View({
        center: fromLonLat([pos.longitude.value, pos.latitude.value]),
        zoom: initialZoom,
      }),
      controls: defaultControls({ zoom: false }), // Disable default zoom control
    });
  } else {
    console.log("[AnchorView] Waiting for valid location data before initializing map");
  }

  // Set up a single event listener for zoom changes only if map is initialized
  if (map.value && map.value.getView) {
    // Use a simple throttled approach instead of debounce
    let lastSaveTime = Date.now();
    map.value.getView().on("change:resolution", () => {
      const now = Date.now();
      // Only save at most once per second
      if (now - lastSaveTime > 1000) {
        const currentZoom = map.value.getView().getZoom();
        localStorage.setItem("anchorMapZoom", currentZoom.toString());
        console.log(`[AnchorView] Saved zoom level: ${currentZoom}`);
        lastSaveTime = now;
      }
    });
  }
  
  // Use a separate function to initialize the map with valid location data
  function initializeMapWithLocation(locationData) {
    if (!locationData?.longitude?.value || !locationData?.latitude?.value) {
      console.log("[AnchorView] Cannot initialize map: invalid location data", locationData);
      return;
    }
    
    // Clean up any existing map
    if (map.value && typeof map.value.setTarget === "function") {
      map.value.setTarget(null);
      map.value = null;
    }
    
    const mapCenterFromPos = [locationData.longitude.value, locationData.latitude.value];
    const initialZoom = getInitialZoom();
    console.log(`[AnchorView] Initializing map with location: ${mapCenterFromPos} and zoom: ${initialZoom}`);
    
    map.value = new Map({
      target: mapElement.value,
      layers: [new TileLayer({ source: new OSM() }), vectorLayer],
      view: new View({
        center: fromLonLat(mapCenterFromPos),
        zoom: initialZoom,
      }),
      controls: defaultControls({ zoom: false }),
    });
    
    // Set up zoom change listener
    let lastSaveTime = Date.now();
    map.value.getView().on("change:resolution", () => {
      const now = Date.now();
      if (now - lastSaveTime > 1000) {
        const currentZoom = map.value.getView().getZoom();
        localStorage.setItem("anchorMapZoom", currentZoom.toString());
        console.log(`[AnchorView] Saved zoom level: ${currentZoom}`);
        lastSaveTime = now;
      }
    });
    
    // Add features to the map
    addFeatures();
    return true;
  }
  
  // Set up a watcher to initialize the map when location data becomes available
  watch(
    () => navigationState.value?.position,
    (newPos) => {
      if (!map.value && newPos?.longitude?.value && newPos?.latitude?.value) {
        console.log("[AnchorView] Location data available, initializing map");
        initializeMapWithLocation(newPos);
      }
    },
    { immediate: true }
  );

  // Always recenter map view when features are updated
  if (pos?.longitude?.value !== undefined && pos?.latitude?.value !== undefined) {
    map.value.getView().setCenter(fromLonLat([pos.longitude.value, pos.latitude.value]));
    console.log(
      "[AnchorView] map view recentered to:",
      pos.longitude.value,
      pos.latitude.value
    );
  }
  addFeatures();
  // Watch for position changes
  stateStore.$subscribe(() => addFeatures());
});
</script>

<style scoped>
.anchor-fab-container {
  position: absolute;
  left: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
  pointer-events: auto;
}
</style>

<style scoped>
.openlayers-map {
  width: 100vw;
  height: 100vh;
  min-height: 0;
}
.map-wrapper {
  width: 100vw;
  height: 100vh;
  min-height: 0;
  position: relative;
  top: 0;
  left: 0;
  z-index: 1;
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
