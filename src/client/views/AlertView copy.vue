<template>
  <ion-page class="page-container">
    <!-- Loading overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <ion-spinner></ion-spinner>
      <p>Initializing navigation...</p>
    </div>

    <!-- Error message -->
    <div v-if="positionError" class="error-overlay">
      <ion-icon :icon="warning"></ion-icon>
      <p>{{ positionError }}</p>
      <ion-button @click="initializeMap()">Retry</ion-button>
    </div>

    <!-- Map container as bottom layer -->
    <div v-if="useMapBackground" class="map-wrapper">
      <div ref="mapElement" class="openlayers-map">
        <!-- Map will be initialized here via JavaScript -->
      </div>
    </div>

    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Anchor View</ion-title>
        <ion-buttons slot="start">
          <!-- <ion-back-button color="light"></ion-back-button> -->
          <ion-menu-button class="menu-icon"></ion-menu-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="toggleMapSettings()">
            <ion-icon src="/img/cog.svg" size="medium"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-modal fullscreen ref="modal" trigger="set-anchor-params">
        <ion-header :translucent="true">
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button size="small" color="medium" @click="cancelModal()"
                >Cancel</ion-button
              >
            </ion-buttons>
            <ion-title>Set Parameters</ion-title>
            <ion-buttons slot="end">
              <ion-button
                size="small"
                color="medium"
                @click="
                  confirmAnchor();
                  cancelModal();
                "
                :disabled="!hasRode || !hasRange || !originalBearing"
                >Confirm</ion-button
              >
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content fullscreen class="ion-padding">
          <div class="popover-content">
            <div class="popover-block">
              Set the range for the anchor alarm.
              <ion-range
                color="light"
                min="0"
                max="250"
                v-model="store.anchorData.criticalRange.r"
              ></ion-range>
              <div class="info-box" :class="[hasRange ? 'success' : 'warning']">
                <div class="label">Range</div>
                <ion-text class="metric label-highlight">
                  {{ store.anchorData.criticalRange.r || 0 }}</ion-text
                >
              </div>
            </div>
            <div class="popover-block">
              Set the amount of rode deployed.
              <ion-range
                color="light"
                min="0"
                max="250"
                v-model="store.anchorData.rode.amount"
              ></ion-range>
              <div class="info-box" :class="[hasRode > 0 ? 'success' : 'warning']">
                <div class="label">Rode</div>
                <ion-text class="metric label-highlight">
                  {{ store.anchorData.rode.amount || 0 }}</ion-text
                >
              </div>
            </div>
            <div class="popover-block">
              Set the bearing of the anchor.
              <ion-range
                color="light"
                min="0"
                max="359"
                v-model="originalBearing"
                @ionChange="onBearingChanged"
              ></ion-range>
              <div
                class="info-box"
                :class="[originalBearing > 0 ? 'success' : 'warning']"
              >
                <div class="label">Bearing</div>
                <ion-text class="metric label-highlight">
                  {{ bearingString }}
                  &deg;</ion-text
                >
              </div>
            </div>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Map status indicator for debugging -->
      <!-- <div class="map-status-indicator" v-if="mapStatus">{{ mapStatus }}</div> -->

      <!-- Floating zoom controls -->
      <div class="zoom-fab-container" v-if="useMapBackground">
        <ion-fab-button
          @click="safeAdjustZoom(1)"
          color="primary"
          class="custom-fab-size"
        >
          <span class="zoom-icon">+</span>
        </ion-fab-button>
        <ion-fab-button @click="adjustZoom(-1)" color="primary" class="custom-fab-size">
          <span class="zoom-icon">−</span>
        </ion-fab-button>
      </div>

      <!-- Standalone scale display with visual indicator -->
      <div class="scale-display" v-if="useMapBackground">
        <div class="scale-label">{{ currentGroundDistance }} ft</div>
        <div class="scale-bar"></div>
        <div class="screen-width">Screen: ~{{ screenWidthFt }} ft</div>
      </div>

      <!-- Map placeholder -->
      <div id="map-placeholder"></div>

      <div class="anchor-container" :class="{ 'map-background': useMapBackground }">
        <CurrentLines :current="store.anchorData.current" />

        <div class="anchor-grid-div">
          <h2 class="title-div">Not Anchored</h2>
          <div class="grid-container">
            <div class="grid-row">
              <div class="info-rect-div">
                <div class="label-div">Range</div>
                <div class="metric-div">{{ store.anchorData.criticalRange.r }}</div>
              </div>
              <div class="info-rect-div">
                <div class="label-div">Rode</div>
                <div class="metric-div">{{ store.anchorData.rode.amount }}</div>
              </div>
              <div class="info-rect-div">
                <div class="label-div">Scope</div>
                <div class="metric-div">{{ scopeString }}</div>
              </div>
            </div>
            <div class="grid-row">
              <div class="info-rect-div">
                <div class="label-div">Depth</div>
                <div class="metric-div">{{ store.anchorData.depth }}</div>
              </div>
              <div class="info-rect-div">
                <div class="label-div">Wind Speed</div>
                <div class="metric-div">{{ store.anchorData.wind.speed }}</div>
              </div>
              <div class="info-rect-div">
                <div class="label-div">Current Speed</div>
                <div class="metric-div">{{ store.anchorData.current.speed }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="svg-square-container" ref="svgContainer">
          <svg
            height="600"
            width="600"
            ref="svg"
            xmlns="http://www.w3.org/2000/svg"
            id="svg-canvas"
            class="instrument anchor-component square-svg"
            preserveAspectRatio="xMidYMid meet"
            viewBox="-5 -5 610 610"
          >
            <!-- Define filters for glow effects -->
            <defs>
              <filter id="glow-effect" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <g id="anchor-graph">
              <g class="ais-targets">
                <circle
                  v-for="(t, index) in store.anchorData.aisTargets"
                  :key="t.id"
                  :cx="t.x"
                  :cy="t.y"
                  r="4"
                  class="ais-target pulsating3"
                  :fill="aisTargetColor"
                  :stroke="primaryContrastHex"
                  stroke-width="1"
                  filter="url(#glow-effect)"
                  :id="t.id"
                  :mmsi="t.mmsi"
                  v-on:click="showAISTarget(t.mmsi)"
                ></circle>
              </g>

              <g class="anchor-area">
                <g id="breadcrumbs">
                  <circle
                    v-for="crumb in store.anchorData.breadcrumbs"
                    :key="crumb.id"
                    :cx="crumb.position.x"
                    :cy="crumb.position.y"
                    r="2"
                    :id="crumb.id"
                    :opacity="crumb.opacity"
                    class="breadcrumb"
                    fill="white"
                    stroke="white"
                    stroke-width="0.5"
                  ></circle>
                </g>

                <circle
                  id="critical-range"
                  cx="300"
                  cy="300"
                  :r="scaledCriticalRangeR"
                  fill="transparent"
                  stroke="white"
                ></circle>

                <g id="boatGroup">
                  <line
                    id="rode"
                    :x1="store.anchorData.rode.x1"
                    :x2="store.anchorData.rode.x2"
                    :y1="store.anchorData.rode.y1"
                    :y2="store.anchorData.rode.y2"
                    stroke="white"
                    stroke-linecap="square"
                  ></line>

                  <circle
                    id="anchor"
                    :cx="store.anchorData.rode.x1"
                    :cy="store.anchorData.rode.y1"
                    r="5"
                    fill="white"
                  ></circle>

                  <circle
                    id="anchoDrop"
                    :cx="store.anchorData.anchorDropLocation.x"
                    :cy="store.anchorData.anchorDropLocation.y"
                    r="5"
                    :fill="complementaryColor"
                  ></circle>

                  <circle
                    id="boat"
                    :cx="store.anchorData.rode.x2"
                    :cy="store.anchorData.rode.y2"
                    r="8"
                    :fill="hexToRgba(complementaryColor, 0.8)"
                    :stroke="primaryContrastHex"
                    stroke-width="1.5"
                    class="pulsating"
                  ></circle>
                </g>

                <g
                  id="compass-group"
                  :style="`transform-origin: ${
                    store.anchorData?.criticalRange?.x ?? 300
                  }px ${store.anchorData?.criticalRange?.y ?? 300}px;`"
                >
                  <circle
                    id="compass"
                    class="compass"
                    :cx="store.anchorData?.criticalRange?.x ?? 300"
                    :cy="store.anchorData?.criticalRange?.y ?? 300"
                    :r="compassR"
                    :fill="hexToRgba(primaryColor, 0.15)"
                    :stroke="complementaryColor"
                    stroke-width="1"
                    @click="setClickAngle"
                  ></circle>
                  <text
                    v-for="d in deg_markers"
                    :key="d.lbl"
                    class="compass-label"
                    :class="[
                      ['N', 'S', 'E', 'W'].includes(d.lbl) ? 'north' : '',
                      store.anchorData?.criticalRange?.r <= 0 ? 'hidden' : '',
                    ]"
                    :transform="`rotate(${d.value})`"
                    :x="store.anchorData?.criticalRange?.x ?? 300"
                    :y="(store.anchorData?.criticalRange?.y ?? 300) - compassR + 6"
                  >
                    {{ d.lbl }}
                  </text>
                </g>
                <text
                  id="wind-direction"
                  dominant-baseline="bottom"
                  text-anchor="end"
                  :x="store.anchorData?.criticalRange?.x ?? 300"
                  :y="(store.anchorData?.criticalRange?.y ?? 300) - compassR + 6"
                >
                  ^
                </text>
                <g class="ais-targets" id="ais-targets">
                  <circle
                    v-for="(t, index) in store.anchorData.aisTargets"
                    :key="t.id"
                    :cx="t.x"
                    :cy="t.y"
                    r="4"
                    class="ais-target pulsating3"
                    :fill="aisTargetColor"
                    :stroke="primaryContrastHex"
                    stroke-width="1"
                    filter="url(#glow-effect)"
                    :id="t.id"
                    :mmsi="t.mmsi"
                    v-on:click="showAISTarget(t.mmsi)"
                  ></circle>
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </ion-content>
    <!-- Floating action buttons on the left side instead of footer buttons -->
    <div class="anchor-fab-container" v-if="useMapBackground">
      <ion-fab-button id="set-anchor-params" color="primary" class="custom-fab-size">
        <img
          src="/img/anchor.svg"
          alt="Anchor"
          style="width: 30px; height: 30px; filter: brightness(0) invert(1)"
        />
      </ion-fab-button>
      <ion-fab-button
        id="present-alert"
        color="primary"
        class="custom-fab-size"
        :disabled="!store.anchorData.anchorDeployed"
      >
        <span class="zoom-icon">×</span>
      </ion-fab-button>
    </div>

    <!-- Alert for cancel anchor action -->
    <ion-alert
      trigger="present-alert"
      header="Cancel Anchor?"
      :buttons="alertButtons"
    ></ion-alert>
  </ion-page>
</template>

<script setup>
import {
  computed,
  watch,
  watchEffect,
  onMounted,
  onUnmounted,
  onBeforeUnmount,
  ref,
  useTemplateRef,
  nextTick,
} from "vue";
import { range } from "lodash";
import { storeToRefs } from "pinia";
// import { useRouter } from "vue-router";
// import Config from "@/config/config";
import { useAnchorStore } from "@/stores/anchor.js";
import { useNavData } from "@/stores/navigation.js";
// import { useViewStore } from "@/stores/view.js";
import { useSignalKStore } from "@/stores/signalk";
import { calculateMapDistance, formatDistance } from "@/utils/mapUtils";
// import { latLonToFeet, feetToLatLon } from "@/util/distance";
import {
  getComplementaryColor,
  adjustBrightness,
  hexToRgba,
  rgbToHex,
  generateColorScheme,
  getHighContrastColor,
} from "@/util/colors";
import CurrentLines from "@/components/CurrentLines.vue";

// Import OpenLayers directly
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Circle as CircleStyle, Fill, Stroke } from "ol/style";
import { fromLonLat } from "ol/proj";
import ScaleLine from "ol/control/ScaleLine";
import Zoom from "ol/control/Zoom";

import {
  IonButton,
  IonButtons,
  IonFabButton,
  IonToolbar,
  IonModal,
  IonRange,
  IonMenuButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonAlert,
  IonText,
  IonIcon,
  IonSpinner,
} from "@ionic/vue";

// initialize the anchor store
const store = useAnchorStore();
const { anchorData } = storeToRefs(store);

const signalKStore = useSignalKStore();

const setAnchorFlag = ref(false);

// const modal = ref(null);

// Map references and settings
let map = null;
let vectorSource = null;
let vectorLayer = null;
let positionFeature = null;
let scaleLineControl = null;
let isInitializingMap = false;

const mapStatus = ref("Initializing map...");
const isLoading = ref(true);
const positionError = ref(null);
const hasValidPosition = ref(false);
let resizeObserver = null;

// Function to get map background state from localStorage
function getStoredMapBackgroundState() {
  const storedValue = localStorage.getItem("anchorViewUseMapBackground");
  console.log(`Retrieved from localStorage: anchorViewUseMapBackground=${storedValue}`);
  return storedValue === null ? true : storedValue === "true";
}

// Initialize map background state from localStorage, default to true if not set
const useMapBackground = ref(getStoredMapBackgroundState());

// Dark mode states
const preferSystemColorScheme = ref(
  localStorage.getItem("preferSystemColorScheme") === "true"
);
const systemIsDarkMode = ref(
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
);
const isDarkMode = ref(
  preferSystemColorScheme.value
    ? systemIsDarkMode.value
    : localStorage.getItem("mapDarkMode") === "true"
);

// OpenLayers map properties
const center = ref([0, 0]);
const currentZoom = ref(parseInt(localStorage.getItem("mapZoom") || "14"));
// const projection = ref("EPSG:4326");
const mapPosition = ref(null);
const mapElement = ref(null);
const viewRef = ref(null);
// Initialize with a reasonable default based on default zoom level instead of 'Unknown'
// const currentScaleText = ref("80 ft"); // Default for zoom level 14
// const screenWidthText = ref("~500 ft"); // Default screen width estimate
const useDeviceGPS = ref(localStorage.getItem("anchorViewUseDeviceGPS") !== "false");
const isTrackingBoat = ref(true);
const osmMapUrl = ref("");

// Map offset controls for manual adjustment
// Load previous offsets from localStorage if available
const mapOffsetX = ref(parseInt(localStorage.getItem("mapOffsetX") || "0"));
const mapOffsetY = ref(parseInt(localStorage.getItem("mapOffsetY") || "0"));
// const offsetStep = 5; // Amount to adjust by each click (smaller for finer control)

// Geolocation watch ID reference
const positionWatchId = ref(null);

// Function to apply dark mode to the map based on current state
function applyMapDarkMode() {
  if (!map) return;

  // Get the canvas element
  const mapCanvas = mapElement.value.querySelector("canvas");
  if (!mapCanvas) return;

  if (isDarkMode.value) {
    // Apply dark mode filter
    mapCanvas.style.filter = "invert(100%) hue-rotate(180deg)";
  } else {
    // Remove filter
    mapCanvas.style.filter = "none";
  }
}

// Listen for system color scheme changes
onMounted(() => {
  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

  // Define the handler function
  const handleColorSchemeChange = (e) => {
    systemIsDarkMode.value = e.matches;

    // Only update if user prefers to use system setting
    if (preferSystemColorScheme.value) {
      isDarkMode.value = systemIsDarkMode.value;
      applyMapDarkMode();
    }
  };

  // Add the event listener
  if (colorSchemeQuery.addEventListener) {
    colorSchemeQuery.addEventListener("change", handleColorSchemeChange);
  } else if (colorSchemeQuery.addListener) {
    // For older browsers
    colorSchemeQuery.addListener(handleColorSchemeChange);
  }

  // Clean up on component unmount
  onUnmounted(() => {
    if (colorSchemeQuery.removeEventListener) {
      colorSchemeQuery.removeEventListener("change", handleColorSchemeChange);
    } else if (colorSchemeQuery.removeListener) {
      colorSchemeQuery.removeListener(handleColorSchemeChange);
    }
  });
});

/**
 * Watch for position changes
 */

// Helper function to check position validity
const isValidPosition = (pos) => {
  return (
    pos &&
    typeof pos.latitude === "number" &&
    typeof pos.longitude === "number" &&
    pos.latitude !== 0 &&
    pos.longitude !== 0
  );
};

watch(
  () => signalKStore.navigation.position,
  async (newPosition) => {
    if (!isValidPosition(newPosition)) return;

    hasValidPosition.value = true;
    positionError.value = null;

    if (!useMapBackground.value) {
      isLoading.value = false;
      return;
    }

    try {
      if (!map && !isInitializingMap) {
        await initializeMap(newPosition);
      } else if (map) {
        const coordinates = [newPosition.longitude, newPosition.latitude];
        updatePositionMarker(coordinates);
        map.getView().setCenter(fromLonLat(coordinates));
      }
    } catch (error) {
      console.error("Position update failed:", error);
    }
  },
  { immediate: true }
);

// We'll use onMounted to initialize the map when the component is mounted
onMounted(() => {
  console.log("Map component mounted");
  mapStatus.value = "Map mounted successfully";

  // Force an update of the scale control after the map is mounted
  nextTick(() => {
    if (mapElement.value) {
      updateScaleControl();
    }
  });
});

// Helper function to get the OpenLayers view object safely
function getOLView() {
  console.log("Attempting to get OpenLayers view object...");

  if (!viewRef.value) {
    console.log("viewRef is not available");
    return null;
  }

  if (!mapElement.value) {
    console.log("mapElement is not available");
    return null;
  }

  try {
    // Log all available properties for debugging
    console.log(
      "viewRef available properties:",
      Object.getOwnPropertyNames(viewRef.value).join(", ")
    );
    console.log(
      "mapElement available properties:",
      Object.getOwnPropertyNames(mapElement.value).join(", ")
    );

    // Try to access the map instance directly
    if (mapElement.value.map) {
      console.log("Found map via mapElement.map");
      map = mapElement.value.map;

      // If we have the map, try to get its view
      if (map.getView) {
        console.log("Found view via map.getView()");
        return map.getView();
      }
    }

    // For vue3-openlayers, the OpenLayers objects are often stored in properties with specific naming patterns

    // 1. Try direct access via viewRef
    if (viewRef.value.$ol_view) {
      console.log("Found view via $ol_view");
      return viewRef.value.$ol_view;
    }

    // 2. Try accessing through the map's getView method
    if (mapElement.value.$ol_map && mapElement.value.$ol_map.getView) {
      console.log("Found view via map.getView()");
      return mapElement.value.$ol_map.getView();
    }

    // 3. Check for the OL instance on the view component
    if (viewRef.value.ol) {
      console.log("Found view via viewRef.ol");
      return viewRef.value.ol;
    }

    // 4. Check if the map has an OL instance with a getView method
    if (mapElement.value.ol && mapElement.value.ol.getView) {
      console.log("Found view via mapElement.ol.getView()");
      return mapElement.value.ol.getView();
    }

    // 5. Try accessing via the map's view property
    if (mapElement.value.view) {
      console.log("Found view via map.view");
      return mapElement.value.view;
    }

    // 6. Try to get the view from the DOM
    const olViewport = document.querySelector(".ol-viewport");
    if (olViewport) {
      console.log("Found .ol-viewport in DOM");

      // The map might be stored as a property on the viewport element
      if (olViewport.map && olViewport.map.getView) {
        console.log("Found view via DOM element .ol-viewport.map");
        return olViewport.map.getView();
      }

      // Or it might be accessible via the __ol_target__ property
      if (olViewport.__ol_target__ && olViewport.__ol_target__.getView) {
        console.log("Found view via DOM element .__ol_target__");
        return olViewport.__ol_target__.getView();
      }
    }

    // 7. Try to find the map instance in the global window object (for debugging)
    if (window.olMap && window.olMap.getView) {
      console.log("Found view via window.olMap");
      return window.olMap.getView();
    }

    // If we still can't find it, log more detailed information
    console.log("viewRef value:", viewRef.value);
    console.log("mapElement value:", mapElement.value);

    if (mapElement.value.$el) {
      console.log("Map element $el available, checking for OL instances");
      const mapEl = mapElement.value.$el;
      // Check if OpenLayers stored the map instance on the DOM element
      if (mapEl.olMap) {
        console.log("Found olMap on DOM element");
        return mapEl.olMap.getView();
      }
    }

    console.error("Could not access OpenLayers view object after trying all methods");
    return null;
  } catch (error) {
    console.error("Error accessing OpenLayers view:", error);
    return null;
  }
}

// This function has been removed to ensure only real calculated scales are used

// Function to update the scale control based on current zoom level
const currentGroundDistance = ref(100); // The distance the fixed bar represents
const screenWidthFt = ref(0);

function updateScaleControl() {
  if (!map || !mapElement.value) return;

  const view = map.getView();
  const resolution = view.getResolution(); // meters/pixel
  const pixelsToMeters = resolution * 80; // 80px = our fixed bar width
  const pixelsToFeet = pixelsToMeters * 3.28084;

  currentGroundDistance.value = Math.round(pixelsToFeet);

  // Update screen width estimate
  const screenWidthPx = mapElement.value.clientWidth;
  screenWidthFt.value = Math.round(screenWidthPx * resolution * 3.28084);
}

function adjustZoom(delta) {
  if (!map) return;

  try {
    const view = map.getView();
    const current = view.getZoom();
    const newZoom = Math.max(1, Math.min(22, current + delta));

    view.animate({
      zoom: newZoom,
      duration: 250,
    });

    currentZoom.value = newZoom;
    localStorage.setItem("mapZoom", newZoom.toString());
    updateScaleControl(); // This will now update the scale bar too
  } catch (error) {
    console.error("Zoom error:", error);
  }
}

function safeAdjustZoom(delta) {
  try {
    adjustZoom(delta);
  } catch (error) {
    console.error("Zoom adjustment failed:", error);
  }
}

// Save map background state to localStorage and reload the page
async function saveMapBackgroundState(newValue) {
  console.log(`Map background changed to: ${newValue}`);

  // Save to localStorage immediately
  localStorage.setItem("anchorViewUseMapBackground", newValue.toString());
  console.log(`Saved to localStorage: anchorViewUseMapBackground=${newValue}`);

  // Show a brief message to the user
  mapStatus.value = newValue ? "Enabling map..." : "Disabling map...";

  // Wait a brief moment to ensure the localStorage is updated
  setTimeout(() => {
    // Reload the page to apply changes with a fresh state
    window.location.reload();
  }, 300);
}

// Handler for GPS setting change
function onGpsSettingChanged() {
  // Save setting to localStorage
  localStorage.setItem("anchorViewUseDeviceGPS", useDeviceGPS.value.toString());

  // Setup GPS if enabled, otherwise clean up
  if (useDeviceGPS.value) {
    setupDeviceGPS();
  }
}

// Create a computed property for originalBearing
const originalBearing = ref(-1);

console.log("originalBearing", originalBearing.value);

// reference to svg
const svg = useTemplateRef("svg");
const svgContainer = useTemplateRef("svgContainer");

/* ---------------------------------------------------------------------
   parameters for animation of current lines.
   clamp the current to a range of 1 to 10
   clamt the animation range from 25 sec to 4 sec
--------------------------------------------------------------------- */
const curr_range = [1, 10];
const animation_range = [25000, 4000];

/* ---------------------------------------------------------------------
  computed values
--------------------------------------------------------------------- */

// utility to compute the radius of the compass
// helps keep the code clean and scales based on zoom level
const compassR = computed(() => {
  // Ensure we have a valid number for the radius, default to 100 if not available
  let criticalR = store.anchorData?.criticalRange?.r ?? 0;

  // If the value is unreasonably large, cap it at 250
  if (criticalR > 250) {
    console.log(
      `Critical range radius for compass is too large (${criticalR}), capping at 250`
    );
    criticalR = 250;
  }

  // Get the current zoom level
  const zoom = currentZoom.value;

  // Calculate a zoom factor - larger value at higher zoom levels (zoomed in)
  // Base scale at zoom level 15
  // Adjust the power base to provide a more gradual scaling
  const zoomFactor = Math.pow(1.1, zoom - 15);

  console.log(`Compass zoom level: ${zoom}, zoom factor: ${zoomFactor}`);

  // Apply zoom factor to the compass radius with a minimum scale factor
  // This ensures the compass doesn't get too small at high zoom levels
  const minScaleFactor = 0.5; // Minimum scale factor to prevent tiny circles
  const adjustedZoomFactor = Math.max(zoomFactor, minScaleFactor);

  console.log(`Compass zoom level: ${zoom}, zoom factor: ${adjustedZoomFactor}`);

  // Apply zoom factor to the compass radius
  // This will make the compass larger when zoomed in and smaller when zoomed out
  return (criticalR + 30) * adjustedZoomFactor;
});

// Compute the scaled critical range radius based on zoom level
const scaledCriticalRangeR = computed(() => {
  // Get the base critical range radius
  // Use nullish coalescing to ensure it defaults to 0 when null or undefined
  let criticalR = store.anchorData.criticalRange.r ?? 0;

  // If the value is unreasonably large, cap it at 250
  if (criticalR > 250) {
    console.log(`Critical range radius is too large (${criticalR}), capping at 250`);
    criticalR = 250;
  }

  // Get the current zoom level
  const zoom = currentZoom.value;

  // Calculate a zoom factor - larger value at higher zoom levels (zoomed in)
  // Base scale at zoom level 15
  // Adjust the power base to provide a more gradual scaling
  const zoomFactor = Math.pow(1.1, zoom - 15);

  // Apply zoom factor to the critical range radius with a minimum scale factor
  // This ensures the critical range doesn't get too small at high zoom levels
  const minScaleFactor = 0.5; // Minimum scale factor to prevent tiny circles
  const adjustedZoomFactor = Math.max(zoomFactor, minScaleFactor);

  console.log(`Critical range zoom level: ${zoom}, zoom factor: ${adjustedZoomFactor}`);

  // Apply zoom factor to the critical range radius
  return criticalR * adjustedZoomFactor;
});

const scopeString = computed(() => {
  if (!store.anchorData.anchorDeployed) return "--";

  return (
    (store.anchorData.rode?.length / store.anchorData.depth).toFixed(1).toString() + ":1"
  );
});

const bearingString = computed(() => {
  return Math.max(originalBearing.value, 0);
});

// utility functions to keep things tidy
const hasRode = computed(() => {
  return store.anchorData.rode.length > 0;
});

const hasRange = computed(() => {
  return store.anchorData.criticalRange.r > 0;
});

// Example of using the complementary color function
const primaryColor = computed(() => {
  // Get the primary color from CSS variables
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue("--ion-color-primary")
    .trim();
  return color.startsWith("#") ? color : `#${color}`;
});

