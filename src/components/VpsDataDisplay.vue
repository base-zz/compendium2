<template>
  <div class="vps-data-display">
    <div class="header">
      <h3>Real-Time VPS Data</h3>
      <div class="connection-status" :class="connectionStatusClass">
        {{ vpsConnectionStatus.status }}
      </div>
    </div>
    
    <div class="data-panels">
      <!-- Connection Panel -->
      <div class="data-panel">
        <div class="panel-header">
          <h4>Connection</h4>
          <span class="message-count">{{ vpsConnectionStatus.messageCount || 0 }} msgs</span>
        </div>
        <div class="panel-content">
          <div class="data-row">
            <span class="label">Status:</span>
            <span class="value" :class="connectionStatusClass">{{ vpsConnectionStatus.status }}</span>
          </div>
          <div class="data-row">
            <span class="label">Last Update:</span>
            <span class="value">{{ formatTime(vpsConnectionStatus.lastUpdate) }}</span>
          </div>
          <div v-if="vpsConnectionStatus.lastError" class="data-row error">
            <span class="label">Error:</span>
            <span class="value">{{ vpsConnectionStatus.lastError }}</span>
          </div>
        </div>
      </div>
      
      <!-- Position Panel -->
      <div class="data-panel" :class="{ 'panel-inactive': !hasPosition }">
        <div class="panel-header">
          <h4>Position</h4>
          <span v-if="isPositionUpdated" class="update-badge">Updated</span>
        </div>
        <div class="panel-content">
          <div v-if="hasPosition">
            <div class="data-row">
              <span class="label">Latitude:</span>
              <span class="value">{{ formatCoordinate(navigationState.position.latitude, 'lat') }}</span>
            </div>
            <div class="data-row">
              <span class="label">Longitude:</span>
              <span class="value">{{ formatCoordinate(navigationState.position.longitude, 'lon') }}</span>
            </div>
            <div class="data-row">
              <span class="label">Updated:</span>
              <span class="value">{{ formatTime(navigationState.position.timestamp) }}</span>
            </div>
          </div>
          <div v-else class="no-data">
            No position data available
          </div>
        </div>
      </div>
      
      <!-- Course Panel -->
      <div class="data-panel" :class="{ 'panel-inactive': !hasCourseData }">
        <div class="panel-header">
          <h4>Course</h4>
          <span v-if="isCourseUpdated" class="update-badge">Updated</span>
        </div>
        <div class="panel-content">
          <div v-if="hasCourseData">
            <div class="data-row">
              <span class="label">Heading:</span>
              <span class="value">{{ navigationState.course.heading !== null ? navigationState.course.heading.toFixed(1) + '°' : 'N/A' }}</span>
            </div>
            <div class="data-row">
              <span class="label">COG:</span>
              <span class="value">{{ navigationState.course.cog !== null ? navigationState.course.cog.toFixed(1) + '°' : 'N/A' }}</span>
            </div>
          </div>
          <div v-else class="no-data">
            No course data available
          </div>
        </div>
      </div>
      
      <!-- Speed Panel -->
      <div class="data-panel" :class="{ 'panel-inactive': !hasSpeedData }">
        <div class="panel-header">
          <h4>Speed</h4>
          <span v-if="isSpeedUpdated" class="update-badge">Updated</span>
        </div>
        <div class="panel-content">
          <div v-if="hasSpeedData">
            <div class="data-row">
              <span class="label">SOG:</span>
              <span class="value">{{ navigationState.speed.sog !== null ? navigationState.speed.sog.toFixed(1) + ' kts' : 'N/A' }}</span>
            </div>
            <div class="data-row">
              <span class="label">STW:</span>
              <span class="value">{{ navigationState.speed.stw !== null ? navigationState.speed.stw.toFixed(1) + ' kts' : 'N/A' }}</span>
            </div>
          </div>
          <div v-else class="no-data">
            No speed data available
          </div>
        </div>
      </div>
      
      <!-- Depth Panel -->
      <div class="data-panel" :class="{ 'panel-inactive': !hasDepthData }">
        <div class="panel-header">
          <h4>Depth</h4>
          <span v-if="isDepthUpdated" class="update-badge">Updated</span>
        </div>
        <div class="panel-content">
          <div v-if="hasDepthData">
            <div class="data-row">
              <span class="label">Below Transducer:</span>
              <span class="value">{{ navigationState.depth?.belowTransducer !== null ? navigationState.depth.belowTransducer.toFixed(1) + ' m' : 'N/A' }}</span>
            </div>
          </div>
          <div v-else class="no-data">
            No depth data available
          </div>
        </div>
      </div>
      
      <!-- Wind Panel -->
      <div class="data-panel" :class="{ 'panel-inactive': !hasWindData }">
        <div class="panel-header">
          <h4>Wind</h4>
          <span v-if="isWindUpdated" class="update-badge">Updated</span>
        </div>
        <div class="panel-content">
          <div v-if="hasWindData">
            <div class="data-row">
              <span class="label">App Speed:</span>
              <span class="value">{{ navigationState.wind?.speedApparent !== null ? navigationState.wind.speedApparent.toFixed(1) + ' kts' : 'N/A' }}</span>
            </div>
            <div class="data-row">
              <span class="label">App Angle:</span>
              <span class="value">{{ navigationState.wind?.angleApparent !== null ? (navigationState.wind.angleApparent * (180/Math.PI)).toFixed(0) + '°' : 'N/A' }}</span>
            </div>
          </div>
          <div v-else class="no-data">
            No wind data available
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useStateDataStore } from '../stores/stateDataStore';

