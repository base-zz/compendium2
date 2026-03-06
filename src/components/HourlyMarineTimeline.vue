<template>
  <div v-if="hourlyMarineForecast.length" class="marine-forecast">
    <h3 class="section-title marine-forecast-title">Marine Forecast</h3>
    <div class="marine-forecast-grid">
      <div class="marine-forecast-cell marine-forecast-key-cell">
        <div class="marine-forecast-day">&nbsp;</div>
        <div class="marine-forecast-time">&nbsp;</div>
        <div class="marine-forecast-key-item">Wind Dir</div>
        <div class="marine-forecast-key-item">Wind kn</div>
        <div class="marine-forecast-key-item">Gust (kn)</div>
        <div class="marine-forecast-divider" aria-hidden="true"></div>
        <div class="marine-forecast-key-item">Wave Dir</div>
        <div class="marine-forecast-key-item">Wave {{ waveHeightUnitLabel }}</div>
        <div class="marine-forecast-key-item">Period s</div>
        <div class="marine-forecast-key-item">Swell {{ waveHeightUnitLabel }}</div>
      </div>

      <div
        v-for="item in hourlyMarineForecast"
        :key="item.startTime"
        class="marine-forecast-cell"
      >
        <div class="marine-forecast-day">{{ item.dayLabel }}</div>
        <div class="marine-forecast-time">{{ item.timeLabel }}</div>
        <div class="marine-forecast-arrow" :style="{ transform: `rotate(${item.windDirectionDegrees}deg)` }">↑</div>
        <div class="marine-forecast-value">{{ item.windSpeed }}</div>
        <div class="marine-forecast-subvalue">{{ item.windGust }}</div>
        <div class="marine-forecast-divider" aria-hidden="true"></div>
        <div class="marine-forecast-arrow" :style="{ transform: `rotate(${item.waveDirectionDegrees}deg)` }">↑</div>
        <div class="marine-forecast-value">{{ item.waveHeight }}</div>
        <div class="marine-forecast-subvalue">{{ item.wavePeriod }}</div>
        <div class="marine-forecast-subvalue">{{ item.swellWaveHeight }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  forecastData: { type: Object, required: true },
  tideData: { type: Object, required: true },
  units: { type: Object, required: true },
});

