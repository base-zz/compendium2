<template>
  <div class="electrical-flow-widget">
    <!-- Compact version for widget -->
    
    <!-- Solar (Top) - Compact -->
    <div class="solar-row" v-if="totalSolarPower > 0">
      <div class="compact-box solar">
        <span class="icon">☀️</span>
        <span class="value">{{ formatPower(totalSolarPower) }}</span>
      </div>
      <div class="flow-line vertical down"></div>
    </div>

    <!-- Main Row -->
    <div class="main-row">
      <!-- Shore Input -->
      <div class="shore-col" v-if="totalShoreInputPower > 0">
        <div class="compact-box shore">
          <span class="icon">🔌</span>
          <span class="value">{{ formatPower(totalShoreInputPower) }}</span>
        </div>
        <div class="flow-line horizontal right"></div>
      </div>

      <!-- MultiPlus Center -->
      <div class="multiplus-col">
        <div class="compact-box multiplus" :class="multiplusClass">
          <div class="multiplus-icon">⚡</div>
          <div class="multiplus-mode">{{ multiplusMode }}</div>
          <div class="multiplus-power" v-if="charger || inverter">
            {{ formatPower(charger?.outputPower || inverter?.outputPower || 0) }}
          </div>
        </div>
      </div>

      <!-- AC Output -->
      <div class="loads-col" v-if="acOutputPower > 0">
        <div class="flow-line horizontal right"></div>
        <div class="compact-box loads">
          <span class="icon">💡</span>
          <span class="value">{{ formatPower(acOutputPower) }}</span>
        </div>
      </div>
    </div>

    <!-- Battery (Bottom) -->
    <div class="battery-row">
      <div class="flow-line vertical" :class="batteryPower > 0 ? 'down' : 'up'"></div>
      <div class="battery-container">
        <div class="compact-box battery" :class="batteryLevelClass">
          <span class="icon">🔋</span>
          <span class="capacity">{{ formatCapacity(totalBatteryCapacity) }}</span>
          <div class="battery-bar">
            <div class="battery-fill" :style="{ width: totalBatteryCapacity + '%' }"></div>
          </div>
        </div>
        <div class="battery-power" v-if="batteryPower !== 0">
          <span :class="{ charging: batteryPower > 0, discharging: batteryPower < 0 }">
            {{ batteryPower > 0 ? '⬇' : '⬆' }} {{ formatPower(Math.abs(batteryPower)) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStateDataStore } from '@/client/stores/stateDataStore';

const stateStore = useStateDataStore();

// Get electrical data from state
const electrical = computed(() => stateStore.state?.vessel?.systems?.electrical || {});

// Solar - Total
const totalSolarPower = computed(() => {
  const inputs = electrical.value.inputs || {};
  let total = 0;
  
  for (let i = 1; i <= 4; i++) {
    const solar = inputs[`solar${i}`];
    if (solar?.power?.value) {
      total += solar.power.value;
    }
  }
  
  return total;
});

// Shore - Total
const totalShoreInputPower = computed(() => {
  const inputs = electrical.value.inputs || {};
  let total = 0;
  
  for (let i = 1; i <= 2; i++) {
    const shore = inputs[`shore${i}`];
    if (shore?.connected?.value && shore?.power?.value) {
      total += shore.power.value;
    }
  }
  
  return total;
});

// Charger
const charger = computed(() => {
  const chargers = electrical.value.chargers || {};
  const charger1 = chargers.charger1;
  
  if (!charger1) return null;
  
  const state = charger1.state?.value;
  const outputPower = charger1.outputPower?.value || 0;
  
  const chargingStates = ['Bulk', 'Absorption', 'Float', 'Storage', 'Equalize'];
  if (chargingStates.includes(state) || outputPower > 0) {
    return {
      outputPower: outputPower,
      state: state,
    };
  }
  
  return null;
});

// Inverter
const inverter = computed(() => {
  const inverters = electrical.value.inverters || {};
  const inverter1 = inverters.inverter1;
  
  if (!inverter1) return null;
  
  const state = inverter1.state?.value;
  const outputPower = inverter1.outputPower?.value || 0;
  
  if (outputPower > 0 || state === 'Inverting') {
    return {
      outputPower: outputPower,
      state: state,
    };
  }
  
  return null;
});

// MultiPlus mode
const multiplusMode = computed(() => {
  if (charger.value && inverter.value) return 'Assist';
  if (charger.value) return 'Charge';
  if (inverter.value) return 'Invert';
  return 'Off';
});

const multiplusClass = computed(() => {
  return {
    charging: charger.value && !inverter.value,
    inverting: inverter.value && !charger.value,
    assist: charger.value && inverter.value,
    off: !charger.value && !inverter.value,
  };
});

// AC Output
const acOutputPower = computed(() => {
  return inverter.value?.outputPower || 0;
});

// Batteries
const totalBatteryCapacity = computed(() => {
  let totalCapacity = 0;
  let count = 0;
  
  for (let i = 1; i <= 4; i++) {
    const battery = electrical.value[`battery${i}`];
    if (battery?.capacity?.value != null) {
      totalCapacity += battery.capacity.value;
      count++;
    }
  }
  
  return count > 0 ? totalCapacity / count : 0;
});

const batteryPower = computed(() => {
  let totalPower = 0;
  
  for (let i = 1; i <= 4; i++) {
    const battery = electrical.value[`battery${i}`];
    if (battery?.voltage?.value && battery?.current?.value) {
      totalPower += (battery.voltage.value * battery.current.value);
    }
  }
  
  return totalPower;
});

const batteryLevelClass = computed(() => {
  const capacity = totalBatteryCapacity.value;
  if (capacity < 20) return 'level-critical';
  if (capacity < 50) return 'level-low';
  if (capacity < 80) return 'level-medium';
  return 'level-high';
});

// Formatting
const formatPower = (watts) => {
  if (watts == null || watts === 0) return '0W';
  if (Math.abs(watts) >= 1000) return `${(watts / 1000).toFixed(1)}kW`;
  return `${Math.round(watts)}W`;
};

const formatCapacity = (percent) => {
  if (percent == null) return 'N/A';
  return `${Math.round(percent)}%`;
};
</script>

<style scoped>
.electrical-flow-widget {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--ion-background-color, white);
  gap: 8px;
  min-height: 280px;
}

