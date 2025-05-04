<script setup>
import { computed } from "vue";
import { IonItem, IonLabel, IonIcon } from "@ionic/vue";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { alertCircleOutline, warningOutline, informationCircleOutline } from "ionicons/icons";

dayjs.extend(relativeTime);

const props = defineProps({
  alert: {
    type: Object,
    required: true,
  },
});

// Choose icon based on alert type/severity
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
  props.alert.timestamp ? dayjs(props.alert.timestamp).fromNow() : "Unknown time"
);
const emit = defineEmits(["view-detail"]);

function handleClick() {
  emit("view-detail", props.alert);
}
</script>

<template>
  <IonItem class="alert-item" :color="props.alert.severity || 'primary'" button @click="handleClick">
    <IonIcon :icon="icon" slot="start" />
    <IonLabel>
      <div class="alert-title">
        {{ props.alert.title || props.alert.label || props.alert.path || "Alert" }}
      </div>
      <div class="alert-message">
        {{ props.alert.message || props.alert.description || "" }}
      </div>
      <div class="alert-timestamp">
        {{ formattedTime }}
      </div>
    </IonLabel>
  </IonItem>
</template>

<style scoped>
.alert-item {
  margin-bottom: 8px;
}
.alert-title {
  font-weight: bold;
  font-size: 1.1em;
}
.alert-message {
  margin-top: 4px;
  margin-bottom: 2px;
  color: var(--ion-color-medium);
}
.alert-timestamp {
  font-size: 0.9em;
  color: var(--ion-color-light);
}
</style>