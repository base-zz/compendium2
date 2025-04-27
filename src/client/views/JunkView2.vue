<template>
  <ion-page>
    <generic-header title="Junk 2" />
    <ion-header>
      <ion-toolbar>
        <ion-title>Anchor View</ion-title>
        <ion-buttons slot="start">
          <ion-back-button color="light"></ion-back-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-menu-button></ion-menu-button>
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
      <div class="anchor-container">
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
                  r="store.anchorData.criticalRange.r"
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
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button size="small" id="set-anchor-params" color="medium">
            {{ store.anchorData.anchorDeployed ? "Edit Anchor" : "Set Anchor" }}
          </ion-button>
        </ion-buttons>
        <ion-title>Footer</ion-title>

        <ion-buttons slot="end">
          <ion-button
            color="medium"
            size="small"
            id="present-alert"
            :disabled="!store.anchorData.anchorDeployed"
            >Cancel Anchor</ion-button
          >
        </ion-buttons>
        <ion-alert
          trigger="present-alert"
          header="Cancel Anchor?"
          :buttons="alertButtons"
        ></ion-alert>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup>
import {
  computed,
  watch,
  watchEffect,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
} from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import Config from "../../config/config";
import { useAnchorStore } from "../stores/anchor.js";
import { useNavData } from "../stores/navigation.js";
import { useViewStore } from "../stores/view.js";
import { latLonToFeet, feetToLatLon } from "../../util/distance";
import {
  getComplementaryColor,
  adjustBrightness,
  hexToRgba,
  rgbToHex,
  generateColorScheme,
  getHighContrastColor,
} from "@/util/colors";
import CurrentLines from "../components/CurrentLines.vue";
import { range } from "lodash";
import {
  IonButton,
  IonButtons,
  IonBackButton,
  IonToolbar,
  IonModal,
  IonRange,
  IonMenuButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonPage,
  IonTitle,
  IonAlert,
  IonText,
} from "@ionic/vue";

// initialize the anchor store
const store = useAnchorStore();
const { anchorData } = storeToRefs(store);

// initialize the websocket connection
store.initFetchAnchorData();

// view store holds screen size info. Overkill that probably is not necessary
const vs = useViewStore();
const router = useRouter();

// flag to show the modal
const setAnchorFlag = ref(false);

// modal reference
const modal = ref(null);

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
// helps keep the code clean
const compassR = computed(() => {
  // Ensure we have a valid number for the radius, default to 100 if not available
  const criticalR = store.anchorData?.criticalRange?.r ?? 0;
  return criticalR + 30;
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

const brighterPrimaryColor = computed(() => {
  return adjustBrightness(primaryColor.value, 1.3); // 30% brighter
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

// For SVG elements that need a complementary color
const getComplementaryFill = (element) => {
  element.setAttribute("fill", complementaryColor.value);
};

const pos = { N: 0, S: 180, E: 90, W: 270 };
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
onMounted(() => {
  /*
    In setTimeout to ensure the objects have been rendered
  */
  setTimeout(() => {
    // rotate the wind direction widget to the current wind angle
    rotateTo("wind-direction", anchorData.value.wind.angle);
  }, 100);

  // Initialize ResizeObserver to maintain square aspect ratio
  let resizeObserver = null;
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(updateSvgSize);
    if (svgContainer.value) {
      resizeObserver.observe(svgContainer.value);
    }
  }

  // Also update on window resize as a fallback
  window.addEventListener("resize", updateSvgSize);
});

onUnmounted(() => {
  // Clean up ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  // Remove event listener
  window.removeEventListener("resize", updateSvgSize);
});

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
  border: solid 1px var(--ion-color-primary-contrast-rgba-opaque);
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
  font-weight: bold;
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
  }

  .grid-container {
    padding: 0 5px;
  }

  .info-rect-div {
    height: 70px;
    margin: 3px;
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
  z-index: 2;
}

svg.instrument {
  background-color: transparent;
}
</style>
