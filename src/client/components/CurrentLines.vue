<template>
  <svg
    ref="currentLines"
    class="current-lines-svg"
    width="100%"
    height="100%"
    viewBox="0 0 1000 1000"
    preserveAspectRatio="xMidYMid meet"
  >
    <g class="current-lines" id="current-lines" ref="svgRef"></g>
  </svg>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { randomIntFromInterval, mapValues } from "../utils/func1";
import { scaleLinear } from "d3";

const svgRef = ref(null);
const currentLines = ref(null);

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
    required: false,
  },
  currentAngle: {
    type: Number,
    required: false,
  },
  current: {
    type: Object,
    required: false,
  },
});

/* ----------------------------------------------------------------------------
   RotateTo used to rotate wind direction widget, current lines, and compass
    TODO: None
------------------------------------------------------------------------------- */
function rotateTo(el, deg) {
  if (!el) {
    console.log("ROTATE NO ELEMENT FOUND");
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
  const parentEl = currentLines.value.parentElement;

  // Get the parent SVG element dimensions
  let pe;
  try {
    pe = parentEl.getBoundingClientRect();
  } catch (e) {
    console.log("CURRENTLINES parent element not found");
    return;
  }

  const centerX = 500; // Center of the 1000x1000 viewBox
  const centerY = 500;
  const svg_width = 1000; // SVG viewBox width
  const svg_height = 1000; // SVG viewBox height

  // Calculate the diagonal length of the SVG and increase it by 50% for a larger area
  const diagonal = Math.hypot(svg_width, svg_height) * 1.5; // Approximately 2121 for a 1000x1000 SVG

  // Use the diagonal as the width for the area where lines move
  // This ensures full coverage even when rotated by 45 degrees
  const areaWidth = diagonal;
  const areaHeight = diagonal;

  const svg = svgRef.value;
  if (!svg) {
    return;
  }

  // Clear any existing lines
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }

  // Increase the number of lines for better coverage
  const n_lines_horizontal = 34; // Number of horizontal positions
  const n_lines_vertical = 4; // Number of vertical positions per horizontal position
  const line_spacing_horizontal = areaWidth / n_lines_horizontal; // Evenly space lines across the full diagonal width
  const line_height = areaHeight / 36;
  const opacity_stop = 0.5;
  const stroke_width = areaWidth / 550;

  // Get current speed from props - use either direct props or from current object
  const currentSpeedValue =
    props.currentSpeed !== undefined ? props.currentSpeed : props.current?.speed || 1;

  //clamp the current speed. lets not go crazy here.
  const currspeed = Math.min(Math.max(1, currentSpeedValue), 10);
  const animation_time = mapValues(curr_range, animation_range, currspeed) || 0;

  // Get current angle from props - use either direct props or from current object
  const currentAngleValue =
    props.currentAngle !== undefined ? props.currentAngle : props.current?.angle || 0;

  // Position the group at the center with proper offset to account for the diagonal
  svg.setAttribute("transform-origin", `${centerX}px ${centerY}px`);
  svg.setAttribute("transform", `rotate(${currentAngleValue})`);

  // Calculate the offset to center the lines area on the SVG
  // We need to offset by half the difference between the diagonal and the SVG width/height
  const offsetX = centerX - areaWidth / 2;
  const offsetY = centerY - areaHeight / 2;

  // Create a grid of lines to ensure even coverage
  for (let i = 0; i < n_lines_horizontal; i++) {
    // Distribute lines evenly across the width with a small random offset
    const xPos = offsetX + i * line_spacing_horizontal + randomIntFromInterval(-10, 10);

    // Create multiple lines at different vertical positions for each horizontal position
    for (let j = 0; j < n_lines_vertical; j++) {
      // Create lines that start well outside the visible area
      // This ensures they're not noticeable when they first initialize
      const startYPos =
        offsetY - areaHeight * 0.5 + randomIntFromInterval(0, areaHeight * 0.3);

      createAnimatedLine(
        svg,
        xPos,
        startYPos,
        line_height,
        i,
        j,
        0,
        animation_time,
        areaHeight,
        opacity_stop,
        stroke_width,
        currspeed,
        n_lines_horizontal,
        n_lines_vertical
      );

      // Create a second line that's already partway through the animation
      // This ensures there's no gap at the beginning or end of the animation cycle
      const startingOffset =
        offsetY + randomIntFromInterval(-areaHeight * 0.3, areaHeight * 0.3);
      createAnimatedLine(
        svg,
        xPos,
        startingOffset,
        line_height,
        i,
        j,
        1,
        animation_time,
        areaHeight,
        opacity_stop,
        stroke_width,
        currspeed,
        n_lines_horizontal,
        n_lines_vertical
      );
    }
  }
}

