<template>
  <div class="zora-container">
    <svg viewBox="-200 -200 400 400" class="compass-svg">
      <!-- Dark background -->
      <rect x="-200" y="-200" width="400" height="400" :fill="colors.background"/>
      
      <!-- Gradient definitions -->
      <defs>
        <radialGradient id="redGradient">
          <stop offset="0%" stop-color="#ff4444" stop-opacity="0"/>
          <stop offset="82%" stop-color="#ff4444" stop-opacity="0"/>
          <stop offset="100%" stop-color="#ff4444" stop-opacity="0.8"/>
        </radialGradient>
        <radialGradient id="greenGradient">
          <stop offset="0%" stop-color="#44ff44" stop-opacity="0"/>
          <stop offset="82%" stop-color="#44ff44" stop-opacity="0"/>
          <stop offset="100%" stop-color="#44ff44" stop-opacity="0.8"/>
        </radialGradient>
      </defs>
      
      <!-- Single circle with radial gradient -->
      <circle cx="0" cy="0" r="187" fill="url(#redGradient)" stroke="none"/>
      
      <!-- Inner compass ring -->
      <circle cx="0" cy="0" r="140" fill="none" :stroke="colors.outerRing" stroke-width="6"/>
      <circle cx="0" cy="0" r="130" fill="none" :stroke="colors.outerRingInner" stroke-width="2"/>
      
      <!-- Outer compass ring -->
      <circle cx="0" cy="0" r="190" fill="none" :stroke="colors.outerRing" stroke-width="8"/>
      <circle cx="0" cy="0" r="180" fill="none" :stroke="colors.outerRingInner" stroke-width="2"/>
      
      <!-- Outer ring degree marks - every 1 degree -->
      <g>
        <line
          v-for="deg in 360"
          :key="deg"
          :transform="`rotate(${deg})`"
          x1="0" y1="-190"
          :x2="0"
          :y2="deg % 45 === 0 ? -175 : deg % 5 === 0 ? -178 : -185"
          :stroke="deg % 45 === 0 ? colors.majorTicks : colors.minorTicks"
          :stroke-width="deg % 45 === 0 ? 2 : deg % 5 === 0 ? 1 : 0.5"
        />
      </g>
      
      <!-- Outer ring degree numbers - every 30 degrees, just inside outer ring -->
      <g>
        <text
          v-for="num in filteredDegreeNumbers"
          :key="num"
          :transform="`rotate(${num}) translate(0, -165) rotate(${-num})`"
          :fill="colors.degreeNumbers"
          font-size="6"
          font-family="monospace"
          text-anchor="middle"
          dominant-baseline="middle"
        >{{ num }}</text>
      </g>
      
      <!-- Cardinal directions -->
      <text x="0" y="-165" :fill="colors.cardinalDirections" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle">N</text>
      <text x="165" y="0" :fill="colors.cardinalDirections" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle">E</text>
      <text x="0" y="165" :fill="colors.cardinalDirections" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle">S</text>
      <text x="-165" y="0" :fill="colors.cardinalDirections" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle">W</text>
      
      <!-- Inner compass ring -->
      <circle cx="0" cy="0" r="140" fill="none" :stroke="colors.outerRing" stroke-width="6"/>
      <circle cx="0" cy="0" r="130" fill="none" :stroke="colors.outerRingInner" stroke-width="2"/>
      
      <!-- Inner ring degree marks - every 1 degree -->
      <g>
        <line
          v-for="deg in 360"
          :key="deg"
          :transform="`rotate(${deg})`"
          x1="0" y1="-140"
          :x2="0"
          :y2="deg % 45 === 0 ? -125 : deg % 5 === 0 ? -128 : -135"
          :stroke="deg % 45 === 0 ? colors.majorTicks : colors.minorTicks"
          :stroke-width="deg % 45 === 0 ? 2 : deg % 5 === 0 ? 1 : 0.5"
        />
      </g>
      
      <!-- Inner ring numbers - every 30 degrees -->
      <g>
        <text
          v-for="num in filteredDegreeNumbers"
          :key="num"
          :transform="`rotate(${num}) translate(0, -105) rotate(${-num})`"
          :fill="colors.degreeNumbers"
          font-size="6"
          font-family="monospace"
          text-anchor="middle"
          dominant-baseline="middle"
        >{{ num }}</text>
      </g>
      
      <!-- Inner ring cardinal directions -->
      <text x="0" y="-115" :fill="colors.cardinalDirections" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">N</text>
      <text x="115" y="0" :fill="colors.cardinalDirections" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle">E</text>
      <text x="0" y="115" :fill="colors.cardinalDirections" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle">S</text>
      <text x="-115" y="0" :fill="colors.cardinalDirections" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle">W</text>
      
      <!-- Green arc on top of all elements -->
      <path d="M 0,-140 A 140,140 0 0,1 80.2,-115.2" fill="none" stroke="#00ff00" stroke-width="4"/>
      <!-- Red arc on top of all elements -->
      <path d="M 0,-140 A 140,140 0 0,0 -80.2,-115.2" fill="none" stroke="#ff0000" stroke-width="4"/>
      
    </svg>
  </div>