// Define props for component configuration
defineProps({
  showAllPanels: {
    type: Boolean,
    default: false
  }
});

const stateDataStore = useStateDataStore();
const vpsConnectionStatus = computed(() => stateDataStore.vpsConnectionStatus);
const navigationState = computed(() => stateDataStore.navigationState);

// Track last update timestamps for each data type
const lastPositionUpdate = ref(0);
const lastCourseUpdate = ref(0);
const lastSpeedUpdate = ref(0);
const lastDepthUpdate = ref(0);
const lastWindUpdate = ref(0);

// Computed properties to check if data exists
const hasPosition = computed(() => {
  return navigationState.value.position && 
         navigationState.value.position.latitude !== null && 
         navigationState.value.position.longitude !== null;
});

const hasCourseData = computed(() => {
  const course = navigationState.value.course;
  return course && (course.heading !== null || course.cog !== null);
});

const hasSpeedData = computed(() => {
  const speed = navigationState.value.speed;
  return speed && (speed.sog !== null || speed.stw !== null);
});

const hasDepthData = computed(() => {
  return navigationState.value.depth && navigationState.value.depth.belowTransducer !== null;
});

const hasWindData = computed(() => {
  const wind = navigationState.value.wind;
  return wind && (wind.speedApparent !== null || wind.angleApparent !== null);
});

// Computed properties to check if data has been updated recently
const isPositionUpdated = computed(() => {
  return Date.now() - lastPositionUpdate.value < 5000;
});

const isCourseUpdated = computed(() => {
  return Date.now() - lastCourseUpdate.value < 5000;
});

const isSpeedUpdated = computed(() => {
  return Date.now() - lastSpeedUpdate.value < 5000;
});

const isDepthUpdated = computed(() => {
  return Date.now() - lastDepthUpdate.value < 5000;
});

const isWindUpdated = computed(() => {
  return Date.now() - lastWindUpdate.value < 5000;
});

// CSS classes
const connectionStatusClass = computed(() => {
  const status = vpsConnectionStatus.value.status;
  if (status === 'connected') return 'status-connected';
  if (status === 'connecting') return 'status-connecting';
  return 'status-disconnected';
});

// Watch for changes in navigation data
watch(() => navigationState.value.position, () => {
  if (hasPosition.value) {
    lastPositionUpdate.value = Date.now();
  }
}, { deep: true });

watch(() => navigationState.value.course, () => {
  if (hasCourseData.value) {
    lastCourseUpdate.value = Date.now();
  }
}, { deep: true });

watch(() => navigationState.value.speed, () => {
  if (hasSpeedData.value) {
    lastSpeedUpdate.value = Date.now();
  }
}, { deep: true });

watch(() => navigationState.value.depth, () => {
  if (hasDepthData.value) {
    lastDepthUpdate.value = Date.now();
  }
}, { deep: true });

watch(() => navigationState.value.wind, () => {
  if (hasWindData.value) {
    lastWindUpdate.value = Date.now();
  }
}, { deep: true });

// Format helpers
function formatTime(timestamp) {
  if (!timestamp) return 'Never';
  
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

function formatCoordinate(value, type) {
  if (value === null || value === undefined) return 'N/A';
  
  const degrees = Math.floor(Math.abs(value));
  const minutes = ((Math.abs(value) - degrees) * 60).toFixed(3);
  const direction = type === 'lat' 
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');
    
  return `${degrees}° ${minutes}' ${direction}`;
}
</script>

<style scoped>
.vps-data-display {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 8px;
}

.header h3 {
  margin: 0;
  color: #343a40;
  font-size: 1.25rem;
}

.connection-status {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;
}

.data-panels {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.data-panel {
  background-color: white;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}

.panel-inactive {
  opacity: 0.7;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #e9ecef;
  padding: 8px 12px;
}

.panel-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #495057;
}

.panel-content {
  padding: 12px;
}

.data-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #f1f3f5;
}

.data-row:last-child {
  border-bottom: none;
}

.label {
  color: #6c757d;
  font-size: 0.875rem;
}

.value {
  font-weight: 500;
  color: #212529;
}

.no-data {
  color: #adb5bd;
  font-style: italic;
  text-align: center;
  padding: 12px 0;
}

.update-badge {
  background-color: #20c997;
  color: white;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  animation: pulse 2s infinite;
}

.message-count {
  font-size: 0.75rem;
  color: #6c757d;
  background-color: #f1f3f5;
  padding: 2px 8px;
  border-radius: 12px;
}

.status-connected {
  background-color: #40c057;
  color: white;
}

.status-connecting {
  background-color: #fd7e14;
  color: white;
}

.status-disconnected {
  background-color: #fa5252;
  color: white;
}

.error {
  color: #fa5252;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}
</style>
