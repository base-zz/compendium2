<template>
  <router-link :to="`/alertdetails/${alert._id}`" class="alert-link">
    <ion-card :class="['alert-card', alertType]">
      <ion-card-header>
        <div class="alert-header">
          <div class="icon-wrapper">
            <AlertIconComponent :type="alertType" />
          </div>
          <div class="title-wrapper">
            <ion-card-title>{{ getAlertTitle }}</ion-card-title>
            <ion-card-subtitle>{{ alert.message }}</ion-card-subtitle>
          </div>
        </div>
      </ion-card-header>
      <ion-card-content>
        <div class="alert-content">
          <div class="alert-info">
            <div class="alert-value" v-if="alert.data?.value">
              {{ alert.data.value }} {{ alert.data?.units }}
            </div>
            <div class="alert-time">
              {{ formatTime(alert.timestamp) }}
            </div>
          </div>
        </div>
      </ion-card-content>
    </ion-card>
  </router-link>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useAlertStore } from "../stores/alerts";
import AlertIconComponent from "./AlertIconComponent.vue";
import { computed } from "vue";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
} from "@ionic/vue";

const router = useRouter();
const alertStore = useAlertStore();

dayjs.extend(relativeTime);

const props = defineProps({
  alert: {
    type: Object,
    required: false,
    default: () => ({
      type: "info",
      label: "Untitled Alert",
      message: "No message available",
      timestamp: Date.now(),
      data: {},
      alert: {}, // Alert definition
    }),
  },
});

// Get alert title
const getAlertTitle = computed(() => {
  // console.log('Getting alert title for:', props.alert);

  // Try all possible locations for the title
  const title =
    props.alert?.label ||
    props.alert?.alert?.label ||
    props.alert?.alert?.title ||
    props.alert?.title ||
    "Untitled Alert";

  // console.log('Found title:', title);
  return title;
});

// Map alert levels to types
const getAlertType = (alert) => {
  if (!alert) return "info";

  // console.log('Getting alert type for:', alert);

  // Use the type directly if it exists and is valid
  const validTypes = ["error", "warning", "info"];
  if (alert.type && validTypes.includes(alert.type.toLowerCase())) {
    // console.log('Using existing type:', alert.type);
    return alert.type.toLowerCase();
  }

  // Otherwise derive from alert level
  const levelMap = {
    error: "error",
    warning: "warning",
    info: "info",
  };

  const derivedType = levelMap[alert.alert?.alertLevel?.toLowerCase()] || "info";
  // console.log('Derived type:', derivedType);
  return derivedType;
};

const alertType = computed(() => {
  const type = getAlertType(props.alert);
  // console.log('Computed alert type:', type);
  return type;
});

const formatTime = (timestamp) => {
  if (!timestamp) return "Unknown time";
  const date = new Date(timestamp);
  return date.toLocaleString();
};
</script>

<style scoped>
.alert-link {
  text-decoration: none;
  display: block;
}

.alert-card {
  margin: 0.5rem 0;
  border-left: 4px solid var(--ion-color-medium);
}

.alert-card.error {
  border-left-color: var(--ion-color-danger);
}

.alert-card.warning {
  border-left-color: var(--ion-color-warning);
}

.alert-card.info {
  border-left-color: var(--ion-color-primary);
}

.alert-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.icon-wrapper {
  flex-shrink: 0;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-wrapper {
  flex-grow: 1;
  min-width: 0;
}

.title-wrapper ion-card-title {
  font-size: 1.1em;
  margin-bottom: 0.25rem;
}

.title-wrapper ion-card-subtitle {
  font-size: 0.9em;
  white-space: normal;
  overflow: visible;
}

.alert-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.alert-value {
  font-size: 1.1em;
  font-weight: 500;
}

.alert-time {
  font-size: 0.9em;
  color: var(--ion-color-medium);
}
</style>
