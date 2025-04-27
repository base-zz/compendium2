<template>
  <ion-page class="page-container">
    <generic-header title="Anchor" />

    <!-- Map container as bottom layer -->
    <div v-if="useMapBackground" class="map-wrapper">
      <div ref="mapElement" class="openlayers-map">
        <!-- Map will be initialized here via JavaScript -->
      </div>
    </div>

    <ion-content class="content-with-header">
      <!-- Set params modal -->
      <ion-modal :is-open="isSetParamsOpen" @didDismiss="isSetParamsOpen = false">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button size="small" color="medium" @click="toggleSetParams()"
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
                  toggleSetParams();
                "
                >Confirm</ion-button
              >
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <div class="settings-container">
            <div class="popover-block">
              Set the range for the anchor alarm.
              <ion-range
                color="light"
                min="0"
                max="83"
                v-model="store.anchorData.criticalRange.r"
              ></ion-range>
              <div class="info-box" :class="[hasRange ? 'success' : 'warning']">
                <ValueDisplay
                  label="Range"
                  :value="store.anchorData.criticalRange.r"
                  decimals="0"
                  unit="length"
                />
              </div>
            </div>
            <div class="popover-block">
              Set the amount of rode deployed.
              <ion-range
                color="light"
                min="0"
                max="83"
                v-model="store.anchorData.rode.amount"
              ></ion-range>
              <div class="info-box" :class="[hasRode > 0 ? 'success' : 'warning']">
                <ValueDisplay
                  label="Rode"
                  :value="store.anchorData.rode.amount"
                  unit="length"
                  decimals="0"
                />
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
                <ValueDisplay label="Bearing" :value="bearingString" unit="angle" />
              </div>
            </div>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Map status indicator for debugging -->
      <!-- <div class="map-status-indicator" v-if="mapStatus">{{ mapStatus }}</div> -->

      <!-- Floating zoom controls -->
      <div class="zoom-fab-container" v-if="useMapBackground">
        <ion-fab-button @click="adjustZoom(1)" color="primary" class="custom-fab-size">
          <span class="zoom-icon">+</span>
        </ion-fab-button>
        <ion-fab-button @click="adjustZoom(-1)" color="primary" class="custom-fab-size">
          <span class="zoom-icon">−</span>
        </ion-fab-button>
      </div>

      <!-- Standalone scale display with visual indicator -->
      <div class="standalone-scale-display" v-if="useMapBackground">
        <div class="scale-text">{{ currentScaleText }}</div>
        <div class="scale-line">
          <div class="scale-line-inner"></div>
        </div>
        <div class="screen-width-text" v-if="screenWidthText">
          Screen: {{ screenWidthText }}
        </div>
      </div>

      <!-- Map placeholder -->
      <div id="map-placeholder"></div>

      <div class="anchor-container" :class="{ 'map-background': useMapBackground }">
        <CurrentLines :current="store.anchorData.current" />

        <div class="anchor-grid-div">
          <div class="title-container">
            <h2 class="title-div">{{ store.anchorData.anchorStatus }}</h2>
          </div>

          <div class="grid-container">
            <div class="grid-row">
              <div class="info-rect-div">
                <ValueDisplay
                  label="Range"
                  :value="store.anchorData.criticalRange.r"
                  unit="length"
                  decimals="0"
                />
              </div>
              <div class="info-rect-div">
                <ValueDisplay
                  label="Rode"
                  :value="store.anchorData.rode.amount"
                  unit="length"
                  decimals="0"
                />
              </div>
              <div class="info-rect-div">
                <ValueDisplay label="Scope" :formattedValue="scopeString" unit="ratio" />
              </div>
            </div>
            <div class="grid-row">
              <div class="info-rect-div">
                <ValueDisplay
                  label="Depth"
                  :value="store.anchorData.depth || 0"
                  unit="depth"
                />
              </div>
              <div class="info-rect-div">
                <ValueDisplay
                  label="Wind Speed"
                  :value="store.anchorData.wind.speed || 0"
                  unit="speed"
                />
              </div>
              <div class="info-rect-div">
                <ValueDisplay
                  label="Current Speed"
                  :value="store.anchorData.current.speed || 0"
                  unit="speed"
                />
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
                    :stroke="hexToRgba(isDarkMode ? '#ffffff' : '#000000', 0.4)"
                    stroke-width="2em"
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
      <ion-fab-button @click="toggleSetParams()" color="primary" class="custom-fab-size">
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
  onMounted,
  onUnmounted,
  onBeforeUnmount,
  ref,
  computed,
  watch,
  watchEffect,
  nextTick,
  useTemplateRef,
} from "vue";
import { useRouter } from "vue-router";
import { useAnchorStore } from "@/stores/anchor.js";
import { useSignalKStore } from "@/stores/signalK.js";
import {
  getComplementaryColor,
  // adjustBrightness,
  hexToRgba,
  rgbToHex,
  generateColorScheme,
  getHighContrastColor,
} from "@/util/colors";
import CurrentLines from "@/components/CurrentLines.vue";
import ValueDisplay from "@/components/ValueDisplay.vue"; // Import ValueDisplay component
import { range } from "lodash";
import { Geolocation } from "@capacitor/geolocation";
import GenericHeader from "@/components/GenericHeader.vue";
// Import OpenLayers directly
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM, Vector as VectorSource } from "ol/source";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import Feature from "ol/Feature";
import { Point } from "ol/geom";
import { fromLonLat } from "ol/proj";
import ScaleLine from "ol/control/ScaleLine";
import Zoom from "ol/control/Zoom";
import { METERS_PER_UNIT } from "ol/proj/Units";
import preferencesStore from "@/stores/preferences";

// Ionicons
import { locationOutline } from "ionicons/icons";

