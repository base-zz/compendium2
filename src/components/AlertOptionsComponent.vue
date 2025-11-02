<template>
  <ion-card class="alert-options" fixed-slot-placement="before">
    <ion-fab vertical="top" horizontal="end">
      <ion-fab-button @click="emit('deleteAlert', props.alertNumber)">
        <ion-icon :icon="closeOutline"></ion-icon>
      </ion-fab-button>
    </ion-fab>
    <ion-card-header>
      <ion-card-title>Alert {{ props.alertNumber + 1 }}</ion-card-title>
      <ion-card-subtitle>Alert Details</ion-card-subtitle>
    </ion-card-header>
    <ion-card-content>
      <ion-list :inset="true">
        <ion-item>
          <ion-select
            class="select-class"
            aria-label="DataSource"
            interface="modal"
            placeholder="Select Data Source"
            v-model="dataSource"
            color="light"
            :interface-options="{
              cssClass: 'custom-modal',
              header: 'Select Data Source',
            }"
          >
            <ion-select-option
              class="select-option"
              :key="f"
              v-for="f in navFields"
              :value="f"
              >{{ f }}</ion-select-option
            >
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-select
            class="select-class"
            interface="modal"
            aria-label="Alert Level"
            placeholder="Select Alert Level"
            v-model="alert.alertLevel"
            :interface-options="{
              cssClass: 'custom-modal',
              header: 'Select Alert Level',
            }"
          >
            <ion-select-option value="info">Info</ion-select-option>
            <ion-select-option value="warning">Warning</ion-select-option>
            <ion-select-option value="critical">Critical</ion-select-option>
            <!-- <ion-note slot="end">
              <p class="ion-text-wrap"><i>Required</i> Set the alert level.</p>
            </ion-note> -->
          </ion-select>
        </ion-item>

        <ion-item tankType>
          <ion-input
            class="custom"
            type="number"
            label-placement="start"
            placeholder="Alert Threshold"
            v-model="alert.alertThreshold"
          ></ion-input>
          <ion-note slot="after">
            <p class="ion-text-wrap">
              <i>Required</i> Set the value where you want the alert to trigger.
            </p>
          </ion-note>
        </ion-item>

        <ion-item tankType>
          <ion-toggle label-placement="start" v-model="alert.isUpperThreshold">
            <ion-label>
              <h3>Invert to Upper Threshold</h3>
              <p class="ion-text-wrap">
                Triggers an alert when the value raises <i>above</i> a threshold.
                <i>Optional</i>
              </p>
              <p class="ion-text-wrap">Default is lower threshold.</p>
            </ion-label>
          </ion-toggle>
        </ion-item>

        <ion-item tankType>
          <ion-toggle label-placement="start" v-model="alert.displayAlert">
            <ion-label>
              <h3>Display Alert</h3>
              <p class="ion-text-wrap">Display alert on local devices.</p>
            </ion-label>
          </ion-toggle>
        </ion-item>

        <ion-item tankType>
          <ion-toggle label-placement="start" v-model="alert.remoteAlert">
            <ion-label>
              <h3>Remote Alert</h3>
              <p class="ion-text-wrap">
                Send this alert to remove clients through the app.
              </p>
            </ion-label>
          </ion-toggle>
        </ion-item>

        <ion-item>
          <ion-input
            class="custom"
            type="text"
            label-placement="start"
            placeholder="Custom Header"
            v-model="alert.customHeader"
          >
          </ion-input>
          <ion-note slot="after">Optional customized header for alert.</ion-note>
        </ion-item>

        <ion-item>
          <ion-input
            class="custom"
            type="text"
            label-placement="start"
            placeholder="Custom Message"
            v-model="alert.customMessage"
          ></ion-input>
          <ion-note slot="after">Optional customized message for alert.</ion-note>
        </ion-item>
      </ion-list>
    </ion-card-content>
  </ion-card>
</template>

<script setup>
import {
  IonSelect,
  IonSelectOption,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonInput,
  IonToggle,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonFab,
  IonFabButton,
  IonIcon,
} from "@ionic/vue";
import { closeOutline } from "ionicons/icons";
import { useStateDataStore } from "@/stores/stateDataStore.js";
import { storeToRefs } from "pinia";

const props = defineProps({
  alertNumber: {
    type: [Number, String],
    required: true,
  },
});

const alert = defineModel("alert");
const emit = defineEmits(["deleteAlert"]);

const stateStore = useStateDataStore();
const { navigationState } = storeToRefs(stateStore);

// Define available instrument fields based on the state structure
const navFields = [
  "Speed Over Ground",
  "Speed Through Water",
  "Depth",
  "Wind Speed (True)",
  "Wind Angle (True)",
  "Wind Speed (Apparent)",
  "Wind Angle (Apparent)",
  "Heading",
  "Course Over Ground",
  "Current Speed",
  "Current Direction",
  "Water Temperature",
  "Air Temperature",
  "Pressure"
];
</script>

<style lang="scss" scoped>
.alert-options {
  border: 1px solid rgba(var(--ion-color-primary-contrast-rgb), 0.3);
  border-radius: 5px;
}

ion-input.custom {
  --padding-bottom: 10px;
  --padding-end: 10px;
  --padding-start: 10px;
  --padding-top: 10px;
}
</style>
