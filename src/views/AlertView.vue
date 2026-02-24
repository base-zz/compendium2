<script setup>
import { ref, computed, onMounted } from "vue";
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonSkeletonText, IonButton, IonIcon, IonRange, IonToggle } from "@ionic/vue";
import { settingsOutline } from "ionicons/icons";
import { useRouter } from "vue-router";
import AlertViewItem from "@components/AlertViewItem.vue";
import AlertViewItemDetail from "@components/AlertViewItemDetail.vue";
import { modalController } from "@ionic/vue";
import GenericHeader from "@components/GenericHeader.vue";
import { useStateDataStore } from "@/stores/stateDataStore";
import { storeToRefs } from "pinia";
import { alarmSoundService } from "@/services/alarmSoundService";

const router = useRouter();

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

const activeAlerts = computed(() => state.value.alerts?.active || []);
const isLoading = ref(true);

const silencedUntilEpochMs = computed(() => alarmSoundService.getSilencedUntilEpochMs());
const isSilenced = computed(() => {
  const until = silencedUntilEpochMs.value;
  return typeof until === "number" && Number.isFinite(until) && Date.now() < until;
});

const formattedSilencedUntil = computed(() => {
  const until = silencedUntilEpochMs.value;
  if (!(typeof until === "number" && Number.isFinite(until))) {
    return "";
  }
  try {
    return new Date(until).toLocaleString();
  } catch (error) {
    return "";
  }
});

function silenceFor1Min() {
  alarmSoundService.silenceForMs(60 * 1000);
}

function silenceFor5Min() {
  alarmSoundService.silenceForMs(5 * 60 * 1000);
}

function silenceUntilMidnight() {
  alarmSoundService.silenceUntilMidnight();
}

function silenceFor24Hours() {
  alarmSoundService.silenceFor24Hours();
}

function clearSilence() {
  alarmSoundService.clearSilence();
}

const anchorAlarmEnabled = ref(alarmSoundService.getAlarmEnabled("anchor_dragging") === true);
const aisAlarmEnabled = ref(alarmSoundService.getAlarmEnabled("ais_proximity") === true);
const fenceAlarmEnabled = ref(alarmSoundService.getAlarmEnabled("fence_alert") === true);

function setAnchorAlarmEnabled(next) {
  if (typeof next !== "boolean") {
    return;
  }
  alarmSoundService.setAlarmEnabled("anchor_dragging", next);
  anchorAlarmEnabled.value = next;
}

function setAisAlarmEnabled(next) {
  if (typeof next !== "boolean") {
    return;
  }
  alarmSoundService.setAlarmEnabled("ais_proximity", next);
  aisAlarmEnabled.value = next;
}

function setFenceAlarmEnabled(next) {
  if (typeof next !== "boolean") {
    return;
  }
  alarmSoundService.setAlarmEnabled("fence_alert", next);
  fenceAlarmEnabled.value = next;
}

const globalVolumePercent = ref(Math.round(alarmSoundService.getGlobalVolume() * 100));
const anchorVolumeOverridePercent = ref(
  Math.round((alarmSoundService.getAlarmVolumeOverride("anchor_dragging") ?? 1) * 100)
);
const aisVolumeOverridePercent = ref(
  Math.round((alarmSoundService.getAlarmVolumeOverride("ais_proximity") ?? 1) * 100)
);
const fenceVolumeOverridePercent = ref(
  Math.round((alarmSoundService.getAlarmVolumeOverride("fence_alert") ?? 1) * 100)
);

const hasAnchorOverride = computed(() => alarmSoundService.getAlarmVolumeOverride("anchor_dragging") != null);
const hasAisOverride = computed(() => alarmSoundService.getAlarmVolumeOverride("ais_proximity") != null);
const hasFenceOverride = computed(() => alarmSoundService.getAlarmVolumeOverride("fence_alert") != null);

function setGlobalVolumeFromPercent(percent) {
  if (typeof percent !== "number" || !Number.isFinite(percent)) {
    return;
  }
  alarmSoundService.setGlobalVolume(percent / 100);
}

function setAnchorOverrideFromPercent(percent) {
  if (typeof percent !== "number" || !Number.isFinite(percent)) {
    return;
  }
  alarmSoundService.setAlarmVolumeOverride("anchor_dragging", percent / 100);
}