import {
  IonButton,
  IonButtons,
  IonFabButton,
  IonToolbar,
  IonModal,
  IonRange,
  // IonMenuButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonAlert,
  IonIcon,
  IonToggle,
  IonItem,
  IonLabel,
} from "@ionic/vue";

// initialize the anchor store
import { storeToRefs } from "pinia";
const store = useAnchorStore();
// const signalKStore = useSignalKStore();

const { anchorData } = storeToRefs(store);

// initialize the websocket connection
store.initFetchAnchorData();

// view store holds screen size info. Overkill that probably is not necessary
const router = useRouter();

// flag to show the modal
const setAnchorFlag = ref(false);

// modal reference
const modal = ref(null);

// Map references and settings
const mapStatus = ref("Initializing map...");

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
const currentZoom = ref(14);
// const projection = ref("EPSG:4326");
const mapPosition = ref(null);
const lastValidPosition = ref(null); // Store the last valid position for fallback
const mapElement = ref(null);
// Initialize with a reasonable default based on default zoom level instead of 'Unknown'
const currentScaleText = ref("80 ft"); // Default for zoom level 14
const screenWidthText = ref("~500 ft"); // Default screen width estimate
const useDeviceGPS = ref(localStorage.getItem("anchorViewUseDeviceGPS") !== "false");
// const osmMapUrl = ref("");

// Map offset controls for manual adjustment
// Load previous offsets from localStorage if available
const mapOffsetX = ref(parseInt(localStorage.getItem("mapOffsetX") || "0"));
const mapOffsetY = ref(parseInt(localStorage.getItem("mapOffsetY") || "0"));

// Map settings modal
// const isMapSettingsOpen = ref(false);
const isSetParamsOpen = ref(false);

// Function to toggle map settings modal
// function toggleMapSettings() {
//   isMapSettingsOpen.value = !isMapSettingsOpen.value;
// }

// Function to toggle set parameters modal
function toggleSetParams() {
  isSetParamsOpen.value = !isSetParamsOpen.value;
}

// Function to toggle dark mode for the map
function toggleMapDarkMode(newValue) {
  // If called from a toggle, use the provided value
  if (typeof newValue !== "undefined") {
    isDarkMode.value = newValue;
  }
  // Otherwise toggle the current value (for backward compatibility)
  else {
    // Only toggle and save if not using system preference
    if (!preferSystemColorScheme.value) {
      isDarkMode.value = !isDarkMode.value;
    } else {
      // If using system preference, temporarily disable it and set to opposite of system
      preferSystemColorScheme.value = false;
      localStorage.setItem("preferSystemColorScheme", "false");
      isDarkMode.value = !systemIsDarkMode.value;
    }
  }

  // Save preference to localStorage
  localStorage.setItem("mapDarkMode", isDarkMode.value.toString());

  // Apply dark mode to the map if it exists
  if (map) {
    applyMapDarkMode();
  }
}

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

