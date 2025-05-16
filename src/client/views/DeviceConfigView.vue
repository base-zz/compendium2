<template>
  <ion-page>
    <generic-header title="Device Configuration" />
    <ion-content class="content-with-header">
      <DeviceConfigPanel />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage, IonContent } from "@ionic/vue";
import DeviceConfigPanel from "@client/components/DeviceConfigPanel.vue";
import GenericHeader from "@client/components/GenericHeader.vue";
</script>

<style scoped></style>