function setAisOverrideFromPercent(percent) {
  if (typeof percent !== "number" || !Number.isFinite(percent)) {
    return;
  }
  alarmSoundService.setAlarmVolumeOverride("ais_proximity", percent / 100);
}

function setFenceOverrideFromPercent(percent) {
  if (typeof percent !== "number" || !Number.isFinite(percent)) {
    return;
  }
  alarmSoundService.setAlarmVolumeOverride("fence_alert", percent / 100);
}

function clearAnchorOverride() {
  alarmSoundService.setAlarmVolumeOverride("anchor_dragging", null);
  anchorVolumeOverridePercent.value = 100;
}

function clearAisOverride() {
  alarmSoundService.setAlarmVolumeOverride("ais_proximity", null);
  aisVolumeOverridePercent.value = 100;
}

function clearFenceOverride() {
  alarmSoundService.setAlarmVolumeOverride("fence_alert", null);
  fenceVolumeOverridePercent.value = 100;
}

onMounted(() => {
  setTimeout(() => { isLoading.value = false; }, 300);
});

const openAlertDetail = async (alert) => {
  const modal = await modalController.create({
    component: AlertViewItemDetail,
    componentProps: { alert },
    swipeToClose: true,
    presentingElement: document.querySelector("ion-router-outlet") || undefined,
  });
  await modal.present();
};
</script>

<template>
  <IonPage class="alerts-page">
    <GenericHeader title="Alerts" />
    <IonContent class="alerts-content">
      <div class="alerts-header">
        <h2>Active Alerts</h2>
        <IonButton fill="outline" size="small" @click="router.push('/alert-rules')">
          <IonIcon slot="start" :icon="settingsOutline" />
          Manage Rules
        </IonButton>
      </div>

      <div class="alerts-silence">
        <div class="alerts-silence-row">
          <IonButton size="small" fill="outline" @click="silenceFor1Min">Silence 1m</IonButton>
          <IonButton size="small" fill="outline" @click="silenceFor5Min">Silence 5m</IonButton>
          <IonButton size="small" fill="outline" @click="silenceUntilMidnight">Until midnight</IonButton>
          <IonButton size="small" fill="outline" @click="silenceFor24Hours">24 hours</IonButton>
        </div>
        <div v-if="isSilenced" class="alerts-silence-status">
          <span>Sounds silenced until {{ formattedSilencedUntil }}</span>
          <IonButton size="small" fill="clear" @click="clearSilence">Clear</IonButton>
        </div>
      </div>

      <div class="alerts-volume">
        <div class="alerts-volume-title">Alarm Volume</div>

        <div class="alerts-volume-block">
          <div class="alerts-volume-row">
            <div class="alerts-volume-label">Global</div>
            <div class="alerts-volume-value">{{ globalVolumePercent }}%</div>
          </div>
          <IonRange
            v-model="globalVolumePercent"
            :min="0"
            :max="100"
            :step="1"
            ticks="true"
            color="primary"
            @ionChange="(e) => setGlobalVolumeFromPercent(e.detail.value)"
          />
        </div>

        <div class="alerts-volume-block">
          <div class="alerts-volume-row">
            <div class="alerts-volume-label">Anchor Drag</div>
            <div class="alerts-volume-actions">
              <IonToggle
                :checked="anchorAlarmEnabled"
                @ionChange="(e) => setAnchorAlarmEnabled(e.detail.checked)"
              >
                Enabled
              </IonToggle>
              <div class="alerts-volume-value">
                {{ anchorVolumeOverridePercent }}% <span v-if="!hasAnchorOverride">(no override)</span>
              </div>
              <IonButton size="small" fill="clear" @click="clearAnchorOverride">Reset</IonButton>
            </div>
          </div>
          <IonRange
            v-model="anchorVolumeOverridePercent"
            :min="0"
            :max="100"
            :step="1"
            ticks="true"
            color="danger"
            @ionChange="(e) => setAnchorOverrideFromPercent(e.detail.value)"
          />
        </div>

        <div class="alerts-volume-block">
          <div class="alerts-volume-row">
            <div class="alerts-volume-label">AIS Proximity</div>
            <div class="alerts-volume-actions">
              <IonToggle
                :checked="aisAlarmEnabled"
                @ionChange="(e) => setAisAlarmEnabled(e.detail.checked)"
              >
                Enabled
              </IonToggle>
              <div class="alerts-volume-value">
                {{ aisVolumeOverridePercent }}% <span v-if="!hasAisOverride">(no override)</span>
              </div>
              <IonButton size="small" fill="clear" @click="clearAisOverride">Reset</IonButton>
            </div>
          </div>
          <IonRange
            v-model="aisVolumeOverridePercent"
            :min="0"
            :max="100"
            :step="1"
            ticks="true"
            color="warning"
            @ionChange="(e) => setAisOverrideFromPercent(e.detail.value)"
          />
        </div>

        <div class="alerts-volume-block">
          <div class="alerts-volume-row">
            <div class="alerts-volume-label">Fence Alert</div>
            <div class="alerts-volume-actions">
              <IonToggle
                :checked="fenceAlarmEnabled"
                @ionChange="(e) => setFenceAlarmEnabled(e.detail.checked)"
              >
                Enabled
              </IonToggle>
              <div class="alerts-volume-value">
                {{ fenceVolumeOverridePercent }}% <span v-if="!hasFenceOverride">(no override)</span>
              </div>
              <IonButton size="small" fill="clear" @click="clearFenceOverride">Reset</IonButton>
            </div>
          </div>
          <IonRange
            v-model="fenceVolumeOverridePercent"
            :min="0"
            :max="100"
            :step="1"
            ticks="true"
            color="medium"
            @ionChange="(e) => setFenceOverrideFromPercent(e.detail.value)"
          />
        </div>
      </div>

      <IonList v-if="isLoading">
        <IonItem v-for="n in 3" :key="n">
          <IonSkeletonText animated style="width: 80%"></IonSkeletonText>
        </IonItem>
      </IonList>
      <IonList v-else class="alerts-list">
        <template v-if="activeAlerts.length">
          <AlertViewItem
            v-for="alert in activeAlerts"
            :key="alert.id || alert.path || alert.timestamp"
            :alert="alert"
            @view-detail="openAlertDetail"
          />
        </template>
        <template v-else>
          <IonItem class="empty-alert">
            <IonLabel>No active alerts</IonLabel>
          </IonItem>
        </template>
      </IonList>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.alerts-page {
  background: var(--app-background-color);
  color: var(--app-text-color);
}

