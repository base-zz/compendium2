<template>
  <IonModal
    :is-open="isOpen"
    @didDismiss="close"
    css-class="set-anchor-modal-root"
  >
    <ion-content class="set-anchor-modal">
      <div class="modal-body">
        <h3>{{ isDeployed ? "Edit Anchor Parameters" : "Set Anchor" }}</h3>
        
        <div class="slider-label">
          <strong>Rode:</strong>
          <span class="slider-value">{{ rodeAmount }} {{ isMetric ? "m" : "ft" }}</span>
        </div>
        <ion-range
          v-model="rodeAmount"
          :min="0"
          :max="rodeRangeMax"
          :step="isMetric ? 1 : 5"
          ticks="true"
          color="secondary"
          class="modal-range modal-range-center"
          style="margin-bottom: 18px; width: 80%"
        />

        <div class="slider-label">
          <strong>Anchor Range:</strong>
          <span class="slider-value">{{ criticalRange }} {{ isMetric ? "m" : "ft" }}</span>
        </div>
        <ion-range
          v-if="hasCriticalRange"
          v-model="criticalRange"
          :min="0"
          :max="criticalRangeMax"
          :step="isMetric ? 1 : 5"
          ticks="true"
          color="danger"
          class="modal-range modal-range-center"
          style="margin-bottom: 18px; width: 80%"
        />
        <div v-else class="text-danger">Critical range not initialized</div>

        <div class="slider-label">
          <strong>AIS Alert Range:</strong>
          <span class="slider-value">{{ warningRange }} {{ isMetric ? "m" : "ft" }}</span>
        </div>
        <ion-range
          v-if="hasWarningRange"
          v-model="warningRange"
          :min="0"
          :max="warningRangeMax"
          :step="isMetric ? 1 : 5"
          ticks="true"
          color="warning"
          class="modal-range modal-range-center"
          style="margin-bottom: 18px; width: 80%"
        />

        <div class="slider-label" style="margin-top: 10px;">
          <strong>Depth at Anchor:</strong>
          <span class="slider-value">{{ customAnchorDropDepthLabel }}</span>
        </div>
        <ion-range
          v-if="customAnchorDropDepthValue != null"
          :value="customAnchorDropDepthValue"
          @ionChange="handleCustomAnchorDropDepthValueChange"
          :min="0"
          :max="anchorDropDepthMax"
          :step="1"
          ticks="true"
          color="primary"
          class="modal-range modal-range-center"
          style="margin-bottom: 18px; width: 80%"
        />
        <div v-else class="text-danger" style="margin-bottom: 18px;">Depth unavailable</div>

        <div class="fence-visibility-setting">
          <label for="fence-connector-toggle">Show fence connector lines</label>
          <input
            id="fence-connector-toggle"
            type="checkbox"
            :checked="fenceConnectorLinesVisible"
            @change="handleFenceConnectorLinesVisibilityChange"
          />
        </div>

        <template v-if="!isDeployed">
          <div class="slider-label">
            <strong>Bearing:</strong>
            <span class="slider-value">{{ bearing }}°</span>
          </div>
          <div class="slider-label" style="margin-top: 6px; text-transform: none; letter-spacing: normal;">
            <span>Phone:</span>
            <span class="slider-value" style="font-size: 1.1em;">
              {{ deviceHeadingDegrees == null ? "--" : `${deviceHeadingDegrees}°` }}
            </span>
          </div>
          <IonButton
            color="secondary"
            size="small"
            style="margin: 6px auto 10px;"
            :disabled="hasTriedPhoneBearing && deviceHeadingDegrees == null"
            @click="$emit('apply-phone-bearing')"
          >
            {{ hasTriedPhoneBearing && deviceHeadingDegrees == null ? 'Phone direction unavailable' : 'Use phone direction' }}
          </IonButton>
          <ion-range
            v-model="bearing"
            :min="0"
            :max="360"
            :step="1"
            ticks="true"
            color="primary"
            class="modal-range modal-range-center"
            style="margin-bottom: 18px; width: 80%"
          />
        </template>

        <!-- Scope Recommendation -->
        <div v-if="recommendedScope" class="scope-recommendation">
          <div class="recommendation-header">
            <span>Chain Calculator</span>
          </div>
          <div v-if="recommendedScope.missingBowRollerToWater" class="suggestion-note">
            Set Bow Roller to Water in Boat Info to enable accurate scope recommendations.
          </div>
          <div v-else class="recommendation-details">
            <div class="recommendation-row">
              <span>Current Depth:</span>
              <span>{{ recommendedScope.currentDepth.toFixed(1) }} {{ recommendedScope.unit }}</span>
            </div>
            <div class="recommendation-row">
              <span>Max Tide Rise (72h):</span>
              <span>+{{ recommendedScope.depthIncrease.toFixed(1) }} {{ recommendedScope.unit }}</span>
            </div>
            <div class="recommendation-row highlight">
              <span>Max Depth (Projected):</span>
              <span>{{ recommendedScope.maxDepth.toFixed(1) }} {{ recommendedScope.unit }}</span>
            </div>

            <!-- Scope Ratios -->
            <div class="scope-ratio">
              <div class="ratio-row">
                <span class="ratio-label">3:1 Scope</span>
                <span class="ratio-value">{{ Math.round(recommendedScope.scopeLength3to1) }} {{ recommendedScope.unit }}</span>
              </div>
              <div class="ratio-row active">
                <span class="ratio-label">5:1 Scope (Recommended)</span>
                <span class="ratio-value">{{ Math.round(recommendedScope.scopeLength5to1) }} {{ recommendedScope.unit }}</span>
              </div>
              <div class="ratio-row">
                <span class="ratio-label">7:1 Scope (Storm)</span>
                <span class="ratio-value">{{ Math.round(recommendedScope.scopeLength7to1) }} {{ recommendedScope.unit }}</span>
              </div>
            </div>
          </div>
          <div v-if="!recommendedScope.missingBowRollerToWater" class="suggestion-note">
            Based on projected max depth of {{ recommendedScope.maxDepth.toFixed(1) }}{{ recommendedScope.unit }} 
            (current depth {{ recommendedScope.currentDepth.toFixed(1) }}{{ recommendedScope.unit }} + 
            {{ recommendedScope.depthIncrease.toFixed(1) }}{{ recommendedScope.unit }} tide rise + 
            {{ recommendedScope.bowRollerToWater.toFixed(1) }}{{ recommendedScope.unit }} bow roller)
          </div>
        </div>
      </div>
    </ion-content>
    
    <ion-footer class="set-anchor-footer">
      <ion-toolbar class="set-anchor-toolbar">
        <div class="modal-actions">
          <IonButton
            color="primary"
            @click="$emit('save')"
          >
            {{ isDeployed ? "Save Changes" : "Set Anchor" }}
          </IonButton>
          <IonButton @click="close">Cancel</IonButton>
        </div>
      </ion-toolbar>
    </ion-footer>
  </IonModal>
