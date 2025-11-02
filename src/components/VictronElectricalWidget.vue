<template>
  <div class="victron-electrical-container">
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 1000 1000" 
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      class="victron-electrical-widget"
    >
      <!-- Flow Lines - Always visible to show system connections -->
      <line x1="280" y1="315" x2="400" y2="315" class="flow gridFlow" :class="{ active: gridPower !== 0 }" />
      <line x1="650" y1="315" x2="750" y2="315" class="flow multiPlusFlow" :class="{ active: multiPlusPower !== 0 }" />
      <line x1="525" y1="410" x2="525" y2="450" class="flow multiPlusFlow" :class="{ active: multiPlusPower !== 0 }" />
      <line x1="650" y1="520" x2="700" y2="520" class="flow batteryFlow" :class="{ active: batteryPower !== 0 }" />
      <path d="M440 650 V570 H400" class="flow pvFlow" fill="none" :class="{ active: pvPower !== 0 }" />
      <path d="M640 650 V570 H650" class="flow dcDcFlow" fill="none" :class="{ active: dcDcPower !== 0 }" />
      
      <!-- Grid -->
      <g class="component">
        <rect class="panel" x="100" y="250" width="180" height="130" rx="10" ry="10" fill="url(#gridGradient)" />
        <text x="190" y="315" font-size="22" fill="white" text-anchor="middle">{{ displayGridPower }}</text>
        <text x="190" y="345" font-size="16" fill="#cfd8dc" text-anchor="middle">Grid</text>
      </g>
      
      <!-- MultiPlus -->
      <g class="component">
        <rect class="panel" x="400" y="250" width="250" height="160" rx="15" ry="15" fill="url(#multiPlusGradient)" />
        <text x="525" y="320" font-size="26" fill="white" text-anchor="middle">{{ displayMultiPlusPower }}</text>
        <text x="525" y="355" font-size="18" fill="#cfd8dc" text-anchor="middle">MultiPlus</text>
      </g>
      
      <!-- AC Loads -->
      <g class="component">
        <rect class="panel" x="750" y="250" width="180" height="130" rx="10" ry="10" fill="url(#acLoadsGradient)" />
        <text x="840" y="315" font-size="22" fill="white" text-anchor="middle">{{ displayAcLoads }}</text>
        <text x="840" y="345" font-size="16" fill="#cfd8dc" text-anchor="middle">AC Loads</text>
      </g>
      
      <!-- Battery -->
      <g class="component">
        <rect class="panel" x="400" y="450" width="250" height="140" rx="15" ry="15" fill="url(#batteryGradient)" />
        <text x="525" y="515" font-size="24" fill="white" text-anchor="middle">{{ displayBatteryLevel }}</text>
        <text x="525" y="545" font-size="16" fill="#cfd8dc" text-anchor="middle">Battery</text>
        <text x="525" y="570" font-size="14" fill="#a0a0a0" text-anchor="middle">{{ displayBatteryPower }}</text>
      </g>
      
      <!-- DC Loads -->
      <g class="component">
        <rect class="panel" x="700" y="470" width="180" height="120" rx="10" ry="10" fill="url(#dcPowerGradient)" />
        <text x="790" y="535" font-size="20" fill="white" text-anchor="middle">{{ displayDcLoads }}</text>
        <text x="790" y="560" font-size="14" fill="#cfd8dc" text-anchor="middle">DC Loads</text>
      </g>
      
      <!-- PV Charger -->
      <g class="component">
        <rect class="panel" x="350" y="650" width="180" height="120" rx="10" ry="10" fill="url(#pvChargerGradient)" />
        <text x="440" y="715" font-size="20" fill="white" text-anchor="middle">{{ displayPvPower }}</text>
        <text x="440" y="740" font-size="14" fill="#cfd8dc" text-anchor="middle">PV Charger</text>
      </g>
      
      <!-- DC-DC Charger -->
      <g class="component">
        <rect class="panel" x="550" y="650" width="180" height="120" rx="10" ry="10" fill="url(#dcDcChargerGradient)" />
        <text x="640" y="715" font-size="20" fill="white" text-anchor="middle">{{ displayDcDcPower }}</text>
        <text x="640" y="740" font-size="14" fill="#cfd8dc" text-anchor="middle">DC-DC Charger</text>
      </g>
      
      <!-- Gradients -->
      <defs>
        <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7d8fa8" />
          <stop offset="100%" stop-color="#5a6779" />
        </linearGradient>
        <linearGradient id="multiPlusGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4aa6a1" />
          <stop offset="100%" stop-color="#367c78" />
        </linearGradient>
        <linearGradient id="acLoadsGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#6a8c5c" />
          <stop offset="100%" stop-color="#4d6542" />
        </linearGradient>
        <linearGradient id="batteryGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#b4a26a" />
          <stop offset="100%" stop-color="#8c7d52" />
        </linearGradient>
        <linearGradient id="dcPowerGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#5a7fb8" />
          <stop offset="100%" stop-color="#445f8a" />
        </linearGradient>
        <linearGradient id="pvChargerGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#cc7a4d" />
          <stop offset="100%" stop-color="#9d5d3a" />
        </linearGradient>
        <linearGradient id="dcDcChargerGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9a7ba8" />
          <stop offset="100%" stop-color="#745c7f" />
        </linearGradient>
      </defs>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStateDataStore } from '../stores/stateDataStore'

