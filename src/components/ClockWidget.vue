<template>
  <div class="clock-widget-container" ref="containerRef">
    <svg
      class="clock-widget"
      viewBox="0 0 300 300"
      preserveAspectRatio="xMidYMid meet"
      ref="svgRef"
    >
      <text class="title" x="150" y="50" ref="titleRef">
        {{ clockTitle }}
      </text>

      <text class="metric" x="150" y="155" ref="timeRef">
        {{ timeParts.time }}
        <tspan
          v-if="timeParts.meridiem"
          class="metric-meridiem"
          dx="0.25em"
          dy="-0.35em"
        >
          {{ timeParts.meridiem }}
        </tspan>
      </text>

      <text class="subtitle" x="150" y="210" ref="dateRef">
        {{ dateString }}
      </text>
    </svg>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from "vue";

const props = defineProps({
  widgetData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["mounted"]);

const containerRef = ref(null);
const titleRef = ref(null);
const timeRef = ref(null);
const dateRef = ref(null);
const timeValue = ref(new Date());
let intervalId = null;

const locale = computed(() => props.widgetData?.locale || undefined);

const timeFormatter = computed(() =>
  new Intl.DateTimeFormat(locale.value || undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
);

const timeParts = computed(() => {
  const formatter = timeFormatter.value;
  const parts = formatter.formatToParts(timeValue.value);

  const meridiem = parts.find((part) => part.type === "dayPeriod")?.value || "";
  const time = parts
    .filter((part) => part.type !== "dayPeriod")
    .map((part) => part.value)
    .join("")
    .trim();

  return {
    time,
    meridiem,
  };
});

const dateString = computed(() =>
  timeValue.value.toLocaleDateString(locale.value, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
);

const clockTitle = computed(() => props.widgetData?.widgetTitle || "Current Time");

const tick = () => {
  timeValue.value = new Date();
};

const resizeText = (element, baseSize, minSize, maxSize, maxWidth) => {
  if (!element) return;

  element.style.fontSize = `${baseSize}px`;
  element.setAttribute("font-size", `${baseSize}px`);

  let bbox;
  try {
    bbox = element.getBBox();
  } catch (error) {
    return;
  }

  if (!bbox || !bbox.width) {
    return;
  }

  const ratio = maxWidth / bbox.width;
  let newSize = baseSize * ratio;

  if (!Number.isFinite(newSize) || newSize <= 0) {
    newSize = baseSize;
  }

  if (ratio < 1) {
    newSize = Math.max(minSize, newSize);
  } else {
    newSize = Math.min(maxSize, Math.max(baseSize, newSize));
  }

  newSize = Math.min(maxSize, Math.max(minSize, newSize));

  element.style.fontSize = `${newSize}px`;
  element.setAttribute("font-size", `${newSize}px`);
};

const adjustSizes = () => {
  resizeText(titleRef.value, 24, 14, 36, 240);
  resizeText(timeRef.value, 64, 32, 80, 260);
  resizeText(dateRef.value, 24, 14, 32, 240);
};

onMounted(() => {
  tick();
  intervalId = window.setInterval(tick, 1000);
  emit("mounted");
  nextTick(() => {
    adjustSizes();
  });
});

onUnmounted(() => {
  if (intervalId) {
    window.clearInterval(intervalId);
  }
});

watch([
  () => timeParts.value.time,
  () => timeParts.value.meridiem,
  dateString,
  clockTitle,
], () => {
  nextTick(() => {
    adjustSizes();
  });
});
</script>

<style scoped>
.clock-widget-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.clock-widget {
  width: 100%;
  height: 100%;
  background-color: var(--widget-surface-color);
  color: var(--widget-text-color);
  border-radius: 8px;
}

.title {
  fill: var(--widget-text-color);
  font-size: 24px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: middle;
}

.metric {
  fill: var(--widget-text-color);
  font-size: 64px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: middle;
}

.metric-meridiem {
  font-size: 0.4em;
}

.subtitle {
  fill: var(--widget-muted-text-color);
  font-size: 24px;
  font-weight: 400;
  text-anchor: middle;
  dominant-baseline: middle;
  opacity: 0.8;
}
</style>
