<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button color="medium" @click="cancel">Cancel</ion-button>
      </ion-buttons>
      <ion-title>Modal</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="confirm" :strong="true">Confirm</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content fullscreen class="ion-padding">
    <div class="flex">
      <div style="color: white" class="header">LOAD DISPLAY COMPONENT</div>
      <div
        style="color: white"
        v-for="(w, i) in widgets"
        :key="w._id"
        @click="loadWidget(i)"
      >
        <!-- <div v-for="(k, i) in Object.keys(w)" :key="w._id + '-' + i">
          {{ k }} : {{ w[k] }}
        </div> -->
        {{ w.widgetName }}
      </div>
    </div>
  </ion-content>
</template>

<script setup>
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  modalController,
} from "@ionic/vue";

import { useWidgetStore } from "../stores/widgets.js";
import TemplateCard from "./TemplateCard.vue";
import { useStateDataStore } from "@/stores/stateDataStore.js";
import { storeToRefs } from "pinia";

const stateStore = useStateDataStore();
const { navigationState } = storeToRefs(stateStore);

const cancel = () => modalController.dismiss(null, "cancel");
const confirm = () => modalController.dismiss(name.value, "confirm");

const widgetStore = useWidgetStore();

const widgets = widgetStore.widgets;

const loadWidget = (i) => {
  console.log(widgets[i]);
};
</script>

<style lang="scss" scoped></style>
