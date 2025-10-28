<template>
  <div class="ruuvi-widget-container">
    <svg
      width="100%"
      height="100%"
      ref="svg"
      class="ruuvi-component"
      viewBox="0 0 300 300"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- Background -->
      <rect class="background" x="0" y="0" width="300" height="300" rx="8" />
      
      <!-- Title -->
      <text class="title" x="150" y="30">
        {{ deviceLabel }}
      </text>
      
      <!-- Temperature - Large display -->
      <g class="temperature-group">
        <text class="metric-large" x="150" y="100">
          {{ displayTemperature }}
          <tspan class="units-large" dx="5">{{ temperatureUnit }}</tspan>
        </text>
      </g>
      
      <!-- Humidity and Pressure - Side by side -->
      <g class="secondary-metrics">
        <!-- Humidity -->
        <g transform="translate(75, 170)">
          <text class="metric-label" x="0" y="0">Humidity</text>
          <text class="metric-medium" x="0" y="30">
            {{ displayHumidity }}
            <tspan class="units-medium" dx="3">%</tspan>
          </text>
        </g>
        
        <!-- Pressure -->
        <g transform="translate(225, 170)">
          <text class="metric-label" x="0" y="0">Pressure</text>
          <text class="metric-medium" x="0" y="30">
            {{ displayPressure }}
            <tspan class="units-medium" dx="3">hPa</tspan>
          </text>
        </g>
      </g>
      
      <!-- Battery and Movement on same line -->
      <g transform="translate(0, 260)">
        <!-- Battery Voltage -->
        <g transform="translate(75, 0)">
          <text class="metric-label-small" x="0" y="0">Battery</text>
          <text class="metric-tiny" x="0" y="18">
            {{ displayBattery }}
            <tspan class="units-tiny" dx="2">V</tspan>
          </text>
        </g>
        
        <!-- Movement Counter (if available) -->
        <g transform="translate(225, 0)" v-if="hasMovementData">
          <text class="metric-label-small" x="0" y="0">Movement</text>
          <text class="metric-tiny" x="0" y="18">
            {{ displayMovement }}
          </text>
        </g>
      </g>
      
      <!-- Last Update Indicator -->
      <circle 
        :class="['status-indicator', isStale ? 'stale' : 'active']"
        cx="280" 
        cy="20" 
        r="6"
      />
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePreferencesStore } from '../stores/preferences'
import { useStateDataStore } from '../stores/stateDataStore'

const props = defineProps({
  widgetData: {
    type: Object,
    required: true,
    default: () => ({
      dataSource: null, // Device ID
      sensorData: null,
      lastSensorUpdate: null,
      label: 'Ruuvi Sensor',
      name: 'Ruuvi'
    })
  },
  data: {
    type: Object,
    required: false
  }
})

const emit = defineEmits(['mounted'])

const preferencesStore = usePreferencesStore()
const stateStore = useStateDataStore()
const svg = ref(null)
const currentTime = ref(Date.now())

// Get device data from state store based on dataSource (device ID)
const deviceData = computed(() => {
  const deviceId = props.widgetData?.dataSource || props.data?.dataSource
  if (!deviceId) return null
  
  return stateStore.state.bluetooth?.devices?.[deviceId] || null
})

// Update current time every second for stale detection
let timeInterval = null
onMounted(() => {
  emit('mounted')
  timeInterval = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})

// Device label
const deviceLabel = computed(() => {
  return props.widgetData?.label || props.data?.label || deviceData.value?.name || deviceData.value?.localName || 'Ruuvi Sensor'
})

// Temperature
const displayTemperature = computed(() => {
  const sensorData = deviceData.value?.sensorData
  if (!sensorData?.temperature) return '--'
  
  // Debug logging
  console.log('Ruuvi - Preferences:', preferencesStore.preferences)
  console.log('Ruuvi - useImperial:', preferencesStore.preferences?.units?.useImperial)
  
  // Use user preference for temperature unit (useImperial = true means Fahrenheit)
  if (preferencesStore.preferences?.units?.useImperial) {
    console.log('Ruuvi - Using Fahrenheit:', sensorData.temperature.fahrenheit)
    return sensorData.temperature.fahrenheit?.toFixed(1) || '--'
  }
  console.log('Ruuvi - Using Celsius:', sensorData.temperature.value)
  return sensorData.temperature.value?.toFixed(1) || '--'
})

const temperatureUnit = computed(() => {
  return preferencesStore.preferences?.units?.useImperial ? '°F' : '°C'
})

// Humidity
const displayHumidity = computed(() => {
  const humidity = deviceData.value?.sensorData?.humidity?.value
  return humidity != null ? humidity.toFixed(1) : '--'
})

// Pressure
const displayPressure = computed(() => {
  const pressure = deviceData.value?.sensorData?.pressure?.value
  return pressure != null ? pressure.toFixed(0) : '--'
})

// Battery
const displayBattery = computed(() => {
  const voltage = deviceData.value?.sensorData?.battery?.voltage?.value
  if (voltage == null) return '--'
  // Convert mV to V
  return (voltage / 1000).toFixed(2)
})

// Movement counter
const hasMovementData = computed(() => {
  return deviceData.value?.sensorData?.counters?.movement != null
})

const displayMovement = computed(() => {
  return deviceData.value?.sensorData?.counters?.movement || 0
})

// Check if data is stale (no update in last 5 minutes)
const isStale = computed(() => {
  if (!deviceData.value?.lastSensorUpdate) return true
  
  const lastUpdate = new Date(deviceData.value.lastSensorUpdate).getTime()
  const fiveMinutes = 5 * 60 * 1000
  
  return (currentTime.value - lastUpdate) > fiveMinutes
})
</script>

<style scoped>
.ruuvi-widget-container {
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

.ruuvi-component {
  pointer-events: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

.background {
  fill: var(--ion-color-primary);
}

text {
  fill: var(--ion-color-primary-contrast);
  text-anchor: middle;
  dominant-baseline: middle;
}

.title {
  font-size: 1.425em;
  font-weight: bold;
  fill: var(--ion-color-primary-contrast);
}

.metric-large {
  font-size: 4.2em;
  font-weight: bold;
}

.units-large {
  font-size: 0.4em;
}

.metric-medium {
  font-size: 1.9em;
  font-weight: bold;
}

.units-medium {
  font-size: 0.475em;
}

.metric-small {
  font-size: 1.425em;
  font-weight: bold;
}

.units-small {
  font-size: 0.57em;
}

.metric-label {
  font-size: 1.14em;
  fill: var(--ion-color-primary-contrast);
  font-weight: 600;
}

.metric-label-small {
  font-size: 0.9em;
  fill: var(--ion-color-primary-contrast);
  font-weight: 600;
}

.metric-tiny {
  font-size: 1.1em;
  font-weight: bold;
}

.units-tiny {
  font-size: 0.55em;
}

.status-indicator {
  transition: fill 0.3s ease;
}

.status-indicator.active {
  fill: #28a745;
  animation: pulse 2s ease-in-out infinite;
}

.status-indicator.stale {
  fill: #dc3545;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.secondary-metrics {
  /* Group styling if needed */
}
</style>
