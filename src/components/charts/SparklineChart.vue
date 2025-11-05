<template>
  <svg
    v-if="normalizedPoints.length > 1"
    :viewBox="`0 0 ${width} ${height}`"
    class="sparkline"
    preserveAspectRatio="none"
  >
    <polyline
      :points="polylinePoints"
      fill="none"
      :stroke="strokeColor"
      :stroke-width="strokeWidth"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
    <defs>
      <linearGradient :id="gradientKey" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="strokeColor" stop-opacity="0.4" />
        <stop offset="100%" :stop-color="strokeColor" stop-opacity="0" />
      </linearGradient>
    </defs>
    <polygon
      :points="gradientPoints"
      :fill="`url(#${gradientKey})`"
      fill-opacity="0.4"
    />
  </svg>
  <div v-else class="sparkline sparkline--empty"></div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  width: {
    type: Number,
    default: 100,
  },
  height: {
    type: Number,
    default: 36,
  },
  strokeColor: {
    type: String,
    default: "#38bdf8",
  },
  strokeWidth: {
    type: Number,
    default: 2,
  },
  gradientId: {
    type: String,
    default: "",
  },
});

const normalizedPoints = computed(() => {
  const series = props.data.filter((value) => typeof value === "number");
  if (series.length < 2) {
    return [];
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  return series.map((value, index) => {
    const x = (index / (series.length - 1)) * props.width;
    const y = props.height - ((value - min) / range) * props.height;
    return { x, y };
  });
});

const gradientKey = computed(() =>
  props.gradientId || `sparkline-gradient-${normalizedPoints.value.length}`
);

const polylinePoints = computed(() =>
  normalizedPoints.value.map(({ x, y }) => `${x},${y}`).join(" ")
);

const gradientPoints = computed(() => {
  if (!normalizedPoints.value.length) {
    return "";
  }

  const baseline = `${props.width},${props.height} 0,${props.height}`;
  return `${polylinePoints.value} ${baseline}`;
});
</script>

<style scoped>
.sparkline {
  width: 100%;
  height: 100%;
  display: block;
  opacity: 0.9;
}

.sparkline--empty {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 4px;
}
</style>
