<template>
  <ion-page>
    <generic-header title="Alerts" />

    <ion-content class="content-with-header">
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

            <li class="data-item">
              <span class="data-label">Position</span>
              <span class="data-value">{{ target.lat }}, {{ target.lon }}</span>
            </li>
          </ul>
        </ion-card-content>
      </ion-card>
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
import { useAnchorStore } from "@/stores/anchor";
import { useRouter } from "vue-router";
import GenericHeader from "@/components/GenericHeader.vue";
const store = useAnchorStore();
const route = useRouter();

const id = route.currentRoute.value.params.mmsi;
const target = store.anchorData.aisTargets.find((target) => target.mmsi === Number(id));
console.log("AIS TARGET : ", target);
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
