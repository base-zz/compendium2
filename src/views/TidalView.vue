<template>
  <IonPage class="tidal-page">
    <GenericHeader title="Tides" />
    <IonContent class="tidal-content">
      <TideComponent view-mode="tide" />
    </IonContent>
  </IonPage>
</template>

<script setup>
import { IonPage, IonContent } from '@ionic/vue';
import GenericHeader from '@/components/GenericHeader.vue';
import TideComponent from '@/components/TideComponent.vue';
</script>

<style scoped>
.tidal-page {
  background: var(--app-background-color);
  color: var(--app-text-color);
}

.tidal-content {
  --background: var(--app-background-color);
  color: var(--app-text-color);
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

.tidal-content::part(scroll) {
  padding-left: 0;
  padding-right: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
