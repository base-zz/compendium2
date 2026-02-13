<template>
  <div 
    ref="chartContainer"
    class="tide-chart-container" 
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
          <rect width="100%" height="100%" class="chart-background" />
          
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
              stroke="currentColor"
              stroke-width="1.5"
            />
            <!-- Y-axis labels -->
            <text 
              :x="props.padding.left - 10" 
              :y="yScale(tick) + 4" 
              font-size="12" 
              font-weight="500"
              text-anchor="end"
              class="axis-label y-axis-label"
            >
              {{ typeof tick === 'number' ? tick.toFixed(1) + seaLevelUnitLabel : '--' }}
            </text>
          </g>
          
          <!-- X-axis line -->
          <line 
            :x1="props.padding.left" 
            :y1="height - props.padding.bottom" 
            :x2="width - props.padding.right" 
            :y2="height - props.padding.bottom" 
            class="axis-line"
            stroke-linecap="square"
          />
          
          <!-- X-axis ticks, labels, and vertical grid lines -->
          <g v-for="(tick, index) in xTicks" :key="'x' + index">
            <!-- Vertical grid lines extending up through chart -->
            <line 
              v-if="tick.isMajor"
              :x1="xScale(tick.time)" 
              :y1="height - props.padding.bottom" 
              :x2="xScale(tick.time)" 
              :y2="props.padding.top" 
              class="grid-line"
            />
            <!-- X-axis tick marks -->
            <line 
              :x1="xScale(tick.time)" 
              :y1="height - props.padding.bottom" 
              :x2="xScale(tick.time)" 
              :y2="height - props.padding.bottom + (tick.isMajor ? 12 : 8)" 
              :class="['axis-tick', tick.isMajor ? 'tick-major' : 'tick-minor']"
              :stroke-width="tick.isMajor ? '1.5' : '1.2'"
              :stroke-dasharray="tick.isMajor ? 'none' : '2,2'"
            />
            <!-- X-axis labels (only for major ticks) -->
            <text 
              v-if="tick.isMajor"
              :x="xScale(tick.time)" 
              :y="height - props.padding.bottom + 18" 
              font-size="12" 
              text-anchor="middle"
              font-weight="500"
              class="axis-label x-axis-label"
            >
              {{ formatXAxisTick(tick.time) }}
            </text>
          </g>

          <!-- Day band (weekday labels) -->
          <g v-for="(band, index) in dayBands" :key="'dayband' + index">
            <rect
              :x="band.x1"
              :y="bandY"
              :width="band.x2 - band.x1"
              :height="bandHeight"
              :class="['day-band-rect', index % 2 === 1 ? 'day-band-rect-alt' : '']"
              rx="4"
              ry="4"
            />
            <text
              :x="(band.x1 + band.x2) / 2"
              :y="bandY + bandHeight - 4"
              font-size="11"
              text-anchor="middle"
              class="day-band-label"
              font-weight="600"
            >
              {{ band.label }}
            </text>
          </g>
          
          <!-- Tide line -->
          <path 
            v-if="tidePath"
            :d="tidePath" 
            fill="none" 
            class="tide-line"
            stroke-width="2" 
            stroke-linejoin="round"
          />
          
          <!-- Current velocity line (split by flood/ebb) -->
          <g v-if="hasCurrentData">
            <!-- Ebb current (negative velocity, below center) -->
            <path 
              v-if="currentPaths.ebb"
              :d="currentPaths.ebb" 
              fill="none" 
              class="current-line-ebb"
              stroke-width="2" 
              stroke-linejoin="round"
            />
            <!-- Flood current (positive velocity, above center) -->
            <path 
              v-if="currentPaths.flood"
              :d="currentPaths.flood" 
              fill="none" 
              class="current-line-flood"
              stroke-width="2" 
              stroke-linejoin="round"
            />
            <!-- Zero line reference -->
            <line 
              :x1="padding.left" 
              :y1="height - padding.bottom - (height - padding.top - padding.bottom) / 2"
              :x2="width - padding.right" 
              :y2="height - padding.bottom - (height - padding.top - padding.bottom) / 2"
              class="current-zero-line"
              stroke-width="1"
              stroke-dasharray="3,3"
            />
          </g>
          
          <!-- Current time indicator -->
          <line 
            v-if="currentTimeX !== null"
            :x1="currentTimeX" 
            y1="0" 
            :x2="currentTimeX" 
            :y2="height - props.padding.bottom" 
            class="indicator-line"
            stroke-width="1.5"
            stroke-dasharray="4,2"
          />
          <text 
            v-if="currentTimeX !== null"
            :x="currentTimeX + 5" 
            y="15" 
            font-size="10" 
            text-anchor="middle"
            class="indicator-label"
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
            stroke-width="1" 
            stroke-dasharray="4, 2"
            class="cursor-line"
          />
          <g v-if="isHovering && cursorTime">
            <text 
              :x="cursorX + 5" 
              :y="40" 
              font-size="12" 
              class="cursor-time-label"
            >
              {{ formatCursorTime(cursorTime) }}
            </text>
            <text 
              v-if="cursorValue !== null"
              :x="cursorX + 5" 
              :y="55" 
              font-size="10" 
              class="cursor-value-label"
            >
              {{ cursorValue.toFixed(2) }}{{ seaLevelUnitLabel }}
            </text>
          </g>
          
          <!-- Current tide level indicator -->
          <circle 
            v-if="currentTideY !== null"
            :cx="currentTimeX" 
            :cy="currentTideY" 
            r="4" 
            class="indicator-dot"
          />
        </svg>
        
        <!-- Chart Legend -->
        <div v-if="hasCurrentData" class="chart-legend">
          <div class="legend-item">
            <div class="legend-line tide"></div>
            <span>Tide Height</span>
          </div>
          <div class="legend-item">
            <div class="legend-line flood"></div>
            <span>Flood Current (in)</span>
          </div>
          <div class="legend-item">
            <div class="legend-line ebb"></div>
            <span>Ebb Current (out)</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStateDataStore } from '@/stores/stateDataStore';
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

