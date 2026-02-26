<template>
  <IonModal
    :is-open="isOpen"
    @didDismiss="close"
    css-class="tide-modal-root"
  >
    <ion-header class="tide-modal-header">
      <ion-toolbar class="tide-modal-header-toolbar">
        <ion-title class="tide-modal-title">Tides</ion-title>
        <IonButton @click="close" slot="end" fill="clear" class="tide-modal-close-btn">
          <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
        </IonButton>
      </ion-toolbar>
    </ion-header>
    <ion-content class="tide-modal-content">
      <TideComponent 
        view-mode="anchor" 
        :anchor-depth="anchorDepth" 
        :depth-units="depthUnits" 
      />
    </ion-content>
  </IonModal>
</template>

<script setup>
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon, IonContent } from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import TideComponent from '@/components/TideComponent.vue';

defineProps({
  isOpen: { type: Boolean, required: true },
  anchorDepth: { type: [Number, String], default: null },
  depthUnits: { type: String, default: 'm' }
});

const emit = defineEmits(['update:isOpen']);

const close = () => emit('update:isOpen', false);
</script>

<style scoped>
.tide-modal-header {
  background: var(--ion-color-step-100, #2a2a2a);
}
.tide-modal-header-toolbar {
  --background: transparent;
  --color: #fff;
}
.tide-modal-title {
  color: var(--ion-color-primary, #3880ff);
  font-weight: bold;
}
.tide-modal-close-btn {
  --color: var(--ion-color-step-600, #aaa);
}
.tide-modal-content {
  --background: var(--ion-color-step-50, #1e1e1e);
}
</style>