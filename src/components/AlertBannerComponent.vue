<template>
  <div v-if="primaryKey" class="alert-banner-root">
    <div class="alert-banner-content">
      <ion-label class="banner-label">{{ bannerTitle }}</ion-label>
      <ion-buttons class="banner-actions" @click.stop>
        <ion-button color="light" size="small" @click="handleView">View</ion-button>
        <ion-button color="light" size="small" @click="handleSilence">Silence 5m</ion-button>
        <ion-button color="light" size="small" @click="handleAcknowledge">Ack</ion-button>
      </ion-buttons>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { IonLabel, IonButtons, IonButton } from "@ionic/vue";
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
  if (title) {
    return title;
  }

  return key;
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

<style>
.alert-banner-root {
  width: 100%;
  background: red;
  color: white;
}

.alert-banner-content {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 12px;
}

.banner-label {
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  color: white;
}

.banner-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.banner-actions ion-button {
  --padding-start: 6px;
  --padding-end: 6px;
  --margin-start: 0;
  --margin-end: 0;
  min-height: 24px;
  font-size: 0.8rem;
  --color: white;
}
</style>