/* Compact Boxes */
.compact-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 70px;
  gap: 4px;
}

.compact-box .icon {
  font-size: 1.5em;
}

.compact-box .value {
  font-size: 0.9em;
  font-weight: bold;
  color: var(--ion-color-dark);
}

/* Solar */
.solar-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.compact-box.solar {
  border-top: 3px solid #ff9800;
  background: linear-gradient(to bottom, #fff9e6 0%, white 100%);
}

/* Shore */
.compact-box.shore {
  border-left: 3px solid #2196f3;
  background: linear-gradient(to right, #e3f2fd 0%, white 100%);
}

/* MultiPlus */
.multiplus-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

.compact-box.multiplus {
  min-width: 90px;
  padding: 12px;
  border: 2px solid #9c27b0;
}

.compact-box.multiplus.charging {
  border-color: #4caf50;
  background: linear-gradient(135deg, #e8f5e9 0%, white 100%);
}

.compact-box.multiplus.inverting {
  border-color: #ff9800;
  background: linear-gradient(135deg, #fff3e0 0%, white 100%);
}

.compact-box.multiplus.assist {
  border-color: #2196f3;
  background: linear-gradient(135deg, #e3f2fd 0%, #fff3e0 100%);
}

.compact-box.multiplus.off {
  border-color: #9e9e9e;
  opacity: 0.6;
}

.multiplus-icon {
  font-size: 2em;
}

.multiplus-mode {
  font-size: 0.75em;
  font-weight: 600;
  color: var(--ion-color-primary);
  margin-top: 4px;
}

.multiplus-power {
  font-size: 0.85em;
  font-weight: bold;
  color: var(--ion-color-dark);
  margin-top: 2px;
}

/* Loads */
.compact-box.loads {
  border-right: 3px solid #f44336;
  background: linear-gradient(to left, #ffebee 0%, white 100%);
}

/* Battery */
.battery-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.battery-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.compact-box.battery {
  min-width: 80px;
  border-bottom: 3px solid #607d8b;
}

.compact-box.battery .capacity {
  font-size: 1.2em;
  font-weight: bold;
  color: var(--ion-color-dark);
}

.battery-bar {
  width: 100%;
  height: 6px;
  background: var(--ion-color-light);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
}

.battery-fill {
  height: 100%;
  background: var(--ion-color-success);
  transition: width 0.3s ease, background-color 0.3s ease;
}

.compact-box.battery.level-critical .battery-fill {
  background: var(--ion-color-danger);
}

.compact-box.battery.level-low .battery-fill {
  background: var(--ion-color-warning);
}

.compact-box.battery.level-medium .battery-fill {
  background: var(--ion-color-primary);
}

.compact-box.battery.level-high .battery-fill {
  background: var(--ion-color-success);
}

.battery-power {
  font-size: 0.75em;
  font-weight: 600;
  margin-top: 4px;
}

.battery-power .charging {
  color: var(--ion-color-success);
}

.battery-power .discharging {
  color: var(--ion-color-warning);
}

/* Main Row Layout */
.main-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.shore-col,
.loads-col {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Flow Lines */
.flow-line {
  background: var(--ion-color-medium);
  position: relative;
  overflow: hidden;
}

.flow-line.horizontal {
  width: 30px;
  height: 3px;
}

.flow-line.vertical {
  width: 3px;
  height: 20px;
}

.flow-line::after {
  content: '';
  position: absolute;
  background: var(--ion-color-primary);
  opacity: 0.8;
}

.flow-line.horizontal::after {
  width: 15px;
  height: 100%;
  animation: flowHorizontal 1.5s linear infinite;
}

.flow-line.vertical::after {
  width: 100%;
  height: 15px;
  animation: flowVertical 1.5s linear infinite;
}

.flow-line.vertical.down::after {
  animation: flowVerticalDown 1.5s linear infinite;
}

.flow-line.vertical.up::after {
  animation: flowVerticalUp 1.5s linear infinite;
}

@keyframes flowHorizontal {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(200%);
  }
}

@keyframes flowVerticalDown {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(200%);
  }
}

@keyframes flowVerticalUp {
  0% {
    transform: translateY(200%);
  }
  100% {
    transform: translateY(-100%);
  }
}

/* Responsive adjustments */
@media (max-width: 400px) {
  .compact-box {
    min-width: 60px;
    padding: 6px 8px;
  }
  
  .compact-box .icon {
    font-size: 1.2em;
  }
  
  .compact-box .value {
    font-size: 0.8em;
  }
}
</style>
