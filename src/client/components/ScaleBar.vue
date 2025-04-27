<!-- components/ScaleBar.vue -->
<template>
  <div class="scale-bar-container">
    <div class="scale-bar" :style="{ width: barWidth + 'px' }">
      <div class="scale-bar-line"></div>
      <div class="scale-bar-label">{{ formattedDistance }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { calculatePixelDistance, formatDistance } from "@/utils/mapUtils";

const props = defineProps({
  map: Object,
  targetLength: {
    // Target ground length to represent
    type: Number,
    default: 100, // meters
  },
  unit: {
    type: String,
    default: "m",
  },
});

const barWidth = ref(100);
const formattedDistance = ref("");

function updateScaleBar() {
  if (!props.map) return;

  // Calculate how many pixels represent our target length
  const groundDistance =
    props.unit === "ft"
      ? props.targetLength * 0.3048 // Convert feet to meters
      : props.targetLength;

  const pixelDistance = groundDistance / (props.map.getView().getResolution() || 1);

  // Limit bar width between 50-200px for good visibility
  barWidth.value = Math.min(200, Math.max(50, pixelDistance));
  formattedDistance.value = formatDistance(props.targetLength, props.unit);
}

// Update when map view changes
watch(() => props.map?.getView()?.getResolution(), updateScaleBar);
onMounted(updateScaleBar);
</script>

<style scoped>
.scale-bar-container {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
}
.scale-bar {
  position: relative;
  height: 4px;
  background: rgba(0, 0, 0, 0.5);
}
.scale-bar-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: white;
}
.scale-bar-label {
  color: white;
  text-shadow: 1px 1px 1px black;
  font-size: 12px;
  text-align: center;
  margin-top: 4px;
}
</style>
