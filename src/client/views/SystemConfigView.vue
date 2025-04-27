<template>
  <ion-page>
    <generic-header title="System Configuration" />
    <ion-content class="content-with-header">
      <SystemConfigPanel />
    </ion-content>
  </ion-page>
</template>

<script setup>
// import GenericHeader from "@/components/GenericHeader.vue";
import SystemConfigPanel from "@/components/SystemConfigPanel.vue";
import { IonPage, IonContent } from "@ionic/vue";
import GenericHeader from "@/components/GenericHeader.vue";
</script>

<style scoped></style>
