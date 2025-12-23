<template>
  <IonPage class="tidal-page">
    <GenericHeader title="Tides" />
    <IonContent class="tidal-content">
      <div class="tide-view">
        <div class="tide-chart-container">
          <div v-if="buoyStationName" class="buoy-station-header">
            {{ buoyStationName }}
          </div>
          <TideChart class="tide-chart" :height="300" :padding="{ top: 20, right: 10, bottom: 42, left: 50 }" />
        </div>

        <div v-if="nextEvents" class="tide-events">
          <h3 class="section-title">Next Tides</h3>
          <div class="events-grid">
            <div v-if="currentTideLevelText" class="event-card event-card-wide">
              <div class="event-label">Current Level</div>
              <div class="event-value">{{ currentTideLevelText }}</div>
            </div>
            <div class="event-card">
              <div class="event-label">Next High</div>
              <div class="event-value">{{ nextEvents.nextHighText }}</div>
            </div>
            <div class="event-card">
              <div class="event-label">Next Low</div>
              <div class="event-value">{{ nextEvents.nextLowText }}</div>
            </div>
          </div>
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

const buoyStationName = computed(() => {
  const name = tideData.value?.metadata?.buoyStation?.name;
  return typeof name === 'string' && name ? name : null;
});

const seaLevelUnitLabel = computed(() => {
  const unit = units.value?.seaLevelHeight;
  return typeof unit === 'string' ? unit : '';
});

const currentTideLevelFromHourly = computed(() => {
  const hourlyTimes = tideData.value?.hourly?.time;
  const hourlyLevels = tideData.value?.hourly?.values?.seaLevelHeightMsl;
  if (!Array.isArray(hourlyTimes) || !Array.isArray(hourlyLevels)) return null;
  if (hourlyTimes.length === 0 || hourlyLevels.length === 0) return null;

  const minLen = Math.min(hourlyTimes.length, hourlyLevels.length);
  if (minLen < 1) return null;

  const now = new Date();
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return null;

  const points = [];
  for (let i = 0; i < minLen; i += 1) {
    const t = new Date(hourlyTimes[i]);
    const v = hourlyLevels[i];
    if (!(t instanceof Date) || Number.isNaN(t.getTime())) continue;
    if (typeof v !== 'number' || Number.isNaN(v)) continue;
    points.push({ time: t, level: v });
  }

  if (points.length === 0) return null;

  // Ensure sorted by time
  points.sort((a, b) => a.time.getTime() - b.time.getTime());

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return null;

  if (now.getTime() <= first.time.getTime()) return first.level;
  if (now.getTime() >= last.time.getTime()) return last.level;

  // Find the bracketing segment and linearly interpolate.
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;

    const t0 = a.time.getTime();
    const t1 = b.time.getTime();
    const tn = now.getTime();
    if (tn < t0 || tn > t1) continue;
    const dt = t1 - t0;
    if (!(dt > 0)) return a.level;

    const ratio = (tn - t0) / dt;
    return a.level + (b.level - a.level) * ratio;
  }

  return null;
});

const currentTideLevelText = computed(() => {
  const level = currentTideLevelFromHourly.value;
  if (typeof level !== 'number' || Number.isNaN(level)) return null;
  const unit = seaLevelUnitLabel.value;
  if (typeof unit !== 'string') return null;
  return `${level.toFixed(2)}${unit}`;
});

const nextEvents = computed(() => {
  const events = tideData.value?.tideEvents;
  if (!events || typeof events !== 'object') return null;

  const nextHigh = events.nextHigh;
  const nextLow = events.nextLow;
  if (!nextHigh || !nextLow) return null;

  const highTime = nextHigh.time ? new Date(nextHigh.time) : null;
  const lowTime = nextLow.time ? new Date(nextLow.time) : null;
  const highHeight = typeof nextHigh.height === 'number' ? nextHigh.height : null;
  const lowHeight = typeof nextLow.height === 'number' ? nextLow.height : null;
  if (highTime == null || lowTime == null) return null;
  if (!(highTime instanceof Date) || Number.isNaN(highTime.getTime())) return null;
  if (!(lowTime instanceof Date) || Number.isNaN(lowTime.getTime())) return null;

  const highTimeText = formatDateTime(highTime);
  const lowTimeText = formatDateTime(lowTime);
  const highHeightText = highHeight != null ? `${highHeight.toFixed(2)}${seaLevelUnitLabel.value}` : '--';
  const lowHeightText = lowHeight != null ? `${lowHeight.toFixed(2)}${seaLevelUnitLabel.value}` : '--';

  return {
    nextHighText: `${highHeightText} at ${highTimeText}`,
    nextLowText: `${lowHeightText} at ${lowTimeText}`,
  };
});

