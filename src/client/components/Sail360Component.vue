<template>
  <div class="sail360-container no-tap-highlight" @touchstart.prevent>
    <svg
      ref="instrument"
      class="instrument display-component sail360 no-tap-highlight"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      style="width: 100%; height: 100%; max-width: 100vh; max-height: 100vh;"
      @touchstart.prevent
    >
      <defs>
        <linearGradient id="red-gradient">
          <stop offset="0%" stop-opacity="0.2" stop-color="red"></stop>
          <stop offset="100%" stop-opacity="1" stop-color="red"></stop>
        </linearGradient>
        <linearGradient id="green-gradient">
          <stop offset="0%" stop-opacity="1" stop-color="green"></stop>
          <stop offset="100%" stop-opacity="0.2" stop-color="green"></stop>
        </linearGradient>
      </defs>

      <!-- Current lines component -->
      <CurrentLinesG
        v-if="
          navData?.current &&
          navData?.current?.speed &&
          navData?.current?.angle
        "
        :currentSpeed="navData?.current?.speed"
        :currentAngle="navData?.current?.angle"
      />

      <!-- Rest of the SVG content -->
      <g class="sail-outline">
        <path
          d="M293.14,53.55c-41.1,53.85-91.91,133.98-126.7,240.06c-63,192.1-37.48,359.59-19.17,440.94"
          transform="translate(150, -150)"
        />
        <path
          d="M289.52,53.55c41.1,53.85,91.91,133.98,126.7,240.06c63,192.1,37.48,359.59,19.17,440.94"
          transform="translate(150, -150)"
        />
      </g>
      <g class="wind" ref="wind">
        <circle ref="arc0" stroke="grey" stroke-width="40" fill="none" />
        <path
          ref="arc1"
          style="stroke: url(#red-gradient)"
          stroke-width="40"
          fill="none"
        />
        <path
          ref="arc2"
          style="stroke: url(#green-gradient)"
          stroke-width="40"
          fill="none"
        />
      </g>
      <circle class="waypoint centerable" r="20" ref="waypoint" />
      <text class="cog wind-angle centerable" ref="cog">&#9660;</text>
      <g class="compass centerable" data-invert="1" ref="compass">
        <circle class="comp-ring" ref="compRing" stroke-width="40" />
      </g>
      <text class="tidal-direction centerable" ref="tidalDirection">&#10513;</text>
      <text class="tidal-speed" ref="tidalSpeed">
        {{ navData.value?.wind?.apparent?.speed?.value }}
      </text>

      <rect class="heading-panel" ref="headingPanel" />
      <text class="heading" ref="heading">
        {{ Math.round(headingUpdated) }}
      </text>
      <g ref="trueWindAngle" class="true-wind-angle wind-angle centerable">
        <text ref="trueWindAngleIcon" class="wind-angle true-wind-angle-icon">
          &#9660;
        </text>
        <text ref="trueWindAngleLabel" class="wind-angle-label">T</text>
      </g>
      <g ref="apparentWindAngle" class="apparent-wind-angle wind-angle centerable">
        <text ref="apparentWindAngleIcon" class="wind-angle">&#9660;</text>
        <text ref="apparentWindAngleLabel" class="wind-angle-label">A</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import * as d3 from "d3";
import { range } from "lodash";
import { onMounted, watch, useTemplateRef, ref, computed } from "vue";
import { useStateDataStore } from "../stores/stateDataStore.js";
import CurrentLinesG from "../components/CurrentLinesG.vue";
import { storeToRefs } from "pinia";

defineProps({
  layout: { type: Object, required: false },
  widgets: { type: Object, required: false, default: () => {} },
});

const emit = defineEmits(["mounted"]);

const svgRef = useTemplateRef("instrument");
const windRef = useTemplateRef("wind");
const arc0Ref = useTemplateRef("arc0");
const arc1Ref = useTemplateRef("arc1");
const arc2Ref = useTemplateRef("arc2");
const wayPointRef = useTemplateRef("waypoint");
const cogRef = useTemplateRef("cog");
const compassRef = useTemplateRef("compass");
const compRingRef = useTemplateRef("compRing");
const tidalDirectionRef = useTemplateRef("tidalDirection");
const tidalSpeedRef = useTemplateRef("tidalSpeed");
const headingPanelRef = useTemplateRef("headingPanel");
const headingRef = useTemplateRef("heading");
const trueWindAngleRef = useTemplateRef("trueWindAngle");
const trueWindAngleIconRef = useTemplateRef("trueWindAngleIcon");
const trueWindAngleLabelRef = useTemplateRef("trueWindAngleLabel");
const apparentWindAngleRef = useTemplateRef("apparentWindAngle");
const apparentWindAngleIconRef = useTemplateRef("apparentWindAngleIcon");
const apparentWindAngleLabelRef = useTemplateRef("apparentWindAngleLabel");
 
