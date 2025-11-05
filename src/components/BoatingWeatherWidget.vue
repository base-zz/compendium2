/* Compact layout takes Ruuvi-inspired minimalism */
.compact-layout {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding: calc(var(--widget-spacing, 16px) * 0.75);
  text-align: center;
  gap: calc(var(--widget-spacing, 16px) * 0.8);
}

.temp-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: calc(var(--widget-spacing, 16px));
}

.temp-large {
  font-size: 3.25em;
  font-weight: 700;
  color: var(--widget-text-color);
  line-height: 1;
}

.compact-condition-icon {
  font-size: 2.4em;
  color: var(--widget-text-color);
  line-height: 1;
}

.metrics-row {
  display: flex;
  justify-content: space-between;
  gap: calc(var(--widget-spacing, 16px) * 0.5);
}

.metric-left,
.metric-right {
  flex: 1 1 0;
  text-align: center;
}

.metric-label {
  display: block;
  font-size: 0.9em;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 0.35em;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.metric-value {
  display: block;
  font-size: 1.45em;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 0.2em;
}

.metric-small {
  display: block;
  font-size: 0.8em;
  color: #9ca3af;
}

.tide-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: calc(var(--widget-spacing, 16px) * 0.75);
}

.tide-label {
  font-size: 0.9em;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.tide-value {
  font-size: 1.15em;
  font-weight: 700;
  color: #f8fafc;
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
}

.tide-arrow {
  font-size: 1em;
  opacity: 0.85;
  line-height: 1;
}


.standard-layout {
  display: grid;
  gap: calc(var(--widget-spacing, 16px));
}
<template>
  <div ref="widgetRef" :class="['weather-widget', widgetSizeClass]" :style="widgetStyleVars">
    <div v-if="layoutVariant === 'compact'" class="compact-layout">
      <!-- Temperature - Large and prominent like Ruuvi -->
      <div class="temp-section">
        <span class="temp-large">{{ temperatureValueDisplay }}°{{ temperatureUnit }}</span>
        <span class="compact-condition-icon">{{ conditionIcon }}</span>
      </div>

      <!-- Wind and Pressure - Side by side like Ruuvi's humidity/pressure -->
      <div class="metrics-row">
        <div class="metric-left">
          <span class="metric-label">Wind</span>
          <span class="metric-value">{{ windDirectionArrow }} {{ windSpeedDisplay }}</span>
          <span v-if="gustDisplay" class="metric-small">Gusts {{ gustDisplay }}</span>
        </div>
        <div class="metric-right">
          <span class="metric-label">Pressure</span>
          <span class="metric-value pressure-reading" :class="trendCategoryClass">
            <span class="pressure-value">{{ pressureValueOnly }}</span>
            <span class="pressure-unit-row">
              <span class="pressure-unit">{{ pressureUnitLabel }}</span>
              <span v-if="pressureTrendArrowSymbol" class="pressure-trend-arrow">{{ pressureTrendArrowSymbol }}</span>
            </span>
          </span>
        </div>
      </div>

      <!-- Tide - Bottom row like Ruuvi's battery -->
      <div class="tide-row">
        <span class="tide-label">Tide</span>
        <span class="tide-value">
          <span>{{ tideDisplay.value }}</span>
          <span v-if="tideDisplay.arrow" class="tide-arrow">{{ tideDisplay.arrow }}</span>
        </span>
      </div>
    </div>

    <div v-else class="standard-layout">
      <div class="standard-grid">
        <div class="standard-cell temp-cell">
          <span class="temperature">{{ temperatureDisplay }}</span>
          <span v-if="conditionText" class="condition-text">{{ conditionText }}</span>
          <span v-if="feelsLikeDisplay" class="feels-like">Feels {{ feelsLikeDisplay }}</span>
        </div>

        <div class="standard-cell wind-cell">
          <span class="metric-label">Wind</span>
          <span v-if="windSpeedDisplay !== '--'" class="wind-value">{{ windSpeedDisplay }}</span>
          <span v-else class="metric-value">--</span>
          <div v-if="windSpeedDisplay !== '--' && (windDirectionArrow || gustDisplay)" class="wind-meta">
            <span v-if="windDirectionArrow" class="arrow">{{ windDirectionArrow }}</span>
            <span v-if="gustDisplay" class="gusts">Gusts {{ gustDisplay }}</span>
          </div>
        </div>

        <div class="standard-cell tide-cell">
          <span class="metric-label">Tide</span>
          <span class="metric-value tide-reading">
            <span>{{ tideDisplay.value }}</span>
            <span v-if="tideDisplay.arrow" class="tide-arrow">{{ tideDisplay.arrow }}</span>
          </span>
          <span v-if="tideNextHighDisplay" class="metric-sub">Next high {{ tideNextHighDisplay }}</span>
        </div>

        <div class="standard-cell pressure-cell">
          <span class="metric-label">Pressure</span>
          <template v-if="pressureDisplay !== '--'">
            <span class="metric-value pressure-reading" :class="trendCategoryClass">
              <span class="pressure-value">{{ pressureValueOnly }}</span>
              <span class="pressure-unit-row">
                <span class="pressure-unit">{{ pressureUnitLabel }}</span>
                <span v-if="pressureTrendArrowSymbol" class="pressure-trend-arrow">{{ pressureTrendArrowSymbol }}</span>
              </span>
            </span>
          </template>
          <template v-else>
            <span class="metric-value">--</span>
          </template>
        </div>
      </div>

      <div
        v-if="tideSparkline.length && (layoutVariant === 'standardWide' || layoutVariant === 'expanded')"
        class="standard-chart-row"
      >
        <div class="chart-block">
          <span class="metric-label">Tide trend</span>
          <div class="chart-frame">
            <SparklineChart
              :data="tideSparkline"
              :width="160"
              :height="42"
              stroke-color="#93c5fd"
              :stroke-width="2"
              gradient-id="tide-trend"
            />
          </div>
        </div>
        <div
          v-if="pressureSparkline.length && layoutVariant === 'expanded'"
          class="chart-block"
        >
          <span class="metric-label">Pressure trend</span>
          <div class="chart-frame">
            <SparklineChart
              :data="pressureSparkline"
              :stroke-color="trendColor"
              :stroke-width="2"
              :width="200"
              :height="46"
              gradient-id="pressure-trend"
            />
          </div>
        </div>
      </div>

      <div
        v-if="layoutVariant === 'standardWide' || layoutVariant === 'expanded'"
        class="standard-footer"
      >
        <div class="sun-block">
          <span class="sun-icon">☀️</span>
          <span class="sun-text">Sunrise {{ sunriseDisplay }}</span>
        </div>
        <div class="sun-block">
          <span class="sun-icon">🌙</span>
          <span class="sun-text">Sunset {{ sunsetDisplay }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useStateDataStore } from "@/stores/stateDataStore";
import { UnitConversion } from "@/shared/unitConversion";
import SparklineChart from "@/components/charts/SparklineChart.vue";

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

const widgetRef = ref(null);
const widgetWidth = ref(0);
const widgetVisualWidth = ref(0);
let resizeObserver;

function measureWidget() {
  if (!widgetRef.value || typeof widgetRef.value.getBoundingClientRect !== "function") {
    return;
  }
  const rect = widgetRef.value.getBoundingClientRect();
  if (rect && typeof rect.width === "number" && rect.width >= 0) {
    widgetVisualWidth.value = rect.width;
  }
}

onMounted(() => {
  if (typeof window === "undefined" || typeof ResizeObserver === "undefined") {
    return;
  }
  resizeObserver = new ResizeObserver((entries) => {
    const entry = Array.isArray(entries) ? entries[0] : null;
    const rect = entry?.contentRect;
    if (rect && typeof rect.width === "number") {
      widgetWidth.value = rect.width;
    }
    measureWidget();
  });
  if (widgetRef.value) {
    resizeObserver.observe(widgetRef.value);
    // Ensure we capture the visual width after the browser applies transforms.
    requestAnimationFrame(() => {
      measureWidget();
    });
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect?.();
    resizeObserver = null;
  }
});

const preferences = computed(() => state.value?.preferences ?? {});
const unitsPreference = computed(() => preferences.value?.units ?? {});
const useImperial = computed(() => {
  const pref = preferences.value?.units;
  if (pref && typeof pref === "object" && typeof pref.useImperial === "boolean") {
    return pref.useImperial;
  }
  return true;
});

const forecast = computed(() => state.value?.forecast ?? {});
const current = computed(() => forecast.value?.current ?? {});
const currentUnits = computed(() => forecast.value?.current_units ?? {});
const tides = computed(() => state.value?.tides ?? {});
const tideInfo = computed(() => buildTideInfo(tides.value));
const marine = computed(() => forecast.value?.marine ?? {});
const history = computed(() => forecast.value?.history ?? {});

const effectiveWidgetWidth = computed(() => {
  if (widgetVisualWidth.value > 0) {
    return widgetVisualWidth.value;
  }
  if (widgetWidth.value > 0) {
    return widgetWidth.value;
  }
  return 0;
});

const widgetScale = computed(() => {
  if (widgetWidth.value > 0 && widgetVisualWidth.value > 0) {
    return widgetVisualWidth.value / widgetWidth.value;
  }
  return 1;
});

const widgetStyleVars = computed(() => {
  const vars = {};
  if (effectiveWidgetWidth.value > 0) {
    const baseFont = Math.min(22, Math.max(14, effectiveWidgetWidth.value / 14));
    const spacing = Math.min(26, Math.max(8, effectiveWidgetWidth.value / 28));
    vars["--widget-font-base"] = `${baseFont.toFixed(2)}px`;
    vars["--widget-spacing"] = `${spacing.toFixed(2)}px`;
    vars["--widget-effective-width"] = `${effectiveWidgetWidth.value.toFixed(2)}px`;
  }
  if (widgetScale.value > 0) {
    vars["--widget-scale"] = widgetScale.value.toFixed(4);
  }
  return vars;
});

const layoutVariant = computed(() => {
  const width = effectiveWidgetWidth.value;
  if (typeof width !== "number" || width === 0) {
    return "standard";
  }
  if (width < 260) {
    return "compact";
  }
  if (width <= 360) {
    return "standard";
  }
  if (width <= 480) {
    return "standardWide";
  }
  return "expanded";
});

const widgetSizeClass = computed(() => {
  const variant = layoutVariant.value;
  if (variant === "compact") {
    return "size-compact";
  }
  if (variant === "standardWide") {
    return "size-medium-wide";
  }
  if (variant === "expanded") {
    return "size-large";
  }
  return "size-medium";
});

function trendToSymbol(trend) {
  if (typeof trend !== "string" || !trend) {
    return "";
  }
  const normalized = trend.toLowerCase();
  if (normalized.includes("rising") || normalized.includes("rise") || normalized.includes("flood")) {
    return "↑";
  }
  if (normalized.includes("falling") || normalized.includes("fall") || normalized.includes("ebb")) {
    return "↓";
  }
  if (normalized.includes("steady") || normalized.includes("stable") || normalized.includes("hold")) {
    return "→";
  }
  return "";
}

const temperatureUnit = computed(() => {
  const pref = unitsPreference.value?.temperature;
  if (typeof pref === "string") {
    const normalized = pref.toLowerCase();
    if (normalized === "c" || normalized === "celsius") {
      return "C";
    }
    if (normalized === "f" || normalized === "fahrenheit") {
      return "F";
    }
  }
  const suppliedUnit = currentUnits.value?.temperature_2m || currentUnits.value?.temperature;
  if (typeof suppliedUnit === "string" && suppliedUnit.toLowerCase().includes("f")) {
    return "F";
  }
  return useImperial.value ? "F" : "C";
});

const pressureUnit = computed(() => {
  const pref = unitsPreference.value?.pressure;
  if (typeof pref === "string") {
    const normalized = pref.toLowerCase();
    if (normalized.includes("in")) {
      return "inHg";
    }
    if (normalized.includes("mb")) {
      return "mb";
    }
    if (normalized.includes("pa")) {
      return "hPa";
    }
  }
  const suppliedUnit = currentUnits.value?.pressure_msl || currentUnits.value?.pressure;
  if (typeof suppliedUnit === "string") {
    const normalized = suppliedUnit.toLowerCase();
    if (normalized.includes("in")) return "inHg";
    if (normalized.includes("mb")) return "mb";
    if (normalized.includes("pa")) return "hPa";
  }
  return useImperial.value ? "inHg" : "mb";
});

const distanceUnit = computed(() => {
  const pref = unitsPreference.value?.distance;
  if (typeof pref === "string" && pref.toLowerCase().startsWith("m")) {
    return "m";
  }
  return useImperial.value ? "ft" : "m";
});

const windUnit = computed(() => {
  const pref = unitsPreference.value?.wind;
  if (typeof pref === "string") {
    const normalized = pref.toLowerCase();
    if (normalized.includes("mps")) return "m/s";
    if (normalized.includes("km")) return "km/h";
    if (normalized.includes("mph")) return "mph";
    if (normalized.includes("kt") || normalized.includes("kn")) return "kt";
  }
  const suppliedUnit = currentUnits.value?.wind_speed_10m || currentUnits.value?.windSpeed;
  if (typeof suppliedUnit === "string") {
    const normalized = suppliedUnit.toLowerCase();
    if (normalized.includes("km")) return "km/h";
    if (normalized.includes("mph")) return "mph";
    if (normalized.includes("kt") || normalized.includes("kn")) return "kt";
    if (normalized.includes("m/s")) return "m/s";
  }
  if (useImperial.value) {
    return "kt";
  }
  return "m/s";
});

const conditionCode = computed(() => getConditionCode());

// Check if it's currently nighttime
const isNighttime = computed(() => {
  const now = new Date();
  const sunrise = getSunEvent("sunrise");
  const sunset = getSunEvent("sunset");
  
  if (!sunrise || !sunset) return false;
  
  const sunriseTime = new Date(sunrise);
  const sunsetTime = new Date(sunset);
  
  return now < sunriseTime || now > sunsetTime;
});

const conditionIcon = computed(() => mapWeatherIcon(conditionCode.value, isNighttime.value));
const conditionText = computed(() => mapWeatherCondition(conditionCode.value));

const temperatureValueDisplay = computed(() => {
  const temperature = getTemperatureCelsius();
  if (temperature === null) {
    return "--";
  }
  if (temperatureUnit.value === "F") {
    return `${Math.round(UnitConversion.cToF(temperature))}`;
  }
  return `${Math.round(temperature)}`;
});

const temperatureDisplay = computed(() => {
  const value = temperatureValueDisplay.value;
  if (value === "--") {
    return value;
  }
  return `${value}°${temperatureUnit.value}`;
});

const feelsLikeDisplay = computed(() => {
  const value = getFeelsLikeCelsius();
  if (value === null) {
    return "";
  }
  if (temperatureUnit.value === "F") {
    return `${Math.round(UnitConversion.cToF(value))}°F`;
  }
  return `${Math.round(value)}°C`;
});

const windSpeedDisplay = computed(() => {
  const speed = getWindSpeed();
  if (speed === null) {
    return "--";
  }
  const formatted = Number.isFinite(speed) ? speed.toFixed(1) : String(speed);
  return `${formatted} ${windUnit.value}`;
});

const gustDisplay = computed(() => {
  const gust = getWindGust();
  if (gust === null) {
    return "";
  }
  const formatted = Number.isFinite(gust) ? gust.toFixed(1) : String(gust);
  return `${formatted} ${windUnit.value}`;
});

const windDirectionDegrees = computed(() => getWindDirectionDegrees());

const windDirectionArrow = computed(() => {
  if (windDirectionDegrees.value === null) {
    return "";
  }
  return mapWindDirection(windDirectionDegrees.value);
});

const pressureSparkline = computed(() => {
  const values = extractPressureHistory();
  if (values.length < 2) {
    return [];
  }
  return values.map((value) => convertPressure(value));
});

const pressureUnitLabel = computed(() => {
  const unit = pressureUnit.value;
  if (unit === "inHg" || unit === "hPa") {
    return unit;
  }
  return "mb";
});

const pressureValueOnly = computed(() => {
  const pressure = getPressure();
  if (pressure === null) {
    return "--";
  }
  const converted = convertPressure(pressure);
  const decimals = pressureUnitLabel.value === "inHg" ? 2 : 0;
  return converted.toFixed(decimals);
});

const pressureDisplay = computed(() => {
  const value = pressureValueOnly.value;
  if (value === "--") {
    return "--";
  }
  return `${value} ${pressureUnitLabel.value}`;
});

const pressureTrendDetails = computed(() => {
  const pressure = getPressure();
  if (pressure === null) {
    return { label: "Stable", description: "" };
  }
  return evaluatePressureTrend(pressureSparkline.value);
});

const pressureTrendDescription = computed(() => {
  const pressure = getPressure();
  if (pressure === null) {
    return "Stable";
  }
  const details = pressureTrendDetails.value;
  return details?.label ?? "Stable";
});

const pressureTrendArrowSymbol = computed(() => {
  if (pressureTrendDescription.value === "Rising") {
    return "↑";
  }
  if (pressureTrendDescription.value === "Falling") {
    return "↓";
  }
  return "→";
});

const trendCategoryClass = computed(() => {
  const label = pressureTrendDescription.value;
  if (label === "Falling") {
    return "trend-negative";
  }
  if (label === "Rising") {
    return "trend-positive";
  }
  return "trend-neutral";
});

const trendColor = computed(() => {
  if (trendCategoryClass.value === "trend-negative") {
    return "#f87171";
  }
  if (trendCategoryClass.value === "trend-positive") {
    return "#34d399";
  }
  return "#e5e7eb";
});

const tideDisplay = computed(() => {
  const info = tideInfo.value;
  if (info.hasTide && typeof info.currentLevel === "number") {
    const preferredUnit = distanceUnit.value;
    const convertedHeight = convertLevelToPreferredUnit(info.currentLevel, preferredUnit);
    const unitLabel = preferredUnit === "ft" ? "ft" : "m";
    if (typeof convertedHeight === "number") {
      const trendText = (info.trend || "").toLowerCase();
      const arrow = trendText ? trendToSymbol(trendText) : "";
      return {
        value: `${roundValue(convertedHeight)} ${unitLabel}`,
        arrow,
      };
    }
  }

  const fallbackWave = getSeaHeightMeters();
  if (fallbackWave !== null) {
    const period = getSeaPeriodSeconds();
    const preferredUnit = distanceUnit.value;
    const converted = preferredUnit === "ft" ? UnitConversion.mToFt(fallbackWave) : fallbackWave;
    const unitLabel = preferredUnit === "ft" ? "ft" : "m";
    if (period !== null) {
      return {
        value: `${roundValue(converted)} ${unitLabel} @ ${Math.round(period)}s`,
        arrow: "",
      };
    }
    return {
      value: `${roundValue(converted)} ${unitLabel}`,
      arrow: "",
    };
  }
  return {
    value: "--",
    arrow: "",
  };
});

const tideNextHighDisplay = computed(() => {
  const info = tideInfo.value;
  const event = info.nextHighEvent;
  if (!event) {
    return "";
  }

  const preferredUnit = distanceUnit.value;
  const convertedHeight = convertLevelToPreferredUnit(event.value, preferredUnit);
  const unitLabel = preferredUnit === "ft" ? "ft" : "m";
  const heightText = typeof convertedHeight === "number"
    ? `${roundValue(convertedHeight)} ${unitLabel}`
    : "";
  const timeText = formatTime(event.date);

  const sanitizedTime = timeText && timeText !== "--" ? timeText : "";

  if (heightText && sanitizedTime) {
    return `${heightText} @ ${sanitizedTime}`;
  }

  return heightText || sanitizedTime || "";
});

const tideSparkline = computed(() => {
  const series = extractTideSeries(tides.value);
  if (series.length < 2) {
    return [];
  }
  const preferredUnit = distanceUnit.value;
  const recent = series.slice(-18);
  const converted = recent
    .map((entry) => convertLevelToPreferredUnit(entry.value, preferredUnit))
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  if (converted.length < 2) {
    return [];
  }
  return converted;
});

const sunriseDisplay = computed(() => formatTime(getSunEvent("sunrise")));
const sunsetDisplay = computed(() => formatTime(getSunEvent("sunset")));

function getConditionCode() {
  return firstNumber([
    current.value.weather_code,
    current.value.weatherCode,
    current.value.conditionCode,
  ]);
}

function getSeaHeightMeters() {
  const height = firstNumber([
    marine.value?.seaState?.significantHeight,
    marine.value?.sea?.height,
    marine.value?.waves?.significantHeight,
    marine.value?.sea_state?.significant_height,
  ]);
  return typeof height === "number" ? height : null;
}

function buildTideInfo(tideSource) {
  const series = extractTideSeries(tideSource);
  const nowMs = Date.now();

  const currentLevel = getCurrentTideLevel(tideSource, series, nowMs);

  const lastBeforeNow = findLastBefore(series, nowMs);
  const firstAfterNow = findFirstAfter(series, nowMs);

  const directTrend = typeof tideSource?.current?.state === "string"
    ? tideSource.current.state
    : typeof tideSource?.current?.trend === "string"
      ? tideSource.current.trend
      : "";

  const computedTrend = computeTrendLabel(
    currentLevel,
    lastBeforeNow?.value,
    firstAfterNow?.value,
  );

  const nextEvent = findNextExtremeEvent(series, nowMs);
  const nextHighEvent = findNextHighEvent(series, nowMs);

  return {
    hasTide: typeof currentLevel === "number" || series.length > 0,
    currentLevel,
    trend: computedTrend || directTrend,
    nextEvent,
    nextHighEvent,
  };
}

function extractTideSeries(tideSource) {
  if (!tideSource || typeof tideSource !== "object") {
    return [];
  }

  const series = [];
  const hourly = tideSource.hourly;

  const addEntry = (timeValue, levelValue) => {
    const date = toDate(timeValue);
    if (!date || typeof levelValue !== "number" || Number.isNaN(levelValue)) {
      return;
    }
    series.push({ date, value: levelValue });
  };

  if (Array.isArray(hourly)) {
    hourly.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      addEntry(entry.time, firstNumber([
        entry.height,
        entry.value,
        entry.seaLevelHeightMsl,
      ]));
    });
  }

  if (Array.isArray(hourly?.waterLevels)) {
    hourly.waterLevels.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      addEntry(entry.time, firstNumber([
        entry.value,
        entry.height,
        entry.seaLevelHeightMsl,
      ]));
    });
  }

  if (Array.isArray(hourly?.time)) {
    const times = hourly.time;
    const valuesContainer = hourly.values || {};
    const rawLevels =
      valuesContainer.seaLevelHeightMsl ??
      valuesContainer.seaLevel ??
      valuesContainer.waterLevel;

    times.forEach((timeValue, index) => {
      const levelAtIndex = getValueAtIndex(rawLevels, index);
      if (typeof levelAtIndex === "number") {
        addEntry(timeValue, levelAtIndex);
      }
    });
  }

  if (!series.length) {
    return series;
  }

  series.sort((a, b) => a.date - b.date);

  const deduped = [];
  const seen = new Set();
  series.forEach((entry) => {
    const key = entry.date.getTime();
    if (seen.has(key)) {
      return;
    }
    deduped.push(entry);
    seen.add(key);
  });

  return deduped;
}