const complementaryColor = computed(() => {
  return getComplementaryColor(primaryColor.value);
});

// Example of using rgbToHex - convert primary contrast color from RGB to Hex
const primaryContrastHex = computed(() => {
  const contrastColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--ion-color-primary-contrast")
    .trim();

  // If it's already a hex color, return it
  if (contrastColor.startsWith("#")) {
    return contrastColor;
  }

  // Otherwise, convert from RGB format
  try {
    return rgbToHex(contrastColor);
  } catch (error) {
    console.warn("Could not convert primary contrast color to hex:", error);
    return "#ffffff"; // Default to white if conversion fails
  }
});

// Generate a complete color scheme based on the primary color
const colorScheme = computed(() => {
  return generateColorScheme(primaryColor.value, {
    brightnessVariations: 2,
    brightnessStep: 0.2,
  });
});

// High contrast color for AIS targets that ensures visibility against the background
const aisTargetColor = computed(() => {
  return getHighContrastColor(primaryColor.value, {
    contrastThreshold: 5.0, // Higher threshold for better visibility
    preferBrightness: true,
    saturationBoost: 30,
  });
});

// Compass degree markers
const rpos = { 0: "N", 180: "S", 90: "E", 270: "W" };
const deg_markers = range(0, 359, 15).map((d) => {
  return { value: d, lbl: rpos[d] ?? d.toString() };
});

