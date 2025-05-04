<template>
  <div
    style="
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0;
      margin: 0;
      background-color: var(--ion-color-primary);
      border-radius: 8px;
      -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
      -webkit-touch-callout: none !important;
      user-select: none !important;
      pointer-events: auto;
      touch-action: manipulation;
      -webkit-user-drag: none;
      -webkit-appearance: none;
      appearance: none;
      outline: none !important;
    "
    class="tank-level-container no-tap-highlight"
    @touchstart.prevent
  >
    <svg
      height="100%"
      width="100%"
      ref="svg"
      class="instrument display-component tank-component no-tap-highlight"
      viewBox="0 0 300 300"
      preserveAspectRatio="xMidYMid meet"
      style="
        max-width: 100%; 
        max-height: 100%;
        -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
        -webkit-touch-callout: none !important;
        user-select: none !important;
        pointer-events: none;
        touch-action: manipulation;
        -webkit-user-drag: none;
        -webkit-appearance: none;
        appearance: none;
        outline: none !important;
      "
      @touchstart.prevent
    >
      <clipPath id="cut-off-wave">
        <path
          ref="wave"
          d="M0 0 
         Q 0 35 25  0
         Q 50 35 75  0
         Q 100 35 125 0         
        Q 150 35 175 0
        Q 200 35 225 0
        Q 250 35 275 0
        Q 300 35 325 0 
        Q 350 35 375 0
        Q 400 35 425 0 
        Q 450 35 475 0 
        Q 500 35 525 0 
        Q 550 35 575 0 
        Q 575 425 475 425
        Q 375 425 275 425
        Q 175 425 75 425
        Q 50 425 0 425        
        "
          :stroke="fluidTypeToColor()"
          :fill="fluidTypeToColor()"
          stroke-width="2"
        />
      </clipPath>
      <g>
        <rect
          class="ring"
          v-bind:class="pastThreshold ? 'pulsating' : ''"
          x="0"
          y="0"
          width="300"
          height="300"
        />
        <rect class="base" x="0" y="0" width="300" height="300" />

        <rect
          class="fluid"
          x="0"
          y="0"
          width="300"
          height="300"
          rx="15"
          :fill="fluidTypeToColor()"
          clip-path="url(#cut-off-wave)"
        />

        <text
          class="metric instrument-value"
          :class="pastThreshold ? 'pulsating-text' : ''"
          x="150"
          y="165"
        >
          {{ props.data?.value || "0" }}
        </text>
        <text ref="title" class="title" x="150" y="35">
          {{ props.widget?.widgetTitle || props.data?.label || "Tank" }}
        </text>
        <text class="units" x="266" y="95" ref="unitsRef">
          {{ props.data?.units || "%" }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed, useTemplateRef, watch, onMounted } from "vue";
import { useStateDataStore } from "../stores/stateDataStore.js";
import { scaleLinear } from "d3";

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => {},
  },
  widget: {
    type: Object,
    required: true,
    default: () => {},
  },
  fluidType: { type: String, required: false, default: () => "water" },
  threshold: { type: Number, required: false, default: () => 20 },
  invertThreshold: { type: Boolean, required: false, default: () => false },
  layout: {
    type: Object,
    required: false,
  },
  label: {
    type: String,
    required: false,
    default: "Tank - No Label",
  },
});

const emit = defineEmits(["mounted"]);

const stateStore = useStateDataStore();

console.log("tank props", props);
/* ****************************************
   refences the clipPath that gets moved up and down
   for fluid level animation
   **************************************** */
const svg = useTemplateRef("svg");
const wave = useTemplateRef("wave");
const titleRef = useTemplateRef("title");

/* ****************************************
    Calculated value that performs this
    logic
   **************************************** */
const pastThreshold = computed(() => {
  // if (props.invertThreshold) {
  //   return props.data.value > props.threshold;
  // } else {
  //   return props.data.value < props.threshold;
  // }
  return false;
});

