<template>
  <IonModal :is-open="isOpen" @didDismiss="close" css-class="fence-modal-root">
    <div class="modal-content fence-modal-content">
      <h3>Create Fence</h3>
      <p v-if="selectedFenceTarget" class="fence-target-summary">
        Target:
        <strong>
          {{ selectedFenceTarget.targetType === "ais" ? (selectedFenceTarget.name || "AIS Target") : "Map Point" }}
        </strong>
      </p>

      <div class="fence-form-row">
        <label for="fence-name-input">Name</label>
        <input id="fence-name-input" v-model="name" type="text" placeholder="Fence name" />
      </div>

      <div v-if="validationError" class="fence-validation-error">
        {{ validationError }}
      </div>

      <div class="fence-form-row">
        <label for="fence-range-input">Alert Range ({{ isMetric ? "m" : "ft" }})</label>
        <input id="fence-range-input" v-model="range" type="number" min="1" step="1" />
      </div>

      <div class="fence-form-row">
        <label for="fence-reference-select">Reference</label>
        <select
          id="fence-reference-select"
          v-model="referenceType"
          @change="$emit('reference-change')"
        >
          <option value="">Select reference</option>
          <option value="boat">Boat</option>
          <option value="anchor_drop">Anchor Drop</option>
        </select>
      </div>

      <div class="modal-actions">
        <IonButton color="primary" @click="$emit('save')">Save Fence</IonButton>
        <IonButton @click="$emit('cancel')">Cancel</IonButton>
      </div>
    </div>
  </IonModal>
</template>

<script setup>
import { computed } from 'vue';
import { IonModal, IonButton } from '@ionic/vue';

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  selectedFenceTarget: { type: Object, default: null },
  fenceName: { type: String, required: true },
  fenceRangeInput: { type: [Number, String], required: true },
  fenceReferenceType: { type: String, required: true },
  validationError: { type: String, default: '' },
  isMetric: { type: Boolean, required: true }
});

const emit = defineEmits([
  'update:isOpen', 
  'update:fenceName', 
  'update:fenceRangeInput', 
  'update:fenceReferenceType',
  'save', 
  'cancel',
  'reference-change'
]);

const close = () => emit('update:isOpen', false);

const name = computed({
  get: () => props.fenceName,
  set: (val) => emit('update:fenceName', val)
});

const range = computed({
  get: () => props.fenceRangeInput,
  set: (val) => emit('update:fenceRangeInput', val)
});

const referenceType = computed({
  get: () => props.fenceReferenceType,
  set: (val) => emit('update:fenceReferenceType', val)
});
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
.fence-target-summary {
  background: var(--ion-color-step-100, #2a2a2a);
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
}
.fence-form-row {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
}
.fence-form-row label {
  margin-bottom: 5px;
  font-weight: bold;
  color: var(--ion-color-step-600, #aaa);
}
.fence-form-row input,
.fence-form-row select {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--ion-color-step-200, #333);
  background: var(--ion-color-step-100, #2a2a2a);
  color: white;
  width: 100%;
}
.fence-validation-error {
  color: var(--ion-color-danger, #eb445a);
  font-size: 0.9em;
  margin-bottom: 15px;
  text-align: center;
}
.modal-actions {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}
</style>