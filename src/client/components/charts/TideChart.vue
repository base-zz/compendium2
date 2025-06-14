<template>
  <div 
    ref="chartContainer"
    class="tide-chart-container" 
    :style="{ height: `${height}px` }"
    @click="handleClick"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
  >
    <div class="tide-chart">
      <div v-if="!hasTideData" class="no-data">
        No tide data available
      </div>
      <template v-else>
        <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" class="tide-svg">
          <!-- Background -->
          <rect width="100%" height="100%" fill="#f5f7fa" />
          
          <!-- Grid lines -->
          <g v-for="(tick, index) in yTicks" :key="'y' + index">
            <line 
              :x1="props.padding.left" 
              :y1="yScale(tick)" 
              :x2="width - props.padding.right" 
              :y2="yScale(tick)" 
              class="grid-line"
            />
            <!-- Y-axis tick marks -->
            <line 
              :x1="props.padding.left - 6"
              :y1="yScale(tick)" 
              :x2="props.padding.left" 
              :y2="yScale(tick)" 
              stroke="#000"
              stroke-width="1.5"
            />
            <!-- Y-axis labels -->
            <text 
              :x="props.padding.left - 10" 
              :y="yScale(tick) + 4" 
              font-size="12" 
              text-anchor="end"
              fill="#000"
              font-weight="500"
              class="y-axis-label"
            >
              {{ typeof tick === 'number' ? tick.toFixed(1) + 'm' : '--' }}
            </text>
          </g>
          
          <!-- X-axis line -->
          <line 
            :x1="props.padding.left" 
            :y1="height - props.padding.bottom" 
            :x2="width - props.padding.right" 
            :y2="height - props.padding.bottom" 
            stroke="#000"
            stroke-width="2"
            stroke-linecap="square"
          />
          
          <!-- X-axis ticks and labels -->
          <g v-for="(tick, index) in xTicks" :key="'x' + index">
            <!-- X-axis tick marks -->
            <line 
              :x1="xScale(tick.time)" 
              :y1="height - props.padding.bottom" 
              :x2="xScale(tick.time)" 
              :y2="height - props.padding.bottom + (tick.isMajor ? 12 : 8)" 
              :stroke="tick.isMajor ? '#000' : '#999'"
              :stroke-width="tick.isMajor ? '1.5' : '1.2'"
              :stroke-dasharray="tick.isMajor ? 'none' : '2,2'"
              class="x-tick"
              :class="{ 'major-tick': tick.isMajor, 'minor-tick': !tick.isMajor }"
            />
            <!-- X-axis labels (only for major ticks) -->
            <text 
              v-if="tick.isMajor"
              :x="xScale(tick.time)" 
              :y="height - props.padding.bottom + 24" 
              font-size="12" 
              text-anchor="middle"
              fill="#000"
              font-weight="500"
              class="x-axis-label"
            >
              {{ formatTime(tick.time) }}
            </text>
          </g>
          
          <!-- Tide line -->
          <path 
            v-if="tidePath"
            :d="tidePath" 
            fill="none" 
            stroke="#4a90e2" 
            stroke-width="2" 
            stroke-linejoin="round"
          />
          
          <!-- Current time indicator -->
          <line 
            v-if="currentTimeX !== null"
            :x1="currentTimeX" 
            y1="0" 
            :x2="currentTimeX" 
            :y2="height - props.padding.bottom" 
            stroke="#ff6b6b" 
            stroke-width="1.5"
            stroke-dasharray="4,2"
          />
          <text 
            v-if="currentTimeX !== null"
            :x="currentTimeX + 5" 
            y="15" 
            font-size="10" 
            text-anchor="middle"
            fill="#ff6b6b"
            font-weight="bold"
          >
            Now
          </text>
          
          <!-- Cursor indicator (only shown when hovering) -->
          <line 
            v-if="isHovering && cursorX !== null"
            :x1="cursorX" 
            y1="0" 
            :x2="cursorX" 
            :y2="height" 
            stroke="#4a90e2" 
            stroke-width="1" 
            stroke-dasharray="4, 2"
            class="cursor-line"
          />
          <g v-if="isHovering && cursorTime">
            <text 
              :x="cursorX + 5" 
              :y="40" 
              font-size="12" 
              fill="#4a90e2"
              class="cursor-time-label"
            >
              {{ formatCursorTime(cursorTime) }}
            </text>
            <text 
              v-if="cursorValue !== null"
              :x="cursorX + 5" 
              :y="55" 
              font-size="10" 
              fill="#4a90e2"
              class="cursor-value-label"
            >
              {{ cursorValue.toFixed(2) }}m
            </text>
          </g>
          
          <!-- Current tide level indicator -->
          <circle 
            v-if="currentTideY !== null"
            :cx="currentTimeX" 
            :cy="currentTideY" 
            r="4" 
            fill="#ff6b6b"
          />
        </svg>
        
        <div class="tide-stats">
          <div class="tide-stat">
            <span class="label">Current:</span>
            <span class="value">{{ currentTideLevel !== null ? currentTideLevel.toFixed(2) + 'm' : '--' }}</span>
          </div>
          <div class="tide-stat">
            <span class="label">Next High:</span>
            <span class="value">
              {{ nextHighTide && nextHighTide.value !== null ? 
                 `${nextHighTide.value.toFixed(2)}m at ${formatTime(nextHighTide.time)}` : '--' }}
            </span>
          </div>
          <div class="tide-stat">
            <span class="label">Next Low:</span>
            <span class="value">
              {{ nextLowTide && nextLowTide.value !== null ? 
                 `${nextLowTide.value.toFixed(2)}m at ${formatTime(nextLowTide.time)}` : '--' }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStateDataStore } from '@client/stores/stateDataStore';
