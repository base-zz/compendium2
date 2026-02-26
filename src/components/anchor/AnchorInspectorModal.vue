<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="close"
    css-class="anchor-inspector-modal-root"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>Anchor State Inspector</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="close">
            <ion-icon :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="anchor-inspector-content">
      <div class="inspector-section">
        <h4>Anchor Status</h4>
        <div class="inspector-row">
          <span class="inspector-label">Status:</span>
          <span class="inspector-value">{{ anchorStatusText }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Anchor Deployed:</span>
          <span class="inspector-value">{{ anchorState?.anchorDeployed ? 'Yes' : 'No' }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Dragging:</span>
          <span class="inspector-value">{{ anchorState?.dragging ? 'Yes' : 'No' }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">AIS Warning:</span>
          <span class="inspector-value">{{ anchorState?.aisWarning ? 'Yes' : 'No' }}</span>
        </div>
      </div>

      <div class="inspector-section">
        <h4>Anchor Drop Location</h4>
        <div class="inspector-row">
          <span class="inspector-label">Latitude:</span>
          <span class="inspector-value">{{ anchorState?.anchorDropLocation?.position?.latitude?.value || 'N/A' }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Longitude:</span>
          <span class="inspector-value">{{ anchorState?.anchorDropLocation?.position?.longitude?.value || 'N/A' }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Depth:</span>
          <span class="inspector-value">
            {{ anchorState?.anchorDropLocation?.depth?.value || 'N/A' }} 
            {{ anchorState?.anchorDropLocation?.depth?.units || '' }}
          </span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Depth Source:</span>
          <span class="inspector-value">{{ anchorState?.anchorDropLocation?.depth?.depthSource || 'N/A' }}</span>
        </div>
      </div>

      <div class="inspector-section">
        <h4>Current Anchor Location</h4>
        <div class="inspector-row">
          <span class="inspector-label">Latitude:</span>
          <span class="inspector-value">{{ anchorState?.anchorLocation?.position?.latitude?.value || 'N/A' }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Longitude:</span>
          <span class="inspector-value">{{ anchorState?.anchorLocation?.position?.longitude?.value || 'N/A' }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Drift:</span>
          <span class="inspector-value">{{ driftDisplay }}</span>
        </div>
      </div>

      <div class="inspector-section">
        <h4>Rode & Range Settings</h4>
        <div class="inspector-row">
          <span class="inspector-label">Rode Amount:</span>
          <span class="inspector-value">{{ anchorState?.rode?.amount || 'N/A' }} {{ anchorState?.rode?.units || '' }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Critical Range:</span>
          <span class="inspector-value">{{ anchorState?.criticalRange?.r || 'N/A' }} {{ anchorState?.criticalRange?.units || '' }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">AIS Alert Range:</span>
          <span class="inspector-value">{{ anchorState?.warningRange?.r || 'N/A' }} {{ anchorState?.warningRange?.units || '' }}</span>
        </div>
      </div>

      <div class="inspector-section">
        <h4>Current Boat Position</h4>
        <div class="inspector-row">
          <span class="inspector-label">Latitude:</span>
          <span class="inspector-value">{{ navigationState?.position?.latitude?.value || 'N/A' }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Longitude:</span>
          <span class="inspector-value">{{ navigationState?.position?.longitude?.value || 'N/A' }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Depth Below Transducer:</span>
          <span class="inspector-value">
            {{ navigationState?.depth?.belowTransducer?.value || 'N/A' }} 
            {{ navigationState?.depth?.belowTransducer?.units || '' }}
          </span>
        </div>
      </div>

      <div class="inspector-section">
        <h4>Dragging Analysis</h4>
        <div class="inspector-row">
          <span class="inspector-label">Preconditions Met:</span>
          <span class="inspector-value">{{ 
            (anchorState?.anchorDeployed && navigationState?.position?.latitude?.value && navigationState?.position?.longitude?.value) 
              ? 'YES' : 'NO' 
          }}</span>
        </div>
        
        <!-- Debug positions -->
        <div class="inspector-row">
          <span class="inspector-label">Boat Position:</span>
          <span class="inspector-value" style="font-size: 0.8em;">
            {{ navigationState?.position?.latitude?.value?.toFixed(6) || 'N/A' }}, {{ navigationState?.position?.longitude?.value?.toFixed(6) || 'N/A' }}
          </span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Drop Position:</span>
          <span class="inspector-value" style="font-size: 0.8em;">
            {{ anchorState?.anchorDropLocation?.position?.latitude?.value?.toFixed(6) || 'N/A' }}, {{ anchorState?.anchorDropLocation?.position?.longitude?.value?.toFixed(6) || 'N/A' }}
          </span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Anchor Position:</span>
          <span class="inspector-value" style="font-size: 0.8em;">
            {{ anchorState?.anchorLocation?.position?.latitude?.value?.toFixed(6) || 'N/A' }}, {{ anchorState?.anchorLocation?.position?.longitude?.value?.toFixed(6) || 'N/A' }}
          </span>
        </div>
        
        <!-- Distances (meters) -->
        <div class="inspector-row">
          <span class="inspector-label">Distance Boat→Drop:</span>
          <span class="inspector-value">{{ calculateDistanceBoatFromDrop() }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Distance Anchor→Drop:</span>
          <span class="inspector-value">{{ calculateDistanceAnchorFromDrop() }}</span>
        </div>
        
        <!-- Rode calculations -->
        <div class="inspector-row">
          <span class="inspector-label">Rode Length:</span>
          <span class="inspector-value">{{ calculateRodeLengthMeters() }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Drop Depth:</span>
          <span class="inspector-value">{{ calculateDropDepthMeters() }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Effective Rode Radius:</span>
          <span class="inspector-value">{{ calculateEffectiveRodeRadiusMeters() }}</span>
        </div>
        
        <!-- Threshold checks -->
        <div class="inspector-row">
          <span class="inspector-label">Anchor Moved (>{{ isMetric ? '5m' : '16.4ft' }}):</span>
          <span class="inspector-value">{{ calculateAnchorHasMoved() ? 'YES' : 'NO' }}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Rode Circle Violated:</span>
          <span class="inspector-value">{{ calculateRodeCircleViolated() ? 'YES' : 'NO' }}</span>
        </div>
        
        <!-- Final results -->
        <div class="inspector-row">
          <span class="inspector-label">Is Dragging (Final):</span>
          <span class="inspector-value" :style="{ color: anchorState?.dragging ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' }">
            {{ anchorState?.dragging ? 'YES' : 'NO' }}
          </span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Rode Circle Violation:</span>
          <span class="inspector-value">{{ anchorState?.rodeCircleViolation ? 'YES' : 'NO' }}</span>
        </div>
      </div>

      <div class="inspector-section">
        <h4>Anchor Actions</h4>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button 
            @click="$emit('reset-anchor')" 
            class="reset-anchor-btn"
            style="flex: 1; padding: 8px 16px; background: var(--ion-color-warning); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
          >
            Reset Anchor Here
          </button>
        </div>
        <div style="font-size: 12px; color: var(--app-muted-text-color, #64748b); margin-top: 8px;">
          Use this when the anchor has dragged and you want to reset the anchorage to the current position.
        </div>
      </div>

      <div class="inspector-section">
        <h4>Full Anchor State (JSON)</h4>
        <pre class="json-display">{{ 
          anchorState 
            ? JSON.stringify(anchorState, null, 2) 
            : 'No anchor state data available' 
        }}</pre>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup>
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent } from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  anchorState: { type: Object, required: true },
  navigationState: { type: Object, required: true },
  anchorStatusText: { type: String, required: true },
  driftDisplay: { type: String, required: true },
  isMetric: { type: Boolean, required: true },
  calculateDistanceBoatFromDrop: { type: Function, required: true },
  calculateDistanceAnchorFromDrop: { type: Function, required: true },
  calculateRodeLengthMeters: { type: Function, required: true },
  calculateDropDepthMeters: { type: Function, required: true },
  calculateEffectiveRodeRadiusMeters: { type: Function, required: true },
  calculateAnchorHasMoved: { type: Function, required: true },
  calculateRodeCircleViolated: { type: Function, required: true }
});

// Debug: Log props when they change
console.log('[AnchorInspectorModal] Props received:', {
  anchorState: props.anchorState,
  navigationState: props.navigationState,
  anchorStatusText: props.anchorStatusText,
  driftDisplay: props.driftDisplay,
  isMetric: props.isMetric
});

const emit = defineEmits(['update:isOpen', 'reset-anchor']);

const close = () => {
  emit('update:isOpen', false);
};
</script>

<style scoped>
.anchor-inspector-content {
  --background: var(--app-background-color);
}
.inspector-section {
  background: var(--app-surface-color);
  border-radius: 8px;
  padding: 16px;
  margin: 16px;
  box-shadow: 0 2px 4px color-mix(in srgb, var(--app-text-color) 8%, transparent);
  border: 1px solid var(--app-border-color);
}
.inspector-section h4 {
  margin-top: 0;
  margin-bottom: 12px;
  color: var(--app-text-color);
  font-size: 1.1em;
  border-bottom: 1px solid var(--app-border-color);
  padding-bottom: 8px;
}
.inspector-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.95em;
}
.inspector-label {
  color: var(--app-muted-text-color);
  font-weight: 500;
}
.inspector-value {
  color: var(--app-text-color);
  font-weight: 600;
  text-align: right;
  max-width: 60%;
  word-break: break-all;
}
.json-display {
  background: color-mix(in srgb, var(--app-surface-color) 50%, var(--app-background-color) 50%);
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85em;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--app-text-color);
  border: 1px solid var(--app-border-color);
  max-height: 300px;
  overflow-y: auto;
}
.reset-anchor-btn {
  --background: var(--app-accent-color);
  --color: var(--app-accent-contrast-color);
  background: var(--app-accent-color);
  color: var(--app-accent-contrast-color);
  border: 1px solid var(--app-accent-color);
}
.reset-anchor-btn:hover {
  background: color-mix(in srgb, var(--app-accent-color) 85%, var(--app-text-color) 15%);
}
</style>