<template>
  <div>
    <!-- Your component content here -->
    
    <!-- Debug overlay that can be toggled on/off -->
    <DebugOverlay :visible="showDebug" title="Tank Debug Info">
      pastThreshold: {{ pastThreshold }}<br>
      value: {{ value }}<br>
      threshold: {{ threshold }}<br>
      operator: {{ operator }}<br>
      tankId: {{ id }}<br>
      fluidType: {{ fluidType }}<br>
      pulsating class: {{ pastThreshold ? 'YES' : 'NO' }}
    </DebugOverlay>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import DebugOverlay from './DebugOverlay.vue'

// Example props and state for demonstration
const props = defineProps({
  widgetData: Object
})

// Toggle debug overlay with a keyboard shortcut (Alt+D)
const showDebug = ref(false)
window.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === 'd') {
    showDebug.value = !showDebug.value
    console.log('Debug overlay toggled:', showDebug.value)
  }
})

// Example computed properties for demonstration
const pastThreshold = computed(() => false)
const value = computed(() => props.widgetData?.value || 0)
const threshold = computed(() => props.widgetData?.threshold || 20)
const operator = computed(() => props.widgetData?.thresholdOperator || 'LESS_THAN')
const id = computed(() => props.widgetData?.id || 'unknown')
const fluidType = computed(() => props.widgetData?.fluidType || 'water')
</script>