/* ----------------------------------------------------------------------------
   RotateTo used to rotate wind direction widget, current lines, and compass
------------------------------------------------------------------------------- */
function rotateTo(elid, deg) {
  const el = document.getElementById(elid);
  if (!el) {
    console.log("ROTATE NO ELEMENT FOUND. ID=", elid, el);
    return;
  }
  if (!deg) {
    console.log("ROTATE NO DEGREES PROVIDED. ID=", elid, deg);
    return;
  }

  // For compass-group, use setAttribute instead of animation
  if (elid === "compass-group") {
    const x = store.anchorData?.criticalRange?.x ?? 300;
    const y = store.anchorData?.criticalRange?.y ?? 300;
    el.setAttribute("transform-origin", `${x}px ${y}px`);
    el.setAttribute("transform", `rotate(${deg})`);
  } else {
    // For other elements, use animation
    el.animate([{ transform: `rotate(${deg}deg)` }], {
      duration: 500,
      iterations: 1,
      fill: "forwards",
    });
  }
}

/* ---------------------------------------------------------------------
    Mounted activities.

   TODO:
 --------------------------------------------------------------------- */
onMounted(async () => {
  // Log initial map background state
  console.log(`Initial map background state: ${useMapBackground.value}`);
  console.log(
    `localStorage value: ${localStorage.getItem("anchorViewUseMapBackground")}`
  );

  // Force save the initial state to localStorage to ensure it's set
  localStorage.setItem("anchorViewUseMapBackground", useMapBackground.value.toString());
  console.log(
    `Initialized localStorage: anchorViewUseMapBackground=${useMapBackground.value}`
  );

  /*
    In setTimeout to ensure the objects have been rendered
  */
  setTimeout(() => {
    // rotate the wind direction widget to the current wind angle
    rotateTo("wind-direction", anchorData.value.wind.angle);
  }, 100);

  // If no value is stored in localStorage, set the default value
  if (localStorage.getItem("anchorViewUseMapBackground") === null) {
    localStorage.setItem("anchorViewUseMapBackground", "true");
  }

  // Initialize map if enabled
  if (useMapBackground.value) {
    mapStatus.value = "Initializing map...";
    await initializeMap();

    // Initialize the custom scale control after map is loaded
    // Use a longer timeout to ensure the map is fully loaded
    setTimeout(() => {
      console.log("Initializing scale control after map load");
      updateScaleControl();
      // Add a second call to ensure it's visible
      setTimeout(updateScaleControl, 1000);
    }, 1000);
  }

  // Set up GPS if device GPS is enabled
  if (useDeviceGPS.value) {
    setupDeviceGPS();
  }

  // Initialize ResizeObserver to maintain square aspect ratio
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(updateSvgSize);
    if (svgContainer.value) {
      resizeObserver.observe(svgContainer.value);
    }
  }

  // Watch for changes in map background setting
  watch(useMapBackground, async (newValue) => {
    console.log(`useMapBackground watch triggered: ${newValue}`);
    await saveMapBackgroundState(newValue);
  });

  // Watch for changes in device GPS setting
  watch(useDeviceGPS, (newValue) => {
    if (newValue) {
      setupDeviceGPS();
    }
    // Save setting to localStorage
    localStorage.setItem("anchorViewUseDeviceGPS", newValue.toString());
  });

  // Watch for changes in anchor position to keep map aligned
  watch(
    () => [store.anchorData.rode.x1, store.anchorData.rode.y1],
    () => {
      if (useMapBackground.value && mapPosition.value) {
        nextTick(() => {
          alignMapWithAnchorCircle();
        });
      }
    }
  );

  // Also update on window resize as a fallback
  window.addEventListener("resize", updateSvgSize);
});

