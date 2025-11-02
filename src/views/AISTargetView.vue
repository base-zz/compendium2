<template>
  <ion-page>
    <generic-header title="AIS Target Details" />

    <ion-content class="content-with-header">
      <div v-if="!target">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Loading...</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>Searching for AIS target with MMSI: {{ mmsi }}</p>
          </ion-card-content>
        </ion-card>
      </div>
      
      <div v-else-if="targetDetails">
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ targetDetails.name }}</ion-card-title>
            <ion-card-subtitle>MMSI: {{ targetDetails.mmsi }}</ion-card-subtitle>
          </ion-card-header>

          <ion-card-content>
            <ul class="data-list">
              <li class="data-item">
                <span class="data-label">Callsign</span>
                <span class="data-value">{{ targetDetails.callsign }}</span>
              </li>

              <li class="data-item" v-if="targetDetails.type">
                <span class="data-label">Vessel Type</span>
                <span class="data-value">{{ targetDetails.type }}</span>
              </li>

              <li class="data-item" v-if="targetDetails.length">
                <span class="data-label">Length</span>
                <span class="data-value">{{ targetDetails.length }}</span>
              </li>

              <li class="data-item" v-if="targetDetails.beam">
                <span class="data-label">Beam</span>
                <span class="data-value">{{ targetDetails.beam }}</span>
              </li>

              <li class="data-item" v-if="targetDetails.heading">
                <span class="data-label">Heading</span>
                <span class="data-value">{{ targetDetails.heading }}</span>
              </li>

              <li class="data-item">
                <span class="data-label">Distance</span>
                <span class="data-value">{{ targetDetails.distance }}</span>
              </li>

              <li class="data-item" v-if="target.position">
                <span class="data-label">Position</span>
                <span class="data-value">
                  {{ target.position.latitude.toFixed ? target.position.latitude.toFixed(6) : target.position.latitude }}, 
                  {{ target.position.longitude.toFixed ? target.position.longitude.toFixed(6) : target.position.longitude }}
                </span>
              </li>
            </ul>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonContent,
  IonPage,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
} from "@ionic/vue";
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useStateDataStore } from "@/stores/stateDataStore";
import { useRoute } from "vue-router";
import GenericHeader from "@/components/GenericHeader.vue";
import { calculateDistanceMeters } from "@/stores/stateDataStore";

// Get route for params
const route = useRoute();

// Access state store
const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

// Get the MMSI from the route params
const mmsi = Number(route.params.mmsi);

// Find the AIS target with the matching MMSI
const target = computed(() => {
  if (!state.value?.aisTargets) {
    console.log("No AIS targets found in state");
    return null;
  }
  
  // With the new object-based structure, we can directly access by MMSI
  const mmsiStr = String(mmsi);
  const found = state.value.aisTargets[mmsiStr];
  
  console.log("Available AIS targets:", Object.keys(state.value.aisTargets).length);
  console.log("AIS TARGET found:", found);
  return found;
});