// Store integration
const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);
const navData = computed(() => state.value.navigation);
const anchorState = computed(() => state.value.anchor);
const alertState = computed(() => state.value.alerts?.active);


// setTimeout(() => {
// console.log("--------Sail360] state", state.value)
// console.log("--------Sail360] navData", navData.value)
// }, 5000);

const radius = 350,
  x = 500,
  y = 500,
  windOffset = 47;

// Opacity is now controlled by the parent component

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  const d = [
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

  return d;
}

function setRefAttributes(theRef, attrs) {
  Object.entries(attrs).forEach(function (a) {
    const [k, v] = a;
    theRef.value.setAttribute(k, v);
  });
}

function rotateRef(theRef, deg) {
  theRef.value.animate([{ transform: `rotate(${deg}deg)` }], {
    // timing options
    duration: 500,
    iterations: 1,
    fill: "forwards",
  });
}

/* ***************************
           initialize position of
           components
*************************** */
const windTrueUpdated = computed(
  () => navData.value?.wind?.true?.speed?.value
);

const windTrueAngleUpdated = computed(
  () => navData.value?.wind?.true?.angle?.value
);

const windApparentUpdated = computed(
  () => navData.value?.wind?.apparent?.speed?.value
);

const windApparentAngleUpdated = computed(
  () => navData.value?.wind?.apparent?.angle?.value
);

const headingUpdated = computed(
  () => navData.value?.course?.heading?.true?.value
);

onMounted(() => {
  //compass
  setRefAttributes(compRingRef, {
    cx: x,
    cy: y,
    r: radius,
  });

  //wind
  setRefAttributes(arc0Ref, {
    cx: x,
    cy: y,
    r: radius + windOffset,
  });

  setRefAttributes(arc1Ref, {
    d: describeArc(x, y, radius + windOffset, 270, 0),
  });
  setRefAttributes(arc2Ref, {
    d: describeArc(x, y, radius + windOffset, 0, 90),
  });

  //tidal info
  setRefAttributes(tidalDirectionRef, {
    x: x,
    y: y,
  });

  setRefAttributes(tidalDirectionRef, { "transform-origin": `${x}px ${y}px` });

  setRefAttributes(tidalSpeedRef, {
    x: x,
    y: y,
  });

  //heading info
  setRefAttributes(headingPanelRef, {
    x: x * 0.9,
    y: 110,
    height: y * 0.1,
    width: x * 0.2,
  });

  setRefAttributes(headingRef, {
    x: x,
    y: y - radius,
  });

  //wind angle icons & labels
  setRefAttributes(trueWindAngleIconRef, {
    x: x,
    y: 120,
  });
  setRefAttributes(trueWindAngleLabelRef, {
    x: x,
    y: 75,
  });
  setRefAttributes(apparentWindAngleIconRef, {
    x: x,
    y: 120,
  });
  setRefAttributes(apparentWindAngleLabelRef, {
    x: x,
    y: 75,
  });

  //COG
  setRefAttributes(cogRef, {
    x: x,
    y: y * 0.375,
  });

  //waypoint
  setRefAttributes(wayPointRef, {
    cx: x,
    cy: y * 0.34,
  });

  const windData = range(0, 360, 10).map(function (d) {
    const ret = {
      angle: d,
      coordinates: polarToCartesian(x, y, radius + windOffset, d),
    };
    return ret;
  });

  d3.select(windRef.value)
    .selectAll("text")
    .data(Array.from(windData))
    .enter()
    .append("text")
    .attr("class", "wind-label")
    .attr("text-anchor", "middle")
    .attr("x", (d) => d.coordinates.x)
    .attr("y", (d) => d.coordinates.y)
    .text(function (d) {
      return d % 30 === 0 ? "\u2022" : ".";
    });

  const compassData = range(0, 360, 10).map(function (d) {
    const ret = {
      angle: d,
      coordinates: polarToCartesian(x, y, radius, d),
      label: d === 0 ? "N" : d === 90 ? "E" : d === 180 ? "S" : d === 270 ? "W" : d,
    };
    return ret;
  });

  d3.select(compassRef.value)
    .selectAll("text")
    .data(compassData)
    .enter()
    .append("text")
    .attr("class", (d) =>
      d.label === d.angle ? "compass-label" : "compass-label compass-label-major"
    )
    .attr(
      "transform",
      (d) => `translate(${d.coordinates.x}, ${d.coordinates.y}) rotate(${d.angle})`
    )
    .text(function (d) {
      return d.label;
    });

  //set all items to center origin for rotation
  Array.from(document.getElementsByClassName("centerable")).forEach(function (el) {
    el.setAttribute("transform-origin", `${x} ${y}`);
    el.setAttribute("data-angle", 0);
  });

  // update widgets as data changes
  // use direct access or use watchers
  headingRef.value.textContent =
    navData.value?.navigation?.headingMagnetic?.value;


  watch(
    () => windTrueAngleUpdated.value,
    (angle) => {
      if (typeof angle === "number") {
        rotateRef(trueWindAngleRef, angle);
      }
    },
    { immediate: true }
  );

  watch(
    () => windApparentAngleUpdated.value,
    (angle) => {
      if (typeof angle === "number") {
        rotateRef(apparentWindAngleRef, angle);
      }
    },
    { immediate: true }
  );

  watch(
    () => headingUpdated.value,
    (first) => {
      rotateRef(compassRef, first);
    }
  );

  watch(
    () => windTrueUpdated.value,
    (first) => {
      if (first) {
        d3.select(arc1Ref.value).style("opacity", 1);
      } else {
        d3.select(arc1Ref.value).style("opacity", 0.3);
      }
    }
  );

  watch(
    () => windApparentUpdated.value,
    (first) => {
      if (first) {
        d3.select(arc2Ref.value).style("opacity", 1);
      } else {
        d3.select(arc2Ref.value).style("opacity", 0.3);
      }
    }
  );

  watch(
    () => headingUpdated.value,
    (updated) => {
      if (updated) {
        d3.select(headingRef.value).style("opacity", 1);
        d3.select(headingPanelRef.value).style("opacity", 1);
        d3.select(compassRef.value).style("opacity", 1);
      } else {
        d3.select(headingRef.value).style("opacity", 0.3);
        d3.select(headingPanelRef.value).style("opacity", 0.3);
        d3.select(compassRef.value).style("opacity", 0.3);
      }
    }
  );

  function resizeDisplayComponent() {
    const my = svgRef.value;
    if (!my) return; // Guard against null reference

    const myParent = my.parentElement;
    if (!myParent) return; // Guard against null reference

    // Get the parent dimensions
    const parentWidth = myParent.clientWidth;
    const parentHeight = myParent.clientHeight;
    
    // Use the smaller dimension to create a square
    const size = Math.min(parentWidth, parentHeight) * 0.9; // 90% of the smaller dimension
    
    // Center the SVG in its container
    my.style.width = `${size}px`;
    my.style.height = `${size}px`;
    my.style.position = 'absolute';
    my.style.left = '50%';
    my.style.top = '50%';
    my.style.transform = 'translate(-50%, -50%)';
  }

  setTimeout(() => {
    resizeDisplayComponent();
  }, 500);

  // Emit mounted event after a short delay
  setTimeout(() => {
    emit("mounted");
  }, 100);
});
</script>

