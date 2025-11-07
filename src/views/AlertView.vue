<script setup>
import { ref, computed, onMounted } from "vue";
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonSkeletonText, IonButton, IonIcon } from "@ionic/vue";
import { settingsOutline } from "ionicons/icons";
import { useRouter } from "vue-router";
import AlertViewItem from "@components/AlertViewItem.vue";
import AlertViewItemDetail from "@components/AlertViewItemDetail.vue";
import { modalController } from "@ionic/vue";
import GenericHeader from "@components/GenericHeader.vue";
import { useStateDataStore } from "@/stores/stateDataStore";
import { storeToRefs } from "pinia";

const router = useRouter();

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);

const activeAlerts = computed(() => state.value.alerts?.active || []);
const isLoading = ref(true);

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