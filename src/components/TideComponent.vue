<template>
  <div class="tide-component">
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
                <div class="station-name-row">
                  <span>{{ station.name }}</span>
                  <span class="station-capability-icons">
                    <span class="capability-icon tide" title="Tide data available">🌊</span>
                    <span v-if="stationHasCurrent(station)" class="capability-icon current" title="Current data available">💨</span>
                  </span>
                </div>
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

      <div v-if="tideExtremesTable" class="tide-events">
        <h3 class="section-title">Tide Extremes</h3>
        <div class="tide-table-container">
          <table class="tide-extremes-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Low</th>
                <th>High</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in tideExtremesTable" :key="row.label">
                <td class="period-cell">{{ row.label }}</td>
                <td :class="props.viewMode === 'anchor' ? row.lowClass : 'extreme-cell-neutral'">{{ row.low }}</td>
                <td :class="props.viewMode === 'anchor' ? 'high-cell' : 'extreme-cell-neutral'">{{ row.high }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="hourlyWindForecast.length" class="wind-forecast">
        <h3 class="section-title">Wind Forecast</h3>
        <div class="wind-forecast-grid">
          <div class="wind-forecast-cell wind-forecast-key-cell">
            <div class="wind-forecast-day">&nbsp;</div>
            <div class="wind-forecast-time">&nbsp;</div>
            <div class="wind-forecast-key-item">Dir</div>
            <div class="wind-forecast-key-item">Wind (kn)</div>
            <div class="wind-forecast-key-item">Gust (kn)</div>
          </div>
          <div v-for="item in hourlyWindForecast" :key="item.startTime" class="wind-forecast-cell">
            <div class="wind-forecast-day">{{ item.dayLabel }}</div>
            <div class="wind-forecast-time">{{ item.timeLabel }}</div>
            <div class="wind-forecast-arrow" :style="{ transform: `rotate(${item.directionDegrees}deg)` }">↑</div>
            <div class="wind-forecast-speed">{{ item.windSpeed }}</div>
            <div class="wind-forecast-gust">{{ item.windGust }}</div>
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

      <!-- Current Data Comparison (Real vs Imputed) -->
      <div v-if="hasAnyCurrentData" class="current-comparison">
        <h3 class="section-title">Current Data Comparison</h3>
        <div class="comparison-grid">
          <!-- Real NOAA Data -->
          <div class="comparison-card" :class="{ 'no-data': !hasRealCurrentData }">
            <div class="comparison-header">
              <span class="source-badge real">NOAA Station</span>
              <span v-if="currentStationDistance" class="distance-badge">{{ currentStationDistance }} km</span>
            </div>
            <div v-if="hasRealCurrentData" class="comparison-data">
              <div class="data-row">
                <span class="data-value">{{ realCurrentData.velocity }}</span>
                <span class="data-unit">kt</span>
              </div>
              <div class="data-row secondary">
                <span class="data-direction">{{ realCurrentData.direction }}°</span>
                <span class="data-dir-name">{{ getDirectionName(realCurrentData.direction) }}</span>
              </div>
              <div class="data-type">{{ realCurrentData.type }}</div>
            </div>
            <div v-else class="no-data-message">
              No nearby station
            </div>
          </div>

          <!-- Imputed Open-Meteo Data -->
          <div class="comparison-card">
            <div class="comparison-header">
              <span class="source-badge imputed">IMPUTED</span>
              <span class="model-badge">Model</span>
            </div>
            <div class="comparison-data">
              <div class="data-row">
                <span class="data-value">{{ imputedCurrentData.velocity }}</span>
                <span class="data-unit">kt</span>
              </div>
              <div class="data-row secondary">
                <span class="data-direction">{{ imputedCurrentData.direction }}°</span>
                <span class="data-dir-name">{{ getDirectionName(imputedCurrentData.direction) }}</span>
              </div>
              <div class="data-type">{{ imputedCurrentData.type }}</div>
            </div>
          </div>
        </div>

        <!-- Comparison Stats (only when both available) -->
        <div v-if="hasRealCurrentData && hasImputedCurrentData" class="comparison-stats">
          <div class="stat-row">
            <span class="stat-label">Velocity Diff:</span>
            <span class="stat-value" :class="comparisonStats.velocityClass">{{ comparisonStats.velocityDiff }} kt</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Direction Diff:</span>
            <span class="stat-value" :class="comparisonStats.directionClass">{{ comparisonStats.directionDiff }}°</span>
          </div>
          <div class="accuracy-bar">
            <div class="accuracy-label">Match: {{ comparisonStats.accuracy }}%</div>
            <div class="accuracy-track">
              <div class="accuracy-fill" :style="{ width: comparisonStats.accuracy + '%' }" :class="comparisonStats.accuracyClass"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import {
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
  IonContent,
} from '@ionic/vue';
import TideChart from '@/components/charts/TideChart.vue';
import { useStateDataStore } from '@/stores/stateDataStore';
import { storeToRefs } from 'pinia';
import noaaTideStations from '@/components/data/noaa-tide-stations.json';
import noaaCurrentStations from '@/components/data/noaa-current-stations.json';

// Props for view mode and anchor depth
const props = defineProps({
  viewMode: {
    type: String,
    default: 'tide', // 'tide' or 'anchor'
    validator: (value) => ['tide', 'anchor'].includes(value)
  },
  anchorDepth: {
    type: Number,
    default: null // Depth in user's preferred units
  },
  depthUnits: {
    type: String,
    default: 'ft', // 'ft' or 'm' - units of anchorDepth
    validator: (value) => ['ft', 'm'].includes(value)
  }
});

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

// Build Set of current station coordinates for quick lookup (IDs differ between tide and current stations)
const currentStationCoords = new Set(
  (noaaCurrentStations?.stations || []).map(s => {
    const lat = s?.lat;
    const lng = s?.lng;
    if (lat == null || lng == null) return null;
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
  }).filter(Boolean)
);

// Check if station has current data by matching coordinates
function stationHasCurrent(station) {
  const lat = station?.lat;
  const lng = station?.lng;
  if (lat == null || lng == null) return false;
  return currentStationCoords.has(`${lat.toFixed(4)},${lng.toFixed(4)}`);
}

const tideData = computed(() => state.value?.tides);
const forecastData = computed(() => state.value?.forecast);
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

const windDirectionToDegrees = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  const map = {
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5,
  };
  if (!Object.prototype.hasOwnProperty.call(map, normalized)) {
    return null;
  }
  return map[normalized];
};

