<template>
  <IonPage class="tidal-page">
    <GenericHeader title="Tides" />
    <IonContent class="tidal-content">
      <div class="tide-view">
        <TideChart class="tide-chart" :height="300" />
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup>
import { IonPage, IonContent } from '@ionic/vue';
import GenericHeader from '@/components/GenericHeader.vue';
import TideChart from '@/components/charts/TideChart.vue';
</script>

<style scoped>
.tidal-page {
  background: var(--app-background-color);
  color: var(--app-text-color);
}

.tidal-content {
  --background: var(--app-background-color);
  color: var(--app-text-color);
}

.tide-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.tide-chart {
  flex: 1;
  width: 100%;
  min-height: 300px;
  background: var(--app-surface-color);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--app-text-color) 10%, transparent);
}
</style>