function getCurrentTideLevel(tideSource, series, nowMs) {
  const directLevel = firstNumber([
    tideSource?.current?.values?.seaLevelHeightMsl,
    tideSource?.current?.seaLevelHeightMsl,
    tideSource?.current?.height,
    tideSource?.current?.value,
  ]);
  if (directLevel !== null) {
    return directLevel;
  }

  if (!series.length) {
    return null;
  }

  const before = findLastBefore(series, nowMs);
  const after = findFirstAfter(series, nowMs);

  if (before && after && after.date.getTime() !== before.date.getTime()) {
    const ratio = (nowMs - before.date.getTime()) / (after.date.getTime() - before.date.getTime());
    return before.value + (after.value - before.value) * ratio;
  }

  if (after) {
    return after.value;
  }

  if (before) {
    return before.value;
  }

  return null;
}

function computeTrendLabel(currentLevel, previousValue, nextValue) {
  if (typeof currentLevel !== "number") {
    return "";
  }

  const threshold = 0.02;

  if (typeof previousValue === "number" && typeof nextValue === "number") {
    const combinedDelta = nextValue - previousValue;
    if (Math.abs(combinedDelta) > threshold) {
      return combinedDelta > 0 ? "rising" : "falling";
    }
  }

  if (typeof previousValue === "number") {
    const diff = currentLevel - previousValue;
    if (Math.abs(diff) > threshold) {
      return diff > 0 ? "rising" : "falling";
    }
  }

  if (typeof nextValue === "number") {
    const diff = nextValue - currentLevel;
    if (Math.abs(diff) > threshold) {
      return diff > 0 ? "rising" : "falling";
    }
  }

  return "steady";
}

