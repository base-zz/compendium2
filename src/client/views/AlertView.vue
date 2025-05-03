<script setup>
import { ref, onMounted, computed } from "vue";
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonSkeletonText,
  IonFab,
  IonFabButton,
  modalController,
} from "@ionic/vue";
import { addOutline } from "ionicons/icons";
import AddWidgetAlert from "@components/AddWidgetAlert.vue";
// import EditAlertSelector from "@components/EditAlertSelector.vue";
import GenericHeader from "@components/GenericHeader.vue";
import AlertItem from "@components/AlertItem.vue";
import SignalKAlertInfo from "@components/SignalKAlertInfo.vue";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime"; // import plugin
dayjs.extend(relativeTime);

import { useStateDataStore  } from "@/client/stores/stateDataStore";

const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);
const alertStore = computed(() => state.value.alerts);
const isLoading = ref(true);

// alerts: { active: [], processingQueue: [] },

// Sort alerts by timestamp
const sortedAlerts = computed(() => {
  // console.log('Computing sorted alerts from store:', alertStore.alerts);

  // Filter out invalid alerts
  const validAlerts = alertStore.alerts.filter((alert) => {
    const isValid = alert && typeof alert === "object" && !Array.isArray(alert);
    if (!isValid) {
      // console.log('Invalid alert:', alert);
    }
    return isValid;
  });

  // Sort by timestamp (newest first)
  return [...validAlerts].sort((a, b) => b.timestamp - a.timestamp);
});

// Function to open the add alert modal
const openAddAlertModal = async () => {
  const modal = await modalController.create({
    component: AddWidgetAlert,
    componentProps: {
      existingAlert: null, // Pass null for a new alert
    },
  });

  await modal.present();

  const { data, role } = await modal.onDidDismiss();
  if (role === "confirm" && data) {
    console.log("New alert added:", data);
  }
};
const viewAlert = async (alert) => {
  const modal = await modalController.create({
    component: SignalKAlertInfo,
    componentProps: {
      alert: alert,
    },
  });

  await modal.present();
  console.log("Modal presented");

  // Optional: Handle modal dismissal if needed
  modal.onDidDismiss().then(() => {
    console.log("Modal closed");
  });
};

// Initialize alerts when component is mounted
onMounted(async () => {
  console.log("AlertView mounted - ensuring modal is closed");
  isLoading.value = true;
  // No need to force close modal when using the ref/trigger pattern

  try {
    await alertStore.initAlerts();
  } catch (err) {
    // console.error('Failed to initialize alerts:', err);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <IonPage>
    <generic-header title="Alerts" />
    <IonContent fullscreen class="content-with-header">
      <div class="alert-container">
        <div v-if="isLoading" class="loading-state">
          <IonList>
            <IonItem>
              <IonLabel>
                <IonSkeletonText animated style="width: 80%" />
              </IonLabel>
            </IonItem>
          </IonList>
        </div>
        <template v-else>
          <template v-if="sortedAlerts.length > 0">
            <IonList>
              <AlertItem
                v-for="alert in sortedAlerts"
                :key="alert._id"
                :alert="alert"
                @click="viewAlert(alert)"
              />
            </IonList>
          </template>
          <template v-else>
            <div class="no-alerts">
              <p>No alerts found.</p>
              <p>Tap the "Add Alert" button below to create your first alert.</p>
            </div>
          </template>
        </template>
      </div>
    </IonContent>

    <!-- FABs for Add and Edit Alert -->
    <IonFab vertical="bottom" horizontal="end" slot="fixed">
      <IonFabButton @click="openAddAlertModal" color="primary">
        <IonIcon :icon="addOutline"></IonIcon>
      </IonFabButton>

      <!-- <IonFabList side="start">
        <IonFabButton @click="openEditAlertModal" color="secondary">
          <IonIcon :icon="createOutline"></IonIcon>
        </IonFabButton>
      </IonFabList> -->
    </IonFab>
  </IonPage>
</template>

<style scoped>
.alert-container {
  padding: 16px;
}

.loading-state {
  padding: 16px;
}

.settings-icon {
  font-size: 24px;
  width: 24px;
  height: 24px;
}

.alert-item {
  width: 100%;
  padding: 10px 0;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.alert-title {
  font-weight: bold;
  font-size: 16px;
}

.alert-title.info {
  color: var(--ion-color-primary-contrast);
}

.alert-title.warning {
  color: var(--ion-color-warning);
}

.alert-title.danger {
  color: var(--ion-color-danger);
}

.alert-message {
  margin-top: 5px;
  margin-bottom: 5px;
}

.alert-timestamp {
  font-size: 12px;
  color: var(--ion-color-light);
}

.delete-icon {
  color: var(--ion-color-danger) !important;
  font-size: 20px;
  cursor: pointer;
}

.custom-icon {
  color: var(--ion-color-primary-contrast);
}

.no-alerts {
  text-align: center;
  padding: 20px;
  color: var(--ion-color-medium);
}

.edit-alert-button {
  margin-right: 8px;
}

/* FAB Styling */
ion-fab {
  margin-bottom: 16px;
  margin-right: 16px;
}

ion-fab-button {
  --box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

/* iOS-specific FAB styling */
:deep(.ios) ion-fab {
  margin-bottom: env(safe-area-inset-bottom, 16px);
}

:deep(.ios) ion-fab-list {
  margin-right: 8px;
}
</style>