import { storeToRefs } from 'pinia';
import { scaleLinear } from 'd3-scale';
import { scaleTime } from 'd3-scale';

// Props
const props = defineProps({
  width: {
    type: Number,
    default: 800
  },
  height: {
    type: Number,
    default: 400
  },
  padding: {
    type: Object,
    default: () => ({
      top: 30,
      right: 30,
      bottom: 50,
      left: 60
    })
  }
});

// State
const stateStore = useStateDataStore();
const { state } = storeToRefs(stateStore);
const currentTime = ref(new Date());

// Check if we have valid tide data
const hasTideData = computed(() => {
  const times = tideData.value?.hourly?.time || [];
  const levels = tideData.value?.hourly?.values?.seaLevelHeightMsl || {};
  return times.length > 0 && Object.keys(levels).length > 0;
});

// Computed properties
const tideData = computed(() => state.value?.tides || { hourly: { time: [], values: { seaLevelHeightMsl: {} } } });

const seaLevels = computed(() => {
  if (!tideData.value?.hourly?.values?.seaLevelHeightMsl) return [];
  return Object.values(tideData.value.hourly.values.seaLevelHeightMsl);
});

const times = computed(() => {
  if (!tideData.value?.hourly?.time) return [];
  return tideData.value.hourly.time.map(time => new Date(time));
});

const currentTideLevel = computed(() => {
  if (!times.value.length || !seaLevels.value.length) return null;
  
  const now = currentTime.value;
  const index = times.value.findIndex(time => time > now);
  
  if (index <= 0) return seaLevels.value[0];
  if (index === -1) return seaLevels.value[seaLevels.value.length - 1];
  
  // Linear interpolation between the two closest points
  const prevTime = times.value[index - 1];
  const nextTime = times.value[index];
  const prevValue = seaLevels.value[index - 1];
  const nextValue = seaLevels.value[index];
  
  const ratio = (now - prevTime) / (nextTime - prevTime);
  return prevValue + (nextValue - prevValue) * ratio;
});

// Y scale for the chart
const yScale = computed(() => {
  if (!seaLevels.value || seaLevels.value.length === 0) {
    return () => 0; // Return a function that always returns 0 if no data
  }
  
  const min = Math.min(...seaLevels.value);
  const max = Math.max(...seaLevels.value);
  const range = max - min;
  
  // Use a smaller padding (10% of the data range) to reduce whitespace
  const padding = Math.max(0.1, range * 0.1); // Ensure at least 0.1m padding
  const paddedMin = min - padding;
  const paddedMax = max + padding;
  
  const totalHeight = props.height - props.padding.top - props.padding.bottom;
  
  return (value) => {
    const scale = (value - paddedMin) / (paddedMax - paddedMin);
    return props.height - props.padding.bottom - (scale * totalHeight);
  };
});

