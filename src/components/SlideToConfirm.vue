<template>
  <div class="slide-confirm" :style="{ width: width }">
    <div class="slide-track" :class="{ confirmed }" ref="trackRef">
      <div
        class="slide-handle"
        :style="{ left: handleLeft + 'px' }"
        ref="handleRef"
        @mousedown.stop.prevent="start"
        @touchstart.stop.prevent="start"
      >
        <span class="icon"><slot name="icon">⛔</slot></span>
      </div>
      <span class="slide-label" v-if="!confirmed"><slot>{{ label }}</slot></span>
      <span class="slide-label confirmed" v-else>Confirmed!</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
const props = defineProps({
  label: { type: String, default: 'Slide to Confirm' },
  width: { type: String, default: '170px' }
});
const emit = defineEmits(['confirm']);

const dragging = ref(false);
const startX = ref(0);
const handleLeft = ref(0);
const confirmed = ref(false);

const trackRef = ref(null);
const handleRef = ref(null);
const maxSlide = ref(140); // px

function updateMaxSlide() {
  nextTick(() => {
    if (trackRef.value && handleRef.value) {
      const trackWidth = trackRef.value.getBoundingClientRect().width;
      const handleWidth = handleRef.value.getBoundingClientRect().width;
      maxSlide.value = trackWidth - handleWidth - 2; // 2px for margin
    }
  });
}

onMounted(() => {
  updateMaxSlide();
});

watch(() => props.width, () => {
  updateMaxSlide();
});

function start(e) {
  dragging.value = true;
  startX.value = e.touches ? e.touches[0].clientX : e.clientX;
  document.addEventListener('mousemove', move);
  document.addEventListener('touchmove', move);
  document.addEventListener('mouseup', end);
  document.addEventListener('touchend', end);
}
function move(e) {
  if (!dragging.value) return;
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  let delta = x - startX.value;
  if (delta < 0) delta = 0;
  if (delta > maxSlide.value) delta = maxSlide.value;
  handleLeft.value = delta;
}
function end() {
  if (!dragging.value) return;
  if (handleLeft.value >= maxSlide) {
    confirmed.value = true;
    emit('confirm');
    setTimeout(() => {
      confirmed.value = false;
    }, 1200);
  }
  handleLeft.value = 0;
  dragging.value = false;
  document.removeEventListener('mousemove', move);
  document.removeEventListener('touchmove', move);
  document.removeEventListener('mouseup', end);
  document.removeEventListener('touchend', end);
}
</script>

<style scoped>
.slide-confirm {
  margin: 0 auto;
  user-select: none;
}
.slide-track {
  background: #eee;
  border-radius: 18px;
  border: 1.5px solid #bbb;
  position: relative;
  height: 36px;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  transition: background 0.2s;
}
.slide-track.confirmed {
  background: #e53935;
}
.slide-handle {
  position: absolute;
  top: 2px;
  left: 0;
  width: 32px;
  height: 32px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0,0,0,0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  transition: background 0.2s;
  font-size: 1.3em;
}
.slide-label {
  width: 100%;
  text-align: center;
  color: #e53935;
  font-weight: 600;
  font-size: 1em;
  z-index: 1;
  pointer-events: none;
}
.slide-label.confirmed {
  color: #fff;
}
</style>
