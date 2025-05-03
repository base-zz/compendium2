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
      
      <div v-else>
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ target.name || "Unknown Vessel" }}</ion-card-title>
            <ion-card-subtitle>MMSI: {{ target.mmsi }}</ion-card-subtitle>
          </ion-card-header>

          <ion-card-content>
            <ul class="data-list">
              <li class="data-item">
                <span class="data-label">Callsign</span>
                <span class="data-value">{{ target.callsign || "N/A" }}</span>
              </li>

              <li class="data-item">
                <span class="data-label">Distance</span>
                <span class="data-value">{{ target.distance || "N/A" }} nm</span>
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
import { useStateDataStore } from "@client/stores/stateDataStore";
import { useRoute } from "vue-router";
import GenericHeader from "@client/components/GenericHeader.vue";

// Get route for params
const route = useRoute();

// Access state store
const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

// Get the MMSI from the route params
const mmsi = Number(route.params.mmsi);

// Find the AIS target with the matching MMSI
const target = computed(() => {
  if (!state.value?.anchor?.aisTargets) {
    console.log("No AIS targets found in state");
    return null;
  }
  
  // With the new object-based structure, we can directly access by MMSI
  const mmsiStr = String(mmsi);
  const found = state.value.anchor.aisTargets[mmsiStr];
  
  console.log("Available AIS targets:", Object.keys(state.value.anchor.aisTargets).length);
  console.log("AIS TARGET found:", found);
  return found;
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
