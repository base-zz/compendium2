<template>
  <div class="grid-cross-layout">
    <!-- Top Left Widget Area -->
    <div class="grid-area top-left">
      <Widget 
        v-if="getWidgetForArea('topLeft')"
        :widget="getWidgetForArea('topLeft')"
        :type="getWidgetForArea('topLeft').type || 'placeholder'"
        :is-editing="isEditing"
        @edit="$emit('edit-widget', getWidgetForArea('topLeft'))"
        @remove="$emit('delete-widget', getWidgetForArea('topLeft'))"
      />
      <PlaceholderWidget 
        v-else
        area="topLeft" 
        @add-widget="handleAddWidget('topLeft')" 
      />
    </div>
    
    <!-- Top Right Widget Area -->
    <div class="grid-area top-right">
      <Widget 
        v-if="getWidgetForArea('topRight')"
        :widget="getWidgetForArea('topRight')"
        :type="getWidgetForArea('topRight').type || 'placeholder'"
        :is-editing="isEditing"
        @edit="$emit('edit-widget', getWidgetForArea('topRight'))"
        @remove="$emit('delete-widget', getWidgetForArea('topRight'))"
      />
      <PlaceholderWidget 
        v-else
        area="topRight" 
        @add-widget="handleAddWidget('topRight')" 
      />
    </div>
    
    <!-- Center Widget Area (spans full width) -->
    <div class="grid-area center">
      <Widget 
        v-if="getWidgetForArea('center')"
        :widget="getWidgetForArea('center')"
        :type="getWidgetForArea('center').type || 'placeholder'"
        :is-editing="isEditing"
        @edit="$emit('edit-widget', getWidgetForArea('center'))"
        @remove="$emit('delete-widget', getWidgetForArea('center'))"
      />
      <PlaceholderWidget 
        v-else
        area="center" 
        @add-widget="handleAddWidget('center')" 
      />
    </div>
    
    <!-- Bottom Left Widget Area -->
    <div class="grid-area bottom-left">
      <Widget 
        v-if="getWidgetForArea('bottomLeft')"
        :widget="getWidgetForArea('bottomLeft')"
        :type="getWidgetForArea('bottomLeft').type || 'placeholder'"
        :is-editing="isEditing"
        @edit="$emit('edit-widget', getWidgetForArea('bottomLeft'))"
        @remove="$emit('delete-widget', getWidgetForArea('bottomLeft'))"
      />
      <PlaceholderWidget 
        v-else
        area="bottomLeft" 
        @add-widget="handleAddWidget('bottomLeft')" 
      />
    </div>
    
    <!-- Bottom Right Widget Area -->
    <div class="grid-area bottom-right">
      <Widget 
        v-if="getWidgetForArea('bottomRight')"
        :widget="getWidgetForArea('bottomRight')"
        :type="getWidgetForArea('bottomRight').type || 'placeholder'"
        :is-editing="isEditing"
        @edit="$emit('edit-widget', getWidgetForArea('bottomRight'))"
        @remove="$emit('delete-widget', getWidgetForArea('bottomRight'))"
      />
      <PlaceholderWidget 
        v-else
        area="bottomRight" 
        @add-widget="handleAddWidget('bottomRight')" 
      />
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import Widget from './Widget.vue';
import PlaceholderWidget from './PlaceholderWidget.vue';

const props = defineProps({
  widgets: {
    type: Array,
    default: () => []
  },
  isEditing: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['add-widget', 'edit-widget', 'delete-widget']);

// Helper function to emit add-widget event
const handleAddWidget = (area) => {
  console.log('GridCrossLayout - handleAddWidget called with area:', area);
  emit('add-widget', { area });
};

// Get widget for a specific area
const getWidgetForArea = (area) => {
  return props.widgets.find(widget => widget.area === area);
};
</script>

<style scoped>
.grid-cross-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 2fr 4fr 2fr;
  grid-template-areas:
    "top-left top-right"
    "center center"
    "bottom-left bottom-right";
  gap: 4px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.grid-area {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.top-left {
  grid-area: top-left;
}

.top-right {
  grid-area: top-right;
}

.center {
  grid-area: center;
}

.bottom-left {
  grid-area: bottom-left;
}

.bottom-right {
  grid-area: bottom-right;
}

/* Ensure all direct children fill the entire area */
.grid-area > * {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
</style>