<style scoped>
.instrument {
  height: 100% !important;
  width: 100% !important;
  aspect-ratio: 1 / 1 !important;
  background-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border: none;
  border-radius: 8px;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: rgba(
    0,
    0,
    0,
    0
  ) !important; /* Disable iOS tap highlight */
  -webkit-touch-callout: none; /* Disable callout */
  -webkit-user-select: none; /* Disable text selection */
  user-select: none; /* Standard syntax */
}

.heading-panel {
  fill: white;
  stroke: black;
  stroke-width: 2px;
}

text {
  text-anchor: middle;
  font-family: "Trebuchet MS", "Lucida Sans Unicode", "Lucida Grande", "Lucida Sans",
    Arial, sans-serif;
}

.heading {
  fill: black;
  font-size: 31pt;
  font-weight: bold;
}

.arc0 {
  opacity: 0.65;
}

.wind-label {
  fill: white;
  font-size: xx-large;
  font-weight: 900;
}

.comp-ring {
  fill: none;
  stroke: white;
  stroke-width: 40px;
}

.compass-label {
  fill: black;
  font-size: large;
  font-weight: bold;
}

.compass-label-major {
  font-size: xx-large;
}

.tidal-speed {
  fill: white;
  font-size: 64pt;
  font-weight: 700;
  opacity: 0.4;
}

.wind-angle {
  font-size: 70pt;
  stroke: white;
}

.true-wind-angle {
  fill: blue;
}

.apparent-wind-angle {
  fill: green;
}

.cog {
  fill: orange;
  color: orange;
  opacity: 0.98;
  font-size: 49pt;
}

.wind-angle-label {
  fill: white;
  font-size: 20px;
  font-weight: bold;
}

.waypoint {
  fill: rgba(255, 0, 234, 1);
  stroke: black;
  stroke-width: 1px;
}

.sail-outline {
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 10px;
  transform: translate(21%, 33%) scale(0.65);
  fill: none;
}

/* Fade transition is now handled by the parent component */

.sail360-container {
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-user-drag: none;
  -webkit-appearance: none;
  appearance: none;
  outline: none !important;
}

.sail360 {
  pointer-events: none;
  touch-action: manipulation;
  -webkit-user-drag: none;
  -webkit-appearance: none;
  appearance: none;
  outline: none !important;
}

.no-tap-highlight {
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0) !important;
  -webkit-touch-callout: none !important;
  user-select: none !important;
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-user-drag: none;
  -webkit-appearance: none;
  appearance: none;
  outline: none !important;
}
</style>
