<template>
  <ion-item
    v-if="primaryKey"
    class="active-alert-banner"
    lines="none"
    button
    @click="handleView"
  >
    <ion-label class="banner-label">
      {{ bannerTitle }}
    </ion-label>

    <ion-buttons slot="end" class="banner-actions" @click.stop>
      <ion-button color="light" size="small" @click="handleView">View</ion-button>
      <ion-button color="light" size="small" @click="handleSilence">Silence 5m</ion-button>
      <ion-button color="light" size="small" @click="handleAcknowledge">Ack</ion-button>
    </ion-buttons>
  </ion-item>
</template>

<script setup>
import { computed } from "vue";
import { IonItem, IonLabel, IonButtons, IonButton } from "@ionic/vue";
import { useRouter } from "vue-router";
import { alarmSoundService } from "@/services/alarmSoundService";
import {
  useActiveAlerts,
  getAlertDestination,
  getAlertTitle,
} from "@/services/activeAlertService";

const router = useRouter();

const { primaryKey, acknowledge } = useActiveAlerts();

const bannerTitle = computed(() => {
  const key = primaryKey.value;
  if (!key) {
    return "";
  }
  const title = getAlertTitle(key);
  return title || key;
});

function handleView() {
  const key = primaryKey.value;
  if (!key) {
    return;
  }

  const destination = getAlertDestination(key);
  if (!destination) {
    return;
  }

  router.push(destination);
}

function handleSilence() {
  alarmSoundService.silenceForMs(5 * 60 * 1000);
}

function handleAcknowledge() {
  const key = primaryKey.value;
  if (!key) {
    return;
  }
  acknowledge(key);
}
</script>

<style scoped>
.active-alert-banner {
  --background: var(--ion-color-danger);
  --color: var(--ion-color-danger-contrast);
}

.banner-label {
  font-weight: 700;
  letter-spacing: 0.02em;
}

.banner-actions ion-button {
  --padding-start: 10px;
  --padding-end: 10px;
}
</style>
