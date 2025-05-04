<script setup>
import { computed } from "vue";
import GenericHeader from "@components/GenericHeader.vue";
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonButton, IonIcon } from "@ionic/vue";
import { closeOutline, alertCircleOutline, warningOutline, informationCircleOutline } from "ionicons/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

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
    <GenericHeader title="Alert Details" />
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
        <!-- Show all other fields for debugging -->
        <IonItem v-for="(value, key) in props.alert" :key="key" v-if="!knownFields.includes(key)">
          <IonLabel>
            <strong>{{ key }}:</strong> {{ value }}
          </IonLabel>
        </IonItem>
      </IonList>
    </IonContent>
  </IonPage>
</template>

<script>
// List of fields already shown above
export default {
  computed: {
    knownFields() {
      return [
        "id", "title", "label", "path", "type", "severity", "timestamp", "message", "description", "source", "state", "acknowledged"
      ];
    }
  }
}
</script>

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
