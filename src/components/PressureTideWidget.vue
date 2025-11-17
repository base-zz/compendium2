<template>
  <div class="pressure-tide-widget">
    <section class="metric-section pressure-block" aria-label="Barometric pressure">
      <span class="metric-label">PRESSURE</span>

      <div class="metric-primary">
        <span class="metric-value metric-value--pressure">{{ pressureValueOnly }}</span>
        <span v-if="pressureUnitLabel" class="metric-unit metric-unit--pressure">{{ pressureUnitLabel }}</span>
      </div>

      <span class="metric-sub advisory" :class="trendCategoryClass">{{ pressureTrendCombined }}</span>
    </section>

    <div class="section-divider" role="presentation"></div>

    <section class="metric-section tide-block" aria-label="Tide levels">
      <span class="metric-label">TIDE</span>

      <div class="metric-primary metric-primary--tide">
        <span class="metric-value metric-value--tide">{{ tidePrimaryValue }}</span>
        <span v-if="tidePrimaryUnit" class="metric-unit metric-unit--tide">{{ tidePrimaryUnit }}</span>
        <span class="metric-trend-arrow" :style="tideArrowStyle" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false" class="arrow-icon">
            <path d="M12 4l6 8h-4v8h-4v-8H6z" />
          </svg>
        </span>
      </div>

      <span v-if="tideSecondaryLabel" class="metric-sub">{{ tideSecondaryLabel }}</span>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useStateDataStore } from "@/stores/stateDataStore";
import { UnitConversion } from "@/shared/unitConversion";

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

const preferences = computed(() => state.value?.preferences ?? {});
const unitsPreference = computed(() => preferences.value?.units ?? {});
const forecast = computed(() => state.value?.forecast ?? {});
const current = computed(() => forecast.value?.current ?? {});
const currentUnits = computed(() => forecast.value?.current_units ?? {});
const history = computed(() => forecast.value?.history ?? {});
const tides = computed(() => state.value?.tides ?? {});

const tideInfo = computed(() => buildTideInfo(tides.value));

const useImperial = computed(() => {
  const pref = unitsPreference.value;
  if (pref && typeof pref === "object" && typeof pref.useImperial === "boolean") {
    return pref.useImperial;
  }
  return true;
});

