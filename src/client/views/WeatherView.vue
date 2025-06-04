<template>
  <IonPage>
    <GenericHeader title="Weather" />
    <IonContent>
      <div class="ion-padding">
        <WeatherComponent />
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup>
import { IonPage, IonContent } from '@ionic/vue';
import GenericHeader from '@client/components/GenericHeader.vue';
import WeatherComponent from '@client/components/WeatherComponent.vue';
</script>

<style scoped>
/* Add any custom styles here if needed */
</style>