// X scale for the chart
const xScale = computed(() => {
  if (!times.value || times.value.length === 0) return null;
  
  const start = new Date(times.value[0]);
  const end = new Date(times.value[times.value.length - 1]);
  
  return scaleTime()
    .domain([start, end])
    .range([props.padding.left, props.width - props.padding.right]);
});

// Generate Y axis ticks
const yTicks = computed(() => {
  if (!seaLevels.value || seaLevels.value.length === 0) return [];
  
  const min = Math.min(...seaLevels.value);
  const max = Math.max(...seaLevels.value);
  const range = max - min || 1;
  
  const tickCount = 5;
  const step = range / (tickCount - 1);
  const ticks = [];
  
  for (let i = 0; i < tickCount; i++) {
    ticks.push(min + i * step);
  }
  
  return ticks;
});

// Generate X-axis ticks with major ticks at midnight and minor ticks at noon
const xTicks = computed(() => {
  if (!times.value || times.value.length === 0) return [];
  
  const start = new Date(times.value[0]);
  const end = new Date(times.value[times.value.length - 1]);
  
  // Calculate number of days in range
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const ticks = [];
  
  // Add one tick per day at midnight (major) and noon (minor)
  for (let i = 0; i <= days; i++) {
    const midnight = new Date(start);
    midnight.setDate(start.getDate() + i);
    midnight.setHours(0, 0, 0, 0);
    const noon = new Date(midnight);
    noon.setHours(12, 0, 0, 0);
    
    // Only add if within our time range
    if (midnight >= start && midnight <= end) {
      ticks.push({ time: new Date(midnight), isMajor: true });
    }
    if (noon >= start && noon <= end) {
      ticks.push({ time: new Date(noon), isMajor: false });
    }
  }
  
  // Always include the start time
  if (ticks.length === 0 || ticks[0].time.getTime() !== start.getTime()) {
    ticks.unshift({ time: new Date(start), isMajor: start.getHours() === 0 });
  }
  
  // Always include the end time
  const lastTick = ticks[ticks.length - 1];
  if (!lastTick || lastTick.time.getTime() !== end.getTime()) {
    ticks.push({ time: new Date(end), isMajor: end.getHours() === 0 });
  }
  
  // Sort to ensure proper order and remove duplicates
  const uniqueTicks = [];
  const seen = new Set();
  
  ticks.forEach(tick => {
    const key = tick.time.getTime();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTicks.push(tick);
    }
  });
  
  return uniqueTicks.sort((a, b) => a.time - b.time);
});

// Generate the SVG path for the tide line
const tidePath = computed(() => {
  if (!times.value.length || !seaLevels.value.length) return '';
  
  let path = `M${xScale.value(times.value[0])},${yScale.value(seaLevels.value[0])}`;
  
  for (let i = 1; i < times.value.length; i++) {
    path += ` L${xScale.value(times.value[i])},${yScale.value(seaLevels.value[i])}`;
  }
  
  return path;
});

// Current time position on the X axis
const currentTimeX = computed(() => {
  if (!times.value.length) return null;
  
  const now = currentTime.value;
  const startTime = times.value[0];
  const endTime = times.value[times.value.length - 1];
  
  if (now < startTime || now > endTime) return null;
  
  return xScale.value(now);
});

// Current tide level position on the Y axis
const currentTideY = computed(() => {
  if (currentTideLevel.value === null) return null;
  return yScale.value(currentTideLevel.value);
});

// Find the next high or low tide
function findNextExtreme(type) {
  if (!times.value.length || !seaLevels.value.length) return { time: null, value: null };
  
  const now = currentTime.value;
  let extremeValue = type === 'high' ? -Infinity : Infinity;
  let extremeTime = null;
  
  // Find the next extreme after current time
  for (let i = 0; i < times.value.length; i++) {
    const time = times.value[i];
    const value = seaLevels.value[i];
    
    if (time <= now) continue;
    
    if ((type === 'high' && value > extremeValue) || 
        (type === 'low' && value < extremeValue)) {
      extremeValue = value;
      extremeTime = time;
    }
  }
  
  return {
    time: extremeTime,
    value: extremeValue
  };
}

