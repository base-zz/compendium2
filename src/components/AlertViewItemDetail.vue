<script setup>
import { computed } from "vue";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  modalController,
} from "@ionic/vue";
import {
  alertCircleOutline,
  warningOutline,
  informationCircleOutline,
  closeOutline,
  checkmarkCircleOutline,
} from "ionicons/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useStateDataStore } from "@/stores/stateDataStore";
dayjs.extend(relativeTime);

const stateStore = useStateDataStore();

const props = defineProps({
  alert: {
    type: Object,
    required: true,
  },
  onClose: {
    type: Function,
    required: false,
  },
});

const close = async () => {
  if (props.onClose) {
    props.onClose();
  } else {
    await modalController.dismiss();
  }
};

const acknowledgeAlert = async () => {
  if (props.alert.id) {
    stateStore.acknowledgeAlert(props.alert.id);
  }
  await close();
};

const icon = computed(() => {
  switch (props.alert.severity || props.alert.type) {
    case "danger":
    case "critical":
      return alertCircleOutline;
    case "warning":
      return warningOutline;
    default:
      return informationCircleOutline;
  }
});

const formattedTime = computed(() =>
  props.alert.timestamp ? dayjs(props.alert.timestamp).format("YYYY-MM-DD HH:mm:ss") +
    " (" + dayjs(props.alert.timestamp).fromNow() + ")" : "Unknown time"
);
</script>

<template>
  <IonPage>
    <IonHeader class="ion-no-border header">
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton @click="close">
            <IonIcon :icon="closeOutline" slot="icon-only" />
          </IonButton>
        </IonButtons>
        <IonTitle>Alert Details</IonTitle>
        <IonButtons slot="end" v-if="!props.alert.acknowledged">
          <IonButton @click="acknowledgeAlert" color="success">
            <IonIcon :icon="checkmarkCircleOutline" slot="icon-only" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent class="ion-padding">
      <IonList>
        <IonItem lines="none">
          <IonIcon :icon="icon" slot="start" size="large" />
          <IonLabel>
            <div class="alert-title">
              {{ props.alert.title || props.alert.label || props.alert.path || "Alert" }}
            </div>
            <div class="alert-type">
              <strong>Type:</strong> {{ props.alert.type || props.alert.severity || "info" }}
            </div>
            <div class="alert-timestamp">
              <strong>Timestamp:</strong> {{ formattedTime }}
            </div>
          </IonLabel>
        </IonItem>
        <IonItem v-if="props.alert.message || props.alert.description">
          <IonLabel>
            <strong>Message:</strong>
            <div>{{ props.alert.message || props.alert.description }}</div>
          </IonLabel>
        </IonItem>
        <IonItem v-if="props.alert.path">
          <IonLabel>
            <strong>Path:</strong> {{ props.alert.path }}
          </IonLabel>
        </IonItem>
        <IonItem v-if="props.alert.source">
          <IonLabel>
            <strong>Source:</strong> {{ props.alert.source }}
          </IonLabel>
        </IonItem>
        <IonItem v-if="props.alert.state">
          <IonLabel>
            <strong>State:</strong> {{ props.alert.state }}
          </IonLabel>
        </IonItem>
        <IonItem v-if="props.alert.acknowledged !== undefined">
          <IonLabel>
            <strong>Acknowledged:</strong> {{ props.alert.acknowledged ? "Yes" : "No" }}
          </IonLabel>
        </IonItem>
      </IonList>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.alert-title {
  font-weight: bold;
  font-size: 1.1em;
  margin-bottom: 4px;
}
.alert-type, .alert-timestamp {
  font-size: 0.98em;
  color: var(--ion-color-medium);
}
</style>
