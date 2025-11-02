<template>
  <div class="cross-layout-container">
    <!-- Top Left Widget Area -->
    <div class="cross-area area-topLeft">
      <PlaceholderWidget area="topLeft" @add-widget="handleAddWidget('topLeft')" />
    </div>
    
    <!-- Top Right Widget Area -->
    <div class="cross-area area-topRight">
      <PlaceholderWidget area="topRight" @add-widget="handleAddWidget('topRight')" />
    </div>
    
    <!-- Center Widget Area -->
    <div class="cross-area area-center">
      <PlaceholderWidget area="center" @add-widget="handleAddWidget('center')" />
    </div>
    
    <!-- Bottom Left Widget Area -->
    <div class="cross-area area-bottomLeft">
      <PlaceholderWidget area="bottomLeft" @add-widget="handleAddWidget('bottomLeft')" />
    </div>
    
    <!-- Bottom Right Widget Area -->
    <div class="cross-area area-bottomRight">
      <PlaceholderWidget area="bottomRight" @add-widget="handleAddWidget('bottomRight')" />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import PlaceholderWidget from './PlaceholderWidget.vue';

const emit = defineEmits(['add-widget']);

// Helper function to emit add-widget event
const handleAddWidget = (area) => {
  console.log('CrossLayout - handleAddWidget called with area:', area);
  emit('add-widget', area);
};

onMounted(() => {
  console.log('CrossLayout mounted');
});
</script>

<style scoped>
.cross-layout-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 2fr 4fr 2fr;
  grid-row-gap: 1px;
  grid-column-gap: 1px;
  width: 100%;
  height: 100%;
  position: relative;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.cross-area {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0;
  margin: 0;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
}

.area-topLeft {
  grid-area: 1 / 1 / 2 / 2;
}

.area-topRight {
  grid-area: 1 / 2 / 2 / 3;
}

.area-center {
  grid-area: 2 / 1 / 3 / 3;
}

.area-bottomLeft {
  grid-area: 3 / 1 / 4 / 2;
}

.area-bottomRight {
  grid-area: 3 / 2 / 4 / 3;
}
</style>
