<template>
  <ion-page>
    <generic-header title="Electrical System" />
    <ion-content class="content-with-header">
      <electrical-flow-diagram />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage, IonContent } from '@ionic/vue';
import GenericHeader from '@/components/GenericHeader.vue';
import ElectricalFlowDiagram from '@/components/electrical/ElectricalFlowDiagram.vue';
</script>

<style scoped>
.content-with-header {
  --padding-top: 16px;
  --padding-bottom: 16px;
  --padding-start: 16px;
  --padding-end: 16px;
}
</style>