const getIndexedNumericValue = (collection, index) => {
  if (Array.isArray(collection)) {
    const value = collection[index];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    return null;
  }

  if (collection && typeof collection === 'object') {
    const key = String(index);
    if (Object.prototype.hasOwnProperty.call(collection, key)) {
      const value = collection[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }
  }

  return null;
};

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

const waveHeightUnitLabel = computed(() => {
  const unit = props.units?.waveHeight;
  if (typeof unit === 'string' && unit.length > 0) {
    return unit;
  }
  return '';
});

const getHourKey = (timeValue) => {
  if (typeof timeValue !== 'string' || timeValue.length < 1) {
    return null;
  }

  const parsedTime = new Date(timeValue);
  if (!(parsedTime instanceof Date) || Number.isNaN(parsedTime.getTime())) {
    return null;
  }

  const hourMs = Math.floor(parsedTime.getTime() / 3600000) * 3600000;
  return `${hourMs}`;
};

const hourlyMarineForecast = computed(() => {
  const windHourly = props.forecastData?.hourly;
  const waveHourly = props.tideData?.hourly;

  const windTimes = windHourly?.time;
  const windSpeeds = windHourly?.wind_speed_10m;
  const windDirections = windHourly?.wind_direction_10m;
  const windGusts = windHourly?.wind_gusts_10m;

  const waveTimes = waveHourly?.time;
  const waveValues = waveHourly?.values;
  const waveHeights = waveValues?.waveHeight;
  const waveDirections = waveValues?.waveDirection;
  const wavePeriods = waveValues?.wavePeriod;
  const swellWaveHeights = waveValues?.swellWaveHeight;

  if (
    !Array.isArray(windTimes) ||
    !Array.isArray(windSpeeds) ||
    !Array.isArray(windDirections) ||
    !Array.isArray(windGusts) ||
    !Array.isArray(waveTimes) ||
    !waveHeights ||
    !waveDirections ||
    !wavePeriods ||
    !swellWaveHeights
  ) {
    return [];
  }

  const waveIndexByHourKey = new Map();
  waveTimes.forEach((waveTime, waveIndex) => {
    const hourKey = getHourKey(waveTime);
    if (typeof hourKey !== 'string') {
      return;
    }
    if (!waveIndexByHourKey.has(hourKey)) {
      waveIndexByHourKey.set(hourKey, waveIndex);
    }
  });

  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: true,
  });
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
  });

  const nowMs = Date.now();

  const matchedEntries = windTimes
    .map((startTime, windIndex) => {
      if (typeof startTime !== 'string' || startTime.length < 1) {
        return null;
      }

      const hourKey = getHourKey(startTime);
      if (typeof hourKey !== 'string') {
        return null;
      }

      const waveIndex = waveIndexByHourKey.get(hourKey);
      if (typeof waveIndex !== 'number') {
        return null;
      }

      const windSpeed = windSpeeds[windIndex];
      const windGust = windGusts[windIndex];
      const rawWindDirection = windDirectionToDegrees(windDirections[windIndex]);
      const waveHeight = getIndexedNumericValue(waveHeights, waveIndex);
      const waveDirection = getIndexedNumericValue(waveDirections, waveIndex);
      const wavePeriod = getIndexedNumericValue(wavePeriods, waveIndex);
      const swellWaveHeight = getIndexedNumericValue(swellWaveHeights, waveIndex);

      if (
        typeof windSpeed !== 'number' ||
        Number.isNaN(windSpeed) ||
        typeof windGust !== 'number' ||
        Number.isNaN(windGust) ||
        typeof rawWindDirection !== 'number' ||
        typeof waveHeight !== 'number' ||
        typeof waveDirection !== 'number' ||
        typeof wavePeriod !== 'number' ||
        typeof swellWaveHeight !== 'number'
      ) {
        return null;
      }

      const time = new Date(startTime);
      if (!(time instanceof Date) || Number.isNaN(time.getTime())) {
        return null;
      }

      const timeMs = time.getTime();
      if (timeMs < nowMs) {
        return null;
      }

      return {
        startTime,
        dayLabel: dayFormatter.format(time),
        timeLabel: formatter.format(time),
        windDirectionDegrees: (rawWindDirection + 180) % 360,
        waveDirectionDegrees: (waveDirection + 180) % 360,
        windSpeed: `${windSpeed.toFixed(1)}`,
        windGust: `${windGust.toFixed(1)}`,
        waveHeight: waveHeight.toFixed(1),
        wavePeriod: wavePeriod.toFixed(1),
        swellWaveHeight: swellWaveHeight.toFixed(1),
      };
    })
    .filter((entry) => entry != null);

  const futureEntries = matchedEntries.filter((entry) => {
    const entryTime = new Date(entry.startTime);
    if (!(entryTime instanceof Date) || Number.isNaN(entryTime.getTime())) {
      return false;
    }
    return entryTime.getTime() >= nowMs;
  });

  if (futureEntries.length > 0) {
    return futureEntries;
  }

  return matchedEntries;
});
</script>

<style scoped>
.marine-forecast {
  margin: 6px 8px 0;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--app-surface-color) 95%, var(--app-text-color) 5%);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
}

.marine-forecast-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--app-text-color);
  margin: 0 0 10px 0;
}

.marine-forecast-grid {
  display: flex;
  overflow-x: auto;
  gap: 1rem;
  padding: 0;
  margin: 0;
  min-height: 120px;
  scrollbar-width: none;
}

.marine-forecast-grid::-webkit-scrollbar {
  display: none;
}

.marine-forecast-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 3.5rem;
  gap: 0.35rem;
}

.marine-forecast-key-cell {
  min-width: 112px;
  align-items: flex-start;
  padding-right: 4px;
}

.marine-forecast-key-item {
  font-size: 0.75rem;
  color: var(--app-muted-text-color);
  font-weight: 600;
  white-space: nowrap;
}

.marine-forecast-day {
  font-size: 0.7rem;
  color: var(--app-muted-text-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.marine-forecast-time {
  font-size: 0.75rem;
  color: var(--app-muted-text-color);
}

.marine-forecast-arrow {
  font-size: 1.25rem;
  color: #ffffff;
  min-height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.marine-forecast-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--app-text-color);
  min-height: 1.2rem;
}

.marine-forecast-subvalue {
  font-size: 0.75rem;
  color: var(--app-muted-text-color);
  min-height: 1rem;
}

.marine-forecast-divider {
  width: 100%;
  border-top: 1px solid var(--app-border-color);
  margin: 0.15rem 0;
}

@media (max-width: 640px) {
  .marine-forecast-grid {
    gap: 0.8rem;
    padding: 0;
  }

  .marine-forecast-key-cell {
    min-width: 104px;
  }

  .marine-forecast-cell {
    min-width: 3.2rem;
  }
}
</style>