defineProps({
  widgetData: {
    type: Object,
    required: false,
    default: () => ({})
  }
})

const emit = defineEmits(['mounted'])

const stateStore = useStateDataStore()

// Get electrical system data from state
const electricalData = computed(() => {
  const data = stateStore.state.vessel?.systems?.electrical || {}
  return data
})

// Grid power (shore power)
const gridPower = computed(() => {
  return electricalData.value.inputs?.shore1?.power?.value || 0
})

const displayGridPower = computed(() => {
  const power = Math.abs(gridPower.value)
  return `${Math.round(power)} W`
})

// MultiPlus power (not used - it's just a broker)
const multiPlusPower = computed(() => {
  return 0 // MultiPlus is just a pass-through, no power value needed
})

const displayMultiPlusPower = computed(() => {
  // Show the charger state instead of power
  const state = electricalData.value.chargers?.charger1?.state?.value || 'Idle'
  return state
})

// AC Loads (inverter output power)
const acLoads = computed(() => {
  return electricalData.value.inverters?.inverter1?.outputPower?.value || 0
})

const displayAcLoads = computed(() => {
  const power = Math.abs(acLoads.value)
  return `${Math.round(power)} W`
})

// Battery
const batteryLevel = computed(() => {
  return electricalData.value.battery1?.capacity?.value || 0
})

const displayBatteryLevel = computed(() => {
  return `${Math.round(batteryLevel.value)}%`
})

const batteryPower = computed(() => {
  // Try to get power value first, fallback to calculating from V*A
  const power = electricalData.value.battery1?.power?.value
  if (power !== null && power !== undefined) {
    return power
  }
  // Fallback: calculate from voltage and current
  const voltage = electricalData.value.battery1?.voltage?.value || 0
  const current = electricalData.value.battery1?.current?.value || 0
  return voltage * current
})

const displayBatteryPower = computed(() => {
  const power = Math.abs(batteryPower.value)
  return `${Math.round(power)} W`
})

// DC Loads - need to find the correct field
const dcLoads = computed(() => {
  const electrical = electricalData.value

  const powerValue = electrical?.battery1?.power?.value
  if (powerValue !== null && powerValue !== undefined) {
    return powerValue
  }

  const voltage = electrical?.battery1?.voltage?.value
  const current = electrical?.battery1?.current?.value

  if (voltage !== null && voltage !== undefined && current !== null && current !== undefined) {
    return voltage * current
  }

  return 0
})

const displayDcLoads = computed(() => {
  const power = Math.abs(dcLoads.value)
  return `${Math.round(power)} W`
})

// PV Charger (solar)
const pvPower = computed(() => {
  const solarPower = electricalData.value.inputs?.solar1?.power?.value || 0
  return solarPower
})

const displayPvPower = computed(() => {
  const power = Math.abs(pvPower.value)
  return `${Math.round(power)} W`
})

// DC-DC Charger (not in your data)
const dcDcPower = computed(() => {
  return 0 // Not available in current data structure
})

const displayDcDcPower = computed(() => {
  return '0 W'
})

// Emit mounted event
emit('mounted')
</script>

<style scoped>
.victron-electrical-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  margin: 0;
  background: linear-gradient(135deg, #1a1d23 0%, #2a2f3a 100%);
  border-radius: 8px;
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

.victron-electrical-widget {
  pointer-events: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  background: transparent;
}

@keyframes flow {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -40; }
}

.flow {
  stroke-width: 4;
  stroke-dasharray: 10 10;
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.flow.active {
  animation: flow 1.8s linear infinite;
  opacity: 0.9;
}

.gridFlow { 
  stroke: #7d8fa8;
}

.multiPlusFlow { 
  stroke: #4aa6a1;
}

.batteryFlow { 
  stroke: #b4a26a;
}

.pvFlow { 
  stroke: #cc7a4d;
}

.dcDcFlow { 
  stroke: #9a7ba8;
}

rect.panel {
  stroke: #2c2f38;
  stroke-width: 2;
  filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.4));
}

.component {
  cursor: pointer;
  transition: opacity 0.2s;
}

.component:hover {
  opacity: 0.9;
}

text {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  user-select: none;
  pointer-events: none;
}
</style>