onUnmounted(() => {
  // Clean up ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  // Clean up map resources
  destroyMap();

  // Remove event listener
  window.removeEventListener("resize", updateSvgSize);
});

// Clean up before unmounting
onBeforeUnmount(() => {
  destroyMap();
});

// Function to initialize OpenLayers map directly
async function initializeMap() {
  // Don't initialize if map is disabled
  if (!useMapBackground.value) return;

  mapStatus.value = "Acquiring GPS position...";
  isInitializingMap = true;

  try {
    // Get current position from anchor store
    // const position = await store.currentPosition();
    let position = signalKStore.navigation.position;
    const hasRealPosition = position?.latitude && position?.longitude;

    if (!hasRealPosition) {
      position = { latitude: 0, longitude: 0 }; // Default position
      mapStatus.value = "Map ready - waiting for GPS...";
    }

    // Load the saved zoom level or use a default
    const savedZoom = localStorage.getItem("mapZoom");
    currentZoom.value = savedZoom ? parseInt(savedZoom) : 14;

    // Set the center coordinates for the map
    const coordinates = [position.longitude, position.latitude];
    center.value = coordinates;

    // Create vector source and layer for position marker
    vectorSource = new VectorSource();
    vectorLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 10, // Ensure it's above the base map
    });

    // Create position feature with styling
    positionFeature = new Feature();
    positionFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({
            color: "rgb(0, 120, 255)",
          }),
          stroke: new Stroke({
            color: "#ffffff",
            width: 2,
          }),
        }),
      })
    );
    vectorSource.addFeature(positionFeature);

    // Update position marker
    updatePositionMarker(coordinates);

    // Create scale line control
    scaleLineControl = new ScaleLine({
      units: "imperial",
      bar: true,
      steps: 4,
      minWidth: 140,
    });

    // Initialize the map with OpenLayers
    map = new Map({
      target: mapElement.value,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
      ],
      controls: [scaleLineControl, new Zoom()],
      view: new View({
        center: fromLonLat(center.value),
        zoom: currentZoom.value,
        projection: "EPSG:3857",
      }),
    });

    // Apply dark mode if enabled
    nextTick(() => {
      applyMapDarkMode();
    });

    //zoom event listsener
    map.getView().on("change:resolution", () => {
      const zoom = Math.round(map.getView().getZoom() * 100) / 100; // Round to 2 decimal places
      currentZoom.value = zoom;
      localStorage.setItem("mapZoom", zoom.toString());
      updateScaleControl();
    });

    console.log(
      `Map initialized with center: [${coordinates[0]}, ${coordinates[1]}], zoom: ${currentZoom.value}`
    );

    // Start watching position for updates
    startWatchingPosition();

    // Wait for the next tick to ensure the map is properly initialized
    nextTick(() => {
      // Align map with anchor circle after a short delay
      setTimeout(() => {
        alignMapWithAnchorCircle();
        applyMapDarkMode();
        mapStatus.value = "Map ready";
      }, 500);
    });

    // After successful initialization
    isLoading.value = false;
  } catch (error) {
    console.error("Map initialization failed:", error);
    mapStatus.value = "Map initialization failed";
  }
}

