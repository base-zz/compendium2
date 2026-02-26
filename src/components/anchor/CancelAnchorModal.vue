<template>
  <IonModal 
    :is-open="isOpen" 
    @didDismiss="close"
    css-class="cancel-anchor-modal"
  >
    <div class="modal-content">
      <h3>Cancel Anchor</h3>

      <!-- Primary action card: retrieve/cancel anchor -->
      <div class="action-card">
        <p>
          Are you sure you want to cancel the anchor and clear all anchor-related data?
        </p>
        <div class="modal-actions">
          <IonButton color="danger" @click="$emit('cancel-anchor')">Yes, Cancel</IonButton>
          <IonButton @click="close">No</IonButton>
        </div>
      </div>

      <!-- Secondary action card: reset anchor here -->
      <div class="action-card secondary-card">
        <p class="action-title">
          Update Anchor to Current Position
        </p>
        <p class="action-desc">
          Treat the anchor's current position as the new anchor drop location. Rode length and alarm radius stay the same.
        </p>
        <div class="modal-actions">
          <IonButton color="secondary" @click="$emit('update-drop-location')">
            Use Current Position
          </IonButton>
        </div>
      </div>
    </div>
  </IonModal>

  <!-- Confirmation modal for updating anchor drop location -->
  <IonModal
    :is-open="showUpdateDropConfirm"
    @didDismiss="closeUpdateDropConfirm"
    css-class="update-drop-confirm-modal"
  >
    <div class="modal-content">
      <h3>Update Anchor Drop Location</h3>
      <p>
        Treat the anchor's current position as the new anchor drop location.
        Rode length and alarm radius stay the same.
      </p>
      <div class="modal-actions">
        <IonButton color="primary" @click="$emit('confirm-update-drop')">Yes, Update</IonButton>
        <IonButton @click="closeUpdateDropConfirm">Cancel</IonButton>
      </div>
    </div>
  </IonModal>
</template>

<script setup>
import { IonModal, IonButton } from '@ionic/vue';

defineProps({
  isOpen: { type: Boolean, required: true },
  showUpdateDropConfirm: { type: Boolean, required: true }
});

const emit = defineEmits([
  'update:isOpen', 
  'update:showUpdateDropConfirm', 
  'cancel-anchor', 
  'update-drop-location', 
  'confirm-update-drop'
]);

const close = () => emit('update:isOpen', false);
const closeUpdateDropConfirm = () => emit('update:showUpdateDropConfirm', false);
</script>

<style scoped>
.modal-content {
  padding: 20px;
  background: var(--ion-color-step-50, #1e1e1e);
  color: #fff;
  border-radius: 8px;
}
.modal-content h3 {
  margin-top: 0;
  color: var(--ion-color-primary, #3880ff);
  text-align: center;
}
.action-card {
  margin-top: 8px;
  padding: 12px 10px;
  border-radius: 10px;
  border: 1px solid var(--app-border-color, #333);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.action-card p {
  margin: 0;
  font-size: 0.9em;
  text-align: center;
}
.secondary-card {
  margin-top: 16px;
}
.action-title {
  font-weight: bold;
}
.action-desc {
  font-size: 0.85em;
  opacity: 0.8;
}
.modal-actions {
  display: flex;
  justify-content: space-around;
  margin-top: 6px;
}
</style>