const tideData = computed(() => state.value?.tides);
const seaLevelUnit = computed(() => tideData.value?.units?.seaLevelHeight);
const seaLevelUnitLabel = computed(() => (typeof seaLevelUnit.value === 'string' ? seaLevelUnit.value : ''));

const dataPoints = computed(() => {
  const timeValues = tideData.value?.hourly?.time;
  const levelValues = tideData.value?.hourly?.values?.seaLevelHeightMsl;

  if (!Array.isArray(timeValues) || !Array.isArray(levelValues)) return [];

  const minLength = Math.min(timeValues.length, levelValues.length);
  const points = [];

  for (let i = 0; i < minLength; i += 1) {
    const rawTime = timeValues[i];
    const rawLevel = levelValues[i];

    const time = rawTime instanceof Date ? rawTime : new Date(rawTime);
    if (!(time instanceof Date) || Number.isNaN(time.getTime())) continue;
    if (typeof rawLevel !== 'number' || Number.isNaN(rawLevel)) continue;

    points.push({ time, level: rawLevel });
  }

  return points;
});

const windowedDataPoints = computed(() => {
  const points = dataPoints.value;
  if (!Array.isArray(points) || points.length === 0) return [];

  const minTime = points[0]?.time;
  const maxTime = points[points.length - 1]?.time;
  if (!(minTime instanceof Date) || Number.isNaN(minTime.getTime())) return [];
  if (!(maxTime instanceof Date) || Number.isNaN(maxTime.getTime())) return [];

  const totalMs = maxTime.getTime() - minTime.getTime();
  if (!(typeof totalMs === 'number') || Number.isNaN(totalMs) || totalMs <= 0) return [];

  const now = currentTime.value;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return [];

  const pastAvailableMs = now.getTime() - minTime.getTime();
  const futureAvailableMs = maxTime.getTime() - now.getTime();

  // If we don't have past or future data, just return all available points.
  if (!(pastAvailableMs > 0) || !(futureAvailableMs > 0)) {
    return points;
  }

  // Enforce a 1/4 past + 3/4 future window around now, clamped to available data.
  // Choose the largest window that preserves the ratio.
  const futureSpanMs = Math.min(futureAvailableMs, pastAvailableMs * 3);
  const pastSpanMs = futureSpanMs / 3;

  const windowStart = new Date(now.getTime() - pastSpanMs);
  const windowEnd = new Date(now.getTime() + futureSpanMs);

  if (windowStart >= windowEnd) return [];

  return points.filter((p) => p.time >= windowStart && p.time <= windowEnd);
});

