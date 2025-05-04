<template>
  <IonItemSliding>
    <IonItem>
      <div class="alert-item" :class="alert.type">
        <div class="alert-header">
          <div class="alert-title">{{ alert.label }}</div>
          <!-- <IonIcon
                        :icon="closeOutline"
                        class="delete-icon custom-icon"
                        @click.stop="deleteAlert(alert._id)"
                      /> -->
        </div>
        <div class="alert-message">{{ props.alert.message }}</div>
        <div class="alert-timestamp">
          <!-- {{ formatTimestamp(alert.timestamp) }} -->
          {{ formatTimestamp(props.alert.timestamp) }}
        </div>
      </div>
    </IonItem>
    <IonItemOptions>
      <ion-item-option color="danger"
        ><ion-icon
          @click.stop="deleteAlert(alert._id)"
          size="large"
          :icon="trashBin"
        ></ion-icon
      ></ion-item-option>
    </IonItemOptions>
  </IonItemSliding>
</template>

<script setup>
import {
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonIcon,
} from "@ionic/vue";
import { trashBin } from "ionicons/icons";
import { ref, onMounted, computed } from "vue";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useStateDataStore } from "../stores/stateDataStore";

dayjs.extend(relativeTime);

const props = defineProps({
  alert: {
    type: Object,
    required: true,
  },
});

const stateStore = useStateDataStore();
const alerts = computed(() => stateStore.alerts);

// Function to delete an alert
const deleteAlert = (alertId) => {
  alertStore.deleteAlert(alertId);
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "Unknown time";
  const date = dayjs(timestamp);
  return date.from(dayjs());
};
</script>

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
  padding-left: 1rem;
  border-left: 0.5rem solid rgba(39, 163, 8, 0.721);
}

.alert-item.warning {
  border-left: 0.5rem solid rgb(255, 204, 0);
}

.alert-item.critical,
.alert-item.ciritical {
  border-left: 0.5rem solid rgb(224, 51, 2);
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
</style>
