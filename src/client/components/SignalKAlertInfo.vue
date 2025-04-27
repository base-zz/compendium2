<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button class="menu-icon"></ion-menu-button>
        </ion-buttons>
        <ion-title>Alerts</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="closeModal()">
            <ion-icon :icon="closeOutline" size="large"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form class="custom-form">
        <!-- Alert Title -->
        <div class="form-group">
          <label class="form-label">Alert Title</label>
          <ion-input
            class="form-control"
            type="text"
            v-model="props.alert.label"
            placeholder="Enter alert title"
            :disabled="disableInputs"
          ></ion-input>
        </div>

        <!-- Data Source -->
        <div class="form-group">
          <label class="form-label">Data Source</label>
          <ion-input
            class="form-control"
            type="text"
            v-model="props.alert.dataSource"
            placeholder="Data Source"
            :disabled="disableInputs"
          ></ion-input>
        </div>

        <!-- Current Value -->
        <div class="form-group" v-if="alert.dataSource">
          <label class="form-label">Current Value</label>
          <ion-input
            :disabled="disableInputs"
            class="form-control"
            readonly
            :value="getCurrentValue"
          ></ion-input>
        </div>

        <!-- Time of Alert -->
        <div class="form-group">
          <label class="form-label">Time of Alert</label>
          <ion-input
            class="form-control"
            type="text"
            :disabled="disableInputs"
            :value="dayjs(alert.timestamp).format('YYYY-MM-DD HH:mm:ss')"
          ></ion-input>
          <small class="form-help">Optional custom message for alert</small>
        </div>

        <!-- Alert Type -->
        <div class="form-group">
          <label class="form-label">Alert Level</label>
          <ion-select
            class="form-control"
            v-model="props.alert.type"
            placeholder="Select alert type"
            interface="modal"
            :interface-options="{
              cssClass: 'select-modal',
              header: 'Select Alert Level',
            }"
            :disabled="disableInputs"
          >
            <ion-select-option value="info">Info</ion-select-option>
            <ion-select-option value="warning">Warning</ion-select-option>
            <ion-select-option value="ciritical">Critical</ion-select-option>
          </ion-select>
        </div>

        <!-- Threshold -->
        <div class="form-group" v-if="alert.dataSource">
          <label class="form-label">Alert Threshold</label>
          <ion-input
            class="form-control"
            type="number"
            v-model="props.alert.threshold"
            placeholder="Enter threshold value"
            :disabled="disableInputs"
          ></ion-input>
          <small class="form-help">Value that will trigger the alert</small>
        </div>

        <!-- Repeat Alert -->
        <div class="form-group">
          <label class="form-label">Repeat Alert</label>
          <ion-input
            :disabled="disableInputs"
            class="form-control"
            readonly
            :value="getCurrentValue"
          ></ion-input>
        </div>

        <!-- Custom Header -->
        <div class="form-group">
          <label class="form-label">Custom Header</label>
          <ion-input
            class="form-control"
            type="text"
            v-model="alert.customHeader"
            placeholder="Enter custom header"
            :disabled="disableInputs"
          ></ion-input>
          <small class="form-help">Optional custom header for alert</small>
        </div>

        <!-- Message -->
        <div class="form-group">
          <label class="form-label">Message</label>
          <ion-textarea
            class="form-control"
            v-model="alert.message"
            placeholder="Enter alert message"
            :disabled="disableInputs"
          ></ion-textarea>
        </div>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButtons,
  IonButton,
  IonIcon,
  IonModal,
  IonMenuButton,
  IonFab,
  IonFabButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToggle,
  modalController,
} from "@ionic/vue";
import { ref, computed } from "vue";
import { useStateDataStore } from "@/stores/stateDataStore.js";
import { storeToRefs } from "pinia";
import { closeOutline } from "ionicons/icons";
import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime"; // import plugin
// dayjs.extend(relativeTime);

const stateStore = useStateDataStore();
const { navigationState, alertState } = storeToRefs(stateStore);

// Define keys for navigation data categories
const navDataKeys = [
  'position',
  'course',
  'speed',
  'depth',
  'wind',
  'environment',
  'current'
];

const props = defineProps({
  alert: {
    type: Object,
    default: null,
  },
});

const disableInputs = ref(props.alert && props.alert.source === "SignalK");

function closeModal() {
  modalController.dismiss(); // Close the modal
  console.log("Modal closed");
}

const getCurrentValue = computed(() => {
  if (!props.alert.dataSource || !navStore.navData.value) return "--";

  return navStore.navData.value[props.alert.dataSource]?.value || "--";
});

console.log(props.alert);
</script>

<style scoped></style>