// Check if we have valid tide data
const hasTideData = computed(() => {
  return windowedDataPoints.value.length > 0;
});

const seaLevels = computed(() => {
  return windowedDataPoints.value.map((p) => p.level);
});

const times = computed(() => {
  return windowedDataPoints.value.map((p) => p.time);
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

// Current velocity data computed properties
const currentVelocityUnit = computed(() => tideData.value?.units?.currentVelocity || 'kt');

const currentDataPoints = computed(() => {
  // Prefer real NOAA current data, fall back to imputed
  const realData = tideData.value?.currentEvents?.predictions;
  const imputedData = tideData.value?.imputedCurrent?.predictions;
  
  const predictions = Array.isArray(realData) && realData.length > 0 
    ? realData 
    : (Array.isArray(imputedData) ? imputedData : []);
  
  if (predictions.length === 0) return [];
  
  const points = [];
  
  for (const p of predictions) {
    const rawTime = p?.time;
    const velocity = p?.velocity;
    const type = p?.type;
    
    if (!rawTime || typeof velocity !== 'number') continue;
    
    const time = rawTime instanceof Date ? rawTime : new Date(rawTime);
    if (!(time instanceof Date) || Number.isNaN(time.getTime())) continue;
    
    // Velocity is now signed from server: positive=flood, negative=ebb
    points.push({ time, velocity, type });
  }
  
  // Sort by time
  points.sort((a, b) => a.time.getTime() - b.time.getTime());
  
  return points;
});

const hasCurrentData = computed(() => currentDataPoints.value.length > 0);

const currentVelocities = computed(() => {
  return currentDataPoints.value.map((p) => p.velocity);
});

const currentTimes = computed(() => {
  return currentDataPoints.value.map((p) => p.time);
});

// Window current data using same centered window logic as tide data
const windowedCurrentDataPoints = computed(() => {
  const points = currentDataPoints.value;
  if (points.length === 0) return [];
  
  // Use full data range if no times available
  if (!times.value.length) return points;
  
  // Get the tide window range (1/4 past, 3/4 future from now)
  const now = currentTime.value;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return points;
  
  const minTime = times.value[0];
  const maxTime = times.value[times.value.length - 1];
  
  if (!(minTime instanceof Date) || !(maxTime instanceof Date)) return points;
  
  const pastAvailableMs = now.getTime() - minTime.getTime();
  const futureAvailableMs = maxTime.getTime() - now.getTime();
  
  if (pastAvailableMs <= 0 || futureAvailableMs <= 0) {
    return points; // Return all if we can't determine window
  }
  
  const futureSpanMs = Math.min(futureAvailableMs, pastAvailableMs * 3);
  const pastSpanMs = futureSpanMs / 3;
  
  const windowStart = new Date(now.getTime() - pastSpanMs);
  const windowEnd = new Date(now.getTime() + futureSpanMs);
  
  return points.filter((p) => p.time >= windowStart && p.time <= windowEnd);
});

const windowedCurrentVelocities = computed(() => {
  const velocities = windowedCurrentDataPoints.value.map((p) => p.velocity);
  
  // Apply moving average smoothing
  const smoothed = [];
  const windowSize = 3;
  
  for (let i = 0; i < velocities.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - Math.floor(windowSize/2)); 
         j <= Math.min(velocities.length - 1, i + Math.floor(windowSize/2)); 
         j++) {
      sum += velocities[j];
      count++;
    }
    smoothed.push(sum / count);
  }
  
  return smoothed;
});

