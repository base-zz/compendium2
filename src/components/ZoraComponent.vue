<template>
  <div class="zora-container">
    <svg viewBox="-250 -250 500 500" class="compass-svg">
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
      <circle cx="0" cy="0" r="181" fill="url(#redGradient)" stroke="none"/>
      
      <!-- Inner compass ring -->
      <circle cx="0" cy="0" r="140" fill="none" :stroke="colors.outerRing" stroke-width="6"/>
      <circle cx="0" cy="0" r="130" fill="none" :stroke="colors.outerRingInner" stroke-width="2"/>
      
      <!-- Outer compass ring -->
      <circle cx="0" cy="0" r="190" fill="none" stroke="none"/>
      
      <!-- Outer compass elements that rotate with heading -->
      <g :transform="`rotate(${-props.headingValue})`">
        <!-- Outer ring degree marks - every 1 degree -->
        <g>
          <line
            v-for="deg in 360"
            :key="deg"
            :transform="`rotate(${deg})`"
            x1="0" y1="-190"
            :x2="0"
            :y2="deg % 45 === 0 ? -182 : deg % 5 === 0 ? -182 : -185"
            :stroke="deg % 45 === 0 ? colors.majorTicks : colors.minorTicks"
            :stroke-width="deg % 45 === 0 ? 1.5 : deg % 5 === 0 ? 1 : 0.5"
            :opacity="deg % 45 === 0 ? 1 : deg % 5 === 0 ? 0.6 : 0.5"
          />
        </g>
        
        <!-- Outer compass numbers -->
        <g>
          <text x="87" y="-151" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(30 87 -151)">30</text>
          <text x="151" y="-87" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(60 151 -87)">60</text>
          <text x="151" y="87" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(120 151 87)">120</text>
          <text x="87" y="151" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(150 87 151)">150</text>
          <text x="-87" y="151" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(210 -87 151)">210</text>
          <text x="-151" y="87" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(240 -151 87)">240</text>
          <text x="-151" y="-87" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(300 -151 -87)">300</text>
          <text x="-87" y="-151" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(330 -87 -151)">330</text>
        </g>
        
        <!-- Cardinal directions -->
        <text x="0" y="-172" :fill="colors.cardinalDirections" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle">N</text>
        <text x="172" y="0" :fill="colors.cardinalDirections" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(90 172 0)">E</text>
        <text x="0" y="172" :fill="colors.cardinalDirections" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(180 0 172)">S</text>
        <text x="-172" y="0" :fill="colors.cardinalDirections" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(270 -172 0)">W</text>
      </g>
      
      <!-- Inner compass ring -->
      <circle cx="0" cy="0" r="140" fill="none" :stroke="colors.outerRing" stroke-width="6"/>
      <circle cx="0" cy="0" r="130" fill="none" :stroke="colors.outerRingInner" stroke-width="2"/>
      
      <!-- Blue background for bottom half (semicircle) -->
      <defs>
        <clipPath id="bottomHalf">
          <rect x="-140" y="0" width="280" height="140"/>
        </clipPath>
        <linearGradient id="blueToBlack" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#3e6a9f"/>
          <stop offset="50%" stop-color="#3e6a9f"/>
          <stop offset="100%" stop-color="#000000"/>
        </linearGradient>
      </defs>
      <circle cx="0" cy="0" r="120" fill="url(#blueToBlack)" opacity="0.6" clip-path="url(#bottomHalf)"/>
      
      <!-- Horizontal line across inner compass center -->
      <line x1="-120" y1="0" x2="120" y2="0" :stroke="colors.minorTicks" stroke-width="1"/>
      
      <!-- Inner ring degree marks - every 1 degree -->
      <g>
        <line
          v-for="deg in 360"
          :key="deg"
          :transform="`rotate(${deg})`"
          x1="0" y1="-140"
          :x2="0"
          :y2="deg % 45 === 0 ? -129 : deg % 5 === 0 ? -132 : -135"
          :stroke="deg % 45 === 0 ? colors.majorTicks : colors.minorTicks"
          :stroke-width="deg % 45 === 0 ? 1.5 : deg % 5 === 0 ? 1 : 0.5"
          :opacity="deg % 45 === 0 ? 1 : deg % 5 === 0 ? 0.6 : 0.5"
        />
      </g>
      
      <!-- Inner ring numbers - every 30 degrees -->
      <g>
        <text x="74" y="-128" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(30 74 -128)">30</text>
        <text x="128" y="-74" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(60 128 -74)">60</text>
        <text x="128" y="74" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(120 128 74)">120</text>
        <text x="74" y="128" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(150 74 128)">150</text>
        <text x="-74" y="128" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(210 -74 128)">210</text>
        <text x="-128" y="74" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(240 -128 74)">240</text>
        <text x="-128" y="-74" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(300 -128 -74)">300</text>
        <text x="-74" y="-128" :fill="colors.degreeNumbers" font-size="6" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(330 -74 -128)">330</text>
      </g>
      
      <!-- Inner ring cardinal directions -->
      <text x="0" y="-148" :fill="colors.cardinalDirections" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle">N</text>
      <text x="148" y="0" :fill="colors.cardinalDirections" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(90 148 0)">E</text>
      <text x="0" y="148" :fill="colors.cardinalDirections" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(180 0 148)">S</text>
      <text x="-148" y="0" :fill="colors.cardinalDirections" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle" dominant-baseline="middle" transform="rotate(270 -148 0)">W</text>
      
      <!-- Green arc on top of all elements -->
      <path d="M 0,-140 A 140,140 0 0,1 80.2,-115.2" fill="none" stroke="#00ff00" stroke-width="4" opacity="0.7"/>
      <!-- Red arc on top of all elements -->
      <path d="M 0,-140 A 140,140 0 0,0 -80.2,-115.2" fill="none" stroke="#ff0000" stroke-width="4" opacity="0.7"/>
      
      <!-- Data overlays -->
      <text x="0" y="-85" fill="#ffffff" font-size="20" font-family="monospace" font-weight="bold" text-anchor="middle">6°</text>
      <text x="0" y="-70" fill="#ffffff" font-size="10" font-family="monospace" text-anchor="middle">AWA</text>
      <text x="-2" y="-45" fill="#ffffff" font-size="20" font-family="monospace" font-weight="bold" text-anchor="end">18</text>
      <text x="2" y="-45" fill="#ffffff" font-size="10" font-family="monospace" text-anchor="start">kt</text>
      <text x="0" y="-30" fill="#ffffff" font-size="10" font-family="monospace" text-anchor="middle">AWS</text>
      <text x="-2" y="40" fill="#ffffff" font-size="20" font-family="monospace" font-weight="bold" text-anchor="end">15</text>
      <text x="2" y="40" fill="#ffffff" font-size="10" font-family="monospace" text-anchor="start">m</text>
      <text x="0" y="55" fill="#ffffff" font-size="10" font-family="monospace" text-anchor="middle">DBK</text>
      <text x="-2" y="80" fill="#ffffff" font-size="20" font-family="monospace" font-weight="bold" text-anchor="end">0.0</text>
      <text x="2" y="80" fill="#ffffff" font-size="10" font-family="monospace" text-anchor="start">kt</text>
      <text x="0" y="95" fill="#ffffff" font-size="10" font-family="monospace" text-anchor="middle">STW</text>
      <!-- Tide arrows above water icon -->
      <text x="32" y="66" fill="#ffffff" font-size="12" text-anchor="middle">↓</text>
      <text x="38" y="66" fill="#ffffff" font-size="12" text-anchor="middle">↓</text>
      
      <!-- Wave icon using foreignObject -->
      <foreignObject x="25" y="65" width="20" height="20">
        <i class="fas fa-water" style="color: white; font-size: 14px;"></i>
      </foreignObject>
      
      <!-- Red and green vertical lines below data displays -->
      <line x1="-2" y1="115" x2="-2" y2="125" stroke="#ff0000" stroke-width="3" opacity="0.7"/>
      <line x1="2" y1="115" x2="2" y2="125" stroke="#00ff00" stroke-width="3" opacity="0.7"/>
      
      <!-- SOG display below compass -->
      <text x="-0.2" y="220" fill="#ffffff" font-size="20" font-family="monospace" font-weight="bold" text-anchor="end">0.4</text>
      <text x="0.2" y="220" fill="#ffffff" font-size="10" font-family="monospace" text-anchor="start">kt</text>
      <text x="0" y="235" fill="#ffffff" font-size="10" font-family="monospace" text-anchor="middle">SOG</text>
            
      <!-- Heading indicator at top -->
      <g v-if="showHeading">
        <!-- Heading text at top -->
        <text x="0" y="-230" fill="#ffffff" font-size="16" font-weight="bold" font-family="monospace" text-anchor="middle">{{ props.headingValue }}°</text>
        <!-- HDT text below heading -->
        <text x="0" y="-215" fill="#ffffff" font-size="10" font-family="monospace" text-anchor="middle">HDT</text>
      </g>
      
      <!-- COG (Course Over Ground) indicator -->
      <g v-if="showCog">
        <g :transform="`rotate(${props.cogValue})`">
          <!-- COG text closer to circle -->
          <text x="0" y="-200" fill="#ffffff" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">COG</text>
          <!-- Vertical line below COG -->
          <line x1="0" y1="-195" x2="0" y2="-185" stroke="#ffffff" stroke-width="2"/>
        </g>
      </g>
      
    </svg>
  </div>
</template>

<script setup>

const props = defineProps({
  layout: { type: Object, required: false },
  widgets: { type: Object, required: false, default: () => {} },
  cogValue: { type: Number, default: 90 }, // Course Over Ground in degrees
  headingValue: { type: Number, default: 0 }, // Heading in degrees
  showCog: { type: Boolean, default: true }, // Show/hide COG indicator
  showHeading: { type: Boolean, default: true } // Show/hide heading indicator
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