.alerts-content {
  --background: var(--app-background-color);
  color: var(--app-text-color);
}

.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--app-surface-color);
  border-bottom: 1px solid var(--app-border-color);
}

.alerts-header h2 {
  margin: 0;
  color: var(--app-text-color);
}

.alerts-header ion-button {
  --color: var(--app-accent-color);
  --border-color: var(--app-accent-color);
}

.alerts-silence {
  padding: 12px 16px;
  background: var(--app-surface-color);
  border-bottom: 1px solid var(--app-border-color);
}

.alerts-silence-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.alerts-silence-status {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--app-muted-text-color);
  font-size: 0.9rem;
}

.alerts-volume {
  padding: 12px 16px;
  background: var(--app-surface-color);
  border-bottom: 1px solid var(--app-border-color);
}

.alerts-volume-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.alerts-volume-block {
  margin-top: 10px;
}

.alerts-volume-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: var(--app-text-color);
}

.alerts-volume-label {
  font-weight: 600;
}

.alerts-volume-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alerts-volume-value {
  color: var(--app-muted-text-color);
  font-size: 0.9rem;
}

.alerts-list {
  background: transparent;
}

.alerts-list :deep(ion-item) {
  --background: var(--app-surface-color);
  --color: var(--app-text-color);
  --border-color: var(--app-border-color);
  --inner-border-width: 0 0 1px 0;
}

.alerts-list :deep(ion-item:last-of-type) {
  --inner-border-width: 0;
}

.empty-alert {
  --background: var(--app-surface-color);
  --color: var(--app-muted-text-color);
  font-style: italic;
}

.alerts-list :deep(ion-skeleton-text) {
  --background: var(--app-surface-color);
  --background-rgb: var(--app-surface-color);
}
</style>

<style>
/* Dark mode override for Manage Rules button */
body.dark .alerts-header ion-button {
  --color: rgba(248, 250, 252, 0.85) !important;
  --border-color: rgba(248, 250, 252, 0.85) !important;
}
</style>