</template>

<script setup>
import { computed } from "vue";

defineProps({
  layout: { type: Object, required: false },
  widgets: { type: Object, required: false, default: () => {} },
});

const emit = defineEmits(["mounted"]);

// Color parameters - easy to tweak
const colors = {
  background: '#0a0f11',
  outerRing: '#000000',
  outerRingInner: '#1a1a1a',
  innerRing: '#2a4a52',
  innerRingInner: '#1a3a42',
  majorTicks: '#e8ffee',
  minorTicks: '#ccffcc',
  degreeNumbers: '#e8ffee',
  cardinalDirections: '#e8ffee',
  innerRingNumbers: '#4a7a82',
  innerRingTicks: '#2a4a52',
  innerRingMinorTicks: '#4a7a82'
};

// Filtered degree numbers (exclude cardinal directions)
const filteredDegreeNumbers = computed(() => {
  return [30, 60, 120, 150, 210, 240, 300, 330];
});

// Emit mounted event after component is ready
setTimeout(() => {
  emit("mounted");
}, 100);
</script>

<style scoped>
.zora-container {
  width: 100%;
  height: 100%;
  background-color: #0a0f11;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: monospace;
}

/* Top Navigation */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #0d1416;
  border-bottom: 1px solid #1a3a42;
  font-size: 11px;
  color: #6bc1cd;
}

.nav-left, .nav-right {
  display: flex;
  gap: 16px;
  align-items: center;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 2px;
  transition: background-color 0.2s;
}

.nav-item:hover {
  background-color: rgba(107, 193, 205, 0.1);
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #6bc1cd;
  margin-left: 2px;
}

/* Main Content Area */
.main-area {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Side Panels */
.left-panel, .right-panel {
  width: 140px;
  background-color: #0d1416;
  border: 1px solid #1a3a42;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gps-title, .tide-title {
  font-size: 14px;
  font-weight: bold;
  color: #6bc1cd;
  border-bottom: 1px solid #1a3a42;
  padding-bottom: 4px;
  margin-bottom: 4px;
}

.gps-status {
  font-size: 12px;
  color: #39b54a;
  font-weight: bold;
}

.coords {
  font-size: 10px;
  line-height: 1.3;
  color: #6bc1cd;
}

.gps-fix {
  font-size: 10px;
  color: #6bc1cd;
}

.tide-height {
  font-size: 20px;
  font-weight: bold;
  color: #6bc1cd;
}

.tide-time {
  font-size: 14px;
  color: #6bc1cd;
}

.tide-countdown {
  font-size: 10px;
  color: #6bc1cd;
}

/* Center Compass */
.compass-area {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #0a0f11;
}

.compass-svg {
  width: 100%;
  height: 100%;
  max-width: 500px;
  max-height: 500px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .left-panel, .right-panel {
    width: 120px;
    padding: 8px;
  }
  
  .top-nav {
    font-size: 10px;
    padding: 6px 12px;
  }
  
  .nav-left, .nav-right {
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .main-area {
    flex-direction: column;
  }
  
  .left-panel, .right-panel {
    width: 100%;
    flex-direction: row;
    justify-content: space-around;
  }
}
</style>