function findLastBefore(series, timestamp) {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    if (series[i].date.getTime() <= timestamp) {
      return series[i];
    }
  }
  return null;
}

function findFirstAfter(series, timestamp) {
  for (let i = 0; i < series.length; i += 1) {
    if (series[i].date.getTime() > timestamp) {
      return series[i];
    }
  }
  return null;
}

function findNextExtremeEvent(series, nowMs) {
  const events = findUpcomingExtrema(series, nowMs);
  return events.length ? events[0] : null;
}

function findNextHighEvent(series, nowMs) {
  const events = findUpcomingExtrema(series, nowMs);
  return events.find((event) => event.type === "High tide") || null;
}

function findUpcomingExtrema(series, nowMs) {
  if (series.length < 2) {
    return [];
  }

  const firstFutureIndex = series.findIndex((entry) => entry.date.getTime() > nowMs);
  if (firstFutureIndex === -1) {
    return [];
  }

  const events = [];
  let prevSlope = null;

  for (let i = Math.max(firstFutureIndex, 1); i < series.length; i += 1) {
    const previous = series[i - 1];
    const current = series[i];
    const slope = current.value - previous.value;

    if (
      prevSlope !== null &&
      Math.sign(slope) !== Math.sign(prevSlope) &&
      Math.sign(slope) !== 0 &&
      Math.sign(prevSlope) !== 0
    ) {
      const turningPoint = previous.date.getTime() > nowMs ? previous : current;
      const type = prevSlope > 0 ? "High tide" : "Low tide";
      events.push({
        type,
        value: turningPoint.value,
        date: turningPoint.date,
      });
    }

    if (Math.abs(slope) > 1e-6) {
      prevSlope = slope;
    }
  }

  if (events.length) {
    return events;
  }

  const futurePoints = series.slice(firstFutureIndex);
  if (!futurePoints.length) {
    return events;
  }

  if (prevSlope === null || Math.abs(prevSlope) <= 1e-6) {
    const fallback = futurePoints[futurePoints.length - 1];
    events.push({
      type: "Tide",
      value: fallback.value,
      date: fallback.date,
    });
    return events;
  }

  if (prevSlope > 0) {
    const maxPoint = futurePoints.reduce((acc, item) => (item.value > acc.value ? item : acc), futurePoints[0]);
    events.push({
      type: "High tide",
      value: maxPoint.value,
      date: maxPoint.date,
    });
    return events;
  }

  const minPoint = futurePoints.reduce((acc, item) => (item.value < acc.value ? item : acc), futurePoints[0]);
  events.push({
    type: "Low tide",
    value: minPoint.value,
    date: minPoint.date,
  });
  return events;
}

