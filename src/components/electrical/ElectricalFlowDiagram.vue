<template>
  <div class="electrical-flow-diagram">
    <!-- Solar Panels (Top) -->
    <div class="solar-section">
      <div 
        v-for="(solar, index) in activeSolarPanels" 
        :key="`solar-${index}`"
        class="power-box solar-box"
        :class="{ active: solar.power > 0 }"
      >
        <div class="box-icon">☀️</div>
        <div class="box-title">Solar {{ index + 1 }}</div>
        <div class="box-value">{{ formatPower(solar.power) }}</div>
        <div class="box-detail">{{ formatVoltage(solar.voltage) }}</div>
        <div class="box-state" v-if="solar.state">{{ solar.state }}</div>
        <div class="box-yield" v-if="solar.yieldToday">
          Today: {{ formatEnergy(solar.yieldToday) }}
        </div>
      </div>
    </div>

    <!-- Flow arrows from solar to batteries -->
    <div class="flow-arrows solar-to-battery" v-if="totalSolarPower > 0">
      <div class="arrow-line vertical">
        <div class="flow-animation"></div>
      </div>
      <div class="flow-label">{{ formatPower(totalSolarPower) }}</div>
    </div>

    <!-- Main Row: Shore Power -> MultiPlus -> AC Loads -->
    <div class="main-row">
      <!-- Shore Power Input (Left) -->
      <div class="shore-section">
        <div 
          v-for="(shore, index) in activeShoreInputs" 
          :key="`shore-${index}`"
          class="power-box shore-box"
          :class="{ active: shore.connected, 'has-power': shore.power > 0 }"
        >
          <div class="box-icon">🔌</div>
          <div class="box-title">Shore {{ index + 1 }}</div>
          <div class="box-value">{{ formatPower(shore.power) }}</div>
          <div class="box-detail">{{ formatVoltage(shore.voltage) }} / {{ formatCurrent(shore.current) }}</div>
          <div class="box-status" :class="{ connected: shore.connected }">
            {{ shore.connected ? 'Connected' : 'Disconnected' }}
          </div>
        </div>
      </div>

      <!-- Flow arrow from shore to multiplus -->
      <div class="flow-arrows shore-to-multiplus" v-if="totalShoreInputPower > 0">
        <div class="arrow-line horizontal">
          <div class="flow-animation"></div>
        </div>
        <div class="flow-label">{{ formatPower(totalShoreInputPower) }}</div>
      </div>

      <!-- MultiPlus Center -->
      <div class="multiplus-section">
        <div class="power-box multiplus-box" :class="multiplusClass">
          <div class="box-icon">⚡</div>
          <div class="box-title">MultiPlus</div>
          <div class="multiplus-mode">{{ multiplusMode }}</div>
          
          <!-- Charger Info (when charging) -->
          <div v-if="charger" class="multiplus-detail">
            <div class="detail-label">Charging</div>
            <div class="detail-value">{{ formatPower(charger.outputPower) }}</div>
            <div class="detail-state">{{ charger.state }}</div>
          </div>
          
          <!-- Inverter Info (when inverting) -->
          <div v-if="inverter" class="multiplus-detail">
            <div class="detail-label">Inverting</div>
            <div class="detail-value">{{ formatPower(inverter.outputPower) }}</div>
            <div class="detail-state">{{ inverter.state }}</div>
          </div>
        </div>
      </div>

      <!-- Flow arrow from multiplus to AC loads -->
      <div class="flow-arrows multiplus-to-loads" v-if="acOutputPower > 0">
        <div class="arrow-line horizontal">
          <div class="flow-animation"></div>
        </div>
        <div class="flow-label">{{ formatPower(acOutputPower) }}</div>
      </div>

      <!-- AC Loads (Right) -->
      <div class="loads-section">
        <div class="power-box loads-box" :class="{ active: acOutputPower > 0 }">
          <div class="box-icon">💡</div>
          <div class="box-title">AC Loads</div>
          <div class="box-value">{{ formatPower(acOutputPower) }}</div>
          <div class="box-detail" v-if="inverter">
            {{ formatVoltage(inverter.outputVoltage) }} / {{ formatCurrent(inverter.outputCurrent) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Batteries (Bottom) -->
    <div class="battery-section">
      <!-- Flow arrows from multiplus to batteries (charging) or batteries to multiplus (discharging) -->
      <div class="flow-arrows battery-flow" v-if="batteryPower !== 0">
        <div class="arrow-line vertical" :class="{ reverse: batteryPower < 0 }">
          <div class="flow-animation"></div>
        </div>
        <div class="flow-label">
          {{ formatPower(Math.abs(batteryPower)) }}
          <span class="flow-direction">{{ batteryPower > 0 ? '⬇ Charging' : '⬆ Discharging' }}</span>
        </div>
      </div>

      <div class="batteries-row">
        <div 
          v-for="(battery, index) in activeBatteries" 
          :key="`battery-${index}`"
          class="power-box battery-box"
          :class="batteryClass(battery)"
        >
          <div class="box-icon">🔋</div>
          <div class="box-title">Battery {{ index + 1 }}</div>
          <div class="battery-capacity">{{ formatCapacity(battery.capacity) }}</div>
          <div class="battery-bar">
            <div class="battery-fill" :style="{ width: battery.capacity + '%' }"></div>
          </div>
          <div class="box-detail">
            {{ formatVoltage(battery.voltage) }} / {{ formatCurrent(battery.current) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="summary-stats">
      <div class="stat-item">
        <div class="stat-label">Total Solar</div>
        <div class="stat-value">{{ formatPower(totalSolarPower) }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Shore Input</div>
        <div class="stat-value">{{ formatPower(totalShoreInputPower) }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">AC Output</div>
        <div class="stat-value">{{ formatPower(acOutputPower) }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Battery</div>
        <div class="stat-value" :class="{ charging: batteryPower > 0, discharging: batteryPower < 0 }">
          {{ batteryPower > 0 ? '+' : '' }}{{ formatPower(batteryPower) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStateDataStore } from '@/stores/stateDataStore';

const stateStore = useStateDataStore();

// Get electrical data from state
const electrical = computed(() => stateStore.state?.vessel?.systems?.electrical || {});

// Solar panels
const activeSolarPanels = computed(() => {
  const panels = [];
  const inputs = electrical.value.inputs || {};
  
  for (let i = 1; i <= 4; i++) {
    const solar = inputs[`solar${i}`];
    if (solar && (solar.power?.value > 0 || solar.voltage?.value > 0)) {
      panels.push({
        power: solar.power?.value || 0,
        voltage: solar.voltage?.value || 0,
        current: solar.current?.value || 0,
        state: solar.state?.value || null,
        yieldToday: solar.yieldToday?.value || 0,
      });
    }
  }
  
  return panels;
});

const totalSolarPower = computed(() => {
  return activeSolarPanels.value.reduce((sum, panel) => sum + panel.power, 0);
});

// Shore power inputs
const activeShoreInputs = computed(() => {
  const shores = [];
  const inputs = electrical.value.inputs || {};
  
  for (let i = 1; i <= 2; i++) {
    const shore = inputs[`shore${i}`];
    if (shore) {
      shores.push({
        connected: shore.connected?.value || false,
        power: shore.power?.value || 0,
        voltage: shore.voltage?.value || 0,
        current: shore.current?.value || 0,
      });
    }
  }
  
  return shores;
});

const totalShoreInputPower = computed(() => {
  return activeShoreInputs.value.reduce((sum, shore) => sum + (shore.connected ? shore.power : 0), 0);
});

// Charger (MultiPlus when charging)
const charger = computed(() => {
  const chargers = electrical.value.chargers || {};
  const charger1 = chargers.charger1;
  
  if (!charger1) return null;
  
  const state = charger1.state?.value;
  const outputPower = charger1.outputPower?.value || 0;
  
  // Charger is active if state is Bulk, Absorption, Float, Storage, or Equalize
  const chargingStates = ['Bulk', 'Absorption', 'Float', 'Storage', 'Equalize'];
  if (chargingStates.includes(state) || outputPower > 0) {
    return {
      inputVoltage: charger1.inputVoltage?.value || 0,
      outputVoltage: charger1.outputVoltage?.value || 0,
      outputCurrent: charger1.outputCurrent?.value || 0,
      outputPower: outputPower,
      state: state,
    };
  }
  
  return null;
});

// Inverter (MultiPlus when inverting)
const inverter = computed(() => {
  const inverters = electrical.value.inverters || {};
  const inverter1 = inverters.inverter1;
  
  if (!inverter1) return null;
  
  const state = inverter1.state?.value;
  const outputPower = inverter1.outputPower?.value || 0;
  
  // Inverter is active if outputting power
  if (outputPower > 0 || state === 'Inverting') {
    return {
      inputVoltage: inverter1.inputVoltage?.value || 0,
      outputVoltage: inverter1.outputVoltage?.value || 0,
      outputCurrent: inverter1.outputCurrent?.value || 0,
      outputPower: outputPower,
      state: state,
    };
  }
  
  return null;
});

// MultiPlus mode and class
const multiplusMode = computed(() => {
  if (charger.value && inverter.value) return 'Power Assist';
  if (charger.value) return 'Charging';
  if (inverter.value) return 'Inverting';
  return 'Standby';
});

const multiplusClass = computed(() => {
  return {
    charging: charger.value && !inverter.value,
    inverting: inverter.value && !charger.value,
    'power-assist': charger.value && inverter.value,
    standby: !charger.value && !inverter.value,
  };
});

// AC output power
const acOutputPower = computed(() => {
  return inverter.value?.outputPower || 0;
});

// Batteries
const activeBatteries = computed(() => {
  const batteries = [];
  
  for (let i = 1; i <= 4; i++) {
    const battery = electrical.value[`battery${i}`];
    if (battery && (battery.voltage?.value > 0 || battery.capacity?.value != null)) {
      batteries.push({
        voltage: battery.voltage?.value || 0,
        current: battery.current?.value || 0,
        capacity: battery.capacity?.value || 0,
      });
    }
  }
  
  return batteries;
});

// Battery power (positive = charging, negative = discharging)
const batteryPower = computed(() => {
  // Sum up all battery currents and voltages to get total power
  let totalPower = 0;
  
  activeBatteries.value.forEach(battery => {
    // Power = Voltage * Current
    // Positive current = charging, negative = discharging
    totalPower += (battery.voltage * battery.current);
  });
  
  return totalPower;
});

// Battery class based on capacity
const batteryClass = (battery) => {
  const capacity = battery.capacity;
  return {
    'level-critical': capacity < 20,
    'level-low': capacity >= 20 && capacity < 50,
    'level-medium': capacity >= 50 && capacity < 80,
    'level-high': capacity >= 80,
  };
};

// Formatting functions
const formatPower = (watts) => {
  if (watts == null || watts === 0) return '0 W';
  if (Math.abs(watts) >= 1000) return `${(watts / 1000).toFixed(1)} kW`;
  return `${Math.round(watts)} W`;
};

const formatVoltage = (volts) => {
  if (volts == null || volts === 0) return '0 V';
  return `${volts.toFixed(1)} V`;
};

const formatCurrent = (amps) => {
  if (amps == null || amps === 0) return '0 A';
  return `${amps.toFixed(1)} A`;
};

const formatCapacity = (percent) => {
  if (percent == null) return 'N/A';
  return `${Math.round(percent)}%`;
};

const formatEnergy = (kwh) => {
  if (kwh == null || kwh === 0) return '0 kWh';
  return `${kwh.toFixed(2)} kWh`;
};
</script>

<style scoped>
.electrical-flow-diagram {
  width: 100%;
  padding: 20px;
  background: var(--ion-background-color, #f5f5f5);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 30px;
  min-height: 600px;
}

/* Power Box Base Styles */
.power-box {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  min-width: 140px;
  transition: all 0.3s ease;
}

.power-box.active {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: scale(1.02);
}

.box-icon {
  font-size: 2em;
  margin-bottom: 8px;
}

.box-title {
  font-weight: 600;
  font-size: 0.9em;
  color: var(--ion-color-medium);
  margin-bottom: 8px;
}

.box-value {
  font-size: 1.5em;
  font-weight: bold;
  color: var(--ion-color-dark);
  margin-bottom: 4px;
}

.box-detail {
  font-size: 0.85em;
  color: var(--ion-color-medium);
}

.box-state {
  font-size: 0.8em;
  margin-top: 4px;
  padding: 2px 8px;
  background: var(--ion-color-light);
  border-radius: 4px;
  display: inline-block;
}

/* Solar Section */
.solar-section {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.solar-box {
  border-top: 4px solid #ff9800;
}

.solar-box.active {
  border-top-color: #ff6f00;
  background: linear-gradient(to bottom, #fff9e6 0%, white 100%);
}

.box-yield {
  font-size: 0.75em;
  color: var(--ion-color-success);
  margin-top: 4px;
  font-weight: 600;
}

/* Main Row */
.main-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

/* Shore Power */
.shore-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shore-box {
  border-left: 4px solid #2196f3;
}

.shore-box.active {
  border-left-color: #1976d2;
}

.shore-box.has-power {
  background: linear-gradient(to right, #e3f2fd 0%, white 100%);
}

.box-status {
  font-size: 0.8em;
  margin-top: 4px;
  padding: 2px 8px;
  background: var(--ion-color-light);
  border-radius: 4px;
  display: inline-block;
}

.box-status.connected {
  background: var(--ion-color-success);
  color: white;
}

/* MultiPlus */
.multiplus-section {
  flex-shrink: 0;
}

.multiplus-box {
  min-width: 200px;
  border: 3px solid #9c27b0;
}

.multiplus-box.charging {
  border-color: #4caf50;
  background: linear-gradient(135deg, #e8f5e9 0%, white 100%);
}

.multiplus-box.inverting {
  border-color: #ff9800;
  background: linear-gradient(135deg, #fff3e0 0%, white 100%);
}

.multiplus-box.power-assist {
  border-color: #2196f3;
  background: linear-gradient(135deg, #e3f2fd 0%, #fff3e0 100%);
}

.multiplus-mode {
  font-size: 1em;
  font-weight: 600;
  color: var(--ion-color-primary);
  margin-bottom: 12px;
}

.multiplus-detail {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--ion-color-light);
}

.detail-label {
  font-size: 0.8em;
  color: var(--ion-color-medium);
  margin-bottom: 4px;
}

.detail-value {
  font-size: 1.2em;
  font-weight: bold;
  color: var(--ion-color-dark);
}

.detail-state {
  font-size: 0.75em;
  color: var(--ion-color-medium);
  margin-top: 2px;
}

/* AC Loads */
.loads-section {
  flex-shrink: 0;
}

.loads-box {
  border-right: 4px solid #f44336;
}

.loads-box.active {
  border-right-color: #d32f2f;
  background: linear-gradient(to left, #ffebee 0%, white 100%);
}

/* Batteries */
.battery-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.batteries-row {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.battery-box {
  border-bottom: 4px solid #607d8b;
}

.battery-capacity {
  font-size: 1.8em;
  font-weight: bold;
  margin: 8px 0;
}

.battery-bar {
  width: 100%;
  height: 8px;
  background: var(--ion-color-light);
  border-radius: 4px;
  overflow: hidden;
  margin: 8px 0;
}

.battery-fill {
  height: 100%;
  background: var(--ion-color-success);
  transition: width 0.3s ease, background-color 0.3s ease;
}

.battery-box.level-critical .battery-fill {
  background: var(--ion-color-danger);
}

.battery-box.level-low .battery-fill {
  background: var(--ion-color-warning);
}

.battery-box.level-medium .battery-fill {
  background: var(--ion-color-primary);
}

.battery-box.level-high .battery-fill {
  background: var(--ion-color-success);
}

/* Flow Arrows */
.flow-arrows {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-line {
  position: relative;
  background: var(--ion-color-medium);
  overflow: hidden;
}

.arrow-line.horizontal {
  width: 60px;
  height: 4px;
}

.arrow-line.vertical {
  width: 4px;
  height: 40px;
}

.arrow-line.reverse .flow-animation {
  animation-direction: reverse;
}

.flow-animation {
  position: absolute;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--ion-color-primary) 50%,
    transparent 100%
  );
  width: 30px;
  height: 100%;
  animation: flow 1.5s linear infinite;
}

.arrow-line.vertical .flow-animation {
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--ion-color-primary) 50%,
    transparent 100%
  );
  width: 100%;
  height: 30px;
}

@keyframes flow {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(200%);
  }
}

.arrow-line.vertical .flow-animation {
  animation: flowVertical 1.5s linear infinite;
}

@keyframes flowVertical {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(200%);
  }
}

.flow-label {
  position: absolute;
  background: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
  color: var(--ion-color-primary);
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.flow-direction {
  display: block;
  font-size: 0.9em;
  color: var(--ion-color-medium);
}

/* Summary Stats */
.summary-stats {
  display: flex;
  justify-content: space-around;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
  min-width: 100px;
}

.stat-label {
  font-size: 0.85em;
  color: var(--ion-color-medium);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.3em;
  font-weight: bold;
  color: var(--ion-color-dark);
}

.stat-value.charging {
  color: var(--ion-color-success);
}

.stat-value.discharging {
  color: var(--ion-color-warning);
}

/* Responsive */
@media (max-width: 768px) {
  .main-row {
    flex-direction: column;
  }
  
  .arrow-line.horizontal {
    transform: rotate(90deg);
    margin: 10px 0;
  }
  
  .flow-label {
    transform: rotate(-90deg);
  }
}
</style>
