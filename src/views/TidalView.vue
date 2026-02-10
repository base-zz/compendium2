<template>
  <IonPage class="tidal-page">
    <GenericHeader title="Tides" />
    <IonContent class="tidal-content">
      <IonProgressBar v-if="isLoadingStationData" type="indeterminate" class="tide-fetch-progress" />
      <div class="tide-view">
        <div class="tide-chart-container">
          <div v-if="stationHeader" class="buoy-station-header" @click="openStationModal">
            <span class="station-name">{{ stationHeader }}</span>
            <IonSpinner v-if="isLoadingStationData" name="dots" color="primary" class="station-loading-spinner" />
          </div>
          <TideChart class="tide-chart" :height="300" :padding="{ top: 20, right: 10, bottom: 42, left: 50 }" />
        </div>

        <IonModal :is-open="isStationModalOpen" @didDismiss="closeStationModal">
          <IonHeader>
            <IonToolbar>
              <IonTitle>Select Tide Station</IonTitle>
              <IonButton slot="end" fill="clear" @click="closeStationModal">Close</IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonSearchbar
              class="station-search"
              :disabled="isStationListLoading || isLoadingStationData"
              :value="stationSearchQuery"
              @ionInput="handleStationSearchInput"
            />
            <IonList>
              <IonItem
                v-if="originalStationHeader"
                button
                :disabled="isLoadingStationData"
                @click="handleSelectOriginalStation"
              >
                <IonLabel>
                  <div>Original Station</div>
                  <div class="station-distance">{{ originalStationHeader }}</div>
                </IonLabel>
              </IonItem>

              <IonItem v-if="isStationListLoading" lines="none">
                <IonLabel>Loading stations...</IonLabel>
                <IonSpinner slot="end" name="dots" color="primary" />
              </IonItem>

              <IonItem
                v-for="station in visibleStations"
                :key="station.id"
                button
                :disabled="isLoadingStationData"
                @click="handleSelectStation(station)"
              >
                <IonLabel>
                  <div>{{ station.name }}</div>
                  <div v-if="station.distanceKmText" class="station-distance">{{ station.distanceKmText }}</div>
                </IonLabel>
              </IonItem>

              <IonItem
                v-if="canShowMoreStations"
                button
                :disabled="isLoadingStationData"
                @click="showMoreStations"
              >
                <IonLabel>Show more</IonLabel>
              </IonItem>
            </IonList>
            <div v-if="isLoadingStationData" class="station-loading">Loading tide data...</div>
          </IonContent>
        </IonModal>

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
import { computed, ref, watch } from 'vue';
import {
  IonPage,
  IonContent,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonProgressBar,
  IonSearchbar,
} from '@ionic/vue';
import GenericHeader from '@/components/GenericHeader.vue';
import TideChart from '@/components/charts/TideChart.vue';
import { useStateDataStore } from '@/stores/stateDataStore';
import { storeToRefs } from 'pinia';
import noaaTideStations from '@/components/data/noaa-tide-stations.json';

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

const tideData = computed(() => state.value?.tides);
const units = computed(() => {
  const u = tideData.value?.units;
  return u && typeof u === 'object' ? u : {};
});

const isStationModalOpen = ref(false);
const isLoadingStationData = ref(false);
const originalTideDataSnapshot = ref(null);

const isStationListLoading = ref(false);
const stationsByDistanceList = ref([]);
const visibleStationCount = ref(null);
const stationSearchQuery = ref('');

const tideStationName = computed(() => {
  const name = tideData.value?.metadata?.tideStation?.name;
  return typeof name === 'string' && name ? name : null;
});

const buoyStationName = computed(() => {
  const name = tideData.value?.metadata?.buoyStation?.name;
  return typeof name === 'string' && name ? name : null;
});

const stationHeader = computed(() => {
  return tideStationName.value || buoyStationName.value;
});

const originalStationHeader = computed(() => {
  const snapshot = originalTideDataSnapshot.value;
  if (!snapshot || typeof snapshot !== 'object') return null;

  const tideName = snapshot?.metadata?.tideStation?.name;
  if (typeof tideName === 'string' && tideName) return tideName;

  const buoyName = snapshot?.metadata?.buoyStation?.name;
  if (typeof buoyName === 'string' && buoyName) return buoyName;

  return null;
});

