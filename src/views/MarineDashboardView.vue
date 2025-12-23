<template>
  <IonPage class="marine-page">
    <GenericHeader title="Marine Dashboard" />
    <IonContent class="marine-content">
      <div class="marine-view">
        <div v-if="meta" class="marine-metadata">
          <div class="meta-line">
            Tide station: {{ meta.tideStationName }}
            <span v-if="meta.tideStationDistanceKm != null">({{ meta.tideStationDistanceKm }} km)</span>
          </div>
          <div class="meta-line" v-if="meta.buoyStationName">
            Buoy: {{ meta.buoyStationName }}
            <span v-if="meta.buoyStationDistanceKm != null">({{ meta.buoyStationDistanceKm }} km)</span>
          </div>
          <div class="meta-line" v-if="meta.portsStationName">
            Currents: {{ meta.portsStationName }}
            <span v-if="meta.portsStationDistanceKm != null">({{ meta.portsStationDistanceKm }} km)</span>
          </div>
          <div class="meta-line" v-if="meta.datum">Datum: {{ meta.datum }}</div>
        </div>

        <div v-if="inlet" class="section">
          <h3 class="section-title">Inlet Conditions</h3>
          <div class="cards-grid">
            <div class="card">
              <div class="card-label">Risk</div>
              <div class="card-value">{{ inlet.riskLevel }}</div>
            </div>
            <div class="card">
              <div class="card-label">Current</div>
              <div class="card-value">{{ inlet.currentStrengthText }}</div>
              <div class="card-sub" v-if="inlet.currentPhase">{{ inlet.currentPhase }}</div>
            </div>
            <div class="card">
              <div class="card-label">Waves</div>
              <div class="card-value">{{ inlet.waveHeightText }}</div>
              <div class="card-sub">Wind opposing: {{ inlet.windOpposingText }}</div>
            </div>
          </div>
          <div v-if="inlet.recommendations && inlet.recommendations.length" class="recommendations">
            <div class="recommendation" v-for="(rec, idx) in inlet.recommendations" :key="idx">{{ rec }}</div>
          </div>
        </div>

        <div v-if="buoy" class="section">
          <h3 class="section-title">Buoy Observations</h3>
          <div class="cards-grid">
            <div class="card">
              <div class="card-label">Wave Height</div>
              <div class="card-value">{{ buoy.waveHeightText }}</div>
              <div class="card-sub" v-if="buoy.timeText">{{ buoy.timeText }}</div>
            </div>
            <div class="card">
              <div class="card-label">Period</div>
              <div class="card-value">{{ buoy.wavePeriodText }}</div>
              <div class="card-sub" v-if="buoy.waveDirectionText">Dir: {{ buoy.waveDirectionText }}</div>
            </div>
            <div class="card">
              <div class="card-label">Water Temp</div>
              <div class="card-value">{{ buoy.waterTempText }}</div>
            </div>
          </div>
        </div>

        <div v-if="ports" class="section">
          <h3 class="section-title">Currents (PORTS)</h3>
          <div class="cards-grid">
            <div class="card">
              <div class="card-label">Speed</div>
              <div class="card-value">{{ ports.speedText }}</div>
              <div class="card-sub" v-if="ports.timeText">{{ ports.timeText }}</div>
            </div>
            <div class="card">
              <div class="card-label">Direction</div>
              <div class="card-value">{{ ports.directionText }}</div>
            </div>
          </div>
        </div>

        <div v-if="sunMoon" class="section">
          <h3 class="section-title">Sun & Moon</h3>
          <div class="cards-grid">
            <div class="card">
              <div class="card-label">Sunrise</div>
              <div class="card-value">{{ sunMoon.sunriseText }}</div>
              <div class="card-sub">Sunset: {{ sunMoon.sunsetText }}</div>
            </div>
            <div class="card">
              <div class="card-label">Moon</div>
              <div class="card-value">{{ sunMoon.moonPhaseName }}</div>
              <div class="card-sub">Illum: {{ sunMoon.moonIlluminationText }}</div>
            </div>
          </div>
        </div>

        <div v-if="weatherSummary" class="section">
          <h3 class="section-title">Weather</h3>
          <div class="cards-grid">
            <div class="card">
              <div class="card-label">Now</div>
              <div class="card-value">{{ weatherSummary.nowText }}</div>
              <div class="card-sub" v-if="weatherSummary.windText">{{ weatherSummary.windText }}</div>
            </div>
            <div class="card" v-if="weatherSummary.nextPeriodText">
              <div class="card-label">Next</div>
              <div class="card-value">{{ weatherSummary.nextPeriodText }}</div>
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
import { useStateDataStore } from '@/stores/stateDataStore';
import { storeToRefs } from 'pinia';

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

const tides = computed(() => state.value?.tides);