// Update boat position on the static map
function updateStaticMapBoatPosition(location) {
  if (!location || !location.latitude || !location.longitude) return;

  // Update CSS variable for boat marker position
  // This positions it on the static map image at the right coordinates
  document.documentElement.style.setProperty("--boat-marker-left", "50%");
  document.documentElement.style.setProperty("--boat-marker-top", "50%");

  console.log("Static map boat position updated", location.latitude, location.longitude);
}

// Function to clean up map resources
function destroyMap() {
  console.log("Cleaning up map resources");

  // Stop watching position
  if (positionWatchId.value) {
    // No longer needed since we're using anchor store position
    positionWatchId.value = null;
  }

  // Destroy map if it exists
  if (map) {
    map.setTarget(null);
    map = null;
  }

  // Clear references
  vectorSource = null;
  vectorLayer = null;
  positionFeature = null;
  scaleLineControl = null;

  // Reset the map URL
  osmMapUrl.value = "";
  mapStatus.value = "Map destroyed";
}

// Function to align the map with the anchor circle
function alignMapWithAnchorCircle() {
  // If alignment is already in progress, don't start another one
  if (window.mapAlignmentInProgress && window.mapAlignmentInProgress !== true) {
    console.log("Map alignment already in progress, skipping");
    return;
  }

  try {
    console.log("Map alignment started");

    // 1. Get the anchor circle element
    const anchorCircle = document.getElementById("anchor");
    if (!anchorCircle) {
      console.error("Anchor circle not found");
      return;
    }

    // 2. Get the blue dot element (the position marker)
    // It's inside the OpenLayers map as a canvas element
    const mapContainer = document.querySelector(".openlayers-map");
    if (!mapContainer) {
      console.error("Map container not found");
      return;
    }

    // Make sure the map is large enough to avoid borders BEFORE calculating positions
    // This prevents any resizing from affecting our calculations
    mapContainer.style.width = "200%";
    mapContainer.style.height = "200%";
    mapContainer.style.top = "-50%";
    mapContainer.style.left = "-50%";

    // Force a small delay to ensure the size changes take effect
    setTimeout(() => {
      // 3. Calculate the position of the anchor circle on the page
      const anchorRect = anchorCircle.getBoundingClientRect();
      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      const anchorCenterY = anchorRect.top + anchorRect.height / 2;
      console.log(`Anchor circle center: (${anchorCenterX}, ${anchorCenterY})`);

      // 4. Find the blue dot position (it's in the center of the viewport)
      // In vue3-openlayers, the viewport might have a different class or structure
      // Try multiple possible selectors
      let viewport = document.querySelector(".ol-viewport");

      // If not found, try alternative selectors
      if (!viewport) {
        viewport =
          document.querySelector(".ol-map") ||
          document.querySelector(".openlayers-map canvas") ||
          mapContainer;

        console.log("Using alternative map container as viewport");
      }

      // If we still can't find anything suitable, use the map container itself
      if (!viewport) {
        console.error("Map viewport not found, using map container as fallback");
        viewport = mapContainer;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const blueDotX = viewportRect.left + viewportRect.width / 2;
      const blueDotY = viewportRect.top + viewportRect.height / 2;
      console.log(`Blue dot position: (${blueDotX}, ${blueDotY})`);

      // 5. Calculate how much the blue dot needs to move
      const moveX = anchorCenterX - blueDotX;
      const moveY = anchorCenterY - blueDotY;
      console.log(`Need to move blue dot: (${moveX}, ${moveY})`);

      // 6. Apply the movement to the map container
      // We need to move the map in the opposite direction of how we want the blue dot to move
      // Add any manual adjustments from the user
      const translateX = moveX + mapOffsetX.value;
      const translateY = moveY + mapOffsetY.value;

      // Apply the transform directly to the map container with a transition
      // The transition makes the movement smooth
      mapContainer.style.transition = "transform 0.5s ease-out";
      mapContainer.style.transform = `translate(${translateX}px, ${translateY}px)`;
      console.log(`Applied transform: translate(${translateX}px, ${translateY}px)`);

      // 7. Force a redraw
      try {
        if (viewRef.value && typeof viewRef.value.changed === "function") {
          viewRef.value.changed();
        }
      } catch (e) {
        console.log("Error during map redraw:", e);
      }

      // 8. Save the current offsets to localStorage for persistence
      localStorage.setItem("mapOffsetX", mapOffsetX.value.toString());
      localStorage.setItem("mapOffsetY", mapOffsetY.value.toString());
    }, 50);
  } catch (error) {
    console.error("Error aligning map with anchor:", error);
  }
}

// Function to update the position marker on the map
function updatePositionMarker(coordinates) {
  if (!vectorSource || !positionFeature) return;

  vectorSource.clear();
  positionFeature.setGeometry(new Point(fromLonLat(coordinates)));
  vectorSource.addFeature(positionFeature);
}

// Function to start watching the device position
function startWatchingPosition() {
  if (!map || !positionFeature) return;

  // Update position marker when store position changes
  watch(
    () => store.anchorData.position,
    (newPosition) => {
      if (newPosition && newPosition.latitude && newPosition.longitude) {
        const coordinates = [newPosition.longitude, newPosition.latitude];
        updatePositionMarker(coordinates);

        // Center map on new position if tracking is enabled
        if (isTrackingBoat.value && map) {
          map.getView().setCenter(fromLonLat(coordinates));
        }
      }
    },
    { deep: true }
  );
}

// Function to update boat position on the map
function updateBoatPosition(location) {
  if (!location || !location.latitude || !location.longitude) return;

  // Update CSS variable for boat marker position
  // This positions it on the static map image at the right coordinates
  document.documentElement.style.setProperty("--boat-marker-left", "50%");
  document.documentElement.style.setProperty("--boat-marker-top", "50%");

  console.log("Static map boat position updated", location.latitude, location.longitude);
}

// Function to set up device GPS monitoring
function setupDeviceGPS() {
  // No longer needed since we're using anchor store position
  return;
}

function updateSvgSize() {
  if (!svgContainer.value) return;

  const containerWidth = svgContainer.value.clientWidth;
  // Set the container height equal to its width for 1:1 aspect ratio
  svgContainer.value.style.height = `${containerWidth}px`;
}

/* ---------------------------------------------------------------------
    Moves the wind direction widget bsaed off changes of wind angle
 --------------------------------------------------------------------- */
watch(
  () => store.anchorData.wind.angle,
  (first) => {
    rotateTo("wind-direction", first);
  }
);

/* ---------------------------------------------------------------------
    Watch for changes to the critical range
 --------------------------------------------------------------------- */
watch(
  () => store.anchorData?.criticalRange?.r,
  () => {
    // Only call orientWindDirection if it exists
    if (typeof orientWindDirection === "function") {
      orientWindDirection();
    }

    // Rotate wind direction if wind angle is available
    if (store.anchorData?.wind?.angle !== undefined) {
      rotateTo("wind-direction", store.anchorData.wind.angle);
    }
  }
);

/* ---------------------------------------------------------------------
    Change the angle of the current lines
 --------------------------------------------------------------------- */
watch(
  () => store.anchorData.current.angle,
  (first, second) => {
    if (second === -1) {
      initCurrentLines();
    } else {
      rotateTo("current-lines", store.anchorData.current.angle);
    }
  }
);

/* ---------------------------------------------------------------------
    Change the angle of the current lines
 --------------------------------------------------------------------- */
// Watch the local ref
watch(originalBearing, (newBearing) => {
  console.log("Local bearing changed to:", newBearing);
  if (newBearing !== undefined && newBearing !== null) {
    rotateTo("compass-group", newBearing);
  }
});

// Watch the store directly
watch(
  () => store.anchorData.anchorDropLocation.originalBearing,
  (newBearing) => {
    console.log("Store bearing changed to:", newBearing);
    if (newBearing !== undefined && newBearing !== null) {
      // Update local ref if different
      if (originalBearing.value !== newBearing) {
        originalBearing.value = newBearing;
      }

      // Directly rotate the compass
      rotateTo("compass-group", newBearing);
    }
  }
);

/* ---------------------------------------------------------------------
    Update speed of current lines
 --------------------------------------------------------------------- */
watchEffect(
  () => store.anchorData.current.speed,
  () => {
    const currspeed = Math.min(Math.max(1, store.anchorData.current.speed), 10);
    const animation_time = mapValues(curr_range, animation_range, currspeed) || 0;
    Array.from(document.querySelectorAll(".current-line")).forEach((el) => {
      const animation = el.getAnimations()[0];
      animation.effect.updateTiming({ duration: animation_time });
    });
  }
);

/* ---------------------------------------------------------------------
  Helper functions to do .... things with...
--------------------------------------------------------------------- */

// Directs to the AIS target page, with the mmsi as an id in the params
function showAISTarget(mmsi) {
  const p = { name: "AISTarget", params: { mmsi: mmsi } };
  router.push(p);
}

// // update the store when the rode changes
// function onRodeChanged({ detail }) {
//   store.setRode(detail.value);
// }

// // update the store when the range changes
// function onRangeChanged({ detail }) {
//   store.setRange(detail.value);
//   orientWindDirection();
// }

// update the store when the bearing changes
function onBearingChanged({ detail }) {
  const bearing = Number(detail.value);
  console.log("onBearingChanged", bearing);
  store.setBearing(bearing);

  console.log("NEW STORE BEARING =", store.anchorData.anchorDropLocation.originalBearing);
}

// for the alert box when canceling the anchor
const alertButtons = [
  {
    text: "No",
    role: "cancel",
    handler: () => {
      console.log("Alert canceled");
    },
  },
  {
    text: "Yes",
    role: "confirm",
    handler: () => {
      cancelAnchor();
    },
  },
];

// for managing the modal
const cancelModal = () => {
  modal.value.$el.dismiss(null, "cancel");
};

// confirm the anchor. Will cause a write to the server
function confirmAnchor() {
  store.setAnchor();
  setAnchorFlag.value = false;
}

// cancel anchor. Will cause a write to the server
function cancelAnchor() {
  store.cancelAnchor();
  setAnchorFlag.value = false;
}
</script>

<style scoped>
.instrument {
  /* background-color: var(--ion-color-primary); */
  border: solid 1px var(--ion-color-primary-contrast);
  border: solid 1px rgba(255, 255, 255, 0.15);
  color: var(--ion-color-primary-contrast);
}

text {
  font-weight: bold;
  fill: var(--ion-color-primary-contrast);
  text-anchor: middle;
}

#wind-direction {
  font-size: 3.75rem;
  font-weight: bolder;
}