</template>

<script setup>
import { computed } from 'vue';
import { IonModal, IonContent, IonRange, IonButton, IonFooter, IonToolbar } from '@ionic/vue';

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  anchorState: { type: Object, required: true },
  isMetric: { type: Boolean, required: true },
  rodeRangeMax: { type: Number, required: true },
  criticalRangeMax: { type: Number, required: true },
  warningRangeMax: { type: Number, required: true },
  anchorDropDepthMax: { type: Number, required: true },
  customAnchorDropDepthLabel: { type: String, required: true },
  customAnchorDropDepthValue: { type: Number, default: null },
  fenceConnectorLinesVisible: { type: Boolean, required: true },
  deviceHeadingDegrees: { type: Number, default: null },
  hasTriedPhoneBearing: { type: Boolean, required: true },
  recommendedScope: { type: Object, default: null },
});

const emit = defineEmits([
  'update:isOpen', 
  'save', 
  'update:customAnchorDropDepthValue',
  'update:fenceConnectorLinesVisible',
  'apply-phone-bearing'
]);

const close = () => emit('update:isOpen', false);

const isDeployed = computed(() => props.anchorState?.anchorDeployed);

const rodeAmount = computed({
  get: () => props.anchorState.rode.amount,
  set: (val) => { props.anchorState.rode.amount = val; }
});