const units = computed(() => {
  const u = tides.value?.units;
  return typeof u === 'object' && u ? u : null;
});

const meta = computed(() => {
  const m = tides.value?.metadata;
  if (!m || typeof m !== 'object') return null;

  const tideStationName = m.tideStation?.name;
  const tideStationDistanceKm = typeof m.tideStation?.distanceKm === 'number'
    ? Number(m.tideStation.distanceKm.toFixed(1))
    : null;

  const buoyStationName = m.buoyStation?.name;
  const buoyStationDistanceKm = typeof m.buoyStation?.distanceKm === 'number'
    ? Number(m.buoyStation.distanceKm.toFixed(1))
    : null;

  const portsStationName = m.portsStation?.name;
  const portsStationDistanceKm = typeof m.portsStation?.distanceKm === 'number'
    ? Number(m.portsStation.distanceKm.toFixed(1))
    : null;

  const datum = typeof m.datum === 'string' ? m.datum : '';

  if (typeof tideStationName !== 'string' || !tideStationName) return null;

  return {
    tideStationName,
    tideStationDistanceKm,
    buoyStationName: typeof buoyStationName === 'string' ? buoyStationName : '',
    buoyStationDistanceKm,
    portsStationName: typeof portsStationName === 'string' ? portsStationName : '',
    portsStationDistanceKm,
    datum,
  };
});

const inlet = computed(() => {
  const inletConditions = tides.value?.inletConditions;
  if (!inletConditions || typeof inletConditions !== 'object') return null;

  const riskLevel = typeof inletConditions.riskLevel === 'string' ? inletConditions.riskLevel : '';
  const currentStrength = typeof inletConditions.currentStrength === 'number' ? inletConditions.currentStrength : null;
  const currentPhase = typeof inletConditions.currentPhase === 'string' ? inletConditions.currentPhase : '';
  const waveHeight = typeof inletConditions.waveHeight === 'number' ? inletConditions.waveHeight : null;
  const windOpposing = typeof inletConditions.windOpposing === 'boolean' ? inletConditions.windOpposing : null;
  const recommendations = Array.isArray(inletConditions.recommendations) ? inletConditions.recommendations.filter((r) => typeof r === 'string') : [];

  if (!riskLevel) return null;

  const currentVelocityUnit = units.value?.currentVelocity;
  const currentStrengthText = currentStrength != null
    ? `${currentStrength.toFixed(2)}${typeof currentVelocityUnit === 'string' ? ` ${currentVelocityUnit}` : ''}`
    : '--';

  const waveHeightUnit = units.value?.waveHeight;
  const waveHeightText = waveHeight != null
    ? `${waveHeight.toFixed(1)}${typeof waveHeightUnit === 'string' ? ` ${waveHeightUnit}` : ''}`
    : '--';

  const windOpposingText = windOpposing == null ? '--' : windOpposing ? 'Yes' : 'No';

  return {
    riskLevel,
    currentStrengthText,
    currentPhase,
    waveHeightText,
    windOpposingText,
    recommendations,
  };
});

const buoy = computed(() => {
  const latest = tides.value?.buoyObservations?.latest;
  if (!latest || typeof latest !== 'object') return null;

  const time = latest.time ? new Date(latest.time) : null;
  const timeText = time instanceof Date && !Number.isNaN(time.getTime())
    ? time.toLocaleString()
    : '';

  const waveHeight = typeof latest.waveHeight === 'number' ? latest.waveHeight : null;
  const wavePeriod = typeof latest.dominantWavePeriod === 'number' ? latest.dominantWavePeriod : null;
  const waveDirection = typeof latest.meanWaveDirection === 'number' ? latest.meanWaveDirection : null;
  const waterTemp = typeof latest.waterTemperature === 'number' ? latest.waterTemperature : null;

  const waveHeightUnit = units.value?.waveHeight;
  const waveHeightText = waveHeight != null
    ? `${waveHeight.toFixed(1)}${typeof waveHeightUnit === 'string' ? ` ${waveHeightUnit}` : ''}`
    : '--';

  const wavePeriodText = wavePeriod != null ? `${wavePeriod.toFixed(0)} s` : '--';
  const waveDirectionText = waveDirection != null ? `${Math.round(waveDirection)}°` : '';

  const tempUnit = units.value?.temperature;
  const waterTempText = waterTemp != null
    ? `${waterTemp.toFixed(1)}${typeof tempUnit === 'string' ? tempUnit : ''}`
    : '--';

  return {
    timeText,
    waveHeightText,
    wavePeriodText,
    waveDirectionText,
    waterTempText,
  };
});

