<template>
  <ion-page>
    <generic-header title="Page Not Found" />

    <ion-content class="content-with-header ion-text-center">
      <div class="error-container">
        <div class="error-image-container">
          <img src="/img/404_baby.jpg" alt="Error illustration" class="error-image" />
        </div>
        <h2 class="error error-message">Page Not Found</h2>
        <p class="error error-description">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <ion-button
          expand="block"
          @click="goHome"
          class="home-button nav-button"
          size="large"
        >
          <ion-icon slot="start" :icon="homeOutline" size="large"></ion-icon>
          <ion-label>Return to Home</ion-label>
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage, IonContent, IonButton, IonIcon, IonLabel } from "@ionic/vue";
import { homeOutline } from "ionicons/icons";
import { useRouter } from "vue-router";
import GenericHeader from "../components/GenericHeader.vue";

const router = useRouter();

function goHome() {
  router.push("/home");
}
</script>

<style scoped></style>
