<template>
  <g ref="svgRef" id="gid"></g>
</template>

<script setup>
import * as d3 from "d3";
import { onMounted, watch, useTemplateRef, onBeforeUnmount } from "vue";

const svgRef = useTemplateRef("svgRef");

// Dimensions for the graph
const h = 55;
const w = 250;
const transformX = 16;
const transformY = 222;
const axisWidth = 10; // Width for the axis

const props = defineProps({
  maxHistoryLength: {
    type: Number,
    required: false,
    default: 30,
  },
  data: {
    type: Array,
    required: true,
  },
  color: {
    type: String,
    required: false,
    default: () => "steelblue",
  },
});

function redraw() {
  if (!svgRef.value) return;

  // Get the SVG element
  const svgElement = d3.select(svgRef.value);
  svgElement.selectAll("*").remove();

  // Ensure data is an array and not empty
  const safeData =
    Array.isArray(props.data) && props.data.length > 0 ? props.data : [0, 0, 0, 0, 0];

  // Create main group with translation to make room for left axis
  const mainGroup = svgElement
    .append("g")
    .attr("transform", `translate(${axisWidth}, 0)`);

  // Set up scales
  const x = d3
    .scaleLinear()
    .domain([0, Math.max(props.maxHistoryLength - 1, safeData.length - 1)])
    .range([0, w]);

  // Calculate y domain with padding
  const yExtent = d3.extent(safeData);
  const yMin = yExtent[0];
  const yMax = yExtent[1];
  const yRange = Math.max(1, yMax - yMin);
  const yPadding = yRange * 0.1;

  const y = d3
    .scaleLinear()
    .domain([Math.max(0, yMin - yPadding), yMax + yPadding])
    .range([h, 0]);

  // Create line generator
  const line = d3
    .line()
    .x((d, i) => x(i))
    .y((d) => y(d))
    .curve(d3.curveBasis);

  // Add line path
  mainGroup
    .append("path")
    .datum(safeData)
    .attr("fill", "none")
    .attr("stroke", props.color)
    .attr("stroke-width", 2)
    .attr("d", line);

  // Add y-axis on the left side
  const yAxis = d3
    .axisLeft(y)
    .ticks(3)
    .tickFormat((d) => d.toFixed(1));

  // Add the y-axis to the main SVG (not the translated group)
  // Position it at x=0 (left side)
  const yAxisGroup = svgElement.append("g").attr("class", "y-axis").call(yAxis);

  // Apply direct styling with very low opacity
  yAxisGroup.select(".domain").style("stroke", "#fff").style("stroke-opacity", "0.11");

  yAxisGroup
    .selectAll(".tick line")
    .style("stroke", "#fff")
    .style("stroke-opacity", "0.005");

  yAxisGroup
    .selectAll(".tick text")
    .style("fill", "#fff")
    .style("font-size", "8px")
    .style("opacity", "0.005");
}

// Watch for data changes
watch(
  () => props.data,
  () => redraw(),
  { deep: true }
);

onMounted(() => {
  // Initialize the SVG
  const svg = d3
    .select(svgRef.value)
    .attr("transform", `translate(${transformX}, ${transformY})`)
    .attr("width", w + axisWidth) // Add extra space for the axis
    .attr("height", h);

  // Initial draw
  redraw();
});

onBeforeUnmount(() => {
  // Clean up if needed
});
</script>

<style>
/* No CSS styling for the axis - we're using inline styles instead */
</style>
