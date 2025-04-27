<template>
  <ion-item>
    <div><ion-spinner color="light"></ion-spinner></div>
  </ion-item>
</template>

<script lang="ts">
import { IonItem, IonLabel, IonSpinner } from "@ionic/vue";
import { defineComponent } from "vue";

export default defineComponent({
  components: { IonItem, IonLabel, IonSpinner },
});
</script>

<style scoped>
ion-item {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-content: center;
  flex-direction: column;
  position: relative;
  text-align: center;
}

div {
  width: 100%;
  height: 100%;
}

ion-spinner {
  width: 80px;
  height: 80px;
}

ion-spinner {
  stroke: red !important;
  fill: red !important;
  color: var(--ion-color-primary-contrast);
}
</style>