// Next high and low tides
const nextHighTide = computed(() => findNextExtreme('high'));
const nextLowTide = computed(() => findNextExtreme('low'));

// Format time for display (shows day and time for midnight)
function formatTime(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '--';
  
  const day = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const hour = date.getHours();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12AM/PM
  
  return `${day} ${displayHour}${ampm}`;
}

// Interactive cursor state
const cursorX = ref(0);
const cursorY = ref(0);
const cursorTime = ref(null);
const cursorValue = ref(null);
const isHovering = ref(false);
const rafId = ref(null);

// Format time for cursor display
function formatCursorTime(date) {
  if (!date) return '';
  const options = { 
    weekday: 'short',
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  };
  // Format as "Mon 2:30pm"
  return date.toLocaleTimeString('en-US', options)
    .replace(/([ap]m)$/, (_, period) => period.toLowerCase()) // lowercase am/pm
    .replace(/^([^,]+),\s*/, ''); // remove the comma after weekday
}

// Handle mouse/touch movement with requestAnimationFrame
function handleMouseMove(event) {
  if (!chartContainer.value || !xScale.value) return;
  
  // Cancel any pending animation frame
  if (rafId.value) {
    cancelAnimationFrame(rafId.value);
  }
  
  // Use requestAnimationFrame for smoother updates
  rafId.value = requestAnimationFrame(() => {
    const svg = chartContainer.value.querySelector('svg');
    const svgRect = svg.getBoundingClientRect();
    
    // Create a scale to convert from viewport to viewBox coordinates
    const viewBox = svg.viewBox.baseVal;
    const viewportToViewBox = scaleLinear()
      .domain([0, svgRect.width])
      .range([0, viewBox.width]);
    
    // Create a scale to convert from viewBox to viewport coordinates
    const viewBoxToViewport = scaleLinear()
      .domain([0, viewBox.width])
      .range([0, svgRect.width]);
    
    // Get mouse position relative to SVG
    const mouseX = event.clientX - svgRect.left;
    
    // Convert to viewBox coordinates
    const viewBoxX = viewportToViewBox(mouseX);
    
    // Get the scale's range in viewBox coordinates
    const scaleRange = xScale.value.range();
    
    // Log detailed position information
    // console.log('--- Mouse Move ---');
    // console.log('SVG rect:', { left: svgRect.left, width: svgRect.width });
    // console.log('ViewBox:', { width: viewBox.width, height: viewBox.height });
    // console.log('Mouse position (clientX, svgX, viewBoxX):', event.clientX, mouseX, viewBoxX);
    // console.log('Scale range:', scaleRange);
    
    // Only update if within chart bounds
    if (mouseX >= 0 && mouseX <= svgRect.width) {
      // Set cursor position in viewport coordinates
      cursorX.value = viewBoxX;
      cursorY.value = event.clientY - svgRect.top;
      isHovering.value = true;
      
      try {
        // Convert viewBox X to time value
        const timeValue = xScale.value.invert(viewBoxX);
        cursorTime.value = new Date(timeValue);
        
        // Find the closest data point to get the Y value
        if (times.value.length > 0 && seaLevels.value.length > 0) {
          // Find the index of the nearest time
          let closestIndex = 0;
          let minDiff = Infinity;
          const targetTime = timeValue.getTime();
          
          times.value.forEach((time, index) => {
            const diff = Math.abs(new Date(time).getTime() - targetTime);
            if (diff < minDiff) {
              minDiff = diff;
              closestIndex = index;
            }
          });
          
          cursorValue.value = seaLevels.value[closestIndex];
        }
        
        // Log scale information
        // console.log('Scale domain:', xScale.value.domain().map(d => d.toString()));
        // console.log('Computed cursor X (viewBox):', cursorX.value);
        // console.log('Time value:', cursorTime.value);
        // console.log('Y value:', cursorValue.value);
      } catch (e) {
        console.error('Error inverting scale:', e);
        isHovering.value = false;
      }
    } else {
      isHovering.value = false;
    }
    
    rafId.value = null;
  });
}