const currentConditions = computed(() => {
  const buoyLatest = tideData.value?.buoyObservations?.latest;
  if (buoyLatest && typeof buoyLatest === 'object') {
    const current = tideData.value?.current;
    const currentValues = current?.values;
    if (!currentValues && !buoyLatest) return null;

    const waveHeight = buoyLatest?.waveHeight ?? currentValues?.waveHeight;
    const waveDirection = buoyLatest?.meanWaveDirection ?? currentValues?.waveDirection;
    const wavePeriod = buoyLatest?.dominantWavePeriod ?? currentValues?.wavePeriod;
    const seaTempC = buoyLatest?.waterTemperature ?? null;
    const seaTemp = seaTempC != null ? (typeof seaTempC === 'number' ? seaTempC : null) : currentValues?.seaSurfaceTemperature;

    return {
      waveHeight: typeof waveHeight === 'number' ? waveHeight.toFixed(1) : '--',
      waveDirection: typeof waveDirection === 'number' ? waveDirection : '--',
      wavePeriod: typeof wavePeriod === 'number' ? wavePeriod.toFixed(1) : '--',
      seaSurfaceTemperature: typeof seaTemp === 'number' ? seaTemp.toFixed(1) : '--',
      oceanCurrentVelocity: typeof currentValues?.oceanCurrentVelocity === 'number' ? currentValues.oceanCurrentVelocity.toFixed(2) : '--',
      oceanCurrentDirection: typeof currentValues?.oceanCurrentDirection === 'number' ? currentValues.oceanCurrentDirection : '--'
    };
  }

  const current = tideData.value?.current;
  const values = current?.values;
  if (!values) return null;

  return {
    waveHeight: typeof values.waveHeight === 'number' ? values.waveHeight.toFixed(1) : '--',
    waveDirection: typeof values.waveDirection === 'number' ? values.waveDirection : '--',
    wavePeriod: typeof values.wavePeriod === 'number' ? values.wavePeriod.toFixed(1) : '--',
    seaSurfaceTemperature: typeof values.seaSurfaceTemperature === 'number' ? values.seaSurfaceTemperature.toFixed(1) : '--',
    oceanCurrentVelocity: typeof values.oceanCurrentVelocity === 'number' ? values.oceanCurrentVelocity.toFixed(2) : '--',
    oceanCurrentDirection: typeof values.oceanCurrentDirection === 'number' ? values.oceanCurrentDirection : '--'
  };
});

function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

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
  gap: 4px;
}

.buoy-station-header {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--app-text-color);
  margin: 2px 0 8px;
  padding: 6px 2px 6px;
  text-align: center;
}

.tide-chart {
  width: 100%;
  height: 100%;
}

.tide-events {
  margin: 6px 8px 0;
  padding: 10px 12px;
  background: var(--app-surface-color);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
}

.tide-events .section-title {
  padding-left: 0;
  margin: 0 0 10px 0;
}

.events-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.event-card {
  background: color-mix(in srgb, var(--app-surface-color) 80%, var(--app-background-color) 20%);
  border: 1px solid var(--app-border-color);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-card-wide {
  grid-column: 1 / -1;
}

.event-label {
  font-size: 0.75rem;
  color: var(--app-muted-text-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.event-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--app-text-color);
  line-height: 1.15;
}

@media (max-width: 480px) {
  .events-grid {
    grid-template-columns: 1fr;
  }
}

.marine-conditions {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 6px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--app-text-color);
  margin: 0 0 6px 0;
  padding-left: 8px;
}

.conditions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  flex: 0 0 auto;
  overflow-y: auto;
  padding-left: 8px;
}

.condition-card {
  background: var(--app-surface-color);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
  padding: 8px 8px 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--app-text-color) 10%, transparent);
}

.condition-icon {
  font-size: 1.8rem;
  line-height: 1;
  padding-right: 4px; 
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
