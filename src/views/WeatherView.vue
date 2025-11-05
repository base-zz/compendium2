<template>
  <IonPage class="weather-page">
    <GenericHeader title="Weather" />
    <IonContent class="weather-content">
      <div class="ion-padding weather-wrapper">
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
  background: var(--app-surface-color);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--app-text-color) 10%, transparent);
}
</style>
