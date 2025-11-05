<template>
  <div class="temp-wind-widget">
    <section class="temp-section">
      <div class="temp-main">
        <span class="temp-value">{{ temperatureValueDisplay }}</span>
        <span class="temp-unit">°{{ temperatureUnit }}</span>
      </div>
      <div class="temp-meta">
        <span v-if="conditionText" class="temp-condition">{{ conditionText }}</span>
        <span v-if="feelsLikeDisplay" class="temp-feels">Feels {{ feelsLikeDisplay }}</span>
      </div>
    </section>

    <div class="section-divider" aria-hidden="true"></div>

    <section class="wind-section" aria-label="Wind conditions">
      <span class="wind-label">Wind</span>
      <span class="wind-speed">{{ windSpeedDisplay }}</span>
      <div v-if="windDirectionArrow || gustDisplay" class="wind-meta">
        <span v-if="windDirectionArrow" class="wind-arrow">{{ windDirectionArrow }}</span>
        <span v-if="gustDisplay" class="wind-gusts">Gusts {{ gustDisplay }}</span>
      </div>
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

const useImperial = computed(() => {
  const pref = unitsPreference.value;
  if (pref && typeof pref === "object" && typeof pref.useImperial === "boolean") {
    return pref.useImperial;
  }
  return true;
});

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

const conditionCode = computed(() => getConditionCode());
const conditionText = computed(() => mapWeatherCondition(conditionCode.value));

function getConditionCode() {
  return firstNumber([
    current.value.weather_code,
    current.value.weatherCode,
    current.value.conditionCode,
  ]);
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
  const fromUnit = (
    currentUnits.value?.wind_speed_10m ||
    currentUnits.value?.windSpeed ||
    (useImperial.value ? "mph" : "m/s")
  ).toString();
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
  const fromUnit = (
    currentUnits.value?.wind_gusts_10m ||
    currentUnits.value?.windGust ||
    currentUnits.value?.wind_speed_10m ||
    (useImperial.value ? "mph" : "m/s")
  ).toString();
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

function mapWeatherCondition(code) {
  if (typeof code !== "number") {
    return "";
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
  return conditions[code] || "";
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

function firstNumber(candidates) {
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}
</script>

<style scoped>

.temp-wind-widget {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 1.1rem;
  background: var(--widget-surface-color);
  border-radius: 14px;
  color: var(--widget-text-color);
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  aspect-ratio: 1 / 1;
  gap: clamp(0.75rem, 2vw, 1.1rem);
}

.temp-section,
.wind-section {
  flex: 1 1 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  text-align: center;
}

.temp-main {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
}

.temp-value {
  font-size: clamp(2.6rem, 6.6vw, 3.3rem);
  font-weight: 700;
  line-height: 1;
}

.temp-unit {
  font-size: clamp(1.05rem, 3.2vw, 1.3rem);
  opacity: 0.85;
}

.temp-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-size: clamp(0.85rem, 2.4vw, 0.95rem);
}

.temp-condition {
  opacity: 0.85;
}

.temp-feels {
  opacity: 0.7;
}

.wind-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  font-size: clamp(0.85rem, 2.4vw, 0.95rem);
}

.wind-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: var(--widget-muted-text-color);
}

.wind-speed {
  font-size: clamp(1.55rem, 4.9vw, 1.95rem);
  font-weight: 700;
}

.wind-meta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font-size: clamp(0.8rem, 2.1vw, 0.9rem);
  color: var(--widget-muted-text-color);
}

.wind-arrow {
  font-size: clamp(1.1rem, 3vw, 1.4rem);
  line-height: 1;
}

.wind-gusts {
  opacity: 0.85;
}

.section-divider {
  width: 85%;
  height: 1px;
  border-radius: 1px;
  background: var(--widget-border-color);
}

@media (max-width: 420px) {
  .temp-wind-widget {
    padding: 0.9rem;
    gap: 0.75rem;
  }
}
</style>
