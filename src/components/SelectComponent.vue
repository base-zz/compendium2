<template>
  <ion-content class="ion-padding">
    <p>{{ message }}</p>
    <ion-button @click="closeModal">Close Modal</ion-button>
  </ion-content>
</template>

<script setup>
import { IonContent, IonButton, useIonModal } from "@ionic/vue";

const { dismiss } = useIonModal();

const closeModal = () => {
  dismiss();
};
</script>