const hourlyWindForecast = computed(() => {
  const hourly = forecastData.value?.hourly;
  const times = hourly?.time;
  const speeds = hourly?.wind_speed_10m;
  const directions = hourly?.wind_direction_10m;
  const gusts = hourly?.wind_gusts_10m;
  if (!Array.isArray(times) || !Array.isArray(speeds) || !Array.isArray(directions) || !Array.isArray(gusts)) {
    return [];
  }
  const count = Math.min(times.length, speeds.length, directions.length, gusts.length);
  if (count < 1) {
    return [];
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: true,
  });
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
  });
  return Array.from({ length: count }, (_, index) => {
    const startTime = times[index];
    const windSpeed = speeds[index];
    const direction = directions[index];
    const windGust = gusts[index];
    if (typeof startTime !== 'string' || !startTime) {
      return null;
    }
    if (typeof windSpeed !== 'number' || Number.isNaN(windSpeed)) {
      return null;
    }
    if (typeof windGust !== 'number' || Number.isNaN(windGust)) {
      return null;
    }
    const rawDirection = windDirectionToDegrees(direction);
    if (typeof rawDirection !== 'number') {
      return null;
    }
    const directionDegrees = (rawDirection + 180) % 360;
    const time = new Date(startTime);
    if (!(time instanceof Date) || Number.isNaN(time.getTime())) {
      return null;
    }
    return {
      startTime,
      dayLabel: dayFormatter.format(time),
      timeLabel: formatter.format(time),
      windSpeed: `${windSpeed}`,
      windGust: `${windGust}`,
      directionDegrees,
      timeMs: time.getTime(), // Add timestamp for filtering
    };
  }).filter((entry) => entry != null);
  
  // Filter to only show hours >= current time
  const nowMs = Date.now();
  const futureEntries = result.filter((entry) => entry.timeMs >= nowMs);
  
  // If all entries are in the past (edge case), show at least the next few hours from start
  if (futureEntries.length === 0 && result.length > 0) {
    return result.slice(0, 12); // Show next 12 hours from beginning of data
  }
  
  return futureEntries;
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

