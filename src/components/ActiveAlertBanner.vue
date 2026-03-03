<template>
  <div v-if="primaryKey" class="debug-banner">
    DEBUG: Banner would render here with key: {{ primaryKey }}
  </div>
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
  console.log('[ActiveAlertBanner] primaryKey:', key);
  if (!key) {
    return "";
  }
  const title = getAlertTitle(key);
  console.log('[ActiveAlertBanner] title:', title);
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
.debug-banner {
  background: orange;
  color: white;
  padding: 10px;
  text-align: center;
  font-weight: bold;
  font-size: 12px;
}

.active-alert-banner {
  --background: var(--ion-color-danger);
  --color: var(--ion-color-danger-contrast);
  margin: 0;
  min-height: 50px;
  display: flex;
  align-items: center;
}

/* iOS Dynamic Island handling - add margin-top only on iOS */
.ios .active-alert-banner {
  margin-top: env(safe-area-inset-top, 0);
}

/* iPhone-specific Dynamic Island handling */
@supports (margin-top: max(0px)) {
  .ios .active-alert-banner {
    margin-top: max(env(safe-area-inset-top, 0), 44px);
  }
}

/* Specific iPhone models with Dynamic Island */
@media screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3),
       screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3),
       screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 2),
       screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 2) {
  .ios .active-alert-banner {
    margin-top: 59px;
  }
}

.banner-label {
  font-weight: 700;
  letter-spacing: 0.02em;
  font-size: 0.9rem;
  line-height: 1.2;
  flex: 1;
}

.banner-actions ion-button {
  --padding-start: 6px;
  --padding-end: 6px;
  --margin-start: 2px;
  --margin-end: 2px;
  font-size: 0.8rem;
  min-height: 28px;
}

/* Adjust button layout on smaller screens */
@media (max-width: 480px) {
  .banner-actions ion-button {
    --padding-start: 4px;
    --padding-end: 4px;
    font-size: 0.75rem;
    min-height: 24px;
  }
  
  .banner-label {
    font-size: 0.85rem;
  }
}
</style>
