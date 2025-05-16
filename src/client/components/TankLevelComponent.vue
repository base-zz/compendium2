<template>
  <div class="tank-level-container" ref="container">
    <svg
      width="100%"
      height="100%"
      ref="svg"
      class="tank-component"
      viewBox="0 0 300 300"
      preserveAspectRatio="xMidYMid meet"
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
          :fill-opacity="props.widgetData.fluidType === 'black' || props.widgetData.fluidType === 'blackWater' ? 1 : 0.9"
          clip-path="url(#cut-off-wave)"
        />

        <text
          class="metric instrument-value"
          :class="pastThreshold ? 'pulsating-text' : ''"
          x="150"
          y="165"
        >
          {{ Math.round(props.widgetData.value) }}
        </text>
        <text
          ref="title"
          class="title"
          x="150"
          y="45"
        >
          {{ props.widgetData.label || props.widgetData.title || props.widgetData.widgetTitle || 'Tank Level' }}
        </text>
        <text class="units" x="266" y="95" ref="unitsRef">
          {{ props.widgetData.units || "%" }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { useStateDataStore } from '../stores/stateDataStore'

const stateStore = useStateDataStore()
const props = defineProps({
  widgetData: {
    type: Object,
    required: true,
    default: () => ({
      value: 0,
      threshold: 20,
      fluidType: 'water',
      label: 'Tank',
      id: 'unknown-tank',
      units: '%'
    })
  }
})

const emit = defineEmits(['mounted'])

const container = ref(null)
const svg = ref(null)
const wave = ref(null)
const titleRef = ref(null)
const metric = ref(null)

const fluidValue = computed(() => {
  return props.widgetData.value || 0
})

const pastThreshold = computed(() => {
  const threshold = Number(typeof props.widgetData.threshold === 'number' ? props.widgetData.threshold : 20)
  const value = Number(typeof fluidValue.value === 'number' ? fluidValue.value : 0)
  
  if ('thresholdOperator' in props.widgetData) {
    const operator = props.widgetData.thresholdOperator
    
    let result = false
    let comparisonResult = false
    
    switch(operator) {
      case 'LESS_THAN':
        comparisonResult = value < threshold
        result = comparisonResult
        break
      case 'LESS_THAN_EQUALS':
        comparisonResult = value <= threshold
        result = comparisonResult
        break
      case 'GREATER_THAN':
        comparisonResult = value > threshold
        result = comparisonResult
        break
      case 'GREATER_THAN_EQUALS':
        comparisonResult = value >= threshold
        result = comparisonResult
        break
      case 'EQUALS':
        comparisonResult = value === threshold
        result = comparisonResult
        break
      case 'NOT_EQUALS':
        comparisonResult = value !== threshold
        result = comparisonResult
        break
      default:
        comparisonResult = value < threshold
        result = comparisonResult
        break
    }
    
    return result
  } else {
    const fluidType = props.widgetData.fluidType || 'water'
    
    let result = false
    if (fluidType === 'water' || fluidType === 'freshWater' || fluidType === 'fuel') {
      result = value < threshold 
    } else {
      result = value > threshold 
    }
    
    return result
  }
})

const adjustFontSize = () => {
  if (!metric.value) return
  const rect = metric.value.getBoundingClientRect()
  const fontSize = Math.min(100, Math.max(20, 100 * (rect.width / 150)))
  metric.value.style.fontSize = `${fontSize}px`
}

watch(fluidValue, () => {
  nextTick(() => {
    adjustFontSize()
  })
})

onMounted(() => {
  setFluidLevel();
  emit('mounted')
  adjustFontSize()
})

const levelToTranslate = (level) => {
  return Math.min(100, Math.max(20, 20 + (level / 100) * 80))
}

const fluidTypeToColor = () => {
  const fluidType = props.widgetData.fluidType || 'water'
  
  const colors = {
    water: '#007bff',
    freshWater: '#007bff',
    waste: '#7f8c8d',
    wasteWater: '#7f8c8d',
    black: '#000',
    blackWater: '#000',
    diesel: '#8b4513',
    gasoline: '#e67e22',
    fuel: '#e67e22',
    other: '#6c757d'
  }
  
  const color = colors[fluidType] || colors.other
  return color
}

watch(() => props.widgetData.threshold, () => {
  nextTick(() => {
    adjustFontSize()
  })
})

function setFluidLevel() {
  let tankLevel = 0;
  if (typeof props.widgetData.value === 'number') {
    tankLevel = props.widgetData.value;
  } else if (props.widgetData.data && typeof props.widgetData.data.value === 'number') {
    tankLevel = props.widgetData.data.value;
  } else {
  }
  
  const keyframes = [
    {
      transform: `translateX(0) translateY(${100 - levelToTranslate(tankLevel)}%)`,
    },
    {
      transform: `translateX(-50%) translateY(${
        100 - levelToTranslate(tankLevel)
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


watch(
  () => props.widgetData.value,
  () => {
    setFluidLevel();

    let alert;
    const tankId = props.widgetData?.id || 'unknown-tank';
    const tankLabel = props.widgetData?.label || 'Tank';
    const tankValue = props.widgetData.value;
    const thresholdValue = typeof props.widgetData.threshold === 'number' ? props.widgetData.threshold : 20;
    const operator = props.widgetData.thresholdOperator || 
                    (props.widgetData.fluidType === 'water' ? 'LESS_THAN' : 'GREATER_THAN');
    
    // Check if we should trigger an alert based on the threshold and operator
    if (pastThreshold.value) {
      // The tank level has crossed the configured threshold
      alert = stateStore.newAlert();
      
      // Set appropriate alert title and message based on the operator
      if (operator === 'LESS_THAN' || operator === 'LESS_THAN_EQUALS') {
        alert.title = "Low Tank Level";
        alert.message = `${tankLabel} level is low at ${tankValue}%`;
      } else {
        alert.title = "High Tank Level";
        alert.message = `${tankLabel} level is high at ${tankValue}%`;
      }
      
      alert.label = tankLabel;
      alert.type = "warning";
      alert.category = "tank";
      alert.level = "warning";
      alert.data = {
        widget: "tank",
        variable: "pct",
        value: tankValue,
        tankId: tankId,
        threshold: thresholdValue,
        operator: operator
      };
      
      stateStore.addAlertWithPrevention(alert, {
        strategies: stateStore.AlertPreventionStrategy.STATE_TRACKING,
        signature: `tank-${tankId}-threshold-alert`,
        value: tankValue,
        threshold: thresholdValue,
        isHigherBad: operator === 'GREATER_THAN' || operator === 'GREATER_THAN_EQUALS'
      });
    }
    
    // We'll still keep the critical alerts for very low/high levels
    if (operator === 'LESS_THAN' || operator === 'LESS_THAN_EQUALS') {
      // For tanks where low levels are bad (fresh water, fuel)
      // Critical low threshold (e.g. 10%)
      if (tankValue <= thresholdValue / 2) {
        alert = stateStore.newAlert();
        alert.title = "Critical Low Tank Level";
        alert.label = tankLabel;
        alert.message = `${tankLabel} level is critically low at ${tankValue}%`;
        alert.type = "error";
        alert.category = "tank";
        alert.level = "critical";
        alert.data = {
          widget: "tank",
          variable: "pct",
          value: tankValue,
          tankId: tankId,
          threshold: thresholdValue / 2
        };
        
        stateStore.addAlertWithPrevention(alert, {
          strategies: [
            stateStore.AlertPreventionStrategy.STATE_TRACKING,
            stateStore.AlertPreventionStrategy.COOLDOWN
          ],
          signature: `tank-${tankId}-critical-low`,
          value: tankValue,
          threshold: thresholdValue / 2,
          isHigherBad: false,
          cooldownMs: 1800000 // Remind every 30 minutes for critical levels
        });
      }
    } else {
      // For tanks where high levels are bad (waste/black water)
      // Critical high threshold (e.g. 90%)
      if (tankValue >= thresholdValue * 1.1) {
        alert = stateStore.newAlert();
        alert.title = "Critical High Tank Level";
        alert.label = tankLabel;
        alert.message = `${tankLabel} level is critically high at ${tankValue}%`;
        alert.type = "error";
        alert.category = "tank";
        alert.level = "critical";
        alert.data = {
          widget: "tank",
          variable: "pct",
          value: tankValue,
          tankId: tankId,
          threshold: thresholdValue * 1.1
        };
        
        stateStore.addAlertWithPrevention(alert, {
          strategies: [
            stateStore.AlertPreventionStrategy.STATE_TRACKING,
            stateStore.AlertPreventionStrategy.COOLDOWN
          ],
          signature: `tank-${tankId}-critical-high`,
          value: tankValue,
          threshold: thresholdValue * 1.1,
          isHigherBad: true,
          cooldownMs: 1800000 // Remind every 30 minutes for critical levels
        });
      }
    }
  }
);

onMounted(() => {
  adjustFontSize();
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

  text-anchor: middle;
  dominant-baseline: middle;
  fill: white;
}

.tank-level-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  margin: 0;
  background-color: var(--ion-color-primary);
  border-radius: 8px;
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
  /* Add a more visible indicator for debugging */
  stroke-width: 15px !important;
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