const toNumericValue = (val) => {
  if (val == null) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val === "object" && val.value != null) {
    const numeric = Number(val.value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
};

const getUnitsFromMeta = (meta, propertyKey) => {
  if (!meta) return null;
  if (propertyKey && meta.properties?.[propertyKey]?.units) {
    return meta.properties[propertyKey].units;
  }
  return meta.units ?? null;
};

const measurementFrom = (value, meta, propertyKey) => {
  const numeric = toNumericValue(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return {
    value: numeric,
    units: getUnitsFromMeta(meta, propertyKey),
  };
};

const resolveMeasurement = (candidates) => {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const measurement = measurementFrom(
      candidate.value,
      candidate.meta,
      candidate.propertyKey
    );
    if (measurement) {
      return measurement;
    }
  }
  return null;
};

const formatMeasurementLabel = (measurement) => {
  if (!measurement) return null;
  const decimals = measurement.value >= 100 ? 0 : 1;
  const units = measurement.units || "m";
  return `${measurement.value.toFixed(decimals)} ${units}`;
};

const ownBoatPosition = computed(() => {
  const navPosition = state.value?.navigation?.position;
  if (!navPosition) return null;

  const latitude = toNumericValue(navPosition.latitude);
  const longitude = toNumericValue(navPosition.longitude);

  if (latitude == null || longitude == null) {
    return null;
  }

  return { latitude, longitude };
});

const normalizeAngleDegrees = (angle) => {
  if (!Number.isFinite(angle)) return null;
  const normalized = ((angle % 360) + 360) % 360;
  return normalized;
};

const radiansToDegrees = (radians) => {
  if (!Number.isFinite(radians)) return null;
  return radians * (180 / Math.PI);
};

const formatNumber = (value, decimals = 1) => {
  if (!Number.isFinite(value)) return null;
  return value.toFixed(decimals);
};

const nauticalMilesFromMeters = (meters) => {
  if (!Number.isFinite(meters)) return null;
  return meters / 1852;
};

const targetDetails = computed(() => {
  const raw = target.value;
  if (!raw) return null;

  const result = {
    name: raw.name || "Unknown Vessel",
    mmsi: raw.mmsi || "N/A",
    callsign: raw.callsign || "N/A",
    type: null,
    length: null,
    beam: null,
    heading: null,
    distance: "N/A",
  };

  if (raw.shipType) {
    result.type = typeof raw.shipType === "object" && raw.shipType.name
      ? raw.shipType.name
      : String(raw.shipType);
  }

  const lengthMeasurement = resolveMeasurement([
    {
      value: raw.dimensions?.length?.overall,
      meta: raw.dimensions?.length?.meta,
      propertyKey: "overall",
    },
    {
      value: raw.dimensions?.length?.value?.overall,
      meta: raw.dimensions?.length?.meta,
      propertyKey: "overall",
    },
    {
      value: raw.design?.length?.value?.overall,
      meta: raw.design?.length?.meta,
      propertyKey: "overall",
    },
    {
      value: raw.design?.length?.overall,
      meta: raw.design?.length?.meta,
      propertyKey: "overall",
    },
    {
      value: raw.length?.value?.overall,
      meta: raw.length?.meta,
      propertyKey: "overall",
    },
    {
      value: raw.length?.overall,
      meta: raw.length?.meta,
      propertyKey: "overall",
    },
    {
      value: raw.length?.value,
      meta: raw.length?.meta,
    },
    {
      value: raw.length,
      meta: raw.length?.meta,
    },
  ]);

  const beamMeasurement = resolveMeasurement([
    {
      value: raw.dimensions?.beam?.value,
      meta: raw.dimensions?.beam?.meta,
    },
    {
      value: raw.dimensions?.beam,
      meta: raw.dimensions?.beam?.meta,
    },
    {
      value: raw.design?.beam?.value,
      meta: raw.design?.beam?.meta,
    },
    {
      value: raw.design?.beam,
      meta: raw.design?.beam?.meta,
    },
    {
      value: raw.beam?.value,
      meta: raw.beam?.meta,
    },
    {
      value: raw.beam,
      meta: raw.beam?.meta,
    },
  ]);

  if (lengthMeasurement) {
    const label = formatMeasurementLabel(lengthMeasurement);
    if (label) result.length = label;
  }

  if (beamMeasurement) {
    const label = formatMeasurementLabel(beamMeasurement);
    if (label) result.beam = label;
  }

  const headingRadians = toNumericValue(raw.heading) ?? toNumericValue(raw.cog);
  const headingDegrees = radiansToDegrees(headingRadians);
  const normalizedHeading = normalizeAngleDegrees(headingDegrees ?? toNumericValue(raw.headingDegrees));
  if (Number.isFinite(normalizedHeading)) {
    const label = formatNumber(normalizedHeading, 1);
    if (label) result.heading = `${label}°`;
  }

  if (Number.isFinite(raw.distance)) {
    result.distance = `${formatNumber(raw.distance, raw.distance >= 10 ? 1 : 2)} nm`;
  } else {
    const targetLat = Number.isFinite(raw.position?.latitude) ? raw.position.latitude : null;
    const targetLon = Number.isFinite(raw.position?.longitude) ? raw.position.longitude : null;
    const ownPos = ownBoatPosition.value;

    if (targetLat != null && targetLon != null && ownPos) {
      const distanceMeters = calculateDistanceMeters(
        ownPos.latitude,
        ownPos.longitude,
        targetLat,
        targetLon,
        true
      );

      const distanceNm = nauticalMilesFromMeters(distanceMeters);
      if (Number.isFinite(distanceNm)) {
        result.distance = `${formatNumber(distanceNm, distanceNm >= 10 ? 1 : 2)} nm`;
      }
    }
  }

  return result;
});
</script>

<style scoped>
/* Use interactive card for better UX */
:deep(ion-card) {
  margin: 1rem;
}

.data-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.data-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.data-item:last-child {
  border-bottom: none;
}

.data-label {
  color: var(--ion-color-medium);
  font-weight: 500;
}

.data-value {
  color: var(--ion-text-color);
  font-weight: 600;
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .data-item {
    border-bottom-color: var(--ion-color-dark-shade);
  }
}
</style>