// Helper function to create and animate a line
function createAnimatedLine(
  svg,
  xPos,
  yStart,
  lineHeight,
  i,
  j,
  lineIndex,
  animationTime,
  radius,
  opacity,
  strokeWidth,
  speed,
  nHorizontal,
  nVertical
) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", xPos);
  line.setAttribute("x2", xPos);
  line.setAttribute("y1", yStart);
  line.setAttribute("y2", yStart + lineHeight);
  line.setAttribute("class", "current-line");
  line.setAttribute("id", `current-line-${i}-${j}-${lineIndex}`);
  line.setAttribute("stroke", colorScale(speed));
  line.setAttribute("stroke-width", strokeWidth);
  line.setAttribute("opacity", opacity);
  svg.appendChild(line);

  try {
    // Assign a completely random delay for each line
    // This will prevent the left-to-right progression
    const randomDelay = randomIntFromInterval(0, animationTime);

    const animation = line.animate(
      [
        { transform: `translateY(0px)` },
        { transform: `translateY(${radius + lineHeight}px)` },
      ],
      {
        duration: animationTime,
        iterations: Infinity,
        delay: randomDelay,
      }
    );
  } catch (e) {
    console.error("Animation error:", e);
  }
}

/* ---------------------------------------------------------------------
    Watcher to change the angle of the current lines
 --------------------------------------------------------------------- */
watch(
  [() => props.currentAngle, () => props.current?.angle],
  ([newAngle, newCurrentAngle], [oldAngle, oldCurrentAngle]) => {
    // Use direct prop if available, otherwise use from current object
    const angle = newAngle !== undefined ? newAngle : newCurrentAngle || 0;
    const oldValue = oldAngle !== undefined ? oldAngle : oldCurrentAngle || 0;

    if (oldValue === -1) {
      initCurrentLines();
    } else {
      rotateTo(currentLines.value, angle);
    }
  }
);

/* ---------------------------------------------------------------------
    Watcher to update speed of current lines
 --------------------------------------------------------------------- */
watch(
  [() => props.currentSpeed, () => props.current?.speed],
  ([newSpeed, newCurrentSpeed], [oldSpeed, oldCurrentSpeed]) => {
    // Use direct prop if available, otherwise use from current object
    const speed = newSpeed !== undefined ? newSpeed : newCurrentSpeed || 1;

    const currspeed = Math.min(Math.max(1, speed), 10);
    const animation_time = mapValues(curr_range, animation_range, currspeed) || 0;

    Array.from(document.querySelectorAll(".current-line")).forEach((el) => {
      const animation = el.getAnimations()[0];
      if (animation) {
        animation.effect.updateTiming({ duration: animation_time });
      }
    });
  }
);

onMounted(() => {
  setTimeout(() => {
    currentLines.value = document.querySelector(".current-lines-svg");
    svgRef.value = document.querySelector(".current-lines");
    initCurrentLines();
  }, 100);
});
</script>
<style scoped>
.current-lines-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.current-line {
  stroke-linecap: round;
}
</style>