const tideExtremesTable = computed(() => {
  const predictions = tideData.value?.tideEvents?.predictions;
  if (!Array.isArray(predictions) || predictions.length === 0) return null;
  
  const now = new Date();
  const nowMs = now.getTime();
  
  // Check if we're in anchor mode with depth
  const isAnchorMode = props.viewMode === 'anchor';
  const anchorDepth = typeof props.anchorDepth === 'number' && props.anchorDepth > 0 
    ? props.anchorDepth 
    : null;
  
  // Time windows in milliseconds
  const windows = [
    { label: 'Next', hours: Infinity, endMs: Infinity },
    { label: '24h', hours: 24, endMs: nowMs + (24 * 60 * 60 * 1000) },
    { label: '48h', hours: 48, endMs: nowMs + (48 * 60 * 60 * 1000) },
    { label: '72h', hours: 72, endMs: nowMs + (72 * 60 * 60 * 1000) },
  ];
  
  const rows = [];
  
  for (const window of windows) {
    // Filter predictions within this window
    const windowPreds = predictions.filter(p => {
      const t = new Date(p.time);
      if (Number.isNaN(t.getTime())) return false;
      const tMs = t.getTime();
      return tMs >= nowMs && tMs <= window.endMs;
    });
    
    if (windowPreds.length === 0) {
      rows.push({
        label: window.label,
        high: '--',
        low: '--'
      });
      continue;
    }
    
    // Find highest high and lowest low
    let maxHigh = null;
    let minLow = null;
    
    for (const p of windowPreds) {
      if (p.type === 'H') {
        if (maxHigh == null || p.height > maxHigh.height) {
          maxHigh = p;
        }
      } else if (p.type === 'L') {
        if (minLow == null || p.height < minLow.height) {
          minLow = p;
        }
      }
    }
    
    // Format values - adjust for anchor depth if in anchor mode
    // Formula: anchorDepth - currentTide + predictedTide = future water depth
    // Tide data from NOAA is always in feet, so convert if needed
    const formatValue = (predictedTideHeight, time) => {
      if (predictedTideHeight == null) return '--';
      const t = time ? formatTime(time) : '';
      
      if (isAnchorMode && anchorDepth != null) {
        // Get current tide level from hourly data
        const currentTideLevel = currentTideLevelFromHourly.value;
        
        // Convert predicted tide height to depth units if needed (NOAA tide is in feet)
        let predictedInDepthUnits = predictedTideHeight;
        let currentInDepthUnits = currentTideLevel;
        
        if (props.depthUnits === 'm') {
          predictedInDepthUnits = predictedTideHeight * 0.3048; // Convert feet to meters
          if (currentInDepthUnits != null) {
            currentInDepthUnits = currentInDepthUnits * 0.3048;
          }
        }
        
        // Calculate water depth: anchorDepth - currentTide + predictedTide
        // This accounts for where we are on the tide curve
        let waterDepth;
        if (currentInDepthUnits != null) {
          waterDepth = (anchorDepth - currentInDepthUnits + predictedInDepthUnits).toFixed(1);
        } else {
          // Fallback if no current tide data
          waterDepth = (anchorDepth + predictedInDepthUnits).toFixed(1);
        }
        
        return `${waterDepth}${props.depthUnits === 'm' ? 'm' : 'ft'} -- ${t}`;
      } else {
        // Show tide height relative to chart datum in user's preferred units
        const displayHeight = props.depthUnits === 'm' ? (predictedTideHeight * 0.3048).toFixed(1) : predictedTideHeight.toFixed(1);
        return `${displayHeight}${props.depthUnits === 'm' ? 'm' : 'ft'} -- ${t}`;
      }
    };
    
    const highText = formatValue(maxHigh?.height, maxHigh?.time ? new Date(maxHigh.time) : null);
    const lowText = formatValue(minLow?.height, minLow?.time ? new Date(minLow.time) : null);

    // Match AnchorView (not anchored) low-tide severity coloring
    let lowClass = 'low-cell-safe';
    if (isAnchorMode && minLow && anchorDepth != null) {
      const currentTideLevel = currentTideLevelFromHourly.value;
      let predictedInDepthUnits = minLow.height;
      let currentInDepthUnits = currentTideLevel;

      if (props.depthUnits === 'm') {
        predictedInDepthUnits = minLow.height * 0.3048;
        if (currentInDepthUnits != null) {
          currentInDepthUnits = currentInDepthUnits * 0.3048;
        }
      }

      let waterDepthAtLowTide;
      if (currentInDepthUnits != null) {
        waterDepthAtLowTide = anchorDepth - currentInDepthUnits + predictedInDepthUnits;
      } else {
        waterDepthAtLowTide = anchorDepth + predictedInDepthUnits;
      }

      const boatDims = state.value?.preferences?.boatDimensions;
      const draft = typeof boatDims?.draft === 'number' ? boatDims.draft : null;
      const safeAnchoringDepth =
        typeof boatDims?.safeAnchoringDepth === 'number' ? boatDims.safeAnchoringDepth : null;

      if (typeof draft === 'number' && waterDepthAtLowTide < draft) {
        lowClass = 'low-cell-danger';
      } else if (typeof safeAnchoringDepth === 'number' && waterDepthAtLowTide < safeAnchoringDepth) {
        lowClass = 'low-cell-warning';
      }
    }
    
    rows.push({
      label: window.label,
      high: highText,
      low: lowText,
      lowClass
    });
  }
  
  return rows;
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

// Current data comparison computed properties
const hasRealCurrentData = computed(() => {
  const events = tideData.value?.currentEvents;
  if (!events || typeof events !== 'object') return false;
  const predictions = events.predictions;
  return Array.isArray(predictions) && predictions.length > 0;
});

const hasImputedCurrentData = computed(() => {
  const imputed = tideData.value?.imputedCurrent;
  if (!imputed || typeof imputed !== 'object') return false;
  const predictions = imputed.predictions;
  return Array.isArray(predictions) && predictions.length > 0;
});

const hasAnyCurrentData = computed(() => hasRealCurrentData.value || hasImputedCurrentData.value);

const currentStationDistance = computed(() => {
  const distance = tideData.value?.metadata?.currentStation?.distanceKm;
  return typeof distance === 'number' ? Math.round(distance) : null;
});

const realCurrentData = computed(() => {
  const events = tideData.value?.currentEvents;
  const predictions = events?.predictions;
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return { velocity: '--', direction: '--', type: '--' };
  }
  
  const now = new Date();
  const current = predictions.find(p => {
    const t = p?.time ? new Date(p.time) : null;
    if (!t || Number.isNaN(t.getTime())) return false;
    // Find prediction within 1 hour of now
    return Math.abs(t.getTime() - now.getTime()) < 3600000;
  }) || predictions[0];
  
  return {
    velocity: typeof current?.velocity === 'number' ? current.velocity.toFixed(2) : '--',
    direction: typeof current?.direction === 'number' ? Math.round(current.direction) : '--',
    type: typeof current?.type === 'string' ? current.type.charAt(0).toUpperCase() + current.type.slice(1) : '--'
  };
});

const imputedCurrentData = computed(() => {
  const imputed = tideData.value?.imputedCurrent;
  const predictions = imputed?.predictions;
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return { velocity: '--', direction: '--', type: '--' };
  }
  
  const now = new Date();
  const current = predictions.find(p => {
    const t = p?.time ? new Date(p.time) : null;
    if (!t || Number.isNaN(t.getTime())) return false;
    return Math.abs(t.getTime() - now.getTime()) < 3600000;
  }) || predictions[0];
  
  return {
    velocity: typeof current?.velocity === 'number' ? current.velocity.toFixed(2) : '--',
    direction: typeof current?.direction === 'number' ? Math.round(current.direction) : '--',
    type: typeof current?.type === 'string' ? current.type.charAt(0).toUpperCase() + current.type.slice(1) : '--'
  };
});

