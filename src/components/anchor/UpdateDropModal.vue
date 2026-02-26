<template>
  <IonModal :is-open="isOpen" @didDismiss="close" css-class="update-drop-modal">
    <div class="modal-content">
      <h3>Update Drop Location</h3>
      <p>Set the current location as the new anchor drop location?</p>
      <div class="modal-actions">
        <IonButton color="primary" @click="$emit('confirm')">Yes, Update</IonButton>
        <IonButton @click="close">Cancel</IonButton>
      </div>
    </div>
  </IonModal>
</template>

<script setup>
import { IonModal, IonButton } from '@ionic/vue';

const props = defineProps({
  isOpen: { type: Boolean, required: true }
});

const emit = defineEmits(['update:isOpen', 'confirm']);

const close = () => emit('update:isOpen', false);
</script>

<style scoped>
.modal-content {
  padding: 20px;
  background: var(--ion-color-step-50, #1e1e1e);
  color: #fff;
  border-radius: 8px;
  text-align: center;
}
.modal-content h3 {
  margin-top: 0;
  color: var(--ion-color-primary, #3880ff);
}
.modal-actions {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}
</style>