const hasCriticalRange = computed(() => props.anchorState.criticalRange);
const criticalRange = computed({
  get: () => props.anchorState.criticalRange?.r || 0,
  set: (val) => { if (props.anchorState.criticalRange) props.anchorState.criticalRange.r = val; }
});

const hasWarningRange = computed(() => props.anchorState.warningRange);
const warningRange = computed({
  get: () => props.anchorState.warningRange?.r || 0,
  set: (val) => { if (props.anchorState.warningRange) props.anchorState.warningRange.r = val; }
});

const bearing = computed({
  get: () => props.anchorState.anchorDropLocation.bearing?.degrees || 0,
  set: (val) => { if (props.anchorState.anchorDropLocation.bearing) props.anchorState.anchorDropLocation.bearing.degrees = val; }
});

const handleCustomAnchorDropDepthValueChange = (e) => {
  emit('update:customAnchorDropDepthValue', e.detail.value);
};

const handleFenceConnectorLinesVisibilityChange = (e) => {
  emit('update:fenceConnectorLinesVisible', e.target.checked);
};
</script>

<style scoped>
.modal-body {
  padding: 16px;
  background: var(--ion-color-step-50, #1e1e1e);
  color: #fff;
}
.modal-body h3 {
  margin-top: 0;
  text-align: center;
  color: var(--ion-color-primary, #3880ff);
}
.slider-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  font-size: 1.1em;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.slider-value {
  font-weight: bold;
  color: var(--ion-color-secondary, #3dc2ff);
  font-size: 1.2em;
}
.modal-range {
  padding: 0;
}
.modal-range-center {
  margin: 0 auto;
}
.text-danger {
  color: var(--ion-color-danger, #eb445a);
}
.fence-visibility-setting {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.set-anchor-footer {
  background: var(--ion-color-step-100, #2a2a2a);
}
.set-anchor-toolbar {
  --background: transparent;
}
.modal-actions {
  display: flex;
  justify-content: space-around;
  padding: 10px;
}

/* Scope Recommendation Styles */
.scope-recommendation {
  background: var(--ion-color-step-150, #333333);
  border-radius: 8px;
  padding: 12px;
  margin-top: 20px;
  border: 1px solid var(--ion-color-step-300, #555555);
}
.recommendation-header {
  font-weight: bold;
  color: var(--ion-color-primary, #3880ff);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.recommendation-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.recommendation-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9em;
  color: var(--ion-color-step-600, #cccccc);
}
.recommendation-row.highlight {
  color: white;
  font-weight: bold;
  margin-bottom: 8px;
}
.scope-ratio {
  margin-top: 8px;
  border-top: 1px solid var(--ion-color-step-300, #555555);
  padding-top: 8px;
}
.ratio-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9em;
  padding: 4px 0;
  color: var(--ion-color-step-600, #cccccc);
}
.ratio-row.active {
  color: var(--ion-color-secondary, #3dc2ff);
  font-weight: bold;
  font-size: 1.05em;
  background: rgba(61, 194, 255, 0.1);
  padding: 6px 8px;
  border-radius: 4px;
  margin: 4px -8px;
}
.suggestion-note {
  font-size: 0.8em;
  color: var(--ion-color-step-500, #aaaaaa);
  text-align: center;
  margin-top: 12px;
  font-style: italic;
  line-height: 1.3;
}
</style>
