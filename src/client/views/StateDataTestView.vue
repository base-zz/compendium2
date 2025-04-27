<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>State Data Test</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <StateDataViewer />
    </ion-content>
  </ion-page>
</template>

<script>
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue';
import StateDataViewer from '../components/StateDataViewer.vue';

export default {
  name: 'StateDataTestView',
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    StateDataViewer
  }
};
</script>