const pressureUnit = computed(() => {
  const pref = unitsPreference.value?.pressure;
  if (typeof pref === "string") {
    const normalized = pref.toLowerCase();
    if (normalized.includes("in")) return "inHg";
    if (normalized.includes("mb")) return "mb";
    if (normalized.includes("pa")) return "hPa";
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

const pressureSparkline = computed(() => {
  const values = extractPressureHistory();
  if (values.length < 2) {
    return [];
  }
  return values.map((value) => convertPressure(value));
});

const pressureUnitLabel = computed(() => {
  if (pressureUnit.value === "inHg") {
    return "inHg";
  }
  if (pressureUnit.value === "hPa") {
    return "hPa";
  }
  return "mb";
});

const pressureValueOnly = computed(() => {
  const pressure = getPressure();
  if (pressure === null) {
    return "--";
  }
  const converted = convertPressure(pressure);
  const decimals = pressureUnit.value === "inHg" ? 2 : 0;
  return converted.toFixed(decimals);
});

const pressureTrend = computed(() => {
  if (pressureSparkline.value.length < 2) {
    return 0;
  }
  const series = pressureSparkline.value;
  return series[series.length - 1] - series[0];
});

const pressureTrendLabel = computed(() => {
  const delta = pressureTrend.value;
  if (delta <= -2) return "Falling Fast";
  if (delta < -0.5) return "Falling";
  if (delta >= 2) return "Rising Fast";
  if (delta > 0.5) return "Rising";
  return "Stable";
});

const pressureAdvisory = computed(() => {
  const label = pressureTrendLabel.value;
  if (label === "Falling Fast") return "Storm warning ⚠️";
  if (label === "Falling") return "Low pressure building";
  if (label === "Rising Fast") return "High pressure building";
  return "";
});

const pressureTrendCombined = computed(() => {
  if (pressureAdvisory.value) {
    return `${pressureTrendLabel.value} — ${pressureAdvisory.value}`;
  }
  return pressureTrendLabel.value;
});

const trendCategoryClass = computed(() => {
  const label = pressureTrendLabel.value;
  if (label.includes("Falling")) return "trend-negative";
  if (label.includes("Rising")) return "trend-positive";
  return "trend-neutral";
});

const tidePrimary = computed(() => {
  const info = tideInfo.value;
  if (info.hasTide && typeof info.currentLevel === "number") {
    const preferredUnit = distanceUnit.value;
    const convertedHeight = convertLevelToPreferredUnit(info.currentLevel, preferredUnit);
    const unitLabel = preferredUnit === "ft" ? "ft" : "m";
    const trendText = (info.trend || "steady").toLowerCase();
    const trendSymbol = info.trendSymbol || trendToSymbol(trendText);
    const trendWord = formatTrendWord(trendText);
    const slopeValue = info.slopeValue ?? 0;
    const rotationDeg = rotationFromSlope(slopeValue);
    if (typeof convertedHeight === "number") {
      const primaryValue = String(roundValue(convertedHeight));
      const resolvedArrow = trendSymbol || wordToSymbol(trendWord) || "→";
      return {
        value: primaryValue,
        unit: unitLabel,
        arrowSymbol: resolvedArrow,
        rotationDeg,
        slopeValue,
        secondaryDetail: trendWord || ""
      };
    }
  }

  const fallbackWave = getSeaHeightMeters();
  if (fallbackWave !== null) {
    const period = getSeaPeriodSeconds();
    const preferredUnit = distanceUnit.value;
    const converted = preferredUnit === "ft" ? UnitConversion.mToFt(fallbackWave) : fallbackWave;
    const unitLabel = preferredUnit === "ft" ? "ft" : "m";
    const detail = period !== null ? `@ ${Math.round(period)}s` : "";
    const rotationDeg = rotationFromSlope(0);
    return {
      value: String(roundValue(converted)),
      unit: unitLabel,
      arrowSymbol: "→",
      rotationDeg,
      slopeValue: 0,
      secondaryDetail: detail
    };
  }
  const rotationDeg = rotationFromSlope(0);
  return {
    value: "--",
    unit: "",
    arrowSymbol: "→",
    rotationDeg,
    slopeValue: 0,
    secondaryDetail: ""
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

const tidePrimaryValue = computed(() => tidePrimary.value.value);
const tidePrimaryUnit = computed(() => tidePrimary.value.unit);

const tideArrowStyle = computed(() => ({
  transform: `rotate(${tidePrimary.value.rotationDeg ?? 0}deg)`,
}));

const tideSecondaryLabel = computed(() => {
  if (tideNextHighDisplay.value) {
    return `Next high ${tideNextHighDisplay.value}`;
  }
  return tidePrimary.value.secondaryDetail;
});

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

  const computedSymbol = trendToSymbol(computedTrend);
  const directSymbol = trendToSymbol(directTrend);
  const slope = slopeFromLevels(series);
  const slopeSymbol = symbolFromSlope(slope);
  let trendSymbol = computedSymbol || directSymbol || slopeSymbol || "→";

  if (!trendSymbol && computedTrend) {
    trendSymbol = trendToSymbol(computedTrend);
  }
  const nextEvent = findNextExtremeEvent(series, nowMs);
  const nextHighEvent = findNextHighEvent(series, nowMs);

  return {
    hasTide: typeof currentLevel === "number" || series.length > 0,
    currentLevel,
    trend: computedTrend || directTrend,
    trendSymbol,
    slopeValue: slope,
    rotationDeg: rotationFromSlope(slope),
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

function slopeFromLevels(series) {
  if (!Array.isArray(series) || series.length < 2) {
    return 0;
  }

  const sample = series.slice(-6);
  const n = sample.length;
  if (n < 2) {
    return 0;
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  sample.forEach((entry, index) => {
    const x = index;
    const y = entry.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return 0;
  }

  return (n * sumXY - sumX * sumY) / denominator;
}

function symbolFromSlope(slope) {
  const threshold = 0.01;
  if (slope > threshold) {
    return "↑";
  }
  if (slope < -threshold) {
    return "↓";
  }
  return "→";
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
    const maxPoint = futurePoints.reduce(
      (acc, item) => (item.value > acc.value ? item : acc),
      futurePoints[0],
    );
    events.push({
      type: "High tide",
      value: maxPoint.value,
      date: maxPoint.date,
    });
    return events;
  }

  const minPoint = futurePoints.reduce(
    (acc, item) => (item.value < acc.value ? item : acc),
    futurePoints[0],
  );
  events.push({
    type: "Low tide",
    value: minPoint.value,
    date: minPoint.date,
  });
  return events;
}

function roundValue(value) {
  if (typeof value !== "number") {
    return value;
  }
  const precision = value >= 10 ? 1 : 2;
  return Number.parseFloat(value.toFixed(precision));
}

function convertLevelToPreferredUnit(value, preferredUnit) {
  if (typeof value !== "number") {
    return null;
  }
  return preferredUnit === "ft" ? UnitConversion.mToFt(value) : value;
}

function getSeaHeightMeters() {
  const height = firstNumber([
    forecast.value?.marine?.seaState?.significantHeight,
    forecast.value?.marine?.sea?.height,
    forecast.value?.marine?.waves?.significantHeight,
    forecast.value?.marine?.sea_state?.significant_height,
  ]);
  return typeof height === "number" ? height : null;
}

function getSeaPeriodSeconds() {
  const period = firstNumber([
    forecast.value?.marine?.seaState?.period,
    forecast.value?.marine?.sea?.period,
    forecast.value?.marine?.waves?.period,
  ]);
  return typeof period === "number" ? period : null;
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

function trendToSymbol(trend) {
  if (typeof trend !== "string" || !trend) {
    return "";
  }
  const normalized = trend.toLowerCase();
  if (
    normalized.includes("rise") ||
    normalized.includes("incoming") ||
    normalized.includes("flood") ||
    normalized.includes("inbound") ||
    normalized.includes("up")
  ) {
    return "↑";
  }
  if (
    normalized.includes("fall") ||
    normalized.includes("outgoing") ||
    normalized.includes("ebb") ||
    normalized.includes("dropping") ||
    normalized.includes("down")
  ) {
    return "↓";
  }
  if (
    normalized.includes("steady") ||
    normalized.includes("stable") ||
    normalized.includes("hold") ||
    normalized.includes("slack") ||
    normalized.includes("flat")
  ) {
    return "→";
  }
  return wordToSymbol(trend);
}

function wordToSymbol(word) {
  if (typeof word !== "string" || !word) {
    return "";
  }
  const normalized = word.toLowerCase();
  if (normalized.startsWith("rise") || normalized.startsWith("incom") || normalized.startsWith("flood")) {
    return "↑";
  }
  if (normalized.startsWith("fall") || normalized.startsWith("outgo") || normalized.startsWith("ebb")) {
    return "↓";
  }
  if (
    normalized.startsWith("steady") ||
    normalized.startsWith("stable") ||
    normalized.startsWith("hold") ||
    normalized.startsWith("flat") ||
    normalized.startsWith("slack")
  ) {
    return "→";
  }
  return "";
}

function rotationFromSlope(slope) {
  const angle = Math.atan(slope) * (180 / Math.PI);
  const raw = 90 - angle;
  return clamp(raw, 0, 180);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatTrendWord(trend) {
  if (typeof trend !== "string" || !trend) {
    return "";
  }
  const normalized = trend.toLowerCase();
  if (normalized.includes("rise")) {
    return "Rising";
  }
  if (normalized.includes("fall")) {
    return "Falling";
  }
  if (normalized.includes("steady") || normalized.includes("stable") || normalized.includes("hold")) {
    return "Steady";
  }
  return trend.charAt(0).toUpperCase() + trend.slice(1);
}

function firstNumber(candidates) {
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
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
</script>

<style scoped>
.pressure-tide-widget {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem 0.95rem;
  background: var(--widget-surface-color);
  border-radius: 14px;
  color: var(--widget-text-color);
  height: 100%;
  box-sizing: border-box;
}

.metric-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  background: var(--widget-surface-elevated-color);
  border-radius: 12px;
  min-height: 0;
  text-align: center;
}

.metric-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--widget-muted-text-color);
}

.metric-primary {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.metric-primary--tide {
  gap: 0.45rem;
}

.metric-value {
  font-size: clamp(1.9rem, 3.4vw, 2.6rem);
  font-weight: 700;
  line-height: 1;
  color: var(--widget-text-color);
}

.metric-unit {
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--widget-muted-text-color);
  letter-spacing: 0.02em;
}

.metric-trend-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--widget-muted-text-color);
  width: 1.35rem;
  height: 1.35rem;
}

.metric-trend-arrow .arrow-icon {
  width: 100%;
  height: 100%;
  fill: currentColor;
  transition: transform 0.2s ease;
}

.metric-sub {
  font-size: 0.88rem;
  color: var(--widget-muted-text-color);
  line-height: 1.25;
}

.section-divider {
  align-self: center;
  width: 90%;
  height: 1px;
  background: color-mix(in srgb, var(--widget-muted-text-color) 35%, transparent);
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

@media (max-width: 420px) {
  .pressure-tide-widget {
    padding: 0.85rem;
    gap: 0.7rem;
  }

  .metric-section {
    padding: 0.75rem 0.85rem;
    gap: 0.45rem;
  }
}
</style>