.title {
  font-size: 2.25em;
  font-weight: bold;
  padding: 0.35em;
  padding-top: 0.6;
  text-anchor: middle;
}
.metric {
  font-size: 2rem;
}
.metric2 {
  font-size: 1.5rem;
}

.units {
  font-size: 0.6em;
}

svg {
  padding: 0;
}

@keyframes pulsateText {
  0% {
    font-size: 6.5em;
    opacity: 1;
  }

  50% {
    font-size: 7em;
    opacity: 0.7;
  }

  100% {
    font-size: 6.5em;
    opacity: 1;
  }
}

.pulsating-text {
  animation: pulsateText 2s ease-in-out infinite;
  font-size: 6.5em;
  font-weight: bolder;
  stroke: red;
  fill: red;
}
.scale-display {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  border-radius: 6px;
  padding: 14px 18px;
  color: white;
  text-align: center;
  min-width: 160px;
  font-family: -apple-system, sans-serif;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  opacity: 0.5;
}

.scale-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px; /* Space between label and bar */
  letter-spacing: 0.3px;
}

.scale-bar {
  height: 4px;
  width: 100%;
  background: white;
  border-radius: 2px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  margin-bottom: 10px; /* Space between bar and screen width */
}

.screen-width {
  font-size: 12px;
  opacity: 0.85;
  letter-spacing: 0.2px;
}

