<template>
  <g ref="currentLines" class="current-lines" id="current-lines"></g>
</template>

<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { randomIntFromInterval, mapValues } from "../utils/func1";

const currentLines = ref(null);
const svgRef = computed(() => currentLines.value);

/* ---------------------------------------------------------------------
parameters for animation of current lines.
clamp the animation range from 25 sec to 4 sec
--------------------------------------------------------------------- */
const curr_range = [0, 10];
const animation_range = [25000, 4000];

// Define the pale light yellow color for all lines
const PALE_YELLOW = "rgba(255, 255, 224, 0.7)";

const props = defineProps({
  currentSpeed: {
    type: Object,
    required: true,
  },
  currentAngle: {
    type: Object,
    required: true,
  },
});

// Computed property to determine if we should display current lines
const shouldDisplayCurrentLines = computed(() => {
  return props.currentSpeed.updated === true;
});

function createCurrentLines() {
  // If we shouldn't display current lines, clear the SVG and return
  if (!shouldDisplayCurrentLines.value) {
    if (svgRef.value) {
      while (svgRef.value.firstChild) {
        svgRef.value.removeChild(svgRef.value.firstChild);
      }
    }
    return;
  }

  const parentEl = currentLines.value.parentElement;

  // Get the parent SVG element dimensions
  const svgWidth = parentEl.viewBox.baseVal.width;
  const svgHeight = parentEl.viewBox.baseVal.height;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // Clear any existing lines
  while (svgRef.value.firstChild) {
    svgRef.value.removeChild(svgRef.value.firstChild);
  }

  // Create a group element for the current lines
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("class", "current-lines-group");

  // Get the current speed and angle
  const speed = props.currentSpeed.value || 0;
  const angle = props.currentAngle.value || 0;

  // Map the current speed to the animation duration
  const animationDuration = mapValues(
    speed,
    curr_range[0],
    curr_range[1],
    animation_range[0],
    animation_range[1]
  );

  // Create the current lines
  const numLines = 20;
  const lineSpacing = 50;
  const lineLength = 30;
  const lineWidth = 2;

  // Use pale light yellow for all lines

  // Create the lines
  for (let i = 0; i < numLines; i++) {
    // Calculate the line position
    const x = centerX + randomIntFromInterval(-200, 200);
    const y = centerY + randomIntFromInterval(-200, 200);

    // Create the line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", y);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y + lineLength);
    line.setAttribute("stroke", PALE_YELLOW);
    line.setAttribute("stroke-width", lineWidth);
    line.setAttribute("stroke-linecap", "round");

    // Add animation
    const animate = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "animate"
    );
    animate.setAttribute("attributeName", "y1");
    animate.setAttribute("from", y);
    animate.setAttribute("to", y + lineSpacing);
    animate.setAttribute("dur", `${animationDuration}ms`);
    animate.setAttribute("repeatCount", "indefinite");

    const animate2 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "animate"
    );
    animate2.setAttribute("attributeName", "y2");
    animate2.setAttribute("from", y + lineLength);
    animate2.setAttribute("to", y + lineSpacing + lineLength);
    animate2.setAttribute("dur", `${animationDuration}ms`);
    animate2.setAttribute("repeatCount", "indefinite");

    // Add the animations to the line
    line.appendChild(animate);
    line.appendChild(animate2);

    // Add the line to the group
    g.appendChild(line);
  }

  // Add the group to the SVG
  svgRef.value.appendChild(g);

  // Rotate the group to match the current angle
  svgRef.value.setAttribute("transform", `rotate(${angle})`);
}

watch(
  [() => props.currentSpeed.value, () => props.currentAngle.value, shouldDisplayCurrentLines],
  () => {
    createCurrentLines();
  }
);

onMounted(() => {
  setTimeout(createCurrentLines, 500);
});
</script>
<style scoped>
.current-lines {
  transform-origin: center;
}
</style>