function getValueAtIndex(collection, index) {
  if (collection == null) {
    return null;
  }

  if (Array.isArray(collection)) {
    return collection[index] ?? null;
  }

  if (typeof collection === "object") {
    const key = String(index);
    const value = collection[key];
    return typeof value === "number" ? value : null;
  }

  return null;
}

function convertLevelToPreferredUnit(value, preferredUnit) {
  if (typeof value !== "number") {
    return null;
  }
  return preferredUnit === "ft" ? UnitConversion.mToFt(value) : value;
}

function toDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getSeaPeriodSeconds() {
  const period = firstNumber([
    marine.value?.seaState?.period,
    marine.value?.sea?.period,
    marine.value?.waves?.period,
  ]);
  return typeof period === "number" ? period : null;
}

function getTemperatureCelsius() {
  const units = currentUnits.value?.temperature_2m || currentUnits.value?.temperature;
  const effectiveUnit = typeof units === "string" ? units : useImperial.value ? "°F" : "°C";
  const raw = firstNumber([
    current.value.temperature,
    current.value.temperature_2m,
    current.value.temp,
  ]);
  if (raw === null) {
    return null;
  }
  return normalizeTemperature(raw, effectiveUnit);
}

function getFeelsLikeCelsius() {
  const units = currentUnits.value?.apparent_temperature;
  const effectiveUnit = typeof units === "string" ? units : useImperial.value ? "°F" : "°C";
  const raw = firstNumber([
    current.value.apparent_temperature,
    current.value.feels_like,
    current.value.feelsLike,
  ]);
  if (raw === null) {
    return null;
  }
  return normalizeTemperature(raw, effectiveUnit);
}

