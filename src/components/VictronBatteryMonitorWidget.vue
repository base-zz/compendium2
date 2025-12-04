<template>
  <div class="victron-widget-container">
    <svg 
      width="100%"
      height="100%"
      viewBox="0 0 300 300"
      preserveAspectRatio="xMidYMid meet"
      class="victron-widget"
      @click="$emit('edit')"
    >
    <!-- Device Name -->
    <text class="title" x="150" y="25" text-anchor="middle">
      {{ deviceLabel }}
    </text>
    
    <!-- State of Charge - Large display -->
    <g class="soc-group">
      <text class="metric-large" x="150" y="100">
        {{ displaySOC }}
        <tspan class="units-large" dx="5">%</tspan>
      </text>
    </g>
    
    <!-- Secondary Metrics -->
    <g class="secondary-metrics">
      <!-- Voltage and Current - Side by side -->
      <g transform="translate(75, 170)">
        <text class="metric-label" x="0" y="0">Voltage</text>
        <text class="metric-medium" x="0" y="30">
          {{ displayVoltage }}
          <tspan class="units-medium" dx="3">V</tspan>
        </text>
      </g>
      
      <g transform="translate(225, 170)">
        <text class="metric-label" x="0" y="0">Current</text>
        <text class="metric-medium" x="0" y="30">
          {{ displayCurrent }}
          <tspan class="units-medium" dx="3">A</tspan>
        </text>
      </g>
      
    </g>
    
    <!-- Bottom Metrics -->
    <g transform="translate(0, 260)">
      <!-- Power -->
      <g transform="translate(75, 0)">
        <text class="metric-label-small" x="0" y="0">Power</text>
        <text class="metric-tiny" x="0" y="18">
          {{ displayPower }}
          <tspan class="units-tiny" dx="2">W</tspan>
        </text>
      </g>
      
      <!-- Time Remaining -->
      <g transform="translate(225, 0)">
        <text class="metric-label-small" x="0" y="0">Time Left</text>
        <text class="metric-tiny" x="0" y="18">
          {{ displayTimeRemaining }}
        </text>
      </g>
    </g>
    
    <!-- Status Indicator (alarm or connection) -->
    <circle 
      :class="['status-indicator', statusClass]"
      cx="280" 
      cy="20" 
      r="6"
    />
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStateDataStore } from '@/stores/stateDataStore'

const props = defineProps({
  widgetData: {
    type: Object,
    required: false
  },
  data: {
    type: Object,
    required: false
  }
})

defineEmits(['edit'])

const stateStore = useStateDataStore()

// Get device data from state
const deviceData = computed(() => {
  // Try to get deviceId from multiple sources
  const deviceId = props.widgetData?.dataSource || 
                   props.widgetData?.deviceId || 
                   props.data?.dataSource || 
                   props.data?.deviceId
  
  if (!deviceId) {
    return null
  }
  
  // Check both devices and selectedDevices
  const allDevices = stateStore.state.bluetooth?.devices || {}
  const selectedDevices = stateStore.state.bluetooth?.selectedDevices || {}
  
  const device = selectedDevices[deviceId] || allDevices[deviceId] || null
  
  return device
})

// Device label
const deviceLabel = computed(() => {
  return props.widgetData?.widgetTitle ||
         props.widgetData?.label || 
         props.data?.label ||
         deviceData.value?.metadata?.userLabel || 
         deviceData.value?.name || 
         'Battery Monitor'
})

// State of Charge
const soc = computed(() => {
  return deviceData.value?.sensorData?.stateOfCharge?.value ?? null
})

const displaySOC = computed(() => {
  return soc.value != null ? soc.value.toFixed(0) : '--'
})

// Voltage
const displayVoltage = computed(() => {
  const voltage = deviceData.value?.sensorData?.voltage?.value
  return voltage != null ? voltage.toFixed(2) : '--'
})

// Current
const displayCurrent = computed(() => {
  const current = deviceData.value?.sensorData?.current?.value
  return current != null ? current.toFixed(2) : '--'
})

// Power
const displayPower = computed(() => {
  const power = deviceData.value?.sensorData?.power?.value
  return power != null ? power.toFixed(1) : '--'
})

// Time Remaining
const displayTimeRemaining = computed(() => {
  const minutes = deviceData.value?.sensorData?.timeRemaining?.value
  if (minutes == null) return '--'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  
  return `${hours}h ${mins}m`
})

// Status indicator
const statusClass = computed(() => {
  const alarm = deviceData.value?.sensorData?.alarm
  const lastUpdated = deviceData.value?.sensorData?.lastUpdated
  
  // Check if alarm is active
  if (alarm && alarm !== 0) {
    return 'alarm'
  }
  
  // Check if data is stale (older than 2 minutes)
  if (lastUpdated) {
    const age = Date.now() - new Date(lastUpdated).getTime()
    if (age > 120000) {
      return 'stale'
    }
  }
  
  return 'active'
})
</script>

<style scoped>
.victron-widget-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  margin: 0;
  background-color: var(--widget-surface-color);
  border-radius: 8px;
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

.victron-widget {
  pointer-events: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  background: transparent;
}

text {
  fill: var(--widget-text-color);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  user-select: none;
  text-anchor: middle;
  dominant-baseline: middle;
}

.title {
  font-size: 1.4em;
  font-weight: bold;
  fill: var(--widget-text-color);
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

.metric-label {
  font-size: 1.14em;
  fill: var(--widget-muted-text-color);
  font-weight: 600;
}

.metric-label-small {
  font-size: 0.9em;
  fill: var(--widget-muted-text-color);
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
  transition: fill 0.3s;
}

.status-indicator.active {
  fill: #10b981;
}

.status-indicator.stale {
  fill: #6b7280;
}

.status-indicator.alarm {
  fill: #ef4444;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