/**
 * Converts a fluid level percentage to a translation value for animation purposes.
 * This function maps the level percentage from a domain of 0 to 100 into a range
 * of 20 to 100 using a linear scale.
 *
 * @param {number} level - The percentage level of the fluid.
 * @returns {number} The translated value for use in animations.
 */
const levelToTranslate = (level) => {
  const scale = scaleLinear().domain([0, 100]).range([20, 100]);
  return scale(level);
};

/**
 * Returns the color associated with the fluid type.
 * The color is determined by a predefined lookup table.
 *
 * @returns {string} The hex color code for the specified fluid type.
 */
function fluidTypeToColor() {
  const lookup = {
    water: "#1f6591",
    diesel: "#912a1f",
    gasoline: "#9e8315",
    waste: "#807e79",
  };
  // Use tankType from widget prop if available, otherwise default to fluidType prop
  const fluidType = props.widget?.tankType || props.fluidType;
  return lookup[fluidType] || lookup.water; // Default to water if type not found
}

/**
 * Checks if the text element overflows its container and rescales the font size accordingly
 * @param {SVGTextElement} el - The text element to check
 */
function checkFontSize(el) {
  const actualWidth = el.getBBox().width;
  const widthThreshold = 0.9 * 300;
  if (actualWidth <= widthThreshold) return;

  const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
  const newFontSize = fontSize * (widthThreshold / actualWidth);
  el.style.fontSize = `${newFontSize}px`;
}

/**
 * Set the fluid level animation based on the current props.level.
 * The animation lasts 15 seconds and repeats indefinitely.
 */
function setFluidLevel() {
  // Define keyframes for animation
  const keyframes = [
    {
      transform: `translateX(0) translateY(${100 - levelToTranslate(props.data.value)}%)`,
    },
    {
      transform: `translateX(-50%) translateY(${
        100 - levelToTranslate(props.data.value)
      }%)`,
    },
  ];

  // Animation options
  const animationOptions = {
    duration: 15000,
    iterations: Infinity,
  };

  // Start the animation
  wave.value.animate(keyframes, animationOptions);
}

/**
 * When the prop.level changes, update the fluid level graphic.
 */
watch(
  () => props.data.value,
  () => {
    setFluidLevel();

    let alert;
    const tankId = props.widget?.id || 'unknown-tank';
    const tankLabel = props.label || props.widget?.widgetTitle || 'Tank';
    const tankValue = props.data.value;

    // For tank levels, STATE_TRACKING is ideal since we only want to alert
    // when crossing from normal to alert state
    
    // Warning threshold (e.g. 20%)
    if (tankValue <= props.threshold && tankValue > props.threshold / 2) {
      alert = stateStore.newAlert();
      alert.title = "Tank Warning";
      alert.label = tankLabel;
      alert.message = `Tank level is ${tankValue}%`;
      alert.type = "warning";
      alert.category = "tank";
      alert.level = "warning";
      alert.data = {
        widget: "tank",
        variable: "pct",
        value: tankValue,
        tankId: tankId,
        threshold: props.threshold
      };
      
      stateStore.addAlertWithPrevention(alert, {
        strategies: stateStore.AlertPreventionStrategy.STATE_TRACKING,
        signature: `tank-${tankId}-warning`,
        value: tankValue,
        threshold: props.threshold,
        isHigherBad: false // For tanks, lower values are bad
      });
      
    // Low threshold (e.g. 10%)
    } else if (tankValue <= props.threshold / 2 && tankValue > props.threshold / 4) {
      alert = stateStore.newAlert();
      alert.title = "Tank Low";
      alert.label = tankLabel;
      alert.message = `Tank level is low at ${tankValue}%`;
      alert.type = "error";
      alert.category = "tank";
      alert.level = "error";
      alert.data = {
        widget: "tank",
        variable: "pct",
        value: tankValue,
        tankId: tankId,
        threshold: props.threshold / 2
      };
      
      stateStore.addAlertWithPrevention(alert, {
        strategies: stateStore.AlertPreventionStrategy.STATE_TRACKING,
        signature: `tank-${tankId}-low`,
        value: tankValue,
        threshold: props.threshold / 2,
        isHigherBad: false
      });
      
    // Critical threshold (e.g. 5%)
    } else if (tankValue <= props.threshold / 4) {
      alert = stateStore.newAlert();
      alert.title = "Critical Tank Level";
      alert.label = tankLabel;
      alert.message = `Tank level is critically low at ${tankValue}%`;
      alert.type = "error";
      alert.category = "tank";
      alert.level = "critical";
      alert.data = {
        widget: "tank",
        variable: "pct",
        value: tankValue,
        tankId: tankId,
        threshold: props.threshold / 4
      };
      
      stateStore.addAlertWithPrevention(alert, {
        // For critical alerts, we might want both state tracking and a cooldown
        // to remind the user periodically even if they don't refill
        strategies: [
          stateStore.AlertPreventionStrategy.STATE_TRACKING,
          stateStore.AlertPreventionStrategy.COOLDOWN
        ],
        signature: `tank-${tankId}-critical`,
        value: tankValue,
        threshold: props.threshold / 4,
        isHigherBad: false,
        cooldownMs: 1800000 // Remind every 30 minutes for critical levels
      });
    }
  }
);

