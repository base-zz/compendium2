<template>
  <IonPage class="tidal-page">
    <GenericHeader title="Tides & Marine Conditions" />
    <IonContent class="tidal-content">
      <div class="tide-view">
        <div class="tide-chart-container">
          <TideChart class="tide-chart" :height="300" :padding="{ top: 20, right: 10, bottom: 40, left: 50 }" />
        </div>
        
        <!-- Current Marine Conditions -->
        <div v-if="currentConditions" class="marine-conditions">
          <h3 class="section-title">Current Conditions</h3>
          <div class="conditions-grid">
            <div class="condition-card">
              <div class="condition-icon">🌊</div>
              <div class="condition-content">
                <div class="condition-label">Wave Height</div>
                <div class="condition-value">{{ currentConditions.waveHeight }} {{ units.waveHeight }}</div>
                <div class="condition-detail">Period: {{ currentConditions.wavePeriod }}s</div>
              </div>
            </div>
            
            <div class="condition-card">
              <div class="condition-icon">🧭</div>
              <div class="condition-content">
                <div class="condition-label">Wave Direction</div>
                <div class="condition-value">{{ currentConditions.waveDirection }}°</div>
                <div class="condition-detail">{{ getDirectionName(currentConditions.waveDirection) }}</div>
              </div>
            </div>
            
            <div class="condition-card">
              <div class="condition-icon">🌡️</div>
              <div class="condition-content">
                <div class="condition-label">Sea Temperature</div>
                <div class="condition-value">{{ currentConditions.seaSurfaceTemperature }}{{ units.temperature }}</div>
              </div>
            </div>
            
            <div class="condition-card">
              <div class="condition-icon">💨</div>
              <div class="condition-content">
                <div class="condition-label">Current Velocity</div>
                <div class="condition-value">{{ currentConditions.oceanCurrentVelocity }} {{ units.currentVelocity }}</div>
                <div class="condition-detail" v-if="currentConditions.oceanCurrentVelocity > 0">
                  {{ currentConditions.oceanCurrentDirection }}° {{ getDirectionName(currentConditions.oceanCurrentDirection) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup>
import { computed } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import GenericHeader from '@/components/GenericHeader.vue';
import TideChart from '@/components/charts/TideChart.vue';
import { useStateDataStore } from '@/stores/stateDataStore';
import { storeToRefs } from 'pinia';

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

const tideData = computed(() => state.value?.tides);
const units = computed(() => tideData.value?.units || {});

const currentConditions = computed(() => {
  const current = tideData.value?.current;
  if (!current?.values) return null;
  
  return {
    waveHeight: current.values.waveHeight?.toFixed(1) || '--',
    waveDirection: current.values.waveDirection || '--',
    wavePeriod: current.values.wavePeriod?.toFixed(1) || '--',
    seaSurfaceTemperature: current.values.seaSurfaceTemperature?.toFixed(1) || '--',
    oceanCurrentVelocity: current.values.oceanCurrentVelocity?.toFixed(2) || '--',
    oceanCurrentDirection: current.values.oceanCurrentDirection || '--'
  };
});

function getDirectionName(degrees) {
  if (degrees === '--') return '';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
</script>

<style scoped>
.tidal-page {
  background: var(--app-background-color);
  color: var(--app-text-color);
}

.tidal-content {
  --background: var(--app-background-color);
  color: var(--app-text-color);
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

.tidal-content::part(scroll) {
  padding-left: 0;
  padding-right: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.tide-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  box-sizing: border-box;
}

.tide-chart-container {
  flex: 1 1 50%;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tide-chart {
  width: 100%;
  height: 100%;
}

.marine-conditions {
  flex: 1 1 50%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--app-text-color);
  margin: 0 0 12px 0;
}

.conditions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  flex: 1;
  overflow-y: auto;
}

.condition-card {
  background: var(--app-surface-color);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--app-text-color) 10%, transparent);
}

.condition-icon {
  font-size: 1.8rem;
  line-height: 1;
}

.condition-content {
  flex: 1;
}

.condition-label {
  font-size: 0.75rem;
  color: var(--app-muted-text-color);
  margin-bottom: 4px;
  font-weight: 500;
}

.condition-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--app-text-color);
  margin-bottom: 2px;
}

.condition-detail {
  font-size: 0.7rem;
  color: var(--app-muted-text-color);
  font-weight: 400;
}

@media (max-width: 768px) {
  .conditions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .conditions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
