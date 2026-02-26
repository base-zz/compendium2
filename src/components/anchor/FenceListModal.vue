<template>
  <IonModal :is-open="isOpen" @didDismiss="close" css-class="fence-modal-root">
    <div class="modal-content fence-modal-content">
      <h3>Fences</h3>
      <div v-if="!Array.isArray(fences) || fences.length === 0" class="fence-empty-state">
        No fences yet.
      </div>
      <div v-else class="fence-list">
        <div v-for="fence in fences" :key="fence.id" class="fence-list-item">
          <div class="fence-list-title">{{ fence.name }}</div>
          <div class="fence-list-detail">
            {{ fence.targetType === "ais" ? "AIS" : "Point" }} · {{ fence.alertRange }} {{ fence.units }} · {{ fence.referenceType === "anchor_drop" ? "Anchor Drop" : "Boat" }}
          </div>
          <IonButton size="small" color="danger" fill="outline" @click="$emit('remove-fence', fence.id)">Remove</IonButton>
        </div>
      </div>
      <div class="modal-actions">
        <IonButton color="primary" @click="$emit('add-fence')">Add Fence</IonButton>
        <IonButton @click="close">Close</IonButton>
      </div>
    </div>
  </IonModal>
</template>

<script setup>
import { IonModal, IonButton } from '@ionic/vue';

defineProps({
  isOpen: { type: Boolean, required: true },
  fences: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:isOpen', 'remove-fence', 'add-fence']);

const close = () => emit('update:isOpen', false);
</script>

<style scoped>
.fence-modal-content {
  padding: 20px;
  background: var(--ion-color-step-50, #1e1e1e);
  color: #fff;
  border-radius: 8px;
}
.fence-modal-content h3 {
  margin-top: 0;
  color: var(--ion-color-primary, #3880ff);
  text-align: center;
}
.fence-empty-state {
  text-align: center;
  color: var(--ion-color-step-600, #888);
  margin: 20px 0;
}
.fence-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
}
.fence-list-item {
  background: var(--ion-color-step-100, #2a2a2a);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid var(--ion-color-step-200, #333);
}
.fence-list-title {
  font-weight: bold;
  font-size: 1.1em;
  margin-bottom: 4px;
}
.fence-list-detail {
  font-size: 0.9em;
  color: var(--ion-color-step-600, #aaa);
  margin-bottom: 10px;
}
.modal-actions {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}
</style>