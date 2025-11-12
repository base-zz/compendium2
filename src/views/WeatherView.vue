<template>
  <IonPage class="weather-page">
    <GenericHeader title="Weather" />
    <IonContent class="weather-content">
      <div class="weather-wrapper">
        <WeatherComponent />
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup>
import { IonPage, IonContent } from '@ionic/vue';
import GenericHeader from '@/components/GenericHeader.vue';
import WeatherComponent from '@/components/WeatherComponent.vue';
</script>

<style scoped>
.weather-page {
  background: var(--app-background-color);
  color: var(--app-text-color);
}

.weather-content {
  --background: var(--app-background-color);
  color: var(--app-text-color);
}

.weather-wrapper {
  width: 100%;
  height: 100%;
  padding: 0 8px;
  box-sizing: border-box;
}
</style>