const windowedCurrentTimes = computed(() => {
  return windowedCurrentDataPoints.value.map((p) => p.time);
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

// Generate X-axis ticks with labels every 2 hours
const xTicks = computed(() => {
  if (!times.value || times.value.length === 0) return [];
  
  const start = new Date(times.value[0]);
  const end = new Date(times.value[times.value.length - 1]);

  if (!(start instanceof Date) || Number.isNaN(start.getTime())) return [];
  if (!(end instanceof Date) || Number.isNaN(end.getTime())) return [];

  const ticks = [];
  const twoHoursMs = 2 * 60 * 60 * 1000;

  // Align first tick to the next 2-hour boundary.
  const firstTick = new Date(start);
  firstTick.setMinutes(0, 0, 0);
  if (start.getMinutes() !== 0 || start.getSeconds() !== 0 || start.getMilliseconds() !== 0) {
    firstTick.setHours(firstTick.getHours() + 1);
  }
  if (firstTick.getHours() % 2 !== 0) {
    firstTick.setHours(firstTick.getHours() + 1);
  }

  for (let t = firstTick.getTime(); t <= end.getTime(); t += twoHoursMs) {
    ticks.push({ time: new Date(t), isMajor: true });
  }

  // Ensure there's at least a start/end tick if the range is tiny.
  if (ticks.length === 0) {
    ticks.push({ time: new Date(start), isMajor: true });
    ticks.push({ time: new Date(end), isMajor: true });
  }

  // Remove duplicates (can happen when start/end align perfectly)
  const uniqueTicks = [];
  const seen = new Set();

  ticks.forEach((tick) => {
    const key = tick.time.getTime();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTicks.push(tick);
    }
  });

  return uniqueTicks.sort((a, b) => a.time - b.time);
});

const bandHeight = 14;
const bandY = computed(() => props.height - props.padding.bottom + 22);

const dayBands = computed(() => {
  if (!times.value || times.value.length === 0 || !xScale.value) return [];

  const start = times.value[0];
  const end = times.value[times.value.length - 1];
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) return [];
  if (!(end instanceof Date) || Number.isNaN(end.getTime())) return [];

  const bands = [];

  // Start at local midnight of the chart start.
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  if (cursor < start) {
    cursor.setDate(cursor.getDate() + 1);
  }

  // If the range starts mid-day, include the partial first day segment.
  const firstDayStart = new Date(start);
  const firstDayEnd = new Date(cursor);
  if (firstDayEnd > firstDayStart) {
    const label = firstDayStart.toLocaleDateString('en-US', { weekday: 'short' });
    bands.push({ start: firstDayStart, end: firstDayEnd, label });
  }

  // Full days between
  while (cursor < end) {
    const dayStart = new Date(cursor);
    const dayEnd = new Date(cursor);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const clippedEnd = dayEnd > end ? end : dayEnd;

    const label = dayStart.toLocaleDateString('en-US', { weekday: 'short' });
    bands.push({ start: dayStart, end: clippedEnd, label });

    cursor.setDate(cursor.getDate() + 1);
  }

  return bands
    .map((b) => ({
      x1: xScale.value(b.start),
      x2: xScale.value(b.end),
      label: b.label,
    }))
    .filter((b) => typeof b.x1 === 'number' && typeof b.x2 === 'number' && b.x2 > b.x1);
});

// Generate the SVG path for the tide line with smoothing
const tidePath = computed(() => {
  if (!times.value.length || !seaLevels.value.length) return '';
  
  // Apply moving average smoothing
  const smoothedLevels = [];
  const windowSize = 3; // Average 3 points
  
  for (let i = 0; i < seaLevels.value.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - Math.floor(windowSize/2)); 
         j <= Math.min(seaLevels.value.length - 1, i + Math.floor(windowSize/2)); 
         j++) {
      sum += seaLevels.value[j];
      count++;
    }
    smoothedLevels.push(sum / count);
  }
  
  const xVals = times.value.map(t => xScale.value(t));
  const yVals = smoothedLevels.map(l => yScale.value(l));
  
  if (xVals.length < 2) return '';
  
  // Start path
  let path = `M${xVals[0]},${yVals[0]}`;
  
  // Use simple line segments (smoothing handled by data averaging)
  for (let i = 1; i < xVals.length; i++) {
    path += ` L${xVals[i]},${yVals[i]}`;
  }
  
  return path;
});

// Current velocity scale (centered at zero, maps to same vertical space as tide)
const currentScale = computed(() => {
  if (!windowedCurrentVelocities.value || windowedCurrentVelocities.value.length === 0) {
    return () => props.height / 2; // Center of chart
  }
  
  // Find max velocity for scaling (use absolute value)
  const maxVel = Math.max(...windowedCurrentVelocities.value.map(Math.abs));
  if (maxVel === 0) return () => props.height / 2;
  
  // Use the same vertical space as tide chart, with zero in the middle
  const chartHeight = props.height - props.padding.top - props.padding.bottom;
  const zeroY = props.height - props.padding.bottom - (chartHeight / 2);
  
  return (velocity) => {
    // Scale: zero at center, positive (flood) up, negative (ebb) down
    const scale = velocity / maxVel; // -1 to 1
    return zeroY - (scale * (chartHeight / 2));
  };
});