const boatPosition = computed(() => {
  const navPos = state.value?.navigation?.position;
  const topPos = state.value?.position;
  const source = navPos || topPos || null;
  if (!source || typeof source !== 'object') return null;

  const rawLat = source.latitude?.value ?? source.latitude;
  const rawLon = source.longitude?.value ?? source.longitude;
  if (typeof rawLat !== 'number' || !Number.isFinite(rawLat)) return null;
  if (typeof rawLon !== 'number' || !Number.isFinite(rawLon)) return null;

  return { latitude: rawLat, longitude: rawLon };
});

const stationSearchQueryNormalized = computed(() => {
  const raw = stationSearchQuery.value;
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
});

const filteredStations = computed(() => {
  const list = stationsByDistanceList.value;
  if (!Array.isArray(list) || list.length === 0) return [];

  const q = stationSearchQueryNormalized.value;
  if (!q) return list;

  return list.filter((s) => {
    const name = s?.name;
    if (typeof name !== 'string') return false;
    return name.toLowerCase().includes(q);
  });
});

const visibleStations = computed(() => {
  const list = filteredStations.value;
  if (!Array.isArray(list) || list.length === 0) return [];

  const count = visibleStationCount.value;
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return [];

  return list.slice(0, count);
});

const canShowMoreStations = computed(() => {
  const list = filteredStations.value;
  if (!Array.isArray(list) || list.length === 0) return false;

  const count = visibleStationCount.value;
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return false;

  return count < list.length;
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

function openStationModal() {
  isStationModalOpen.value = true;

  stationSearchQuery.value = '';

  isStationListLoading.value = true;
  stationsByDistanceList.value = [];
  visibleStationCount.value = 100;

  setTimeout(() => {
    try {
      stationsByDistanceList.value = buildStationsByDistance();
    } catch (e) {
      console.error('[TidalView] Failed to build station list', e);
      stationsByDistanceList.value = [];
    } finally {
      isStationListLoading.value = false;
    }
  }, 0);
}

function closeStationModal() {
  isStationModalOpen.value = false;
}

function handleStationSearchInput(evt) {
  const value = evt?.detail?.value;
  stationSearchQuery.value = typeof value === 'string' ? value : '';
}

function showMoreStations() {
  const count = visibleStationCount.value;
  if (typeof count !== 'number' || !Number.isFinite(count)) return;
  visibleStationCount.value = count + 100;
}

watch(
  stationSearchQueryNormalized,
  () => {
    if (isStationModalOpen.value !== true) return;
    visibleStationCount.value = 100;
  }
);

async function handleSelectStation(station) {
  if (!station || typeof station !== 'object') return;
  const stationId = typeof station.id === 'string' ? station.id : null;
  const stationName = typeof station.name === 'string' ? station.name : null;
  const queryStationId = typeof station.queryStationId === 'string' ? station.queryStationId : null;
  if (!stationId || !stationName) return;
  if (!queryStationId) return;

  if (originalTideDataSnapshot.value == null && tideData.value && typeof tideData.value === 'object') {
    originalTideDataSnapshot.value = tideData.value;
  }

  closeStationModal();

  isLoadingStationData.value = true;

  try {
    const timeWindow = getExistingHourlyTimeWindow();
    if (!timeWindow) {
      throw new Error('Missing/invalid existing hourly tide time window (state.tides.hourly.time)');
    }

    const datum = tideData.value?.metadata?.datum;
    if (typeof datum !== 'string' || !datum) {
      throw new Error('Missing tide datum (state.tides.metadata.datum)');
    }

    const seaLevelUnit = units.value?.seaLevelHeight;
    const noaaUnits = getNoaaUnitsFromSeaLevelUnit(seaLevelUnit);
    if (!noaaUnits) {
      throw new Error(`Unsupported/missing sea level unit (state.tides.units.seaLevelHeight): ${String(seaLevelUnit)}`);
    }

    const [hourly, tideEvents] = await Promise.all([
      fetchNoaaTidePredictionsHourly({
        stationId: queryStationId,
        beginDate: timeWindow.beginDate,
        endDate: timeWindow.endDate,
        datum,
        units: noaaUnits,
      }),
      fetchNoaaTidePredictionsHiLo({
        stationId: queryStationId,
        beginDate: timeWindow.beginDate,
        endDate: timeWindow.endDate,
        datum,
        units: noaaUnits,
      }),
    ]);

    if (!hourly || !tideEvents) return;

    const existingMetadata = tideData.value?.metadata;
    const metadata = typeof existingMetadata === 'object' && existingMetadata ? { ...existingMetadata } : {};
    metadata.tideStation = {
      id: stationId,
      name: stationName,
      queryStationId,
      latitude: station.lat,
      longitude: station.lng,
      distanceKm: typeof station.distanceKm === 'number' ? station.distanceKm : null,
    };
    metadata.last_updated = new Date().toISOString();

    stateStore.updateTideData({
      hourly,
      tideEvents,
      metadata,
    });
  } catch (e) {
    console.error('[TidalView] Failed to load tide data for station', stationId, e);
  } finally {
    isLoadingStationData.value = false;
  }
}

function handleSelectOriginalStation() {
  closeStationModal();

  const snapshot = originalTideDataSnapshot.value;
  if (!snapshot || typeof snapshot !== 'object') return;

  try {
    stateStore.updateTideData(snapshot);
  } catch (e) {
    console.error('[TidalView] Failed to restore original tide data snapshot', e);
  }
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (typeof lat1 !== 'number' || !Number.isFinite(lat1)) return null;
  if (typeof lon1 !== 'number' || !Number.isFinite(lon1)) return null;
  if (typeof lat2 !== 'number' || !Number.isFinite(lat2)) return null;
  if (typeof lon2 !== 'number' || !Number.isFinite(lon2)) return null;

  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildStationsByDistance() {
  const stations = noaaTideStations?.stations;
  if (!Array.isArray(stations) || stations.length === 0) return [];

  const pos = boatPosition.value;
  if (!pos) return [];

  const withDistance = [];
  for (const s of stations) {
    if (!s || typeof s !== 'object') continue;
    const id = typeof s.id === 'string' ? s.id : null;
    const name = typeof s.name === 'string' ? s.name : null;
    if (!id) continue;

    const referenceId = typeof s.reference_id === 'string' ? s.reference_id : null;
    const queryStationId = /^[0-9]+$/.test(id)
      ? id
      : referenceId && /^[0-9]+$/.test(referenceId)
        ? referenceId
        : null;
    if (!queryStationId) continue;

    const lat = typeof s.lat === 'number' ? s.lat : null;
    const lng = typeof s.lng === 'number' ? s.lng : null;
    if (!name || lat == null || lng == null) continue;

    const distanceKm = haversineDistanceKm(pos.latitude, pos.longitude, lat, lng);
    if (distanceKm == null) continue;

    const distanceKmText = Number.isFinite(distanceKm) ? `${distanceKm.toFixed(1)} km` : null;
    withDistance.push({ id, name, queryStationId, lat, lng, distanceKm, distanceKmText });
  }

  withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
  return withDistance;
}

function formatNoaaDateYYYYMMDD(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function getExistingHourlyTimeWindow() {
  const times = tideData.value?.hourly?.time;
  if (!Array.isArray(times) || times.length < 2) return null;

  const first = new Date(times[0]);
  const last = new Date(times[times.length - 1]);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return null;

  const beginDate = formatNoaaDateYYYYMMDD(first);
  const endDate = formatNoaaDateYYYYMMDD(last);
  if (!beginDate || !endDate) return null;

  return { beginDate, endDate };
}

function getNoaaUnitsFromSeaLevelUnit(seaLevelUnit) {
  if (typeof seaLevelUnit !== 'string' || !seaLevelUnit) return null;
  const normalized = seaLevelUnit.toLowerCase();
  if (normalized.includes('ft')) return 'english';
  if (normalized.includes('m')) return 'metric';
  return null;
}

async function fetchNoaaTidePredictionsHourly({ stationId, beginDate, endDate, datum, units }) {
  if (!stationId || !beginDate || !endDate || !datum || !units) return null;

  const url = new URL('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter');
  url.search = new URLSearchParams({
    product: 'predictions',
    station: stationId,
    begin_date: beginDate,
    end_date: endDate,
    datum,
    units,
    time_zone: 'gmt',
    interval: 'h',
    format: 'json',
  }).toString();

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`NOAA hourly predictions request failed (${res.status})`);
  }
  const json = await res.json();
  const preds = json?.predictions;
  if (!Array.isArray(preds) || preds.length === 0) {
    const apiErrorMessage =
      typeof json?.error?.message === 'string' ? json.error.message :
      typeof json?.error === 'string' ? json.error :
      null;
    const detail = apiErrorMessage ? ` NOAA error: ${apiErrorMessage}` : ` NOAA response keys: ${Object.keys(json || {}).join(', ')}`;
    throw new Error(`NOAA hourly predictions missing predictions array.${detail}`);
  }

  const time = [];
  const seaLevelHeightMsl = [];
  for (const p of preds) {
    const t = typeof p?.t === 'string' ? p.t : null;
    const v = typeof p?.v === 'string' || typeof p?.v === 'number' ? Number(p.v) : null;
    if (!t || v == null || Number.isNaN(v)) continue;
    const parsed = new Date(`${t.replace(' ', 'T')}Z`);
    if (Number.isNaN(parsed.getTime())) continue;
    time.push(parsed.toISOString());
    seaLevelHeightMsl.push(v);
  }

  return {
    time,
    values: {
      seaLevelHeightMsl,
    },
  };
}

async function fetchNoaaTidePredictionsHiLo({ stationId, beginDate, endDate, datum, units }) {
  if (!stationId || !beginDate || !endDate || !datum || !units) return null;

  const url = new URL('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter');
  url.search = new URLSearchParams({
    product: 'predictions',
    station: stationId,
    begin_date: beginDate,
    end_date: endDate,
    datum,
    units,
    time_zone: 'gmt',
    interval: 'hilo',
    format: 'json',
  }).toString();

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`NOAA high/low predictions request failed (${res.status})`);
  }
  const json = await res.json();
  const preds = json?.predictions;
  if (!Array.isArray(preds) || preds.length === 0) {
    const apiErrorMessage =
      typeof json?.error?.message === 'string' ? json.error.message :
      typeof json?.error === 'string' ? json.error :
      null;
    const detail = apiErrorMessage ? ` NOAA error: ${apiErrorMessage}` : ` NOAA response keys: ${Object.keys(json || {}).join(', ')}`;
    throw new Error(`NOAA high/low predictions missing predictions array.${detail}`);
  }

  const predictions = [];
  for (const p of preds) {
    const t = typeof p?.t === 'string' ? p.t : null;
    const v = typeof p?.v === 'string' || typeof p?.v === 'number' ? Number(p.v) : null;
    const type = typeof p?.type === 'string' ? p.type : null;
    if (!t || v == null || Number.isNaN(v) || !type) continue;
    const parsed = new Date(`${t.replace(' ', 'T')}Z`);
    if (Number.isNaN(parsed.getTime())) continue;
    predictions.push({ time: parsed.toISOString(), height: v, type });
  }

  const now = Date.now();
  const upcoming = predictions
    .filter((p) => {
      const d = new Date(p.time);
      return !Number.isNaN(d.getTime()) && d.getTime() >= now;
    })
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const nextHigh = upcoming.find((p) => p.type === 'H') || null;
  const nextLow = upcoming.find((p) => p.type === 'L') || null;

  return {
    nextHigh: nextHigh ? { time: nextHigh.time, height: nextHigh.height } : null,
    nextLow: nextLow ? { time: nextLow.time, height: nextLow.height } : null,
    predictions,
  };
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

.tide-fetch-progress {
  position: sticky;
  top: 0;
  z-index: 5;
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
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.station-name {
  display: inline-block;
}

.station-loading-spinner {
  width: 18px;
  height: 18px;
}

.station-distance {
  font-size: 0.8rem;
  color: var(--app-muted-text-color);
  margin-top: 2px;
}

.station-loading {
  padding: 12px;
  font-weight: 600;
  color: var(--app-text-color);
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
