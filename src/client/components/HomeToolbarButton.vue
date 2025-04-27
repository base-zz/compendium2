<template>
  <ion-button @click="goHome" fill="clear">
    <ion-icon :icon="homeOutline" slot="icon-only"></ion-icon>
  </ion-button>
</template>

<script setup>
import { IonButton, IonIcon } from '@ionic/vue';
import { homeOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';

const router = useRouter();

const goHome = () => {
  router.push('/');
};
</script>

<style scoped>
ion-button {
  --padding-start: 8px;
  --padding-end: 8px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  --border-radius: 4px;
}
</style>
