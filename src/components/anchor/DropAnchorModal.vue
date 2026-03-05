<template>
  <IonModal :is-open="isOpen" @didDismiss="close" css-class="drop-anchor-modal-root">
    <IonContent class="drop-anchor-modal-content">
      <div class="modal-body">
        <h3>Drop Anchor Here</h3>
        <p class="subtitle">Review current values before confirming anchor drop.</p>

        <div class="row">
          <span class="label">Location</span>
          <span class="value">{{ locationText }}</span>
        </div>
        <div class="row">
          <span class="label">Depth</span>
          <span class="value">{{ depthText }}</span>
        </div>
        <div class="row">
          <span class="label">Rode</span>
          <span class="value">{{ rodeText }}</span>
        </div>
        <div class="row">
          <span class="label">Anchor Range</span>
          <span class="value">{{ criticalRangeText }}</span>
        </div>
        <div class="row">
          <span class="label">AIS Alert Range</span>
          <span class="value">{{ warningRangeText }}</span>
        </div>

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
            <div class="recommendation-row">
              <span>Bow Roller Height:</span>
              <span>
                {{
                  typeof recommendedScope.bowRollerToWater === "number" && !Number.isNaN(recommendedScope.bowRollerToWater)
                    ? `${recommendedScope.bowRollerToWater.toFixed(1)} ${recommendedScope.unit}`
                    : "N/A"
                }}
              </span>
            </div>
            <div class="recommendation-row highlight">
              <span>Max Depth (Projected):</span>
              <span>{{ recommendedScope.maxDepth.toFixed(1) }} {{ recommendedScope.unit }}</span>
            </div>
            <div class="recommendation-row" :class="lowTideClearanceClass">
              <span>Low Tide Clearance:</span>
              <span>{{ lowTideClearanceText }}</span>
            </div>

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
        </div>
      </div>
    </IonContent>

    <IonFooter>
      <IonToolbar>
        <div class="actions">
          <IonButton color="primary" @click="confirmDrop">Drop Anchor Here</IonButton>
          <IonButton fill="outline" @click="close">Cancel</IonButton>
        </div>
      </IonToolbar>
    </IonFooter>
  </IonModal>
</template>

<script setup>
import { computed } from "vue";
import { IonModal, IonContent, IonFooter, IonToolbar, IonButton } from "@ionic/vue";

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  preview: { type: Object, required: true },
  recommendedScope: { type: Object, required: false },
  lowTideClearance: { type: Object, required: false },
});

const emit = defineEmits(["update:isOpen", "confirm"]);

const close = () => emit("update:isOpen", false);

const confirmDrop = () => {
  emit("confirm");
};

const formatValue = (value, units) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }
  if (typeof units === "string" && units.length > 0) {
    return `${value.toFixed(1)} ${units}`;
  }
  return value.toFixed(1);
};

const locationText = computed(() => {
  const latitude = props.preview?.latitude;
  const longitude = props.preview?.longitude;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return "N/A";
  }
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return "N/A";
  }
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
});

const depthText = computed(() => formatValue(props.preview?.depth, props.preview?.units));
const rodeText = computed(() => formatValue(props.preview?.rode, props.preview?.units));
const criticalRangeText = computed(() => formatValue(props.preview?.criticalRange, props.preview?.units));
const warningRangeText = computed(() => formatValue(props.preview?.warningRange, props.preview?.units));
const recommendedScope = computed(() => {
  if (props.recommendedScope && typeof props.recommendedScope === "object") {
    return props.recommendedScope;
  }
  return null;
});

const lowTideClearance = computed(() => {
  if (props.lowTideClearance && typeof props.lowTideClearance === "object") {
    return props.lowTideClearance;
  }
  return null;
});

const lowTideClearanceText = computed(() => {
  if (typeof lowTideClearance.value?.text === "string") {
    return lowTideClearance.value.text;
  }
  return "N/A";
});

const lowTideClearanceClass = computed(() => {
  const status = lowTideClearance.value?.status;
  if (status === "safe") return "clearance-safe";
  if (status === "warning") return "clearance-warning";
  if (status === "danger") return "clearance-danger";
  return "clearance-unknown";
});
</script>

<style scoped>
.modal-body {
  padding: 16px;
}

.subtitle {
  margin-top: 6px;
  margin-bottom: 14px;
  color: var(--app-muted-text-color);
  font-size: 0.92rem;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--app-border-color);
}

.label {
  font-weight: 600;
}

.value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 10px;
}

.scope-recommendation {
  background: var(--ion-color-step-150, #333333);
  border-radius: 8px;
  padding: 12px;
  margin-top: 14px;
  border: 1px solid var(--ion-color-step-300, #555555);
}

.recommendation-header {
  font-weight: bold;
  color: #ffffff;
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

.recommendation-row.clearance-safe {
  color: #22c55e;
  font-weight: 700;
}

.recommendation-row.clearance-warning {
  color: #f59e0b;
  font-weight: 700;
}

.recommendation-row.clearance-danger {
  color: #ef4444;
  font-weight: 700;
}

.recommendation-row.clearance-unknown {
  color: var(--ion-color-step-500, #aaaaaa);
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
  color: #facc15;
  font-weight: bold;
  font-size: 1.05em;
  background: rgba(250, 204, 21, 0.14);
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