function getWindSpeed() {
  const raw = firstNumber([
    current.value.wind_speed_10m,
    current.value.windSpeed,
    current.value.wind_speed,
  ]);
  const fromUnit = (currentUnits.value?.wind_speed_10m || currentUnits.value?.windSpeed || (useImperial.value ? "mph" : "m/s")).toString();
  return convertWind(raw, fromUnit, windUnit.value);
}

function getWindGust() {
  const raw = firstNumber([
    current.value.wind_gusts_10m,
    current.value.windGust,
    current.value.gust,
  ]);
  if (raw === null) {
    return null;
  }
  const fromUnit = (currentUnits.value?.wind_gusts_10m || currentUnits.value?.windGust || currentUnits.value?.wind_speed_10m || (useImperial.value ? "mph" : "m/s")).toString();
  return convertWind(raw, fromUnit, windUnit.value);
}

function getWindDirectionDegrees() {
  const direction = firstNumber([
    current.value.wind_direction_10m,
    current.value.windDirection,
    current.value.wind_bearing,
  ]);
  if (direction === null) {
    return null;
  }
  return UnitConversion.normalizeDegrees(direction);
}

function extractPressureHistory() {
  const historyArray = history.value?.pressure || history.value?.pressureHistory;
  if (Array.isArray(historyArray) && historyArray.length) {
    const values = historyArray
      .map((entry) => {
        if (typeof entry === "number") {
          return entry;
        }
        if (entry && typeof entry === "object") {
          return firstNumber([entry.value, entry.pressure]);
        }
        return null;
      })
      .filter((value) => typeof value === "number");
    if (values.length >= 2) {
      return values.slice(-6);
    }
  }

  const hourly = forecast.value?.hourly;
  if (hourly && Array.isArray(hourly.pressure_msl) && hourly.pressure_msl.length) {
    const values = hourly.pressure_msl
      .map((value, index) => {
        const candidate = firstNumber([value]);
        if (candidate !== null) {
          return candidate;
        }
        // Some APIs provide nested objects
        const entry = hourly.pressure_msl[index];
        if (entry && typeof entry === "object") {
          return firstNumber([entry.value, entry.pressure]);
        }
        return null;
      })
      .filter((value) => typeof value === "number");
    if (values.length >= 2) {
      return values.slice(-6);
    }
  }

  return [];
}

