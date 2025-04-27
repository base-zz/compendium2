<template>
  <svg class="current-line-svg" ref="currentLinesContainer">
    <g class="current=lines" ref="currentLines"></g>
  </svg>
</template>

<script setup>
import { ref, watch, onMounted, useTemplateRef } from "vue";
import { randomIntFromInterval, mapValues } from "../util/func1";
import { scaleLinear } from "d3";

const svgRef = useTemplateRef("currentLinesContainer");
const currentLines = ref("currentLines");

/* ---------------------------------------------------------------------
parameters for animation of current lines.
clamp the current to a range of 0 to 10
clamp the animation range from 25 sec to 4 sec
--------------------------------------------------------------------- */
const curr_range = [0, 10];
const colorScale = scaleLinear().domain(curr_range).range(["steelblue", "red"]);
const animation_range = [25000, 4000];

const props = defineProps({
  currentSpeed: {
    type: Number,
    required: true,
  },
  currentAngle: {
    type: Number,
    required: true,
  },
});

/* ----------------------------------------------------------------------------
   RotateTo used to rotate wind direction widget, current lines, and compass
    TODO: None
------------------------------------------------------------------------------- */
function rotateTo(el, deg) {
  // const el = document.getElementById(elid);
  if (!el) {
    console.log("ROTATE NO ELEMENT FOUND. ID=", elid, el);
    return;
  }

  el.animate([{ transform: `rotate(${deg}deg)` }], {
    duration: 500,
    iterations: 1,
    fill: "forwards",
  });
}

/* ---------------------------------------------------------------------
      Create lines for animation of the current and kick off animation

      Make sure to init after mounted

   TODO:
--------------------------------------------------------------------- */
function initCurrentLines() {
  const parentEl = currentLines.value;
  // parentEl.setAttribute("transform-origin", `${w / 2} ${h / 2}`);

  const pe = svgRef.value.parentElement;
  const ph = pe.offsetHeight;
  const pw = pe.offsetWidth;
  const mx = Math.hypot(ph, pw);
  const w = mx;
  const h = mx;

  const svg = svgRef.value;
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  svg.setAttribute("viewBox", `0 0 ${mx} ${mx}`);

  const n_lines = Math.round(mx / 1.1);
  const line_spacing = 0.0175 * mx;
  const line_height = 0.028 * mx;
  const opacity_stop = 0.4;
  const stroke_width = 0.0014 * mx;

  //clamp the current speed. lets not go crazy here.
  const currspeed = Math.min(Math.max(1, props.currentSpeed), 10);
  const animation_time = mapValues(curr_range, animation_range, currspeed) || 0;
  const delay_factor = Math.floor(animation_time / mx);

  // Remove existing current lines
  if (parentEl) {
    while (parentEl.firstChild) {
      parentEl.removeChild(parentEl.firstChild);
    }
  }

  for (let i = 0; i < n_lines; i++) {
    const f = randomIntFromInterval(0, mx);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", i * line_spacing);
    line.setAttribute("y1", f);
    line.setAttribute("x2", i * line_spacing);
    line.setAttribute("y2", f + line_height);
    line.setAttribute("class", "current-line");
    line.setAttribute("id", `current-line-${i}`);
    line.setAttribute("stroke", colorScale(props.currentSpeed));
    line.setAttribute("stroke-width", stroke_width);
    line.setAttribute("opacity", opacity_stop);
    parentEl.appendChild(line);

    parentEl.setAttribute("transform-origin", "center");
    parentEl.setAttribute("transform", `rotate(${props.currentAngle})`);

    line.animate(
      [
        { transform: `translateY(${-1 * i * line_spacing}px)` },
        { transform: `translateY(${mx + 100}px)` },
      ],
      {
        duration: animation_time,
        iterations: Infinity,
        delay: randomIntFromInterval(0, mx * delay_factor),
      }
    );

    line.animate([{ opacity: 0 }, { opacity: opacity_stop }], {
      duration: 5000,
      iterations: 1,
    });
  }
}

/* ---------------------------------------------------------------------
    Watcher to change the angle of the current lines
 --------------------------------------------------------------------- */
watch(
  () => props.currentAngle,
  (first, second) => {
    if (second === -1) {
      initCurrentLines();
    } else {
      rotateTo(currentLines.value, props.currentAngle);
    }
  }
);

/* ---------------------------------------------------------------------
    Watcher to update speed of current lines
 --------------------------------------------------------------------- */
watch(
  () => props.currentSpeed,
  (first, second) => {
    const currspeed = Math.min(Math.max(1, props.currentSpeed), 10);
    const animation_time = mapValues(curr_range, animation_range, currspeed) || 0;
    Array.from(document.querySelectorAll(".current-line")).forEach((el) => {
      const animation = el.getAnimations()[0];
      animation.effect.updateTiming({ duration: animation_time });
    });
  }
);

onMounted(() => {
  setTimeout(initCurrentLines, 100);
  // initCurrentLines();
});
</script>
<style scoped>
.current-line-svg {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
