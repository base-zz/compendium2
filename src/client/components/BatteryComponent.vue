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
    class="battery-container no-tap-highlight"
    @touchstart.prevent
  >
    <svg
      height="100%"
      width="100%"
      ref="svg"
      class="instrument display-component battery-component no-tap-highlight"
      :class="pastThreshold ? 'critical-border' : ''"
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
      <g ref="battery-group" transform="scale(0.72) translate(25, 100)">
        <g ref="battery-body" >
          <rect
            ref="battery"
            class="battery"
            :class="pastThreshold ? 'critical' : ''"
            x="30"
            y="40"
            width="80"
            height="240"
            :stroke="widgetColor"
            stroke-width="3"
            rx="5"
          ></rect>
          <rect
            class="battery"
            :class="pastThreshold ? 'critical' : ''"
            x="50"
            y="25"
            width="40"
            height="15"
            :stroke="widgetColor"
            :fill="pastThreshold ? 'red' : widgetColor"
            stroke-width="2"
            rx="5"
          ></rect>
        </g>
        <g ref="power-group" transform="translate(1.5, 0) scale(0.98)">
          <rect
            ref="power-10"
            class="power"
            :class="pastThreshold ? 'critical' : ''"
            x="35"
            y="46"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-9"
            class="power"
            :class="pastThreshold ? 'critical' : ''"
            x="35"
            y="70"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-8"
            class="power"
            :class="pastThreshold ? 'critical' : ''"
            x="35"
            y="94"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-7"
            class="power"
            :class="pastThreshold ? 'critical' : ''"
            x="35"
            y="118"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-6"
            class="power"
            :class="pastThreshold ? 'critical' : ''"
            x="35"
            y="142"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-5"
            class="power"
            :class="pastThreshold ? 'critical' : ''"
            x="35"
            y="166"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-4"
            class="power"
            :class="pastThreshold ? 'critical' : ''"
            x="35"
            y="190"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-3"
            class="power"
            :class="pastThreshold ? 'critical' : ''"
            x="35"
            y="214"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-2"
            class="power"
            :class="pastThreshold ? 'critical' : ''"
            x="35"
            y="238"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>

          <rect
            ref="power-1"
            class="power"
            :class="pastThreshold ? 'critical' : ''"
            x="35"
            y="262"
            width="70"
            height="19"
            :stroke="widgetColor"
            :fill="widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>
        </g>
        <g transform="translate(118,35)">
          <text
            ref="metric"
            class="metric"
            :class="pastThreshold ? 'pulsating-text' : ''"
            x="114"
            y="80"
          >
            {{ displayValue }}<tspan class="units" dx="5px">%</tspan>
          </text>

          <text class="metric2" x="105" y="175">
            {{ displayVoltage }}<tspan class="units2" dx="5px" dy="-2px">V</tspan>
          </text>

          <text class="metric2" x="105" y="210">
            {{ displayAmperage }}<tspan class="units2" dx="5px" dy="-2px">A</tspan>
          </text>
          
        </g>
      </g>
      <text ref="title" class="title" x="150" y="48">
        {{ batteryTitle }}
      </text>
    </svg>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, nextTick, onActivated } from 'vue'

const props = defineProps({
  widgetData: {
    type: Object,
    required: true,
    default: () => ({
      value: 0,
      voltage: null,
      amperage: null,
      color: '#007bff',
      threshold: 20,
      label: 'Battery'
    })
  }
})

const emit = defineEmits(['mounted'])

// const container = ref(null)
const svg = ref(null)
const metric = ref(null)

const batteryValue = computed(() => {
  return props.widgetData.value ?? 0
})

const widgetColor = computed(() => {
  return props.widgetData.color || '#007bff'
})


const displayValue = computed(() => {
  return batteryValue.value !== null && batteryValue.value !== undefined
    ? batteryValue.value
    : "--"
})

const displayVoltage = computed(() => {
  return props.widgetData.voltage != null ? props.widgetData.voltage : "--"
})

const displayAmperage = computed(() => {
  return props.widgetData.amperage != null ? props.widgetData.amperage : "--"
})

const batteryTitle = computed(() => {
  return props.widgetData.label || props.widgetData.displayLabel || 'Battery'
})

// Computed property to determine the font size class based on the number of digits
const fontSizeClass = computed(() => {
  // Safely get the display value as a string
  const value = String(displayValue.value || '');
  
  // Get the numeric part (remove % sign if present and any non-digit characters)
  const numericValue = value.toString().replace(/[^\d.]/g, '');
  
  // Use smaller font if we have 3 digits (100%)
  return numericValue.length >= 3 ? 'smaller-font' : '';
});

const adjustFontSize = () => {
  if (!metric.value) return;
  
  // Remove any existing font size classes
  metric.value.classList.remove('smaller-font');
  
  // Add the appropriate class based on the current value
  if (fontSizeClass.value) {
    metric.value.classList.add('smaller-font');
  }
}

const threshold = computed(() => {
  return props.widgetData.threshold ?? 20
})

const pastThreshold = computed(() => {
  // Get the battery value
  const value = batteryValue.value
  // Get the threshold value
  const thresholdValue = threshold.value
  
  // Check if thresholdOperator exists in the widget data
  if ('thresholdOperator' in props.widgetData) {
    const operator = props.widgetData.thresholdOperator
    
    // Apply the appropriate comparison based on the operator
    switch(operator) {
      case 'LESS_THAN':
        return value < thresholdValue
      case 'LESS_THAN_EQUALS':
        return value <= thresholdValue
      case 'GREATER_THAN':
        return value > thresholdValue
      case 'GREATER_THAN_EQUALS':
        return value >= thresholdValue
      case 'EQUALS':
        return value === thresholdValue
      case 'NOT_EQUALS':
        return value !== thresholdValue
      default: {
        // Default behavior for batteries is to alert when below threshold
        return value <= thresholdValue
      }
    }
  } else {
    // Default behavior for batteries is to alert when below threshold
    return value <= thresholdValue
  }
})