function getPressure() {
  const value = firstNumber([
    current.value.pressure_msl,
    current.value.pressure,
    current.value.barometer,
  ]);
  return typeof value === "number" ? value : null;
}

function convertPressure(value) {
  if (typeof value !== "number") {
    return value;
  }
  if (pressureUnit.value === "inHg") {
    return UnitConversion.hpaToInHg(value);
  }
  return value;
}

function evaluatePressureTrend(series) {
  if (!Array.isArray(series) || series.length < 2) {
    return { label: "Stable", description: "Insufficient history" };
  }

  const start = series[0];
  const end = series[series.length - 1];
  if (typeof start !== "number" || typeof end !== "number") {
    return { label: "Stable", description: "Invalid history" };
  }

  const delta = end - start;
  const riseThreshold = 0.5;
  const fallThreshold = -0.5;

  if (delta >= riseThreshold) {
    return { label: "Rising", description: "Pressure increasing" };
  }
  if (delta <= fallThreshold) {
    return { label: "Falling", description: "Pressure decreasing" };
  }
  return { label: "Stable", description: "Pressure steady" };
}

function getSunEvent(kind) {
  const sun = forecast.value?.sun ?? {};
  const astro = forecast.value?.astronomy ?? {};
  const daily = forecast.value?.daily ?? {};
  if (kind === "sunrise") {
    return firstDate([
      sun.sunrise,
      astro.sunrise,
      daily.sunrise?.[0],
      forecast.value?.sunrise,
    ]);
  }
  return firstDate([
    sun.sunset,
    astro.sunset,
    daily.sunset?.[0],
    forecast.value?.sunset,
  ]);
}