.critical {
  stroke: red;
}

.info-rect {
  fill: none;
  stroke: var(--ion-color-primary-contrast);
  stroke-width: 1px;
  opacity: 0.5;
}

.anchor-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: auto;
  min-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  box-sizing: border-box;
}

.instrument {
  width: 100%;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  overflow: visible;
}

.anchor-component {
  background-color: var(--ion-color-primary);
  border-radius: 8px;
  box-shadow: none;
  margin: 0.5rem;
  padding: 0;
  overflow: hidden;
}

.anchor-grid {
  max-width: 600px;
  width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

.anchor-grid-div {
  max-width: 600px;
  width: 100%;
  min-height: 300px;
  height: auto;
  margin: 0 auto 1rem auto;
  background-color: var(--ion-color-primary);
  border-radius: 8px;
  box-shadow: none;
  padding: 20px 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.title-div {
  font-size: 2.25em;
  font-weight: bold;
  text-align: center;
  margin: 0 0 20px 0;
  color: white;
}

.grid-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 20px;
}

.grid-row {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-bottom: 2px;
  flex-wrap: nowrap;
}

.info-rect-div {
  width: 138px;
  height: 100px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  margin: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  min-width: 0; /* Allow shrinking below min-content if needed */
}

.label-div {
  position: absolute;
  top: 12px;
  font-size: 0.9em;
  font-weight: bold;
  color: white;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 5px;
}

.metric-div {
  font-size: 2em !important;
  font-weight: bolder;
  color: var(--ion-color-primary-contrast);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  padding-top: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 768px) {
  .anchor-grid-div {
    min-height: 350px;
  }

  .info-rect-div {
    margin: 10px 15px;
    max-width: 138px;
    opacity: 1;
  }
}

@media (max-width: 767px) {
  .anchor-grid-div {
    min-height: 300px;
  }

  .info-rect-div {
    margin: 5px;
  }

  .label-div {
    font-size: 0.8em;
  }
}

@media (max-width: 480px) {
  .title-div {
    font-size: 1.8em;
    margin-bottom: 10px;
  }

  .info-rect-div {
    height: 80px;
    margin: 3px;
  }

  .label-div {
    font-size: 0.7em;
    top: 8px;
  }

  .svg-square-container {
    max-width: 95%;
    padding-bottom: 95%; /* Slightly smaller square */
  }

  .anchor-component {
    margin: 0.25rem;
  }
}

/* Square SVG styling */
.svg-square-container {
  position: relative;
  width: 100%;
  max-width: 580px;
  height: auto; /* Height will be set by ResizeObserver */
  margin: 0 auto 20px auto;
  overflow: visible;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  display: flex;
  justify-content: center;
  align-items: center;
}

.square-svg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  box-sizing: border-box;
}

/* Safari-specific fixes */
@supports (-webkit-touch-callout: none) {
  .anchor-container {
    height: auto;
    min-height: 100%;
    padding-bottom: 50px;
    -webkit-overflow-scrolling: touch;
  }

  .svg-square-container {
    margin-bottom: 40px;
    z-index: 1;
    overflow: visible;
  }

  ion-content {
    --overflow: auto;
    position: relative;
    z-index: 10; /* Ensure content is above map */
  }

  #svg-canvas {
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    will-change: transform;
  }
}

