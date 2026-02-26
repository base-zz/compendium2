<template>
  <div class="map-footer-toolbar">
    <button @click="$emit('recenter-map')" class="toolbar-button" data-label="Recenter">
      <ion-icon :icon="navigate" size="small" />
    </button>

    <button
      @click="$emit('toggle-measure-mode')"
      class="toolbar-button measure-toggle"
      :class="{ 'measure-toggle-active': measureModeEnabled }"
      :data-label="measureModeEnabled ? 'Measure (On)' : 'Measure (Off)'"
    >
      <ion-icon :icon="resizeOutline" size="small" aria-hidden="true" />
    </button>

    <div class="toolbar-zoom-group" aria-label="Zoom Controls">
      <button @click="$emit('zoom-in')" class="toolbar-button toolbar-zoom-in" data-label="Zoom In">
        <ion-icon :icon="addOutline" size="small" />
      </button>
      <button @click="$emit('zoom-out')" class="toolbar-button toolbar-zoom-out" data-label="Zoom Out">
        <ion-icon :icon="removeOutline" size="small" />
      </button>
    </div>

    <button
      @click="$emit('toggle-fence-mode')"
      class="toolbar-button toolbar-fence"
      :class="{ 'measure-toggle-active': fenceModeEnabled }"
      :data-label="fenceModeEnabled ? 'Fence (On)' : 'Fence (Off)'"
    >
      <ion-icon :icon="shieldOutline" size="small" />
    </button>

    <button
      @click="$emit('show-tides')"
      class="toolbar-button toolbar-tide"
      data-label="Tides"
    >
      <i class="fas fa-water toolbar-fa-icon"></i>
    </button>

    <div class="toolbar-divider"></div>

    <button
      @click="$emit('set-anchor')"
      class="toolbar-button toolbar-anchor-set"
      data-label="Set Anchor"
    >
      <img
        src="/img/anchor2.svg"
        alt="Set Anchor"
        class="toolbar-icon"
      />
    </button>

    <button
      @click="$emit('cancel-anchor')"
      class="toolbar-button toolbar-anchor-cancel"
      :disabled="!anchorDeployed"
      data-label="Cancel Anchor"
    >
      <ion-icon :icon="chevronUpOutline" size="small" />
    </button>
  </div>
</template>

<script setup>
import { IonIcon } from '@ionic/vue';
import { navigate, resizeOutline, addOutline, removeOutline, shieldOutline, chevronUpOutline } from 'ionicons/icons';

defineProps({
  measureModeEnabled: { type: Boolean, default: false },
  fenceModeEnabled: { type: Boolean, default: false },
  anchorDeployed: { type: Boolean, default: false }
});

defineEmits([
  'recenter-map', 
  'toggle-measure-mode', 
  'zoom-in', 
  'zoom-out', 
  'toggle-fence-mode', 
  'show-tides', 
  'set-anchor', 
  'cancel-anchor'
]);
</script>

<style scoped>
/* Toolbar container styles */
.map-footer-toolbar {
  position: absolute;
  bottom: 20px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10;
  pointer-events: none; /* Let clicks pass through empty space */
}

/* Base button styles */
.toolbar-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--ion-color-step-100, #ffffff);
  border: 1px solid var(--ion-color-step-200, #e0e0e0);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto; /* Re-enable clicks on buttons */
  position: relative;
  transition: all 0.2s ease;
  color: var(--ion-color-primary, #3880ff);
}

.dark-mode .toolbar-button {
  background-color: var(--ion-color-step-100, #2a2a2a);
  border-color: var(--ion-color-step-200, #333333);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.toolbar-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.toolbar-button:active:not(:disabled) {
  transform: translateY(0);
  background-color: var(--ion-color-step-150, #f0f0f0);
}

.dark-mode .toolbar-button:active:not(:disabled) {
  background-color: var(--ion-color-step-150, #333333);
}

.toolbar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Active states (e.g. for measure tool) */
.measure-toggle-active {
  background-color: var(--ion-color-primary, #3880ff);
  color: white;
}
.dark-mode .measure-toggle-active {
  background-color: var(--ion-color-primary, #3880ff);
  color: white;
}

/* Custom icons (Anchor, Tides) */
.toolbar-icon {
  width: 24px;
  height: 24px;
}

.toolbar-fa-icon {
  font-size: 20px;
}

/* Anchor specific colors */
.toolbar-anchor-set {
  background-color: var(--ion-color-secondary, #3dc2ff);
  border-color: var(--ion-color-secondary, #3dc2ff);
  color: white;
}

.toolbar-anchor-cancel {
  background-color: var(--ion-color-danger, #eb445a);
  border-color: var(--ion-color-danger, #eb445a);
  color: white;
}

/* Tooltips */
.toolbar-button::after {
  content: attr(data-label);
  position: absolute;
  right: 100%;
  margin-right: 12px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  pointer-events: none;
}

.toolbar-button:hover::after {
  opacity: 1;
  visibility: visible;
}

/* Zoom group styles */
.toolbar-zoom-group {
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  background-color: var(--ion-color-step-100, #ffffff);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
}

.dark-mode .toolbar-zoom-group {
  background-color: var(--ion-color-step-100, #2a2a2a);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.toolbar-zoom-group .toolbar-button {
  box-shadow: none;
  border: none;
}

.toolbar-zoom-group .toolbar-zoom-in {
  border-bottom: 1px solid var(--ion-color-step-200, #e0e0e0);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.dark-mode .toolbar-zoom-group .toolbar-zoom-in {
  border-bottom-color: var(--ion-color-step-200, #333333);
}

.toolbar-zoom-group .toolbar-zoom-out {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

/* Divider */
.toolbar-divider {
  height: 32px;
  width: 2px;
  background-color: var(--ion-color-step-300, #cccccc);
  margin: 4px auto;
}

.dark-mode .toolbar-divider {
  background-color: var(--ion-color-step-300, #444444);
}

/* Hide zoom buttons on touch devices (phones/tablets) - pinch-to-zoom is available */
@media (hover: none) and (pointer: coarse) {
  .toolbar-zoom-group {
    display: none;
  }
}
</style>