// Function to update system theme preference
function updateSystemThemePreference(newValue) {
  preferSystemColorScheme.value = newValue;
  localStorage.setItem("preferSystemColorScheme", newValue.toString());

  // If using system preference, update dark mode to match system
  if (preferSystemColorScheme.value) {
    isDarkMode.value = systemIsDarkMode.value;
  }

  // Apply dark mode to the map if it exists
  if (map) {
    applyMapDarkMode();
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
  if (colorSchemeQuery && colorSchemeQuery.addEventListener) {
    colorSchemeQuery.addEventListener("change", handleColorSchemeChange);
  } else if (colorSchemeQuery && colorSchemeQuery.addListener) {
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

// We're now handling zoom changes directly in the template
// with @update:zoom="currentZoom = $event; updateScaleControl();"

// We'll use onMounted to initialize the map when the component is mounted
onMounted(async () => {
  console.log("Map component mounted");
  mapStatus.value = "Map mounted successfully";

  // Force an update of the scale control after the map is mounted
  nextTick(() => {
    if (mapElement.value) {
      console.log("Map element available");
      updateScaleControl();
    }
  });
});

// Helper function to get the OpenLayers view object safely
function getOLView() {
  console.log("Attempting to get OpenLayers view object...");

  if (!map) {
    console.log("Map instance not available");
    return null;
  }

  try {
    const view = map.getView();
    if (view && typeof view.getCenter === "function") {
      console.log("Found view via map.getView()");
      return view;
    }
    console.error("Could not access valid OpenLayers view object");
    return null;
  } catch (error) {
    console.error("Error accessing OpenLayers view:", error);
    return null;
  }
}

// Utility function to convert pixels to feet based on current map resolution
function pixelsToFeet(pixels) {
  if (!map) {
    console.error("Map instance not available");
    return null;
  }

  try {
    const view = getOLView();
    if (!view) return null;

    const center = view.getCenter();
    const resolution = view.getResolution();

    if (!center || !resolution) return null;

    // Calculate conversion factors based on latitude
    const latitude = center[1];
    const longitudeDegreesPerMeter = 1 / (111320 * Math.cos((latitude * Math.PI) / 180));
    const longitudeDegreesPerFoot = longitudeDegreesPerMeter / 3.28084;

    // Convert pixels to feet
    return (resolution * pixels) / longitudeDegreesPerFoot;
  } catch (error) {
    console.error("Error converting pixels to feet:", error);
    return null;
  }
}

// Utility function to convert feet to pixels based on current map resolution
function feetToPixels(feet) {
  if (!map) {
    console.error("Map instance not available");
    return null;
  }

  try {
    const view = getOLView();
    if (!view) return null;

    const center = view.getCenter();
    const resolution = view.getResolution();

    if (!center || !resolution) return null;

    // Calculate conversion factors based on latitude
    const latitude = center[1];
    const longitudeDegreesPerMeter = 1 / (111320 * Math.cos((latitude * Math.PI) / 180));
    const longitudeDegreesPerFoot = longitudeDegreesPerMeter / 3.28084;

    // Convert feet to pixels
    return (feet * longitudeDegreesPerFoot) / resolution;
  } catch (error) {
    console.error("Error converting feet to pixels:", error);
    return null;
  }
}

// Function to update the scale control based on current zoom level
function updateScaleControl() {
  // Get the current zoom level from our reactive property
  const zoom = currentZoom.value;

  // If map background is disabled, we can't calculate scale
  if (!useMapBackground.value) {
    console.log("Map background disabled, cannot calculate real scale");
    currentScaleText.value = "80 ft"; // Default value
    return;
  }

  // If map is not available yet, use default value
  if (!map) {
    console.log("Map not yet available, using default scale");
    currentScaleText.value = "80 ft"; // Default value
    return;
  }

  try {
    // Use the stored center coordinates
    const centerCoords = center.value;
    if (!centerCoords || !Array.isArray(centerCoords) || centerCoords.length < 2) {
      console.log("Center coordinates not available for scale control");
      currentScaleText.value = "80 ft"; // Default value
      return;
    }

    // Get the map projection and units
    const projection = map.getView().getProjection();
    const units = projection.getUnits();

    // Get the resolution from the map view
    const resolution = map.getView().getResolution();

    // Calculate feet per 100 pixels using the proper OpenLayers approach
    let feetPer100Pixels;

    if (units === "degrees") {
      // For EPSG:4326 (WGS 84), the resolution depends on latitude
      const latitude = centerCoords[1];

      // Calculate meters per degree at this latitude
      const metersPerDegree = 1 / (111320 * Math.cos((latitude * Math.PI) / 180));

      // Convert to feet (1 meter = 3.28084 feet)
      const feetPerDegree = metersPerDegree * 3.28084;

      // Calculate how many feet 100 pixels represents
      const pixelDistance = 100;
      feetPer100Pixels = resolution * pixelDistance * feetPerDegree;
    } else {
      // For other projections, use the units directly
      // Get meters per unit from OpenLayers
      const metersPerUnit = METERS_PER_UNIT[units] || 1;

      // Convert to feet per unit
      const feetPerUnit = metersPerUnit * 3.28084;

      // Calculate feet per 100 pixels
      const pixelDistance = 100;
      feetPer100Pixels = resolution * feetPerUnit * pixelDistance;
    }

    // console.log(`Scale calculation:`);
    // console.log(`  • Zoom level: ${zoom}`);
    // console.log(`  • Resolution: ${resolution}`);
    // console.log(`  • Units: ${units}`);
    // console.log(`  • Feet per 100 pixels: ${feetPer100Pixels.toFixed(4)}`);

    // If the calculation produces an unreasonable value, use fallback values
    if (feetPer100Pixels > 100000 || feetPer100Pixels < 0.1 || isNaN(feetPer100Pixels)) {
      console.warn(
        `Unreasonable feetPer100Pixels value: ${feetPer100Pixels}, using fallback`
      );
      // Use the same fallback values as in HoldView
      const scales = {
        1: "10000 ft",
        2: "8000 ft",
        3: "5000 ft",
        4: "2500 ft",
        5: "1000 ft",
        6: "800 ft",
        7: "500 ft",
        8: "400 ft",
        9: "300 ft",
        10: "250 ft",
        11: "200 ft",
        12: "150 ft",
        13: "100 ft",
        14: "80 ft",
        15: "50 ft",
        16: "25 ft",
        17: "10 ft",
        18: "5 ft",
        19: "2 ft",
        20: "1 ft",
        21: "0.5 ft",
      };

      currentScaleText.value = scales[zoom] || "80 ft";
      return;
    }

    // Round to a nice number
    let roundedFeet;
    if (feetPer100Pixels >= 5000) {
      roundedFeet = Math.round(feetPer100Pixels / 1000) * 1000;
    } else if (feetPer100Pixels >= 1000) {
      roundedFeet = Math.round(feetPer100Pixels / 500) * 500;
    } else if (feetPer100Pixels >= 100) {
      roundedFeet = Math.round(feetPer100Pixels / 50) * 50;
    } else if (feetPer100Pixels >= 10) {
      roundedFeet = Math.round(feetPer100Pixels / 5) * 5;
    } else {
      roundedFeet = Math.round(feetPer100Pixels);
    }

    // Format the scale text
    let scaleText;
    if (roundedFeet >= 5280) {
      // 1 mile = 5280 feet
      const miles = roundedFeet / 5280;
      // Format miles to 2 decimal places
      const formattedMiles = miles.toFixed(2);
      // If it's exactly 1.00, just show "1 mile"
      scaleText = formattedMiles === "1.00" ? "1 mile" : `${formattedMiles} miles`;
    } else {
      scaleText = `${roundedFeet} ft`;
    }

    // Update the standalone scale display
    currentScaleText.value = scaleText;

    // Calculate the width of the screen in feet/miles using the full device screen width
    try {
      // Get the full screen width of the device
      const screenWidth = window.screen.width;

      if (screenWidth) {
        // Calculate feet per pixel from our 100 pixel calculation
        const feetPerPixel = feetPer100Pixels / 100;

        // Calculate how many feet the screen width represents
        const screenWidthInFeet = feetPerPixel * screenWidth;

        // Log detailed information about the screen width calculation
        // console.log(`Screen width calculation:`);
        // console.log(`  • Full screen width: ${screenWidth} pixels`);
        // console.log(`  • Feet per pixel: ${feetPerPixel.toFixed(4)}`);
        // console.log(`  • Total width: ${screenWidthInFeet.toFixed(2)} feet`);

        // Format the screen width text
        if (screenWidthInFeet >= 5280) {
          const screenWidthInMiles = screenWidthInFeet / 5280;
          screenWidthText.value = `${screenWidthInMiles.toFixed(2)} miles`;
        } else {
          screenWidthText.value = `${Math.round(screenWidthInFeet)} ft`;
        }
        // console.log(`Screen width: ${screenWidth}px = ${screenWidthText.value}`);
      } else {
        console.log("Screen width is not available");
        screenWidthText.value = "~500 ft"; // Default value
      }
    } catch (innerError) {
      console.error("Error calculating screen width:", innerError);
      screenWidthText.value = "~500 ft"; // Default value
    }
  } catch (error) {
    console.error("Error calculating scale:", error);
    // Ensure zoom is a valid number
    let validZoom = zoom;
    if (validZoom === undefined || validZoom === null || isNaN(validZoom)) {
      console.warn(`Invalid zoom value: ${zoom}, defaulting to 14`);
      validZoom = 14; // Default to a reasonable zoom level
    }

    console.log(`Using fallback scale for zoom level: ${validZoom}`);

    // Fallback to approximate values if calculation fails
    const scales = {
      1: "10000 ft",
      2: "8000 ft",
      3: "5000 ft",
      4: "2500 ft",
      5: "1000 ft",
      6: "800 ft",
      7: "500 ft",
      8: "400 ft",
      9: "300 ft",
      10: "250 ft",
      11: "200 ft",
      12: "150 ft",
      13: "100 ft",
      14: "80 ft",
      15: "50 ft",
      16: "25 ft",
      17: "10 ft",
      18: "5 ft",
      19: "2 ft",
      20: "1 ft",
      21: "0.5 ft",
    };

    currentScaleText.value = scales[validZoom] || "80 ft";
    screenWidthText.value = "~500 ft"; // Default screen width
  }
}

// Function to adjust the zoom level
function adjustZoom(delta) {
  // Get current zoom level
  const currentZoomLevel = currentZoom.value;

  // Calculate new zoom level
  const newZoomLevel = Math.max(1, Math.min(19, currentZoomLevel + delta));

  console.log(`Adjusting zoom from ${currentZoomLevel} to ${newZoomLevel}`);

  // Set the new zoom level
  currentZoom.value = newZoomLevel;

  // Update the map view if it exists
  if (map && map.getView()) {
    map.getView().setZoom(newZoomLevel);
  } else if (viewRef.value) {
    // Fallback to viewRef if map is not available
    viewRef.value.setZoom(newZoomLevel);
  }

  // Save the zoom level to localStorage
  localStorage.setItem("mapZoom", newZoomLevel.toString());

  // Update the scale control to reflect the new zoom level
  updateScaleControl();
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

/***
 * Dummy function to supress errors.
 * May need to do something with this for capability
 * where user uses a device (e.g. Android tablet or phone)
 * as a server.
 */
const setupDeviceGPS = () => {
  return true;
};

// Create a computed property for originalBearing
const originalBearing = ref(-1);

// reference to svg
const svg = useTemplateRef("svg");
const svgContainer = useTemplateRef("svgContainer");
const resizeObserver = ref(null);

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

const formattedCriticalRange = computed(() => {
  const value = store.anchorData?.criticalRange?.r;
  if (value === undefined || value === null) {
    return { formattedValue: "--", formattedUnits: "--" };
  }
  return preferencesStore.getFormattedValueDetails(value, "length", 0);
});

// Create a ref that will automatically update when store.anchorData?.rode?.amount changes
const formattedRode = computed(() => {
  const value = store.anchorData?.rode?.amount;
  if (value === undefined || value === null) {
    return { formattedValue: "--", formattedUnits: "--" };
  }
  return preferencesStore.getFormattedValueDetails(value, "length", 0);
});

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

  // console.log(`Compass zoom level: ${zoom}, zoom factor: ${zoomFactor}`);

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

  // console.log(`Critical range zoom level: ${zoom}, zoom factor: ${adjustedZoomFactor}`);

  // Apply zoom factor to the critical range radius
  return criticalR * adjustedZoomFactor;
});

const scopeString = computed(() => {
  if (
    !store.anchorData.anchorDeployed ||
    !store.anchorData.rode?.length ||
    !store.anchorData.depth ||
    1 > 0
  )
    return "--";
  return (
    (store.anchorData.rode?.length / store.anchorData.depth).toFixed(1).toString() + ":1"
  );
});

const bearingString = computed(() => {
  return Math.max(originalBearing.value, 0);
});

// measures the distance from the original anchor drop location to the current location
const distanceOutOfRange = computed(() => {
  const x1 = store.anchorData.rode.x1;
  const y1 = -store.anchorData.rode.y1;
  const x2 = store.anchorData.anchorDropLocation.x;
  const y2 = -store.anchorData.anchorDropLocation.y;
  const roded = Math.hypot(x2 - x1, y2 - y1);
  const r = store.anchorData.criticalRange.r;
  const d = Math.abs(Math.round(roded - r));

  return Math.max(d, 0);
});

// utility functions to keep things tidy
const hasRode = computed(() => {
  return store.anchorData?.rode?.length > 0;
});

const hasRange = computed(() => {
  return store.anchorData?.criticalRange?.r > 0;
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

// const pos = { N: 0, S: 180, E: 90, W: 270 };
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
    console.log("ROTATE NO DEGREES PROVIDED. ID=", elid, el, deg);
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
  // Force save the initial state to localStorage to ensure it's set
  localStorage.setItem("anchorViewUseMapBackground", useMapBackground.value.toString());

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

    // 1. First check initial position
    if (store.anchorData.position?.latitude && store.anchorData.position?.longitude) {
      initializeAlignment();
    }

    // 2. Then watch for future changes
    const stopWatch = watch(
      () => store.anchorData.position,
      (newPosition) => {
        if (newPosition?.latitude && newPosition?.longitude) {
          initializeAlignment();
          stopWatch(); // ✅ Now safe to call
        }
      }
    );
  }

  // Set up GPS if device GPS is enabled
  if (useDeviceGPS.value) {
    setupDeviceGPS();
  }

  // Initialize ResizeObserver to maintain square aspect ratio
  if (window.ResizeObserver && svgContainer.value) {
    resizeObserver.value = new ResizeObserver(updateSvgSize);
    resizeObserver.value.observe(svgContainer.value);
  } else {
    console.log("ResizeObserver not available or container not found");
  }

  // Add resize event listener
  window.addEventListener("resize", updateSvgSize);

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
    () => [store.anchorData.rode?.x1, store.anchorData.rode?.y1],
    () => {
      if (useMapBackground.value && mapPosition.value && store.anchorData.rode) {
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
  if (resizeObserver.value) {
    try {
      resizeObserver.value.disconnect();
    } catch (error) {
      console.error("Error disconnecting ResizeObserver:", error);
    }
    resizeObserver.value = null;
  }

  destroyMap(); // Clean up map resources
  window.removeEventListener("resize", updateSvgSize); // Remove event listener

  stopWatch?.();
});

// Clean up before unmounting
onBeforeUnmount(() => {
  destroyMap();
});

// Variables for OpenLayers map components
let map = null;
let vectorSource = null;
let vectorLayer = null;
let positionFeature = null;
let scaleLineControl = null;

// Function to initialize OpenLayers map directly
async function initializeMap() {
  // Don't initialize if map is disabled
  if (!useMapBackground.value) return;

  mapStatus.value = "Creating map...";
  console.log("Initializing map with OpenLayers");

  try {
    // Get current location from the store instead of directly from the device
    const storePosition = store.anchorData.position;
    console.log("Store position data:", JSON.stringify(storePosition));

    // Check if we have valid position data from the store
    if (
      !storePosition ||
      !storePosition.latitude ||
      !storePosition.longitude ||
      isNaN(storePosition.latitude) ||
      isNaN(storePosition.longitude)
    ) {
      console.log("No valid position data in store");
      mapStatus.value = "Fetching position from SignalK...";

      // Make sure the map element exists before proceeding
      if (!mapElement.value) {
        console.error("Map element not found, cannot initialize map");
        mapStatus.value = "Map initialization failed: element not found";
        return;
      }

      // Initialize the map components but don't set a center yet
      // This allows the map to be ready when position data becomes available
      setupMapWithoutPosition();

      // Try to get position from SignalK API as fallback
      try {
        const signalKPosition = await fetchPositionFromSignalK();
        if (signalKPosition) {
          console.log("Got position from SignalK:", signalKPosition);
          // Update the store with the position from SignalK
          store.updatePosition({
            latitude: signalKPosition.latitude,
            longitude: signalKPosition.longitude,
            accuracy: 10, // Default accuracy
            timestamp: Date.now(),
            source: "signalk",
          });

          // Initialize the map with the position from SignalK
          if (mapElement.value) {
            initializeMapWithPosition({
              latitude: signalKPosition.latitude,
              longitude: signalKPosition.longitude,
            });
          } else {
            console.error("Map element not found, cannot initialize map");
          }
          return;
        } else {
          console.log("No position data available from SignalK");
        }
      } catch (error) {
        console.error("Error fetching position from SignalK:", error);
      }

      mapStatus.value = "Waiting for valid position data...";

      // Set up a watcher to initialize the map when position becomes available
      watch(
        () => store.anchorData.position,
        (newPosition) => {
          if (
            newPosition &&
            newPosition.latitude &&
            newPosition.longitude &&
            !isNaN(newPosition.latitude) &&
            !isNaN(newPosition.longitude)
          ) {
            console.log("Position data received, initializing map center");
            if (mapElement.value) {
              initializeMapWithPosition(newPosition);
            } else {
              console.error("Map element not found, cannot initialize map");
            }
          }
        },
        { deep: true, immediate: true }
      );

      return;
    }

    // We have valid position data, initialize the map with it
    if (mapElement.value) {
      initializeMapWithPosition(storePosition);
    } else {
      console.error("Map element not found, cannot initialize map");
      mapStatus.value = "Map initialization failed: element not found";
    }
  } catch (error) {
    console.error("Map initialization failed:", error);
    mapStatus.value = "Map initialization failed";
  }
}

// Function to set up map components without a specific position
function setupMapWithoutPosition() {
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

  // Create scale line control
  scaleLineControl = new ScaleLine({
    units: "imperial",
    bar: true,
    steps: 4,
    minWidth: 140,
  });

  // Load the saved zoom level or use a default
  const savedZoom = localStorage.getItem("mapZoom");
  currentZoom.value = savedZoom ? parseInt(savedZoom) : 14;

  console.log("Map components initialized without position");
}

// Function to initialize the map with a valid position
function initializeMapWithPosition(position) {
  if (
    !position ||
    !position.latitude ||
    !position.longitude ||
    isNaN(position.latitude) ||
    isNaN(position.longitude)
  ) {
    console.log("Cannot initialize map: invalid position data");
    return;
  }

  // Use the position from the store
  const currentLocation = {
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy: position.accuracy || 1000,
  };
  console.log("Initializing map with location:", JSON.stringify(currentLocation));
  mapStatus.value = `Got location: ${currentLocation.latitude.toFixed(
    6
  )}, ${currentLocation.longitude.toFixed(6)}`;

  // Set the center coordinates for the map in [longitude, latitude] format for OpenLayers
  const coordinates = [currentLocation.longitude, currentLocation.latitude];
  console.log("Setting map center coordinates:", coordinates);
  center.value = coordinates;

  // Store valid position for future use
  if (isValidCoordinates(coordinates)) {
    lastValidPosition.value = coordinates;
    console.log("Stored as lastValidPosition:", lastValidPosition.value);
  }

  // If map already exists, update its center
  if (map) {
    const olCenter = fromLonLat(coordinates);
    map.getView().setCenter(olCenter);
    updatePositionMarker(coordinates);
    console.log("Updated existing map with new position");
    return;
  }

  // Initialize the map with OpenLayers
  const olCenter = fromLonLat(center.value);
  console.log("OpenLayers center (transformed):", olCenter);

  if (!vectorLayer) {
    vectorSource = new VectorSource();
    vectorLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 10, // Ensure it's above the base map
    });
  }

  if (!scaleLineControl) {
    scaleLineControl = new ScaleLine({
      units: "imperial",
      bar: true,
      steps: 4,
      minWidth: 140,
    });
  }

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
      center: olCenter,
      zoom: currentZoom.value,
      projection: "EPSG:3857",
    }),
  });

  // Apply dark mode if enabled
  nextTick(() => {
    applyMapDarkMode();
  });

  // Add zoom change event listener
  map.getView().on("change:resolution", () => {
    currentZoom.value = Math.round(map.getView().getZoom());
    // Save zoom level to localStorage
    localStorage.setItem("mapZoom", currentZoom.value.toString());

    // Update the scale control to show the new screen width
    updateScaleControl();

    console.log(
      `Zoom changed to ${currentZoom.value}, compass and critical range scaling updated`
    );
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
      if (map) {
        map.updateSize();
        console.log("Forced map size update to ensure visibility");
      }
      mapStatus.value = "Map ready";
    }, 500);
  });

  // Initialize alignment
  initializeAlignment();
}