function formatTime(dateValue) {
  if (!dateValue) {
    return "--";
  }
  const date = typeof dateValue === "string" || typeof dateValue === "number"
    ? new Date(dateValue)
    : dateValue instanceof Date
      ? dateValue
      : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function convertWind(value, fromUnit, toUnit) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  const mps = (() => {
    const unit = fromUnit.toLowerCase();
    if (unit === "m/s") return value;
    if (unit === "km/h") return value / 3.6;
    if (unit === "mph") return value / 2.23694;
    if (unit === "kt" || unit === "kts" || unit === "kn" || unit === "knots") {
      return value / 1.94384;
    }
    return value;
  })();
  const target = toUnit.toLowerCase();
  if (target === "m/s") {
    return mps;
  }
  if (target === "km/h") {
    return mps * 3.6;
  }
  if (target === "mph") {
    return mps * 2.23694;
  }
  if (target === "kt" || target === "kts" || target === "kn" || target === "knots") {
    return mps * 1.94384;
  }
  return mps;
}

function firstNumber(candidates) {
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function firstDate(candidates) {
  for (const value of candidates) {
    if (!value) {
      continue;
    }
    const date = typeof value === "string" || typeof value === "number"
      ? new Date(value)
      : value instanceof Date
        ? value
        : null;
    if (date && !Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

function normalizeTemperature(value, suppliedUnit) {
  if (typeof value !== "number") {
    return null;
  }
  if (typeof suppliedUnit === "string" && suppliedUnit.toLowerCase().includes("f")) {
    return UnitConversion.fToC(value);
  }
  if (typeof suppliedUnit === "string" && suppliedUnit.toLowerCase().includes("k")) {
    return value - 273.15;
  }
  return value;
}

function roundValue(value) {
  if (typeof value !== "number") {
    return value;
  }
  const precision = value >= 10 ? 1 : 2;
  return Number.parseFloat(value.toFixed(precision));
}

function mapWeatherCondition(code) {
  if (typeof code !== "number") {
    return "--";
  }
  const conditions = {
    0: "Clear",
    1: "Mostly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Cloudy",
    48: "Freezing Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Heavy Drizzle",
    56: "Freezing Drizzle",
    57: "Freezing Drizzle",
    61: "Light Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Freezing Rain",
    67: "Freezing Rain",
    71: "Light Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    77: "Snow Grains",
    80: "Showers",
    81: "Showers",
    82: "Heavy Showers",
    85: "Snow Showers",
    86: "Snow Showers",
    95: "Storm",
    96: "Storm w/ Hail",
    99: "Severe Storm",
  };
  return conditions[code] || "--";
}

function mapWeatherIcon(code, isNight = false) {
  if (typeof code !== "number") {
    return "☁";
  }
  
  // Clear sky
  if (code === 0) return isNight ? "🌙" : "☀";
  
  // Partly cloudy
  if (code === 1 || code === 2) return isNight ? "☁" : "🌤";
  
  // Cloudy
  if (code === 3) return "☁";
  
  // Fog
  if ([45].includes(code)) return "☁";
  if ([48].includes(code)) return "🌫";
  
  // Drizzle
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦";
  
  // Rain
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "🌧";
  
  // Snow
  if ([66, 67, 71, 73, 75, 77, 85, 86].includes(code)) return "🌨";
  
  // Thunderstorm
  if ([95, 96, 99].includes(code)) return "⛈";
  
  return "☁";
}

function mapWindDirection(degrees) {
  if (typeof degrees !== "number") {
    return "";
  }
  const arrows = [
    "↑", "↗", "↗", "→",
    "→", "↘", "↘", "↓",
    "↓", "↙", "↙", "←",
    "←", "↖", "↖", "↖",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return arrows[index];
}
</script>

<style scoped>
.weather-widget {
  --widget-spacing: 16px;
  --widget-font-base: 16px;
  display: flex;
  flex-direction: column;
  gap: calc(var(--widget-spacing) * 0.9);
  padding: calc(var(--widget-spacing) * 0.9);
  padding-top: calc(var(--widget-spacing) * 0.7);
  border-radius: 14px;
  background: var(--widget-surface-color);
  color: var(--widget-text-color);
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  font-size: var(--widget-font-base);
  line-height: 1.25;
}

.compact-layout {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding: calc(var(--widget-spacing) * 0.75);
  text-align: center;
  gap: calc(var(--widget-spacing) * 0.8);
}

.temp-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--widget-spacing);
}

.temp-large {
  font-size: 3.25em;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1;
}

.compact-condition-icon {
  font-size: 2.4em;
  color: #f8fafc;
  line-height: 1;
}

.metrics-row {
  display: flex;
  justify-content: space-between;
  gap: calc(var(--widget-spacing) * 0.5);
}

.metric-left,
.metric-right {
  flex: 1 1 0;
  text-align: center;
}

.metric-label {
  display: block;
  font-size: 0.72em;
  font-weight: 600;
  color: var(--widget-muted-text-color);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.metric-value {
  display: block;
  font-size: 1.12em;
  font-weight: 700;
  color: var(--widget-text-color);
  margin-bottom: 0.2em;
}

.metric-small,
.metric-sub {
  display: block;
  font-size: 0.66em;
  color: var(--widget-muted-text-color);
}

.tide-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: calc(var(--widget-spacing) * 0.75);
}

.tide-label {
  font-size: 0.9em;
  font-weight: 600;
  color: var(--widget-muted-text-color);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.tide-value {
  font-size: 1.15em;
  font-weight: 700;
  color: var(--widget-text-color);
}


.standard-layout {
  display: flex;
  flex-direction: column;
  gap: var(--widget-spacing);
  height: 100%;
}

.standard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: calc(var(--widget-spacing) * 0.55);
  height: 100%;
}

.standard-cell {
  background: var(--widget-surface-elevated-color);
  border-radius: 12px;
  padding: 0.6em 0.72em;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.22em;
  text-align: left;
  min-width: 0;
}

.temp-cell {
  grid-column: 1 / 2;
  grid-row: 1 / 2;
  gap: 0.26em;
}

.temp-cell .temperature {
  font-size: 1.82em;
  font-weight: 700;
  line-height: 1;
}

.condition-text {
  font-size: 0.78em;
  opacity: 0.85;
  line-height: 1.1;
}

.feels-like {
  font-size: 0.68em;
  opacity: 0.7;
  line-height: 1.1;
}

.wind-cell {
  grid-column: 2 / 3;
  grid-row: 1 / 2;
  align-items: flex-end;
  text-align: right;
}

.wind-cell .metric-label {
  align-self: flex-end;
  text-transform: uppercase;
}

.wind-value {
  font-size: 1.48em;
  font-weight: 700;
}

.wind-meta {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.3em;
  font-size: 0.7em;
}

.arrow {
  font-size: 1em;
  line-height: 1;
  opacity: 0.9;
}

.gusts {
  font-size: 0.7em;
  color: var(--widget-muted-text-color);
}

.tide-cell {
  grid-column: 1 / 2;
  grid-row: 2 / 3;
  align-items: flex-start;
}

.pressure-cell {
  grid-column: 2 / 3;
  grid-row: 2 / 3;
  align-items: flex-end;
  text-align: right;
}

.pressure-cell .metric-label {
  align-self: flex-end;
}

.pressure-cell .metric-value {
  align-self: flex-end;
}

.pressure-cell .metric-sub {
  align-self: flex-end;
}

.pressure-reading {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.12em;
  line-height: 1.05;
}

.metrics-row .pressure-reading {
  align-items: center;
}

.pressure-value {
  font-size: 1em;
}

.pressure-unit-row {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  font-size: 0.9em;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pressure-unit {
  font-size: inherit;
  font-weight: inherit;
  opacity: 0.75;
}

.pressure-trend-arrow {
  font-size: 1em;
  line-height: 1;
}

.standard-chart-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: calc(var(--widget-spacing) * 0.75);
}

.chart-block {
  background: var(--widget-surface-elevated-color);
  border-radius: 12px;
  padding: 0.7em 0.9em;
  display: flex;
  flex-direction: column;
  gap: 0.4em;
}

.chart-frame {
  width: 100%;
  min-height: 2.6em;
}

.chart-frame :deep(svg),
.chart-frame :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
}

.standard-footer {
  display: flex;
  justify-content: space-between;
  gap: calc(var(--widget-spacing) * 0.5);
  flex-wrap: wrap;
  font-size: 0.88em;
}

.sun-block {
  display: flex;
  align-items: center;
  gap: 0.45em;
  white-space: nowrap;
}

.sun-icon {
  font-size: 1.3em;
}

.sun-text {
  opacity: 0.85;
}

.trend-positive {
  color: #34d399;
}

.trend-negative {
  color: #f87171;
}

.trend-neutral {
  color: #e5e7eb;
}
</style>