// Generate SVG paths for current line (split by flood/ebb for coloring) with smoothing
const currentPaths = computed(() => {
  if (!windowedCurrentTimes.value.length || !windowedCurrentVelocities.value.length || !xScale.value) {
    return { flood: '', ebb: '' };
  }
  
  let floodPath = '';
  let ebbPath = '';
  let prevX = null;
  let prevY = null;
  let prevType = null;
  
  for (let i = 0; i < windowedCurrentTimes.value.length; i++) {
    const x = xScale.value(windowedCurrentTimes.value[i]);
    const y = currentScale.value(windowedCurrentVelocities.value[i]);
    const type = windowedCurrentVelocities.value[i] >= 0 ? 'flood' : 'ebb';
    
    if (i === 0) {
      // First point - move to
      const cmd = `M${x},${y}`;
      if (type === 'flood') floodPath += cmd;
      else ebbPath += cmd;
    } else if (type === prevType) {
      // Same type - simple line (data already smoothed)
      const cmd = ` L${x},${y}`;
      if (type === 'flood') floodPath += cmd;
      else ebbPath += cmd;
    } else {
      // Type changed - connect from previous point to zero crossing, then to current point
      const zeroY = currentScale.value(0);
      
      // Calculate zero crossing using linear interpolation
      const prevVel = windowedCurrentVelocities.value[i - 1];
      const currVel = windowedCurrentVelocities.value[i];
      const ratio = Math.abs(prevVel) / (Math.abs(prevVel) + Math.abs(currVel));
      const zeroX = prevX + (x - prevX) * ratio;
      
      // Complete previous type path to zero crossing
      const prevToZero = ` L${zeroX},${zeroY}`;
      if (prevType === 'flood') floodPath += prevToZero;
      else ebbPath += prevToZero;
      
      // Start new type path from zero crossing
      const zeroToCurr = `M${zeroX},${zeroY} L${x},${y}`;
      if (type === 'flood') floodPath += zeroToCurr;
      else ebbPath += zeroToCurr;
    }
    
    prevX = x;
    prevY = y;
    prevType = type;
  }
  
  return { flood: floodPath, ebb: ebbPath };
});

// Current velocity Y-axis ticks (for right side)
const currentYTicks = computed(() => {
  if (!windowedCurrentVelocities.value || windowedCurrentVelocities.value.length === 0) return [];
  
  const maxVel = Math.max(...windowedCurrentVelocities.value.map(Math.abs));
  if (maxVel === 0) return [];
  
  // Round to nearest 0.5 or 1.0 for nice ticks
  const tickMax = Math.ceil(maxVel * 2) / 2;
  
  return [
    { value: -tickMax, label: `-${tickMax.toFixed(1)}` },
    { value: 0, label: '0' },
    { value: tickMax, label: `+${tickMax.toFixed(1)}` }
  ];
});

// Current data source label
const currentDataSource = computed(() => {
  const realData = tideData.value?.currentEvents?.predictions;
  if (Array.isArray(realData) && realData.length > 0) return 'NOAA';
  const imputedData = tideData.value?.imputedCurrent?.predictions;
  if (Array.isArray(imputedData) && imputedData.length > 0) return 'Model';
  return null;
});

// Current time position on the X axis
const currentTimeX = computed(() => {
  if (!times.value.length || !xScale.value) return null;

  const now = currentTime.value;
  const startTime = times.value[0];
  const endTime = times.value[times.value.length - 1];

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return null;
  if (!(startTime instanceof Date) || Number.isNaN(startTime.getTime())) return null;
  if (!(endTime instanceof Date) || Number.isNaN(endTime.getTime())) return null;

  const clampedNow = now < startTime ? startTime : now > endTime ? endTime : now;
  return xScale.value(clampedNow);
});

// Current tide level position on the Y axis
const currentTideY = computed(() => {
  if (currentTideLevel.value === null) return null;
  return yScale.value(currentTideLevel.value);
});

