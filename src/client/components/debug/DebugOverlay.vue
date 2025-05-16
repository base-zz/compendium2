<template>
  <div 
    v-if="visible" 
    :style="{
      position: 'absolute',
      top: position === 'top' ? '0' : 'auto',
      bottom: position === 'bottom' ? '0' : 'auto',
      left: '0',
      background: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '5px',
      fontSize: '10px',
      zIndex: 9999,
      maxWidth: '100%',
      maxHeight: '50%',
      overflow: 'auto',
      borderRadius: '0 0 5px 0'
    }"
  >
    <div v-if="title" style="font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 2px;">
      {{ title }}
    </div>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: true
  },
  position: {
    type: String,
    default: 'top',
    validator: (value) => ['top', 'bottom'].includes(value)
  },
  title: {
    type: String,
    default: ''
  }
})
</script>