const comparisonStats = computed(() => {
  if (!hasRealCurrentData.value || !hasImputedCurrentData.value) {
    return { velocityDiff: '--', directionDiff: '--', accuracy: 0, velocityClass: '', directionClass: '', accuracyClass: '' };
  }
  
  const real = realCurrentData.value;
  const imputed = imputedCurrentData.value;
  
  const realVel = parseFloat(real.velocity);
  const impVel = parseFloat(imputed.velocity);
  const realDir = parseFloat(real.direction);
  const impDir = parseFloat(imputed.direction);
  
  if (Number.isNaN(realVel) || Number.isNaN(impVel) || Number.isNaN(realDir) || Number.isNaN(impDir)) {
    return { velocityDiff: '--', directionDiff: '--', accuracy: 0, velocityClass: '', directionClass: '', accuracyClass: '' };
  }
  
  const velocityDiff = (impVel - realVel).toFixed(2);
  
  // Calculate smallest direction difference (handles 350° vs 10° case)
  let directionDiff = Math.abs(impDir - realDir);
  if (directionDiff > 180) directionDiff = 360 - directionDiff;
  
  // Calculate accuracy percentage
  const velAccuracy = Math.max(0, 1 - Math.abs(velocityDiff) / Math.max(realVel, 0.1));
  const dirAccuracy = Math.max(0, 1 - directionDiff / 90);
  const accuracy = Math.round(((velAccuracy + dirAccuracy) / 2) * 100);
  
  const velocityClass = Math.abs(parseFloat(velocityDiff)) < 0.3 ? 'good' : Math.abs(parseFloat(velocityDiff)) < 0.6 ? 'warning' : 'bad';
  const directionClass = directionDiff < 15 ? 'good' : directionDiff < 30 ? 'warning' : 'bad';
  const accuracyClass = accuracy >= 80 ? 'good' : accuracy >= 60 ? 'warning' : 'bad';
  
  return {
    velocityDiff: velocityDiff > 0 ? `+${velocityDiff}` : velocityDiff,
    directionDiff: directionDiff,
    accuracy,
    velocityClass,
    directionClass,
    accuracyClass
  };
});

