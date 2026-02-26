<template>
  <IonModal
    :is-open="isOpen"
    @didDismiss="close"
    css-class="ais-modal-root"
  >
    <ion-content class="ais-modal-body">
      <div class="ais-modal-content">
        <div class="ais-modal-header">
          <h2 class="ais-vessel-name">{{ target?.name || 'Unknown Vessel' }}</h2>
          <p class="ais-vessel-mmsi">MMSI: {{ target?.mmsi || 'N/A' }}</p>
        </div>
        
        <div class="ais-section">
          <h3 class="ais-section-title">Position</h3>
          <div class="ais-grid">
            <div class="ais-field">
              <span class="ais-label">Latitude</span>
              <div class="ais-value">{{ formatCoordinate(target?.latitude) }}</div>
            </div>
            <div class="ais-field">
              <span class="ais-label">Longitude</span>
              <div class="ais-value">{{ formatCoordinate(target?.longitude) }}</div>
            </div>
            <div class="ais-field">
              <span class="ais-label">SOG</span>
              <div class="ais-value">{{ target?.sog || 'N/A' }}</div>
            </div>
            <div class="ais-field">
              <span class="ais-label">COG</span>
              <div class="ais-value">{{ target?.cog || 'N/A' }}</div>
            </div>
            <div v-if="target?.heading" class="ais-field">
              <span class="ais-label">Heading</span>
              <div class="ais-value">{{ target.heading }}</div>
            </div>
            <div v-if="target?.distance" class="ais-field">
              <span class="ais-label">Distance</span>
              <div class="ais-value">{{ target.distance }}</div>
            </div>
          </div>
        </div>

        <div class="ais-section" v-if="target?.callsign || target?.vesselType || target?.length || target?.beam || target?.draft">
          <h3 class="ais-section-title">Vessel Info</h3>
          <div class="ais-grid">
            <div v-if="target?.callsign" class="ais-field">
              <span class="ais-label">Callsign</span>
              <div class="ais-value">{{ target.callsign }}</div>
            </div>
            <div v-if="target?.vesselType" class="ais-field">
              <span class="ais-label">Type</span>
              <div class="ais-value">{{ target.vesselType }}</div>
            </div>
            <div v-if="target?.length" class="ais-field">
              <span class="ais-label">Length</span>
              <div class="ais-value">{{ target.length }}</div>
            </div>
            <div v-if="target?.beam" class="ais-field">
              <span class="ais-label">Beam</span>
              <div class="ais-value">{{ target.beam }}</div>
            </div>
            <div v-if="target?.draft" class="ais-field">
              <span class="ais-label">Draft</span>
              <div class="ais-value">{{ target.draft }}</div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
    <ion-footer class="ais-modal-footer">
      <ion-toolbar class="ais-modal-toolbar">
        <IonButton @click="close" slot="end" color="primary">Close</IonButton>
      </ion-toolbar>
    </ion-footer>
  </IonModal>
</template>

<script setup>
import { IonModal, IonButton, IonContent, IonFooter, IonToolbar } from '@ionic/vue';

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  target: { type: Object, default: null }
});

const emit = defineEmits(['update:isOpen']);

const close = () => emit('update:isOpen', false);

// Helper function to format coordinates (matches AnchorView implementation)
const formatCoordinate = (coord) => {
  if (coord == null) return 'N/A';
  const num = typeof coord === 'number' ? coord : (coord?.value ?? null);
  if (num == null || !Number.isFinite(num)) return 'N/A';
  return num.toFixed(4);
};
</script>

<style scoped>
.ais-modal-content {
  padding: 20px;
  background: var(--ion-color-step-50, #1e1e1e);
  color: #fff;
  border-radius: 8px;
  height: 100%;
}

.ais-modal-header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--ion-color-step-200, #333);
}

.ais-vessel-name {
  margin: 0 0 8px 0;
  color: var(--ion-color-primary, #3880ff);
  font-size: 1.4em;
  font-weight: 600;
}

.ais-vessel-mmsi {
  margin: 0;
  color: var(--ion-color-step-600, #aaa);
  font-size: 0.9em;
}

.ais-section {
  margin-bottom: 25px;
}

.ais-section-title {
  margin: 0 0 15px 0;
  color: var(--ion-color-primary, #3880ff);
  font-size: 1.1em;
  font-weight: 600;
  border-bottom: 1px solid var(--ion-color-step-200, #333);
  padding-bottom: 8px;
}

.ais-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.ais-field {
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: var(--ion-color-step-100, #2a2a2a);
  border-radius: 6px;
  border: 1px solid var(--ion-color-step-200, #333);
}

.ais-label {
  font-size: 0.85em;
  color: var(--ion-color-step-600, #aaa);
  font-weight: 500;
  margin-bottom: 4px;
}

.ais-value {
  font-size: 0.95em;
  color: #fff;
  font-weight: 600;
}

.ais-modal-footer {
  --background: var(--ion-color-step-50, #1e1e1e);
  border-top: 1px solid var(--ion-color-step-200, #333);
}

.ais-modal-toolbar {
  --background: var(--ion-color-step-50, #1e1e1e);
}
</style>