<template>
  <div class="value-display">
    <div class="label">{{ label }}</div>
    <div class="value-container">
      <UnitValue
        v-if="!formattedValue"
        :value="value"
        :unit="unit"
        :decimals="decimals"
        :highlight="highlight"
      />
      <div v-else class="unit-value" :class="{ highlight: highlight }">
        {{ formattedValue }}
      </div>
    </div>
  </div>
</template>

<script setup>
import UnitValue from "@/components/UnitValue.vue";

// Props definition
defineProps({
  value: {
    type: [Number, String],
    required: false,
  },
  unit: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  decimals: {
    default: null,
  },
  highlight: {
    type: Boolean,
    default: false,
  },
  formattedValue: {
    type: String,
    default: null,
  },
});
</script>

<style scoped>
.value-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.label {
  position: absolute;
  top: 12px;
  font-size: 0.9em;
  font-weight: bold;
  color: white;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 5px;
}

.value-container {
  font-size: 1.8rem;
  font-weight: bolder;
  color: var(--ion-color-primary-contrast);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  padding-top: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Media queries to match AnchorView styles */
@media (max-width: 767px) {
  .label {
    font-size: 0.7em;
  }
}

@media (max-width: 480px) {
  .label {
    font-size: 0.6em;
    top: 8px;
  }
}
</style>
