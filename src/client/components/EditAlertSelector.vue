<template>
  <IonHeader>
    <IonToolbar>
      <IonTitle>Select Alert to Edit</IonTitle>
      <IonButtons slot="start">
        <IonButton @click="cancel">Cancel</IonButton>
      </IonButtons>
    </IonToolbar>
  </IonHeader>
  <IonContent class="ion-padding">
    <div v-if="isLoading" class="loading-state">
      <IonList>
        <IonItem v-for="n in 3" :key="n">
          <IonLabel>
            <IonSkeletonText animated style="width: 80%" />
          </IonLabel>
        </IonItem>
      </IonList>
    </div>
    <div v-else>
      <div v-if="alerts.length === 0" class="no-alerts">
        <p>No alerts found.</p>
      </div>
      <IonList v-else>
        <IonItem v-for="alert in alerts" :key="alert._id" button @click="selectAlert(alert)">
          <div class="alert-item">
            <div class="alert-header">
              <div class="alert-title" :class="alert.type">{{ alert.label }}</div>
            </div>
            <div class="alert-message">{{ alert.message }}</div>
            <div class="alert-timestamp">{{ formatTimestamp(alert.timestamp) }}</div>
          </div>
        </IonItem>
      </IonList>
    </div>
  </IonContent>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSkeletonText,
  modalController
} from '@ionic/vue';
import { useAlertStore } from '../stores/alerts';

const props = defineProps({
  alerts: {
    type: Array,
    required: true
  }
});

const isLoading = ref(false);

// Function to format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Function to select an alert
const selectAlert = (alert) => {
  modalController.dismiss(alert, 'selected');
};

// Function to cancel
const cancel = () => {
  modalController.dismiss(null, 'cancel');
};
</script>

<style scoped>
.loading-state {
  padding: 16px;
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
  color: var(--ion-color-primary);
}

.alert-title.warning {
  color: var(--ion-color-warning);
}

.alert-title.danger {
  color: var(--ion-color-danger);
}

.alert-message {
  margin-bottom: 5px;
  color: var(--ion-color-medium);
}

.alert-timestamp {
  font-size: 12px;
  color: var(--ion-color-medium-shade);
}

.no-alerts {
  text-align: center;
  margin-top: 50px;
  color: var(--ion-color-medium);
}
</style>
