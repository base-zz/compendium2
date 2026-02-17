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
      background-color: var(--widget-surface-color);
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
      :class="{
        'warning-border': alertSeverity === 'warning',
        'critical-border': alertSeverity === 'critical'
      }"
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
            :class="{
              'battery-warning': alertSeverity === 'warning',
              'battery-critical': alertSeverity === 'critical'
            }"
            fill="var(--widget-surface-color)"
            x="30"
            y="40"
            width="80"
            height="240"
            :stroke="alertSeverity === 'critical' ? '#ef4444' : alertSeverity === 'warning' ? '#f59e0b' : widgetColor"
            stroke-width="5"
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
            :fill="alertSeverity === 'critical' ? '#ef4444' : alertSeverity === 'warning' ? '#f59e0b' : widgetColor"
            stroke-width="2"
            rx="5"
          ></rect>
        </g>
        <g ref="power-group" transform="translate(1.5, 0) scale(0.98)">
          <rect
            class="power power-track"
            x="35"
            y="46"
            width="70"
            height="235"
            fill-opacity="0.12"
            :stroke="alertSeverity === 'critical' ? '#ef4444' : alertSeverity === 'warning' ? '#f59e0b' : widgetColor"
            :fill="alertSeverity === 'critical' ? '#ef4444' : alertSeverity === 'warning' ? '#f59e0b' : widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>
          <rect
            class="power"
            :class="pastThreshold ? 'critical' : ''"
            x="35"
            :y="powerFillY"
            width="70"
            :height="powerFillHeight"
            :stroke="alertSeverity === 'critical' ? '#ef4444' : alertSeverity === 'warning' ? '#f59e0b' : widgetColor"
            :fill="alertSeverity === 'critical' ? '#ef4444' : alertSeverity === 'warning' ? '#f59e0b' : widgetColor"
            stroke-width="1"
            rx="5"
          ></rect>
          <rect
            v-if="powerFillHeight > 0"
            class="power-level-cap"
            x="35"
            :y="powerFillY"
            width="70"
            height="2"
            rx="1"
          ></rect>
        </g>
        <g transform="translate(118,35)">
          <text
            ref="metric"
            class="metric"
            :class="{
              'alert-text-warning': alertSeverity === 'warning',
              'alert-text-critical': alertSeverity === 'critical'
            }"
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
      <text ref="titleRef" class="title" x="150" y="48">
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
const titleRef = ref(null)

const batteryValue = computed(() => {
  return props.widgetData.value ?? 0
})

const widgetColor = computed(() => {
  return props.widgetData.color || '#007bff'
})

const displayValue = computed(() => {
  const value = batteryValue.value
  if (value === null || value === undefined) {
    return "--"
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return "--"
  }

  return Math.round(numeric)
})

const displayVoltage = computed(() => {
  return props.widgetData.voltage != null ? props.widgetData.voltage : "--"
})

const displayAmperage = computed(() => {
  return props.widgetData.amperage != null ? props.widgetData.amperage : "--"
})

const batteryTitle = computed(() => {
  return (
    props.widgetData.widgetTitle ||
    props.widgetData.label ||
    props.widgetData.displayLabel ||
    props.widgetData.widgetName ||
    'Battery'
  )
})

// Computed property to determine the font size class based on the number of digits
const fontSizeClass = computed(() => {
  // Safely get the display value as a string
  const value = String(displayValue.value || '');
  
  // Get the numeric part (remove % sign if present and any non-digit characters)
  const numericValue = value.toString().replace(/[^\d.]/g, '');
  
  // Use smaller font if we have 3 digits (100%)
  return numericValue.length >= 3 ? 'smaller-font' : '';
})

const adjustFontSize = () => {
  if (!metric.value) return;
  
  // Remove any existing font size classes
  metric.value.classList.remove('smaller-font');
  
  // Add the appropriate class based on the current value
  if (fontSizeClass.value) {
    metric.value.classList.add('smaller-font');
  }
}

