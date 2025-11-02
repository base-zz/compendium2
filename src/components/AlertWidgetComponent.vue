<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Alert {{ alertNumber + 1 }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <form class="custom-form">
        <!-- Data Source -->
        <div class="form-group">
          <label class="form-label">Data Source</label>
          <ion-label>{{ props.dataSource }}</ion-label>
        </div>

        <!-- Alert Threshold -->
        <div class="form-group">
          <label class="form-label">Alert At This Value</label>
          <ion-input
            class="form-control"
            type="number"
            v-model="alert.alertThreshold"
            placeholder="Enter threshold value"
          ></ion-input>
          <small class="form-help">Value that will trigger the alert</small>
        </div>

        <!-- Alert Type -->
        <div class="form-group">
          <label class="form-label">Alert Level</label>
          <ion-select
            class="form-control"
            v-model="alert.alertLevel"
            interface="modal"
            :interface-options="{
              cssClass: 'select-modal',
              header: 'Select Alert Level'
            }"
          >
            <ion-select-option value="info">Info</ion-select-option>
            <ion-select-option value="warning">Warning</ion-select-option>
            <ion-select-option value="danger">Danger</ion-select-option>
          </ion-select>
        </div>

        <!-- Repeat Alert -->
        <div class="form-group">
          <label class="form-label">Repeat Alert</label>
          <ion-select
            class="form-control"
            v-model="alert.repeat"
            interface="modal"
            :interface-options="{
              cssClass: 'select-modal',
              header: 'Select Repeat Alert'
            }"
          >
            <ion-select-option value="">No Repeat</ion-select-option>
            <ion-select-option value="every_5_above">Every 5 Above</ion-select-option>
            <ion-select-option value="every_5_below">Every 5 Below</ion-select-option>
          </ion-select>
        </div>

        <!-- Repeat Threshold -->
        <div class="form-group" v-if="alert.repeat">
          <label class="form-label">End Alerts At This Value</label>
          <ion-input
            class="form-control"
            type="number"
            v-model="alert.repeatThreshold"
            placeholder="Enter end threshold"
          ></ion-input>
          <small class="form-help">Value at which to stop alerts</small>
        </div>

        <!-- Remote Alert Toggle -->
        <div class="form-group">
          <label class="form-label">Remote Alert</label>
          <ion-toggle v-model="alert.remoteAlert"></ion-toggle>
        </div>

        <!-- Custom Message Toggle -->
        <div class="form-group">
          <label class="form-label">Customize Message</label>
          <ion-toggle v-model="customizeMessage"></ion-toggle>
        </div>

        <!-- Custom Header -->
        <div class="form-group" v-if="customizeMessage">
          <label class="form-label">Custom Header</label>
          <ion-input
            class="form-control"
            type="text"
            v-model="alert.customHeader"
            placeholder="Enter custom header"
          ></ion-input>
          <small class="form-help">Optional custom header for alert</small>
        </div>

        <!-- Custom Message -->
        <div class="form-group" v-if="customizeMessage">
          <label class="form-label">Custom Message</label>
          <ion-input
            class="form-control"
            type="text"
            v-model="alert.customMessage"
            placeholder="Enter custom message"
          ></ion-input>
          <small class="form-help">Optional custom message for alert</small>
        </div>

        <!-- Delete Button -->
        <div class="form-group">
          <ion-button 
            color="danger" 
            @click="emit('deleteAlert', props.alertNumber)"
            class="delete-btn"
          >
            <ion-icon name="trash-outline" slot="start"></ion-icon>
            Delete Alert
          </ion-button>
        </div>
      </form>
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
  IonButton,
} from "@ionic/vue";
import { closeOutline } from "ionicons/icons";
import { ref } from "vue";

const props = defineProps({
  alertNumber: {
    type: [Number, String],
    required: true,
  },
  dataSource: {
    type: String,
    required: true,
  },
});

const alert = defineModel("alert");
const emit = defineEmits(["deleteAlert"]);
const customizeMessage = ref(false);
</script>

<style>
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--ion-text-color);
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border-radius: 4px;
  border: 2px solid #3c3c3c;
}

.alert-form {
  padding: 1rem;
}

.alert-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

ion-card {
  background: #1c1c1c;
  margin: 1rem;
}

ion-card-header {
  background: #2c2c2c;
  color: #fff;
}

ion-card-title {
  color: #fff !important;
}

.delete-btn {
  margin-top: 1rem;
}

ion-toggle {
  --background: #3c3c3c;
  --background-checked: var(--ion-color-primary);
  --handle-background: #fff;
  --handle-background-checked: #fff;
}

::v-deep .dark-modal {
  --height: auto;
  --width: 90%;
  --max-width: 400px;
  --border-radius: 8px;
}

::v-deep .dark-modal ion-header {
  background: #2c2c2c;
}

::v-deep .dark-modal ion-toolbar {
  --background: #2c2c2c;
  --color: #ffffff;
}

::v-deep .dark-modal ion-title {
  color: #ffffff;
}

::v-deep .dark-modal ion-content {
  --background: #1c1c1c;
}

::v-deep .dark-modal ion-list {
  background: #1c1c1c;
}

::v-deep .dark-modal ion-item {
  --background: #1c1c1c;
  --color: #ffffff;
  --border-color: #3c3c3c;
}

::v-deep .dark-modal ion-select-option {
  color: #000000;
}

::v-deep .dark-modal ion-item:hover {
  --background: #2c2c2c;
}

::v-deep .dark-modal .ion-activated {
  --background: #2c2c2c;
}

::v-deep .dark-modal ion-radio {
  --color: #ffffff;
  --color-checked: var(--ion-color-primary);
}

::v-deep .dark-modal ion-radio::part(container) {
  border-color: #3c3c3c;
}

::v-deep .dark-modal ion-radio.radio-checked::part(container) {
  border-color: var(--ion-color-primary);
}

::v-deep .dark-modal ion-label {
  --color: #000000;
  color: #000000 !important;
}

::v-deep .dark-modal .select-interface-option {
  color: #000000 !important;
}

::v-deep .dark-modal .select-interface-option.select-interface-option-selected {
  background: var(--ion-color-primary) !important;
  color: #ffffff !important;
}

::v-deep .modal-wrapper {
  background: #ffffff;
}
</style>