function formatXAxisTick(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '--';

  const hour = date.getHours();
  if (hour === 0) return 'Midnight';
  if (hour === 12) return 'Noon';

  const displayHour = hour % 12 || 12;
  return String(displayHour);
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
    
    // Get mouse position relative to SVG
    const mouseX = event.clientX - svgRect.left;
    
    // Convert to viewBox coordinates
    const viewBoxX = viewportToViewBox(mouseX);
    
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
  background: var(--app-surface-color);
  border-radius: 14px;
  padding: 0;
  margin: 0;
  overflow: hidden;
  --tide-line-color: var(--app-accent-color);
  width: 100%;
  height: 100%;
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px; /* Match the chart height */
  color: var(--app-muted-text-color);
  font-style: italic;
  font-size: 1.1em;
}

.tide-svg {
  display: block;
  max-width: 100%;
  width: 100%;
  height: auto;
}

.chart-background {
  fill: color-mix(in srgb, var(--app-surface-color) 85%, var(--app-background-color) 15%);
}

.x-axis-label {
  user-select: none;
}

.y-axis-label {
  user-select: none;
}

/* Style for grid lines */
.grid-line {
  stroke: color-mix(in srgb, var(--app-border-color) 65%, transparent);
  stroke-width: 1;
  stroke-dasharray: 2,2;
}

.axis-line {
  stroke: var(--app-muted-text-color);
  stroke-width: 2;
}

.axis-tick {
  stroke: var(--app-muted-text-color);
}

.tick-minor {
  stroke: color-mix(in srgb, var(--app-muted-text-color) 60%, transparent);
}

.axis-label {
  fill: var(--app-text-color);
}

.day-band-rect {
  fill: #000000;
  fill-opacity: 0.06;
  stroke: color-mix(in srgb, var(--app-border-color) 70%, transparent);
  stroke-width: 1;
}

.day-band-rect-alt {
  fill: #000000;
  fill-opacity: 0.03;
}

@media (prefers-color-scheme: dark) {
  .day-band-rect {
    fill: #ffffff;
    fill-opacity: 0.10;
  }

  .day-band-rect-alt {
    fill: #ffffff;
    fill-opacity: 0.05;
  }
}

.day-band-label {
  fill: var(--app-muted-text-color);
  user-select: none;
}

.tide-line {
  stroke: var(--tide-line-color);
}

/* Current line styles */
.current-line-flood {
  stroke: #3b82f6; /* Blue for flood */
  stroke-dasharray: none;
}

.current-line-ebb {
  stroke: #ef4444; /* Red for ebb */
  stroke-dasharray: none;
}

.current-zero-line {
  stroke: var(--app-muted-text-color);
  stroke-opacity: 0.5;
}

.current-tick {
  stroke: var(--app-muted-text-color);
  stroke-opacity: 0.6;
}

.current-y-label {
  fill: var(--app-muted-text-color);
  font-family: 'Roboto Mono', monospace;
}

/* Chart legend styles */
.chart-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 10px 0;
  font-size: 12px;
  color: var(--app-text-color);
  border-top: 1px solid var(--app-border-color);
  margin-top: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-line {
  width: 20px;
  height: 3px;
  border-radius: 2px;
}

.legend-line.tide {
  background-color: #f8fafc;
}

.legend-line.flood {
  background-color: #3b82f6;
}

.legend-line.ebb {
  background-color: #ef4444;
}

.indicator-line {
  stroke: color-mix(in srgb, var(--app-accent-color) 80%, var(--app-text-color) 20%);
}

.indicator-label {
  fill: color-mix(in srgb, var(--app-accent-color) 90%, var(--app-text-color) 10%);
}

:global(body.dark) .indicator-line {
  stroke: #fbbf24 !important;
}

:global(body.dark) .indicator-label {
  fill: #fbbf24 !important;
}

.cursor-line {
  stroke: color-mix(in srgb, var(--app-accent-color) 70%, transparent);
}

.cursor-time-label,
.cursor-value-label {
  fill: color-mix(in srgb, var(--app-accent-color) 85%, var(--app-text-color) 15%);
}

.indicator-dot {
  fill: color-mix(in srgb, var(--app-accent-color) 82%, var(--app-text-color) 18%);
}

:global(body.dark) .tide-line {
  stroke: #f8fafc !important;
}

@media (max-width: 768px) {
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
}
</style>

<style>
/* Unscoped dark mode override for tide line */
body.dark .tide-line {
  stroke: #f8fafc !important;
}

body.dark .indicator-line {
  stroke: #fbbf24 !important;
}

body.dark .indicator-label {
  fill: #fbbf24 !important;
}
</style>
