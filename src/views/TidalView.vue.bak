<template>
  <IonPage>
    <GenericHeader title="Tides" />
    <IonContent>
      <div class="tide-view">
        <TideChart class="tide-chart" :height="300" />
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup>
import { IonPage, IonContent } from '@ionic/vue';
import GenericHeader from '@client/components/GenericHeader.vue';
import TideChart from '@client/components/charts/TideChart.vue';
</script>

<style scoped>
.tide-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tide-chart {
  flex: 1;
  width: 100%;
  min-height: 300px;
}
</style>
