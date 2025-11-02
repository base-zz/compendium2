<script setup lang="ts">
import LoginComponent from "@/components/LoginComponent.vue";
import { IonPage, IonContent } from "@ionic/vue";
</script>

<template>
  <ion-page>
    <ion-content class="content-with-header">
      <LoginComponent />
    </ion-content>
  </ion-page>
</template>

<style scoped>
div.page {
  height: 100%;
}
</style>