function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
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
      console.error('[TideComponent] Failed to build station list', e);
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
    console.error('[TideComponent] Failed to load tide data for station', stationId, e);
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
    console.error('[TideComponent] Failed to restore original tide data snapshot', e);
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
.tide-component {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--app-background-color);
  color: var(--app-text-color);
}

.tide-fetch-progress {
  position: sticky;
  top: 0;
  z-index: 5;
}

.tide-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
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
  background: color-mix(in srgb, var(--app-surface-color) 95%, var(--app-text-color) 5%);
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

/* Tide extremes table styles */
.tide-table-container {
  overflow-x: auto;
}

.wind-forecast {
  margin-top: 8px;
}

.wind-forecast-key-item {
  font-size: 0.75rem;
  color: var(--app-muted-text-color);
  font-weight: 600;
}

.wind-forecast-grid {
  display: flex;
  overflow-x: auto;
  gap: 1.25rem;
  padding: 1rem;
  margin: 0.5rem 0 1rem;
  min-height: 100px;
  scrollbar-width: none;
  background: color-mix(in srgb, var(--app-surface-color) 50%, var(--app-background-color) 50%);
  border-radius: 12px;
  border: 1px solid var(--app-border-color);
}

.wind-forecast-grid::-webkit-scrollbar {
  display: none;
}

.wind-forecast-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 3.25rem;
  gap: 0.35rem;
}

.wind-forecast-key-cell {
  min-width: 74px;
  align-items: flex-start;
  padding-right: 6px;
}

