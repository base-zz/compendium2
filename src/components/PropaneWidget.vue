<template>
  <div class="propane-widget-container">
    <svg
      class="propane-widget"
      width="100%"
      height="100%"
      viewBox="0 0 300 300"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath :id="clipPathId">
          <path :d="tankInteriorPath" />
        </clipPath>
      </defs>

      <!-- Alert halo -->
      <rect
        class="alert-ring"
        x="20"
        y="20"
        width="260"
        height="260"
        rx="40"
        :class="{
          'alert-ring-warning': alertSeverity === 'warning',
          'alert-ring-critical': alertSeverity === 'critical'
        }"
      />

      <!-- Tank silhouette -->
      <g class="tank-group">
        <path class="tank-outline" :d="tankOutlinePath" />
        <rect class="tank-body" x="90" y="70" width="120" height="170" rx="45" />
        <path class="tank-dome" d="M90 70 C90 30 210 30 210 70" />
        <path class="tank-base" d="M90 240 C90 270 210 270 210 240" />
        <rect class="valve-neck" x="134" y="20" width="32" height="35" rx="6" />
        <rect class="valve-block" x="120" y="15" width="60" height="12" rx="4" />
        <circle class="valve-cap" cx="150" cy="12" r="8" />
      </g>

      <!-- Fluid fill -->
      <g :clip-path="`url(#${clipPathId})`">
        <rect
          class="fluid-fill"
          x="80"
          :y="fluidTop"
          width="140"
          :height="fluidHeight"
          :fill="fluidColor"
        />
      </g>

      <!-- Measurement text -->
      <text class="propane-title" x="150" y="110" :fill="themeTextColor">
        {{ widgetTitle }}
      </text>
      <text
        class="propane-value"
        x="150"
        y="165"
        :fill="themeTextColor"
        :class="{
          'alert-text-warning': alertSeverity === 'warning',
          'alert-text-critical': alertSeverity === 'critical'
        }"
      >
        {{ displayValue }}
      </text>
      <text class="propane-units" x="210" y="165" :fill="themeTextColor">%</text>

      <text class="status-text" x="150" y="215" :fill="statusTextColor">
        {{ statusMessage }}
      </text>
    </svg>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useStateDataStore } from '@/stores/stateDataStore'