/* Small screen adjustments */
@media (max-width: 480px) {
  .title-div {
    font-size: 1.5em;
    margin-bottom: 5px;
  }

  .anchor-container {
    padding: 10px;
  }

  .anchor-grid-div {
    min-height: auto;
    margin-bottom: 0.5rem;
    opacity: 0.8;
  }

  .grid-container {
    padding: 0 5px;
  }

  .info-rect-div {
    height: 70px;
    margin: 3px;
    opacity: 1;
  }

  .svg-square-container {
    max-width: 100%;
  }

  .anchor-component {
    margin: 0.25rem;
  }
}

.compass {
  stroke: white;
  stroke-width: 2em;
  opacity: 0.2;
}

.compass-label {
  opacity: 0.85;
  transform-origin: 300px 300px;
  text-anchor: middle;
}

.compass-label.north {
  font-weight: bold;
  font-size: 1.3rem;
  fill: gold;
}

.compass-label.hidden {
  display: none;
}

#compass-group {
  transform-origin: 300px 300px;
}

#anchor-graph {
  transform-origin: 300px 300px;
  transform: scale(0.89);
}

.anchor-container > div:first-child {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none; /* Allow clicks to pass through to elements below */
}

.anchor-grid-div,
.svg-square-container {
  position: relative;
  z-index: 20; /* Ensure controls appear above map */
}

/* Boat marker overlay */
.boat-marker {
  position: absolute;
  top: var(--boat-marker-top, 50%);
  left: var(--boat-marker-left, 50%);
  width: 20px;
  height: 20px;
  margin-left: -10px; /* Center the marker */
  margin-top: -10px; /* Center the marker */
  background-color: var(--ion-color-primary);
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.6);
  z-index: 10;
  transform-origin: center center;
  /* Add subtle pulse animation */
  animation: pulse-marker 2s infinite ease-in-out;
}

@keyframes pulse-marker {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.9;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Ensure the map wrapper respects safe areas on iOS devices */
.map-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
  overflow: hidden; /* Hide the overflow of the scaled map */
  /* Add extra padding to prevent black borders */
  padding: 5px;
}

/* Floating zoom controls */
.zoom-fab-container {
  position: fixed;
  bottom: 80px; /* Position above the footer */
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
  pointer-events: auto; /* Allow interaction with buttons */
}

.zoom-icon {
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: white;
}

/* Map status indicator */
.map-status-indicator {
  position: absolute;
  bottom: 20px;
  left: 20px;
  padding: 8px 16px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  z-index: 1000;
  max-width: 80%;
  text-align: center;
}

/* Standalone scale display styling */
.standalone-scale-display {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.6);
  padding: 8px 12px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* Action buttons fab styling */
.anchor-fab-container {
  position: fixed;
  bottom: 80px; /* Position above the footer */
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
  pointer-events: auto; /* Allow interaction with buttons */
}

/* Custom fab button size - 40% larger than small */
.custom-fab-size {
  --size: 50px; /* Default small is ~35px, increasing by ~40% */
  width: var(--size);
  height: var(--size);
}

/* Stacked icons styling */
.stacked-icon-container {
  position: relative;
  width: 28px;
  height: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.stacked-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.anchor-icon {
  filter: brightness(0) invert(1); /* Make it white */
  z-index: 1;
  transform: scale(0.8); /* Make the anchor slightly smaller */
}

.ban-icon {
  color: #ff4961; /* Use a red color for better visibility */
  font-size: 32px; /* Make it larger */
  z-index: 2;
  opacity: 1;
  transform: scale(1.2); /* Make the ban icon larger */
}

/* OpenLayers map styling */
.openlayers-map {
  width: 200%;
  height: 200%;
  position: absolute;
  top: -50%;
  left: -50%;
  transition: all 0.3s ease-out; /* Add smooth transition */
  transform-origin: center center;
}

.page-container {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

ion-header,
ion-content {
  position: relative;
  z-index: 10; /* Ensure content is above map */
  background: transparent;
}

ion-content {
  --background: transparent;
}

/* Menu icon styling */
.menu-icon {
  font-size: 24px;
  width: 24px;
  height: 24px;
  color: var(--ion-color-primary-contrast);
}

/* Settings container styles */
.settings-container {
  padding: 16px;
}

.settings-info {
  margin-top: 24px;
  padding: 16px;
  background-color: rgba(var(--ion-color-primary-rgb), 0.1);
  border-radius: 8px;
}

.settings-info p {
  margin-bottom: 8px;
  color: var(--ion-color-medium);
  font-size: 14px;
}

/* Ensure map container has proper dimensions and respects safe area on iOS */
.map-wrapper {
  position: fixed; /* Fixed positioning to cover the entire viewport */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 1; /* Above the page background but below content */
  padding: 0;
  margin: 0;
  overflow: hidden;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
}

.osm-map {
  border: none;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  pointer-events: auto; /* Make the map interactive */
  /* Style to disable the default OpenStreetMap controls */
  filter: contrast(1.1); /* Slightly improve map contrast */
}

svg.instrument {
  background-color: transparent;
}

/* Hide OpenStreetMap controls via an overlay element */
#osm-map {
  position: relative;
}

/* Completely hide OpenStreetMap controls */
.map-control-cover {
  position: absolute;
  background-color: var(--ion-background-color);
  pointer-events: auto; /* Capture clicks to prevent map control interactions */
  z-index: 100;
}

.map-control-cover.top-right {
  top: 0;
  right: 0;
  width: 150px;
  height: 150px;
  border-bottom-left-radius: 8px;
}

.map-control-cover.bottom-right {
  bottom: 0;
  right: 0;
  width: 200px;
  height: 30px;
}

.map-control-cover.bottom-left {
  bottom: 0;
  left: 0;
  width: 200px;
  height: 30px;
}

/* Disable all interactions with the map itself */
.osm-map {
  pointer-events: none !important; /* Prevent all interactions with the map */
}

/* Location permission overlay */
.location-permission-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 200;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
}

.location-permission-card {
  background-color: var(--ion-background-color);
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 350px;
  text-align: center;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.location-icon {
  font-size: 48px;
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  color: var(--ion-color-primary);
}

.location-permission-card h3 {
  margin-top: 0;
  color: var(--ion-color-primary);
  font-size: 20px;
  font-weight: 600;
}

.location-permission-card p {
  margin-bottom: 16px;
  font-size: 16px;
  line-height: 1.4;
  color: var(--ion-color-medium);
}

.location-permission-card .helper-text {
  font-size: 14px;
  margin-top: 16px;
  opacity: 0.7;
}

.location-permission-card .error-message {
  color: var(--ion-color-danger);
  font-size: 14px;
  margin-bottom: 16px;
  background-color: rgba(var(--ion-color-danger-rgb), 0.1);
  padding: 8px;
  border-radius: 6px;
}

/* Make the button larger for better touch target */
.location-permission-card .nav-button {
  --padding-start: 16px;
  --padding-end: 16px;
  min-height: 60px;
  margin: 10px 0;
  font-weight: 600;
}

.loading-overlay,
.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  color: white;
}

.error-overlay {
  background: rgba(0, 0, 0, 0.9);
}

.error-overlay ion-icon {
  font-size: 48px;
  color: var(--ion-color-warning);
  margin-bottom: 16px;
}
</style>
