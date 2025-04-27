<template>
  <ion-page>
    <generic-header title="Set Theme" />
    <ion-content class="content-with-header">
      <ThemeSelector />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage, IonContent } from "@ionic/vue";
import ThemeSelector from "../components/ThemeSelector.vue";
import GenericHeader from "@/components/GenericHeader.vue";
</script>

<style scoped></style>