function handleMouseLeave() {
  isHovering.value = false;
  cursorX.value = null;
  cursorTime.value = null;
}

// Handle click for debugging
function handleClick(event) {
  const svg = chartContainer.value.querySelector('svg');
  const svgRect = svg.getBoundingClientRect();
  const clickX = event.clientX - svgRect.left;
  
  // console.log('--- Click ---');
  // console.log('Click position (clientX, svgX):', event.clientX, clickX);
  // console.log('Current cursorX:', cursorX.value);
  // console.log('Scale range:', xScale.value ? xScale.value.range() : 'Scale not ready');
  // console.log('SVG width:', svgRect.width);
  // console.log('Padding:', props.padding);
}

// Touch event handlers
function handleTouchStart(event) {
  event.preventDefault();
  if (event.touches.length > 0) {
    handleMouseMove(event.touches[0]);
  }
}

function handleTouchMove(event) {
  if (event.touches.length > 0) {
    // Prevent scrolling
    event.preventDefault();
    // Use first touch
    handleMouseMove(event.touches[0]);
  }
}

function handleTouchEnd() {
  isHovering.value = false;
  cursorX.value = null;
  cursorTime.value = null;
}



// Refs
const chartContainer = ref(null);
const timeUpdateInterval = ref(null);

// Lifecycle

onMounted(() => {
  currentTime.value = new Date();
  timeUpdateInterval.value = setInterval(() => {
    currentTime.value = new Date();
  }, 60000); // Update current time every minute
  
  // Add event listeners
  const container = chartContainer.value;
  if (container) {
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
  }
});

// Clean up animation frame on unmount
onUnmounted(() => {
  if (rafId.value) {
    cancelAnimationFrame(rafId.value);
  }
  
  // Clean up interval
  if (timeUpdateInterval.value) {
    clearInterval(timeUpdateInterval.value);
  }
  
  // Remove event listeners
  const container = chartContainer.value;
  if (container) {
    container.removeEventListener('mousemove', handleMouseMove);
    container.removeEventListener('mouseleave', handleMouseLeave);
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchmove', handleTouchMove);
    container.removeEventListener('touchend', handleTouchEnd);
  }
});

</script>

<style scoped>
.tide-chart {
  font-family: 'Arial', sans-serif;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 16px;
  margin: 16px 0;
  overflow: visible; /* Ensure nothing gets cut off */
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px; /* Match the chart height */
  color: #666;
  font-style: italic;
  font-size: 1.1em;
}

.tide-svg {
  display: block;
  max-width: 100%;
  height: auto;
}

.x-axis-label {
  user-select: none;
}

.y-axis-label {
  user-select: none;
}

/* Style for grid lines */
.grid-line {
  stroke: #e0e6ed;
  stroke-width: 1;
  stroke-dasharray: 2,2;
}

.tide-stats {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 4px;
}

.tide-stat {
  text-align: center;
  padding: 0.25rem 0.5rem;
}

.tide-stat .label {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.tide-stat .value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

@media (max-width: 768px) {
  .tide-stats {
    flex-direction: column;
    gap: 0.75rem;
    margin: 1rem 0.75rem 0.5rem 0.75rem;
    padding: 1rem;
  }
  
  .tide-stat {
    text-align: left;
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 6px;
  }
  
  .tide-stat .label {
    margin-bottom: 0;
    margin-right: 1rem;
    font-weight: 500;
  }
  
  .tide-stat .value {
    font-weight: 600;
  }
  
  .tide-chart {
    padding: 4px 0; /* Remove horizontal padding */
    width: 100%;
    margin: 0;
  }
  
  .tide-svg {
    width: 100%;
    min-width: 100%;
  }
  
  .tide-chart-container {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0;
    padding: 0;
  }
  
  /* Make sure the SVG scales properly */
  svg {
    max-width: 100%;
    height: auto;
  }
}
</style>