const props = defineProps({
  widgetData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['mounted'])

const stateStore = useStateDataStore()

const clipPathId = computed(() => {
  const id = props.widgetData?.id || props.widgetData?.dataSource || 'propane'
  return `propane-fluid-mask-${id}`
})

const tankOutlinePath = 'M80 70 C80 20 220 20 220 70 L220 240 C220 280 80 280 80 240 Z'
const tankInteriorPath = 'M95 75 C95 35 205 35 205 75 L205 235 C205 265 95 265 95 235 Z'

const bluetoothState = computed(() => stateStore.state.bluetooth || null)

const selectedDevice = computed(() => {
  const deviceId = props.widgetData?.dataSource || props.widgetData?.deviceId
  if (!deviceId || !bluetoothState.value) {
    return null
  }
  const { selectedDevices, devices } = bluetoothState.value
  return (selectedDevices && selectedDevices[deviceId]) || (devices && devices[deviceId]) || null
})

function extractLevel(sensorData) {
  if (!sensorData || typeof sensorData !== 'object') {
    return null
  }

  const directKeys = [
    'levelPercent',
    'level_percentage',
    'percentage',
    'propanePercent',
    'tankLevel'
  ]

  for (const key of directKeys) {
    const value = sensorData[key]
    if (typeof value === 'number') {
      return value
    }
  }

  const nestedKeys = [
    ['level', 'percent'],
    ['level', 'value'],
    ['tank', 'percent'],
    ['tank', 'value'],
    ['propane', 'percent'],
    ['propane', 'value'],
    ['liquid', 'percent']
  ]

  for (const path of nestedKeys) {
    let current = sensorData
    for (const part of path) {
      if (!current || typeof current !== 'object' || !(part in current)) {
        current = null
        break
      }
      current = current[part]
    }
    if (typeof current === 'number') {
      return current
    }
  }

  return null
}

const rawLevel = computed(() => {
  if (typeof props.widgetData?.value === 'number') {
    return props.widgetData.value
  }
  const device = selectedDevice.value
  if (device?.sensorData) {
    return extractLevel(device.sensorData)
  }
  return null
})

const normalizedLevel = computed(() => {
  if (typeof rawLevel.value !== 'number') {
    return null
  }
  if (Number.isNaN(rawLevel.value)) {
    return null
  }
  return Math.min(100, Math.max(0, rawLevel.value))
})

const tankTop = 75
const tankBottom = 235
const tankHeight = tankBottom - tankTop

const fluidHeight = computed(() => {
  if (normalizedLevel.value == null) {
    return 0
  }
  return (tankHeight * normalizedLevel.value) / 100
})

const fluidTop = computed(() => tankBottom - fluidHeight.value)

const thresholdValue = computed(() => {
  return typeof props.widgetData?.threshold === 'number' ? props.widgetData.threshold : null
})

const operator = computed(() => {
  if (props.widgetData?.thresholdOperator) {
    return props.widgetData.thresholdOperator
  }
  return 'LESS_THAN'
})

const alertSeverity = computed(() => {
  if (thresholdValue.value == null || normalizedLevel.value == null) {
    return 'none'
  }

  const level = normalizedLevel.value
  const threshold = thresholdValue.value

  let isPastThreshold = false

  switch (operator.value) {
    case 'LESS_THAN':
      isPastThreshold = level < threshold
      break
    case 'LESS_THAN_EQUALS':
      isPastThreshold = level <= threshold
      break
    case 'GREATER_THAN':
      isPastThreshold = level > threshold
      break
    case 'GREATER_THAN_EQUALS':
      isPastThreshold = level >= threshold
      break
    case 'EQUALS':
      isPastThreshold = level === threshold
      break
    case 'NOT_EQUALS':
      isPastThreshold = level !== threshold
      break
    default:
      isPastThreshold = level < threshold
      break
  }

  if (!isPastThreshold) {
    return 'none'
  }

  if (operator.value === 'LESS_THAN' || operator.value === 'LESS_THAN_EQUALS') {
    if (level <= threshold / 2 || level === 0) {
      return 'critical'
    }
    return 'warning'
  }

  if (operator.value === 'GREATER_THAN' || operator.value === 'GREATER_THAN_EQUALS') {
    if (level >= threshold * 1.1 || level >= 95) {
      return 'critical'
    }
    return 'warning'
  }

  return 'warning'
})

const displayValue = computed(() => {
  if (normalizedLevel.value == null) {
    return '--'
  }
  return Math.round(normalizedLevel.value)
})

const widgetTitle = computed(() => {
  if (props.widgetData?.widgetTitle) {
    return props.widgetData.widgetTitle
  }
  if (props.widgetData?.label) {
    return props.widgetData.label
  }
  if (selectedDevice.value?.metadata?.userLabel) {
    return selectedDevice.value.metadata.userLabel
  }
  if (selectedDevice.value?.name) {
    return selectedDevice.value.name
  }
  return 'Propane'
})

const statusMessage = computed(() => {
  if (!selectedDevice.value) {
    return 'Select a Bluetooth device'
  }
  if (normalizedLevel.value == null) {
    return 'Awaiting propane data'
  }
  if (selectedDevice.value?.sensorData?.timestamp) {
    return `Updated ${new Date(selectedDevice.value.sensorData.timestamp).toLocaleTimeString()}`
  }
  return 'Live data'
})

const fluidColor = computed(() => {
  if (props.widgetData?.color) {
    return props.widgetData.color
  }
  return '#f97316'
})

const themeTextColor = 'var(--widget-text-color)'
const statusTextColor = 'var(--widget-muted-text-color)'

onMounted(() => {
  emit('mounted')
})
</script>

<style scoped>
.propane-widget-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
}

.propane-widget {
  width: 100%;
  height: 100%;
  background: transparent;
}

.alert-ring {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 8px;
}

.alert-ring-warning {
  stroke: #f59e0b;
  stroke-width: 10px;
}

.alert-ring-critical {
  stroke: #ef4444;
  stroke-width: 10px;
}

.tank-group path,
.tank-group rect,
.tank-group circle {
  fill: transparent;
  stroke: rgba(255, 255, 255, 0.28);
  stroke-width: 4px;
}

.tank-body {
  fill: rgba(255, 255, 255, 0.08);
  stroke-width: 3px;
}

.valve-neck,
.valve-block,
.valve-cap {
  fill: rgba(255, 255, 255, 0.28);
  stroke-width: 0;
}

.fluid-fill {
  fill: v-bind(fluidColor);
  opacity: 0.85;
}

.propane-title {
  font-size: 1.45em;
  font-weight: 600;
  text-anchor: middle;
  fill: v-bind(themeTextColor);
}

.propane-value {
  font-size: 4.5em;
  font-weight: 700;
  text-anchor: middle;
  fill: v-bind(themeTextColor);
}

.propane-units {
  font-size: 1.6em;
  font-weight: 600;
  text-anchor: middle;
  fill: v-bind(themeTextColor);
}

.status-text {
  font-size: 1.1em;
  fill: rgba(255, 255, 255, 0.72);
  text-anchor: middle;
}

.alert-text-warning {
  fill: #f59e0b;
}

.alert-text-critical {
  fill: #ef4444;
}
</style>