// Import the state store for alerts
import { useStateDataStore } from '../stores/stateDataStore';
const stateStore = useStateDataStore();

// Watchers
watch(batteryValue, () => {
  nextTick(() => {
    adjustFontSize()
    setPowerMarker()
    
    // Generate alerts based on battery level and threshold
    generateBatteryAlerts()
  })
})

// Generate alerts for battery levels
const generateBatteryAlerts = () => {
  let alert;
  const batteryId = props.widgetData?.id || 'unknown-battery';
  const batteryLabel = props.widgetData?.label || 'Battery';
  const batteryValue = props.widgetData.value;
  const thresholdValue = typeof props.widgetData.threshold === 'number' ? props.widgetData.threshold : 20;
  const operator = props.widgetData.thresholdOperator || 'LESS_THAN';
  
  // Check if we should trigger an alert based on the threshold and operator
  if (pastThreshold.value) {
    // The battery level has crossed the configured threshold
    alert = stateStore.newAlert();
    
    // Set appropriate alert title and message based on the operator
    if (operator === 'LESS_THAN' || operator === 'LESS_THAN_EQUALS') {
      alert.title = "Low Battery Level";
      alert.message = `${batteryLabel} level is low at ${batteryValue}%`;
    } else {
      alert.title = "High Battery Level";
      alert.message = `${batteryLabel} level is high at ${batteryValue}%`;
    }
    
    alert.label = batteryLabel;
    alert.type = "warning";
    alert.category = "electrical";
    alert.level = "warning";
    alert.data = {
      widget: "battery",
      variable: "capacity",
      value: batteryValue,
      batteryId: batteryId,
      threshold: thresholdValue,
      operator: operator
    };
    
    stateStore.addAlertWithPrevention(alert, {
      strategies: stateStore.AlertPreventionStrategy.STATE_TRACKING,
      signature: `battery-${batteryId}-threshold-alert`,
      value: batteryValue,
      threshold: thresholdValue,
      isHigherBad: operator === 'GREATER_THAN' || operator === 'GREATER_THAN_EQUALS'
    });
    
    // For batteries, we typically care about low levels
    // Add a critical alert for very low battery levels
    if ((operator === 'LESS_THAN' || operator === 'LESS_THAN_EQUALS') && batteryValue <= thresholdValue / 2) {
      alert = stateStore.newAlert();
      alert.title = "Critical Battery Level";
      alert.label = batteryLabel;
      alert.message = `${batteryLabel} is critically low at ${batteryValue}%`;
      alert.type = "error";
      alert.category = "electrical";
      alert.level = "critical";
      alert.data = {
        widget: "battery",
        variable: "capacity",
        value: batteryValue,
        batteryId: batteryId,
        threshold: thresholdValue / 2
      };
      
      stateStore.addAlertWithPrevention(alert, {
        strategies: [
          stateStore.AlertPreventionStrategy.STATE_TRACKING,
          stateStore.AlertPreventionStrategy.COOLDOWN
        ],
        signature: `battery-${batteryId}-critical`,
        value: batteryValue,
        threshold: thresholdValue / 2,
        isHigherBad: false,
        cooldownMs: 1800000 // Remind every 30 minutes for critical levels
      });
    }
  }
}

// Watch for threshold changes
watch(threshold, () => {
  nextTick(() => {
    adjustFontSize()
    setPowerMarker()
  })
})

// Component-specific methods
const setPowerMarker = () => {
  const powerLevel = Math.floor(batteryValue.value / 10)
  const powerRefs = [
    'power-10', 'power-9', 'power-8', 'power-7',
    'power-6', 'power-5', 'power-4', 'power-3',
    'power-2', 'power-1'
  ]

  powerRefs.forEach((power, index) => {
    const el = document.getElementById(power)
    if (el) {
      el.style.fill = index < powerLevel ? widgetColor.value : 'none'
    }
  })
}

// Lifecycle
// Function to handle component setup
const setupComponent = () => {
  nextTick(() => {
    adjustFontSize();
    setPowerMarker();
  });
}

onMounted(() => {
  emit('mounted')
  // Initial setup
  setupComponent()
})

// Handle component being shown again after navigation
onActivated(() => {
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    setupComponent()
  }, 50)
})
</script>


<style scoped>
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

text {
  font-weight: bold;
  fill: var(--ion-color-primary-contrast);
  text-anchor: middle;
}

.title {
  font-size: 2.75em;
  font-weight: bold;
  padding: 0.35em;
  padding-top: 0.6;
  text-anchor: middle;
}
.metric {
  font-size: 6.5em;
  transition: font-size 0.2s ease;
}

.metric.smaller-font {
  font-size: 5.5em; /* Slightly smaller font for 3-digit numbers */
}

.metric2 {
  font-size: 1.75em;
}

.units {
  font-size: 0.5em;
}

.units2 {
  font-size: 0.5em;
}

.pulsating-text {
  font-weight: bolder;
  stroke: red;
  fill: red;
  animation: pulsate-text 1.5s ease-in-out infinite;
}

.critical {
  stroke: red;
}
.critical-border {
  border: none;
  border-radius: 8px;
  -webkit-box-shadow: 0px 0px 6px red, 0px 0px 6px rgb(241, 45, 45);
  -moz-box-shadow: 0px 0px 6px red, 0px 0px 6px rgb(241, 45, 45);
  box-shadow: 0px 0px 6px red, 0px 0px 6px rgb(241, 45, 45);
}

.battery-container {
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

.battery-component {
  pointer-events: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
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