const ports = computed(() => {
  const latest = tides.value?.portsCurrents?.latest;
  if (!latest || typeof latest !== 'object') return null;

  const time = latest.time ? new Date(latest.time) : null;
  const timeText = time instanceof Date && !Number.isNaN(time.getTime())
    ? time.toLocaleString()
    : '';

  const speed = typeof latest.speed === 'number' ? latest.speed : null;
  const direction = typeof latest.direction === 'number' ? latest.direction : null;

  const currentVelocityUnit = units.value?.currentVelocity;
  const speedText = speed != null
    ? `${speed.toFixed(2)}${typeof currentVelocityUnit === 'string' ? ` ${currentVelocityUnit}` : ''}`
    : '--';

  const directionText = direction != null ? `${Math.round(direction)}°` : '--';

  return { timeText, speedText, directionText };
});

const sunMoon = computed(() => {
  const data = tides.value?.sunMoon;
  if (!data || typeof data !== 'object') return null;

  const sun = data.sun;
  const moon = data.moon;
  if (!sun || typeof sun !== 'object' || !moon || typeof moon !== 'object') return null;

  const sunrise = sun.sunrise ? new Date(sun.sunrise) : null;
  const sunset = sun.sunset ? new Date(sun.sunset) : null;

  const sunriseText = sunrise instanceof Date && !Number.isNaN(sunrise.getTime()) ? sunrise.toLocaleTimeString() : '--';
  const sunsetText = sunset instanceof Date && !Number.isNaN(sunset.getTime()) ? sunset.toLocaleTimeString() : '--';

  const moonPhaseName = typeof moon.phaseName === 'string' ? moon.phaseName : '';
  const illumination = typeof moon.illumination === 'number' ? moon.illumination : null;
  const moonIlluminationText = illumination != null ? `${Math.round(illumination * 100)}%` : '--';

  if (!moonPhaseName) return null;

  return {
    sunriseText,
    sunsetText,
    moonPhaseName,
    moonIlluminationText,
  };
});

const weatherSummary = computed(() => {
  const weather = tides.value?.weather;
  if (!weather || typeof weather !== 'object') return null;

  const hourly = Array.isArray(weather.hourlyForecast) ? weather.hourlyForecast : null;
  const forecast = Array.isArray(weather.forecast) ? weather.forecast : null;

  const now = hourly && hourly.length ? hourly[0] : null;
  const nextPeriod = forecast && forecast.length ? forecast[0] : null;

  const nowTemp = typeof now?.temperature === 'number' ? now.temperature : null;
  const nowShort = typeof now?.shortForecast === 'string' ? now.shortForecast : '';
  const nowText = nowTemp != null && nowShort ? `${nowTemp}° ${nowShort}` : nowTemp != null ? `${nowTemp}°` : nowShort || '--';

  const windText = typeof now?.windSpeed === 'string' && typeof now?.windDirection === 'string'
    ? `${now.windDirection} ${now.windSpeed}`
    : typeof now?.windSpeed === 'string'
      ? now.windSpeed
      : '';

  const periodName = typeof nextPeriod?.name === 'string' ? nextPeriod.name : '';
  const periodForecast = typeof nextPeriod?.shortForecast === 'string' ? nextPeriod.shortForecast : '';
  const periodTemp = typeof nextPeriod?.temperature === 'number' ? nextPeriod.temperature : null;
  const nextPeriodText = periodName && (periodForecast || periodTemp != null)
    ? `${periodName}: ${periodTemp != null ? `${periodTemp}°` : ''} ${periodForecast}`.trim()
    : '';

  return {
    nowText,
    windText,
    nextPeriodText,
  };
});
</script>

<style scoped>
.marine-page {
  background: var(--app-background-color);
  color: var(--app-text-color);
}

.marine-content {
  --background: var(--app-background-color);
  color: var(--app-text-color);
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

.marine-content::part(scroll) {
  padding-left: 0;
  padding-right: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.marine-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px;
  box-sizing: border-box;
}

.section-title {
  margin: 10px 0 8px;
  font-size: 1.05rem;
  font-weight: 700;
}

.marine-metadata {
  background: var(--app-surface-color);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
  padding: 10px 12px;
}

.meta-line {
  font-size: 0.9rem;
  color: var(--app-text-color);
  margin: 4px 0;
}

.section {
  background: var(--app-surface-color);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
  padding: 10px 12px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.card {
  background: color-mix(in srgb, var(--app-surface-color) 80%, var(--app-background-color) 20%);
  border: 1px solid var(--app-border-color);
  border-radius: 10px;
  padding: 10px;
}

.card-label {
  font-size: 0.75rem;
  color: var(--app-muted-text-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-value {
  font-size: 1.05rem;
  font-weight: 700;
  margin-top: 6px;
}

.card-sub {
  font-size: 0.85rem;
  color: var(--app-muted-text-color);
  margin-top: 4px;
}

.recommendations {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recommendation {
  font-size: 0.9rem;
  color: var(--app-text-color);
}

@media (max-width: 480px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