const resizeTitle = () => {
  const el = titleRef.value
  if (!el) return

  const baseSize = 32
  const minSize = 16
  const maxSize = 42
  const maxWidth = 220

  el.style.fontSize = `${baseSize}px`
  el.setAttribute('font-size', `${baseSize}px`)

  let bbox
  try {
    bbox = el.getBBox()
  } catch (error) {
    return
  }

  if (!bbox || !bbox.width) {
    return
  }

  const ratio = maxWidth / bbox.width
  let newSize = baseSize * ratio

  if (!Number.isFinite(newSize)) {
    newSize = baseSize
  }

  if (ratio < 1) {
    newSize = Math.max(minSize, newSize)
  } else {
    newSize = Math.min(maxSize, Math.max(baseSize, newSize))
  }

  newSize = Math.min(maxSize, Math.max(minSize, newSize))

  el.style.fontSize = `${newSize}px`
  el.setAttribute('font-size', `${newSize}px`)
};

const powerFillTopY = 46
const powerFillBottomY = 281
const powerFillRange = powerFillBottomY - powerFillTopY

const normalizedBatteryPercent = computed(() => {
  const rawValue = Number(batteryValue.value)
  if (!Number.isFinite(rawValue)) {
    return 0
  }
  if (rawValue < 0) {
    return 0
  }
  if (rawValue > 100) {
    return 100
  }
  return rawValue
})

const powerFillHeight = computed(() => {
  return (normalizedBatteryPercent.value / 100) * powerFillRange
})

const powerFillY = computed(() => {
  return powerFillBottomY - powerFillHeight.value
})

const generateBatteryAlerts = () => {
  // Alerts disabled temporarily; implementation needs store integration
  return
}

const threshold = computed(() => {
  return props.widgetData.threshold ?? 20
})

// Determine alert severity: 'none', 'warning', or 'critical'
const alertSeverity = computed(() => {
  const value = batteryValue.value
  const thresholdValue = threshold.value
  const operator = props.widgetData.thresholdOperator || 'LESS_THAN_EQUALS'
  
  // Check if past threshold first
  let isPastThreshold = false
  
  switch(operator) {
    case 'LESS_THAN':
      isPastThreshold = value < thresholdValue
      break
    case 'LESS_THAN_EQUALS':
      isPastThreshold = value <= thresholdValue
      break
    case 'GREATER_THAN':
      isPastThreshold = value > thresholdValue
      break
    case 'GREATER_THAN_EQUALS':
      isPastThreshold = value >= thresholdValue
      break
    case 'EQUALS':
      isPastThreshold = value === thresholdValue
      break
    case 'NOT_EQUALS':
      isPastThreshold = value !== thresholdValue
      break
    default:
      isPastThreshold = value <= thresholdValue
  }
  
  if (!isPastThreshold) return 'none'
  
  // Determine if critical based on severity
  // For batteries, low levels are bad
  if (operator === 'LESS_THAN' || operator === 'LESS_THAN_EQUALS') {
    // Critical if at or below half the threshold OR at 0%
    if (value <= thresholdValue / 2 || value === 0) {
      return 'critical'
    }
    return 'warning'
  }
  
  // For other operators, just use warning
  return 'warning'
})

const pastThreshold = computed(() => {
  return alertSeverity.value !== 'none'
})

// Watchers
watch(batteryValue, () => {
  nextTick(() => {
    adjustFontSize()
    resizeTitle()

    // Generate alerts based on battery level and threshold
    generateBatteryAlerts()
  })
})

watch(batteryTitle, () => {
  nextTick(() => {
    resizeTitle()
  })
})

// Lifecycle
// Function to handle component setup
const setupComponent = () => {
  nextTick(() => {
    adjustFontSize();
    resizeTitle();

    // Emit mounted event once the component is fully initialized
    emit('mounted')
  })
}

onMounted(() => {
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
  background-color: var(--widget-surface-color);
  color: var(--widget-text-color);
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
  fill: var(--widget-text-color);
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
  font-size: 5em; /* Slightly smaller font for 3-digit numbers */
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

/* Alert status styling - Warning (orange) */
.alert-text-warning {
  fill: #f59e0b;
}

.battery-warning {
  stroke: #f59e0b;
}

.warning-border {
  border: none;
  border-radius: 8px;
}

.badge-bg-warning {
  fill: #f59e0b;
}

/* Alert status styling - Critical (red) */
.alert-text-critical {
  fill: #ef4444;
}

.battery-critical {
  stroke: #ef4444;
}

.critical-border {
  border: none;
  border-radius: 8px;
}

.badge-bg-critical {
  fill: #ef4444;
}

/* Alert badge */
.alert-badge {
  animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.badge-icon {
  fill: white;
  font-size: 28px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: middle;
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

.power-level-cap {
  fill: rgba(255, 255, 255, 0.38);
  stroke: none;
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