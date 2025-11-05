<template>
  <div class="wind-speed-widget">
    <div class="instrument-surface">
      <svg
        class="wind-speed-svg"
        viewBox="0 0 200 220"
        role="img"
        aria-label="Wind speed and direction"
      >
        <text
          v-if="displayLabel"
          class="label-text"
          x="100"
          y="55"
        >
          {{ displayLabel }}
        </text>
        <circle class="circle-base" cx="100" cy="110" :r="radius" />
        <g class="circle-segments">
          <path
            v-for="segment in windSegments"
            :key="segment.id"
            :d="segment.path"
            :stroke="segment.color"
            class="segment"
          />
        </g>
        <g class="caret-group" :style="caretGroupStyle">
          <polygon class="caret" :points="caretPoints" :style="caretStyle" />
        </g>
        <text class="speed-text" x="100" y="115">{{ formattedSpeed }}</text>
        <text class="units-text" x="100" y="140">{{ units }}</text>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { createLogger } from "@/services/logger";

const props = defineProps({
  widgetData: {
    type: Object,
    required: true,
  },
});

const logger = createLogger("wind-speed-widget");

const speedData = computed(() => props.widgetData?.speed || null);
const angleData = computed(() => props.widgetData?.angle || null);

const speedValue = computed(() => {
  const explicit = speedData.value?.value ?? props.widgetData?.value;
  return typeof explicit === "number" ? explicit : null;
});

const units = computed(() => {
  const suppliedUnits =
    speedData.value?.units ||
    props.widgetData?.units ||
    props.widgetData?.dataConfig?.defaultUnits;
  return typeof suppliedUnits === "string" ? suppliedUnits : "";
});

const displayLabel = computed(() => {
  return (
    props.widgetData?.label ||
    props.widgetData?.displayLabel ||
    speedData.value?.displayLabel ||
    props.widgetData?.dataConfig?.displayLabel ||
    ""
  );
});

const angleValue = computed(() => {
  const raw =
    angleData.value?.value ?? angleData.value?.degrees ?? props.widgetData?.angle;
  return typeof raw === "number" ? raw : null;
});

const formattedSpeed = computed(() => {
  if (speedValue.value === null) {
    return "--";
  }
  return speedValue.value.toFixed(1);
});

const radius = 88;
const centerX = 100;
const centerY = 110;

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(startAngle, endAngle) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

const windSegments = computed(() =>
  [
    {
      id: "green",
      start: 0,
      end: 110,
      color: "#2dd36f",
    },
    {
      id: "white",
      start: 110,
      end: 249,
      color: "#ffffff",
    },
    {
      id: "red",
      start: 249,
      end: 360,
      color: "#eb445a",
    },
  ].map((segment) => ({
    ...segment,
    path: describeArc(segment.start, segment.end),
  }))
);

const normalizedAngle = computed(() => {
  if (typeof angleValue.value !== "number" || Number.isNaN(angleValue.value)) {
    return null;
  }
  const raw = angleValue.value % 360;
  return raw >= 0 ? raw : raw + 360;
});

const caretColor = computed(() => {
  const angle = normalizedAngle.value;
  if (typeof angle !== "number") {
    return "var(--ion-color-primary-contrast)";
  }
  if (angle >= 0 && angle <= 110) {
    return "#2dd36f";
  }
  if (angle >= 111 && angle <= 249) {
    return "#ffffff";
  }
  return "#eb445a";
});

const caretStyle = computed(() => ({
  fill: caretColor.value,
  stroke: "rgba(0, 0, 0, 0.25)",
  strokeWidth: 0.8,
  transition: "fill 0.2s ease, stroke 0.2s ease",
}));

const caretPoints = computed(() => {
  const tipRadius = radius - 6;
  const baseRadius = radius - 32;
  const halfWidth = 8;
  const tipY = -(tipRadius);
  const baseY = -(baseRadius);
  return `0,${tipY} ${-halfWidth},${baseY} ${halfWidth},${baseY}`;
});

const caretTransitionReady = ref(false);

onMounted(() => {
  requestAnimationFrame(() => {
    caretTransitionReady.value = true;
  });
});

watch(
  () => ({
    label: displayLabel.value,
    speed: speedValue.value,
    angle: angleValue.value,
  }),
  (next, prev) => {
    if (
      !prev ||
      next.label !== prev.label ||
      next.speed !== prev.speed ||
      next.angle !== prev.angle
    ) {
      logger.info("WindSpeedWidget update", {
        label: next.label,
        speed: next.speed,
        angle: next.angle,
      });
    }
  },
  { immediate: true }
);

const caretGroupStyle = computed(() => {
  const angle = normalizedAngle.value ?? 0;
  return {
    transform: `translate(${centerX}px, ${centerY}px) rotate(${angle}deg)`,
    transition: caretTransitionReady.value ? "transform 0.6s ease-in-out" : "none",
  };
});
</script>

<style scoped>
.wind-speed-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--widget-text-color);
}

.instrument-surface {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: var(--widget-surface-color);
  color: var(--widget-text-color);
  border-radius: 8px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

.wind-speed-svg {
  width: 100%;
  height: 100%;
  max-width: 240px;
  max-height: 240px;
}

.circle-base {
  fill: none;
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 10px;
}

.circle-segments .segment {
  fill: none;
  stroke-width: 10px;
  stroke-linecap: butt;
}

.caret-group {
  transform-origin: 0 0;
  transition: transform 0.6s ease-in-out;
}

.label-text {
  fill: var(--widget-text-color);
  font-size: 22px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: middle;
}

.caret {
  transform-origin: 100px 110px;
  transition: transform 0.4s ease-in-out;
  fill: v-bind(caretColor);
}

.speed-text {
  font-size: 40px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: middle;
  fill: var(--widget-text-color);
}

.units-text {
  font-size: 16px;
  text-anchor: middle;
  dominant-baseline: middle;
  fill: var(--widget-muted-text-color);
}
</style>
