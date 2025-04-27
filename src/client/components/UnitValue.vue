<template>
  <div class="unit-value" :class="{ highlight: highlight }">
    {{ formattedValue }}
  </div>
</template>

<script setup>
import { computed } from "vue";
import preferencesStore from "@/stores/preferences";

// Props definition
const props = defineProps({
  value: {
    type: [Number, String],
    required: true,
  },
  unit: {
    type: String,
    required: true,
    validator: (value) =>
      [
        "depth",
        "speed",
        "temperature",
        "distance",
        "angle",
        "pressure",
        "volume",
        "power",
        "length",
        "ratio",
      ].includes(value),
  },
  decimals: {
    default: null, // Use the default from preferences if not specified
  },
  highlight: {
    type: Boolean,
    default: false,
  },
});

// Computed property to format the value with the appropriate unit
const formattedValue = computed(() => {
  if (props.value === undefined || props.value === null) {
    return "--";
  }

  // If the value is already a string that might include units, just return it
  if (typeof props.value === "string" && props.value.includes(" ")) {
    return props.value;
  }

  // Otherwise, format the value using the preferences store
  return preferencesStore.formatValue(
    typeof props.value === "string" ? parseFloat(props.value) : props.value,
    props.unit,
    props.decimals
  );
});
</script>

<style scoped>
.unit-value {
  font-family: var(--ion-font-family, inherit);
  white-space: nowrap;
  font-weight: bold;
  display: inline-block;
  text-align: center;
  margin: 0;
  padding: 0;
}

.highlight {
  color: var(--ion-color-danger);
}
</style>