onMounted(() => {
  checkFontSize(titleRef.value);
  setTimeout(() => {
    emit("mounted");
  }, 100);
});
</script>

<style scoped>
text {
  font-weight: bold;
  fill: var(--ion-color-primary-contrast);
  dominant-baseline: middle;
  text-anchor: middle;
}

.instrument {
  height: 100% !important;
  width: 100% !important;
  aspect-ratio: 1 / 1 !important;
  background-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border: none;
  border-radius: 8px;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent !important; /* Disable iOS tap highlight */
  -webkit-touch-callout: none; /* Disable callout */
  user-select: none; /* Disable text selection */
}
.title {
  font-size: 2.25em;
  font-weight: bold;
  padding: 0.35em;
  padding-top: 0.6;
}
.metric {
  font-size: 6.75em;
}
.units {
  font-size: 1.75em;
}
.ring {
  fill: var(--ion-color-primary-contrast);
  stroke: var(--ion-color-primary-contrast);
  stroke-width: 8px;
}

.base {
  fill: var(--ion-color-primary);
}

.instrument-value {
  font-size: 30px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: middle;
  fill: white;
}

.tank-level-container {
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

.tank-component {
  pointer-events: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

@keyframes pulsate {
  0% {
    stroke-width: 5px;
    opacity: 0.7;
  }

  50% {
    stroke-width: 10px;
    opacity: 1;
    /* Slightly fade */
  }

  100% {
    stroke-width: 5px;
    opacity: 0.7;
    /* Return to original size and full opacity */
  }
}

.pulsating {
  animation: pulsate 2s ease-in-out infinite;
  transform-origin: center;
  font-weight: bolder;
  stroke: red;
}

@keyframes pulsateText {
  0% {
    font-size: 6em;
    opacity: 1;
  }

  50% {
    font-size: 6.1em;
    opacity: 0.7;
  }

  100% {
    font-size: 6em;
    opacity: 1;
  }
}

.pulsating-text {
  animation: pulsateText 2s ease-in-out infinite;
  transform-origin: center;
  /* Ensure scaling happens from the center */
  font-weight: bolder;
  stroke: red;
  fill: red;
}

.fluid {
  opacity: 0.45;
}

.no-tap-highlight {
  -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  pointer-events: none;
  touch-action: manipulation;
  -webkit-user-drag: none;
  -webkit-appearance: none;
  appearance: none;
  outline: none !important;
}
</style>