.wind-forecast-day {
  font-size: 0.7rem;
  color: var(--app-muted-text-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.wind-forecast-time {
  font-size: 0.75rem;
  color: var(--app-muted-text-color);
}

.wind-forecast-arrow {
  font-size: 1.25rem;
  color: #ffffff;
  min-height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wind-forecast-speed {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--app-text-color);
  min-height: 1.2rem;
}

.wind-forecast-gust {
  font-size: 0.75rem;
  color: var(--app-muted-text-color);
  min-height: 1rem;
}

.tide-extremes-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.tide-extremes-table th {
  text-align: left;
  padding: 8px 6px;
  font-weight: 600;
  color: var(--app-muted-text-color);
  border-bottom: 1px solid var(--app-border-color);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.03em;
}

.tide-extremes-table td {
  padding: 10px 6px;
  border-bottom: 1px solid var(--app-border-color);
  vertical-align: top;
}

.tide-extremes-table tr:last-child td {
  border-bottom: none;
}

.period-cell {
  font-weight: 600;
  color: var(--app-text-color);
  white-space: nowrap;
}

.high-cell {
  color: #22c55e;
  font-weight: 500;
}

.low-cell {
  color: #ef4444;
  font-weight: 500;
}

.low-cell-safe {
  color: #22c55e;
  font-weight: 500;
}

.low-cell-warning {
  color: #f97316;
  font-weight: 500;
}

.low-cell-danger {
  color: #ef4444;
  font-weight: 500;
}

.extreme-cell-neutral {
  color: var(--app-text-color);
  font-weight: 500;
}

@media (max-width: 480px) {
  .events-grid {
    grid-template-columns: 1fr;
  }
}

.marine-conditions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  overflow: visible;
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
  overflow: visible;
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

.station-search {
  --background: var(--app-surface-color);
  --color: var(--app-text-color);
  --placeholder-color: var(--app-muted-text-color);
  --icon-color: var(--app-text-color);
}

/* Station capability icons in list */
.station-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.station-capability-icons {
  display: flex;
  gap: 4px;
  align-items: center;
}

.capability-icon {
  font-size: 0.9rem;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.capability-icon:hover {
  opacity: 1;
}

/* Current Data Comparison Styles */
.current-comparison {
  margin: 6px 8px 0;
  padding: 10px 12px;
  background: var(--app-surface-color);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.comparison-card {
  background: color-mix(in srgb, var(--app-surface-color) 80%, var(--app-background-color) 20%);
  border: 1px solid var(--app-border-color);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comparison-card.no-data {
  opacity: 0.7;
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.source-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.source-badge.real {
  background: var(--app-accent-color);
  color: var(--app-accent-contrast-color);
}

.source-badge.imputed {
  background: color-mix(in srgb, var(--app-accent-color) 30%, var(--app-surface-color) 70%);
  color: var(--app-text-color);
  border: 1px solid var(--app-border-color);
}

.distance-badge,
.model-badge {
  font-size: 0.65rem;
  color: var(--app-muted-text-color);
  background: var(--app-background-color);
  padding: 2px 6px;
  border-radius: 8px;
}

.comparison-data {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.data-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.data-row.secondary {
  font-size: 0.85rem;
  color: var(--app-muted-text-color);
}

.data-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--app-text-color);
}

.data-unit {
  font-size: 0.8rem;
  color: var(--app-muted-text-color);
  font-weight: 500;
}

.data-direction {
  font-weight: 600;
}

.data-dir-name {
  font-size: 0.75rem;
}

.data-type {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--app-accent-color);
  text-transform: capitalize;
  margin-top: 2px;
}

.no-data-message {
  font-size: 0.9rem;
  color: var(--app-muted-text-color);
  text-align: center;
  padding: 16px 8px;
  font-style: italic;
}

.comparison-stats {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--app-border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.stat-label {
  color: var(--app-muted-text-color);
  font-weight: 500;
}

.stat-value {
  font-weight: 600;
  font-family: 'Roboto Mono', monospace;
}

.stat-value.good {
  color: #22c55e;
}

.stat-value.warning {
  color: #f59e0b;
}

.stat-value.bad {
  color: #ef4444;
}

.accuracy-bar {
  margin-top: 4px;
}

.accuracy-label {
  font-size: 0.75rem;
  color: var(--app-muted-text-color);
  margin-bottom: 4px;
  font-weight: 500;
}

.accuracy-track {
  height: 8px;
  background: var(--app-background-color);
  border-radius: 4px;
  overflow: hidden;
}

.accuracy-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.accuracy-fill.good {
  background: #22c55e;
}

.accuracy-fill.warning {
  background: #f59e0b;
}

.accuracy-fill.bad {
  background: #ef4444;
}

@media (max-width: 480px) {
  .comparison-grid {
    grid-template-columns: 1fr;
  }
  
  .comparison-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