function initializeAlignment() {
  nextTick(() => {
    if (!map || !mapElement.value) return;

    // Force a small delay to ensure everything is rendered
    setTimeout(() => {
      alignMapWithAnchorCircle();

      // Additional adjustment for SVG elements
      const boatGroup = document.getElementById("boatGroup");
      if (boatGroup) {
        boatGroup.style.transform = "translate(0, 0)";
      }

      // Force map redraw
      map.updateSize();
      console.log("Initial alignment completed");
    }, 300);
  });
}

// Function to clean up map resources
function destroyMap() {
  console.log("Cleaning up map resources");

  // Clean up map components
  if (map) {
    map.setTarget(null);
    map = null;
  }

  if (vectorSource) {
    vectorSource.clear();
    vectorSource = null;
  }

  if (vectorLayer) {
    vectorLayer = null;
  }

  if (positionFeature) {
    positionFeature = null;
  }

  if (scaleLineControl) {
    scaleLineControl = null;
  }
}

// Function to align the map with the anchor circle
function alignMapWithAnchorCircle() {
  // If alignment is already in progress, don't start another one
  if (window.mapAlignmentInProgress && window.mapAlignmentInProgress !== true) {
    console.log("Map alignment already in progress, skipping");
    return;
  }

  if (!map || !mapElement.value) return;

  document.getElementById("boatGroup")?.style?.removeProperty("display");

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
    mapContainer.style.display = "block"; // Ensure the map stays visible
    mapContainer.style.visibility = "visible"; // Explicitly set visibility

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
        if (map) {
          map.updateSize(); // CHANGED to use map directly
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

// Function to request location permissions with proper handling for iOS and Android
// NOTE: This function is kept for reference but is no longer used since we get location from the store
async function requestLocationPermission() {
  try {
    console.log("Checking location permissions...");
    const permissionStatus = await Geolocation.checkPermissions();
    console.log("Current permission status:", permissionStatus);

    // Handle both location and coarseLocation for iOS
    if (
      permissionStatus.location === "denied" ||
      permissionStatus.coarseLocation === "denied"
    ) {
      console.log("Permission permanently denied");
      mapStatus.value = "Location access is disabled. Please enable it in Settings.";
      return false;
    }

    if (
      permissionStatus.location !== "granted" ||
      permissionStatus.coarseLocation !== "granted"
    ) {
      console.log("Permission not granted, requesting...");
      const permission = await Geolocation.requestPermissions({
        permissions: ["location", "coarseLocation"],
      });
      console.log("Permission request result:", permission);

      if (permission.location !== "granted" && permission.coarseLocation !== "granted") {
        console.log("Permission denied by user");
        mapStatus.value =
          "Location permission is required to show your position on the map.";
        return false;
      }
    }

    console.log("Permission granted successfully");
    return true;
  } catch (e) {
    console.error("Permission request error:", e);
    mapStatus.value = e.message;
    return false;
  }
}

// Function to start watching the device position
async function startWatchingPosition() {
  console.log("Setting up position watching from store");

  try {
    // Set up a watcher for the store position
    watch(
      () => store.anchorData.position,
      (newPosition) => {
        if (
          !newPosition ||
          !newPosition.latitude ||
          !newPosition.longitude ||
          isNaN(newPosition.latitude) ||
          isNaN(newPosition.longitude)
        ) {
          console.log("Invalid position data from store");
          return;
        }

        const coords = [newPosition.longitude, newPosition.latitude];

        // Store valid position for future use
        if (isValidCoordinates(coords)) {
          lastValidPosition.value = coords;
          console.log("Updated lastValidPosition:", lastValidPosition.value);
        }

        // Update the position marker
        updatePositionMarker(coords);
      },
      { deep: true }
    );

    console.log("Position watching from store started");
  } catch (error) {
    console.error("Failed to set up position watching:", error);
    mapStatus.value = `Location tracking error: ${error.message}`;
  }
}

// Function to update the position marker on the map
function updatePositionMarker(coordinates) {
  if (!positionFeature || !coordinates) return;

  // Check for invalid coordinates
  if (
    !coordinates[0] ||
    !coordinates[1] ||
    isNaN(coordinates[0]) ||
    isNaN(coordinates[1])
  ) {
    console.log("Invalid coordinates for position marker:", coordinates);

    // Use last valid position if available
    if (lastValidPosition.value) {
      console.log("Using last valid position instead:", lastValidPosition.value);
      coordinates = lastValidPosition.value;
    } else {
      return;
    }
  }

  // Convert to OpenLayers coordinates
  const olCoords = fromLonLat(coordinates);

  // Update the feature's geometry
  positionFeature.setGeometry(new Point(olCoords));

  // Update the mapPosition ref for reactivity
  mapPosition.value = coordinates;
}

// Function to fetch position data from SignalK API
async function fetchPositionFromSignalK() {
  try {
    console.log("Fetching position from SignalK API");

    // Try to fetch from the local SignalK server
    try {
      const response = await fetch("http://openplotter.local:3000/signalk/v1/api/", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        // Set a reasonable timeout to avoid hanging
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("SignalK API response received");

        const position = extractPositionFromSignalK(data);
        if (position) {
          return position;
        }
      } else {
        console.log(`SignalK API returned status: ${response.status}`);
      }
    } catch (error) {
      console.log("Error fetching from openplotter.local:", error.message);
    }

    // Try alternative URL if the first one fails
    try {
      console.log("Trying alternative SignalK URL (localhost)");
      const response = await fetch("http://localhost:3000/signalk/v1/api/", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("SignalK API response received from localhost");

        const position = extractPositionFromSignalK(data);
        if (position) {
          return position;
        }
      }
    } catch (error) {
      console.log("Error fetching from localhost:", error.message);
    }

    console.log("No valid position data found from any SignalK source");
    return null;
  } catch (error) {
    console.error("Error in fetchPositionFromSignalK:", error);
    return null;
  }
}

// Helper function to extract position data from SignalK response
function extractPositionFromSignalK(data) {
  if (!data || !data.vessels) {
    console.log("Invalid SignalK data format");
    return null;
  }

  // Extract vessel data - first try to find the self vessel
  let vessel = null;

  // Try to find self vessel
  if (data.vessels && data.vessels.self) {
    vessel = data.vessels.self;
    console.log("Found self vessel in SignalK data");
  }
  // Try to find vessel by MMSI
  else if (data.self && data.self.mmsi) {
    const mmsi = data.self.mmsi;
    vessel = data.vessels[`urn:mrn:imo:mmsi:${mmsi}`];
    if (vessel) {
      console.log(`Found vessel with MMSI ${mmsi} in SignalK data`);
    }
  }

  // If no self reference, try to find the first vessel with position data
  if (!vessel || !vessel.navigation || !vessel.navigation.position) {
    console.log("Searching for any vessel with position data");
    for (const key in data.vessels) {
      const currentVessel = data.vessels[key];
      if (
        currentVessel.navigation &&
        currentVessel.navigation.position &&
        currentVessel.navigation.position.value
      ) {
        vessel = currentVessel;
        console.log(`Found vessel with position data: ${key}`);
        break;
      }
    }
  }

  if (!vessel || !vessel.navigation || !vessel.navigation.position) {
    console.log("No vessel with position data found in SignalK response");
    return null;
  }

  const position = vessel.navigation.position;
  if (
    !position.value ||
    typeof position.value.latitude !== "number" ||
    typeof position.value.longitude !== "number" ||
    isNaN(position.value.latitude) ||
    isNaN(position.value.longitude)
  ) {
    console.log("Invalid position data in SignalK response:", position);
    return null;
  }

  console.log(
    `Valid position found: ${position.value.latitude}, ${position.value.longitude}`
  );
  return {
    latitude: position.value.latitude,
    longitude: position.value.longitude,
  };
}

// Function to check if coordinates are valid
function isValidCoordinates(coords) {
  return (
    coords &&
    coords.length === 2 &&
    !isNaN(coords[0]) &&
    !isNaN(coords[1]) &&
    coords[0] !== null &&
    coords[1] !== null
  );
}

/* ---------------------------------------------------------------------
   Moves the wind direction widget bsaed off changes of wind angle
--------------------------------------------------------------------- */
watch(
  () => store.anchorData.wind?.angle,
  (angle) => {
    if (angle === undefined || angle === null) {
      console.log("Wind angle is undefined or null, not rotating");
      return;
    }
    rotateTo("wind-direction", angle);
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
    } else {
      console.log("Wind angle is undefined, not rotating");
    }
  }
);

/* ---------------------------------------------------------------------
  Change the angle of the current lines
--------------------------------------------------------------------- */
watch(
  () => store.anchorData.current.angle,
  (angle) => {
    if (angle === undefined) {
      console.log("Current angle is undefined, not rotating");
      return;
    }
    if (angle === -1) {
      initCurrentLines();
    } else {
      rotateTo("current-lines", angle);
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

// Function to update SVG size based on container size
function updateSvgSize() {
  if (!svgContainer.value) return;

  const containerWidth = svgContainer.value.clientWidth;
  // Set the container height equal to its width for 1:1 aspect ratio
  svgContainer.value.style.height = `${containerWidth}px`;
}

// Add this after your existing console.log statement
function logSignalKData() {
  const data = store.anchorData;
  console.log("======== SIGNALK DATA LOG ========");

  // Log depth data
  console.log("DEPTH:");
  console.log(
    `  • Below Transducer: ${
      data.depth !== undefined ? data.depth + " m" : "Not available"
    }`
  );

  // Log wind data
  console.log("WIND:");
  if (data.wind) {
    console.log(
      `  • Apparent Angle: ${
        data.wind.angleApparent !== undefined
          ? data.wind.angleApparent + "°"
          : "Not available"
      }`
    );
    console.log(
      `  • Apparent Speed: ${
        data.wind.speedApparent !== undefined
          ? data.wind.speedApparent + " kts"
          : "Not available"
      }`
    );
    console.log(
      `  • True Angle: ${
        data.wind.angleTrue !== undefined ? data.wind.angleTrue + "°" : "Not available"
      }`
    );
    console.log(
      `  • True Speed: ${
        data.wind.speedTrue !== undefined ? data.wind.speedTrue + " kts" : "Not available"
      }`
    );
  } else {
    console.log("  • Wind data not available");
  }

  // Log navigation data
  console.log("NAVIGATION:");
  if (data.navigation) {
    if (data.navigation.course && data.navigation.course.calcValues) {
      console.log(
        `  • Bearing Magnetic: ${
          data.navigation.course.calcValues.bearingMagnetic !== undefined
            ? data.navigation.course.calcValues.bearingMagnetic + "°"
            : "Not available"
        }`
      );
      console.log(
        `  • Bearing True: ${
          data.navigation.course.calcValues.bearingTrue !== undefined
            ? data.navigation.course.calcValues.bearingTrue + "°"
            : "Not available"
        }`
      );
    } else {
      console.log("  • Course data not available");
    }
    console.log(
      `  • Speed Over Ground: ${
        data.navigation.speedOverGround !== undefined
          ? data.navigation.speedOverGround + " kts"
          : "Not available"
      }`
    );
  } else {
    console.log("  • Navigation data not available");
  }

  // Log AIS targets
  console.log("AIS TARGETS:");
  if (data.aisTargets && data.aisTargets.length > 0) {
    console.log(`  • Number of targets: ${data.aisTargets.length}`);
    // Log first 3 targets as examples
    const targetsToShow = Math.min(3, data.aisTargets.length);
    for (let i = 0; i < targetsToShow; i++) {
      const target = data.aisTargets[i];
      console.log(`  • Target ${i + 1}:`);
      console.log(`    - MMSI: ${target.mmsi || "Unknown"}`);
      console.log(`    - Name: ${target.name || "Unknown"}`);
      if (target.position) {
        console.log(
          `    - Position: ${target.position.latitude || "N/A"}, ${
            target.position.longitude || "N/A"
          }`
        );
      }
    }
    if (data.aisTargets.length > 3) {
      console.log(`  • ... and ${data.aisTargets.length - 3} more targets`);
    }
  } else {
    console.log("  • No AIS targets available");
  }

  console.log("================================");
}

// // Log the data initially after a short delay
// setTimeout(() => {
//   logSignalKData();
// }, 5000);

// // Set up interval to log data every 15 seconds
// const logInterval = setInterval(() => {
//   logSignalKData();
// }, 15000);

// // Make the logging function available globally for console access
// window.logSignalKData = logSignalKData;
</script>

<style scoped>
.instrument {
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

.standalone-scale-display {
  background: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  bottom: 20px;
  left: 20px;
  padding: 6px 10px;
  position: absolute;
  color: white;
  font-size: 0.9rem;
  font-weight: normal;
  text-align: center;
  min-width: 100px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
  z-index: 9999;
  pointer-events: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
  opacity: 0.35;
}

.screen-width-text {
  margin-top: 4px;
  font-size: 0.8rem;
  opacity: 0.9;
}

.scale-line {
  width: 100%;
  height: 10px;
  margin-top: 4px;
  position: relative;
}

.scale-line-inner {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background-color: white;
  transform: translateY(-50%);
}

.scale-line-inner::before,
.scale-line-inner::after {
  content: "";
  position: absolute;
  top: -4px;
  width: 2px;
  height: 10px;
  background-color: white;
}

.scale-line-inner::before {
  left: 0;
}

.scale-line-inner::after {
  right: 0;
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

.anchor-component {
  background-color: var(--ion-color-primary);
  border-radius: 8px;
  box-shadow: none;
  margin: 0.5rem;
  padding: 0;
  overflow: hidden;
}

.anchor-grid-div {
  max-width: 600px;
  width: 100%;
  min-height: 300px;
  height: auto;
  margin: 0 auto 1rem auto;
  background: linear-gradient(
    180deg,
    var(--ion-color-primary),
    color-mix(in srgb, var(--ion-color-primary), white 15%)
  );
  border-radius: 8px;
  box-shadow: none;
  padding: 0.8rem 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  opacity: 0.95;
  transform: translateY(-12%) scale(0.9);
  transform-origin: center;
}

.title-container {
  display: grid;
  place-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
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
  min-width: 0;
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
    padding-bottom: 95%;
  }

  .anchor-component {
    margin: 0.25rem;
  }
}

.svg-square-container {
  position: relative;
  width: 100%;
  max-width: 580px;
  height: auto;
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
    z-index: 10;
  }

  #svg-canvas {
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    will-change: transform;
  }
}

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
  visibility: visible !important;
  display: block !important;
}

#anchor-graph {
  transform-origin: 300px 300px;
  transform: scale(0.89);
  visibility: visible !important;
  display: block !important;
}

.anchor-container > div:first-child {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

.anchor-grid-div,
.svg-square-container {
  position: relative;
  z-index: 20;
}

.zoom-fab-container {
  position: fixed;
  bottom: 80px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
  pointer-events: auto;
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

.anchor-fab-container {
  position: fixed;
  bottom: 80px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
  pointer-events: auto;
}

.custom-fab-size {
  --size: 50px;
  width: var(--size);
  height: var(--size);
}

.openlayers-map {
  width: 200%;
  height: 200%;
  position: absolute;
  top: -50%;
  left: -50%;
  transition: all 0.3s ease-out;
  transform-origin: center center;
  visibility: visible !important;
  display: block !important;
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
  z-index: 10;
  background: transparent;
}

ion-content {
  --background: transparent;
}

.menu-icon {
  font-size: 24px;
  width: 24px;
  height: 24px;
  color: var(--ion-color-primary-contrast);
}

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

.map-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  padding: 0;
  margin: 0;
  overflow: hidden;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
  visibility: visible !important;
  display: block !important;
}

.osm-map {
  border: none;
  display: block !important;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  pointer-events: auto;
  filter: contrast(1.1);
  visibility: visible !important;
}

svg.instrument {
  background-color: transparent;
}

ion-range {
  --bar-background: var(--ion-color-primary);
  --bar-background-active: var(--ion-color-light);

  --knob-background: var(--ion-color-light);
}
</style>
