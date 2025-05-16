<template>
  <div v-if="template" class="template-layout" :class="'template-layout-' + templateId">
    <!-- Cross Layout (Template 4) -->
    <div v-if="templateId === 4" class="grid-layout cross-layout">
      <!-- Top Left -->
      <div class="grid-area area-topLeft">
        <PlaceholderWidget 
          v-if="!getWidgetForArea('topLeft')"
          area="topLeft" 
          @add-widget="handleAddWidget('topLeft')" 
        />
        <Widget 
          v-else
          :widget="getWidgetForArea('topLeft')" 
          :type="getWidgetForArea('topLeft').type || 'placeholder'" 
          :is-editing="isEditing"
          @edit="$emit('edit-widget', getWidgetForArea('topLeft'))"
          @remove="$emit('delete-widget', getWidgetForArea('topLeft'))"
        />
      </div>
      
      <!-- Top Right -->
      <div class="grid-area area-topRight">
        <PlaceholderWidget 
          v-if="!getWidgetForArea('topRight')"
          area="topRight" 
          @add-widget="handleAddWidget('topRight')" 
        />
        <Widget 
          v-else
          :widget="getWidgetForArea('topRight')" 
          :type="getWidgetForArea('topRight').type || 'placeholder'" 
          :is-editing="isEditing"
          @edit="$emit('edit-widget', getWidgetForArea('topRight'))"
          @remove="$emit('delete-widget', getWidgetForArea('topRight'))"
        />
      </div>
      
      <!-- Center -->
      <div class="grid-area area-center">
        <PlaceholderWidget 
          v-if="!getWidgetForArea('center')"
          area="center" 
          @add-widget="handleAddWidget('center')" 
        />
        <Widget 
          v-else
          :widget="getWidgetForArea('center')" 
          :type="getWidgetForArea('center').type || 'placeholder'" 
          :is-editing="isEditing"
          @edit="$emit('edit-widget', getWidgetForArea('center'))"
          @remove="$emit('delete-widget', getWidgetForArea('center'))"
        />
      </div>
      
      <!-- Bottom Left -->
      <div class="grid-area area-bottomLeft">
        <PlaceholderWidget 
          v-if="!getWidgetForArea('bottomLeft')"
          area="bottomLeft" 
          @add-widget="handleAddWidget('bottomLeft')" 
        />
        <Widget 
          v-else
          :widget="getWidgetForArea('bottomLeft')" 
          :type="getWidgetForArea('bottomLeft').type || 'placeholder'" 
          :is-editing="isEditing"
          @edit="$emit('edit-widget', getWidgetForArea('bottomLeft'))"
          @remove="$emit('delete-widget', getWidgetForArea('bottomLeft'))"
        />
      </div>
      
      <!-- Bottom Right -->
      <div class="grid-area area-bottomRight">
        <PlaceholderWidget 
          v-if="!getWidgetForArea('bottomRight')"
          area="bottomRight" 
          @add-widget="handleAddWidget('bottomRight')" 
        />
        <Widget 
          v-else
          :widget="getWidgetForArea('bottomRight')" 
          :type="getWidgetForArea('bottomRight').type || 'placeholder'" 
          :is-editing="isEditing"
          @edit="$emit('edit-widget', getWidgetForArea('bottomRight'))"
          @remove="$emit('delete-widget', getWidgetForArea('bottomRight'))"
        />
      </div>
    </div>
    <!-- Other template layouts with CSS Grid -->
    <div v-else class="grid-layout" :class="'template-' + templateId">
      <!-- Dynamically create grid areas for each template area -->
      <div 
        v-for="(position, area) in template.layout" 
        :key="area"
        class="grid-area"
        :class="'area-' + area"
        :style="getGridAreaStyle(area, position)"
      >
        <!-- Show placeholder if no widget exists for this area -->
        <PlaceholderWidget 
          v-if="!getWidgetForArea(area)"
          :area="area" 
          @add-widget="handleAddWidget(area)" 
        />
        <!-- Show widget if it exists for this area -->
        <Widget 
          v-else
          :widget="getWidgetForArea(area)" 
          :type="getWidgetForArea(area).type || 'placeholder'" 
          :is-editing="isEditing"
          @edit="$emit('edit-widget', getWidgetForArea(area))"
          @remove="$emit('delete-widget', getWidgetForArea(area))"
        />
      </div>
    </div>
  </div>
  <div v-else class="template-error">
    <p>Template not found. Please select a valid template.</p>
  </div>
</template>

<script setup>
import { computed, onMounted, defineProps, defineEmits } from 'vue';
import PlaceholderWidget from './PlaceholderWidget.vue';
import Widget from './Widget.vue';
import { useDashboardStore } from '../../stores/dashboardStore';

const props = defineProps({
  templateId: {
    type: Number,
    required: true
  },
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
  console.log('TemplateLayout - handleAddWidget called with area:', area);
  emit('add-widget', area);
};

// Helper function to get widget for a specific area
const getWidgetForArea = (area) => {
  return props.widgets.find(widget => widget.area === area);
};

// Helper function to convert template layout position to CSS Grid area style
const getGridAreaStyle = (area, position) => {
  // For template 4 (cross layout), we use predefined grid areas
  if (props.templateId === 4) {
    return {}; // Grid areas are defined in CSS
  }
  
  // For other templates, calculate grid-area based on position
  // Convert percentage values to grid coordinates
  const gridColumnStart = Math.floor(position.x / 50) + 1;
  const gridColumnEnd = position.width === 100 ? 3 : gridColumnStart + 1;
  
  // Calculate row position based on y value
  // Assuming rows are 25% height each
  const gridRowStart = Math.floor(position.y / 25) + 1;
  const gridRowSpan = Math.ceil(position.height / 25);
  const gridRowEnd = gridRowStart + gridRowSpan;
  
  return {
    gridArea: `${gridRowStart} / ${gridColumnStart} / ${gridRowEnd} / ${gridColumnEnd}`
  };
};

const dashboardStore = useDashboardStore();

const template = computed(() => {
  return dashboardStore.getTemplateById(props.templateId);
});

// Log the template layout for debugging
const logTemplateLayout = () => {
  if (template.value) {
    console.log('Template layout:', template.value.layout);
    Object.entries(template.value.layout).forEach(([area, position]) => {
      console.log(`Area: ${area}, Position:`, position);
    });
  }
};

// Call the log function when the component is mounted
onMounted(() => {
  logTemplateLayout();
});
</script>

<style scoped>
.template-layout {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: none;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

/* Cross Layout (Template 4) */
.grid-layout.cross-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 2fr 4fr 2fr;
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
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Grid area positioning */
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

/* Ensure all direct children fill the entire area */
.grid-area > * {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

/* Template Grid (for other templates) */
.template-grid {
  width: 100%;
  height: 100%;
  display: grid;
  gap: 4px;
  box-sizing: border-box;
  padding: 0;
}

.template-area {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* Single Widget (Template 1) */
.template-grid-1 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.template-grid-1 .area-main {
  grid-area: 1 / 1 / 2 / 2;
}

/* Stacked 2 (Template 2) */
.template-grid-2 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr;
}

.template-grid-2 .area-top {
  grid-area: 1 / 1 / 2 / 2;
}

.template-grid-2 .area-bottom {
  grid-area: 2 / 1 / 3 / 2;
}

/* Stacked (3) layout */
.template-layout-3 .template-area {
  width: 100% !important;
}

/* Make sure the template fills the entire container */
.template-layout-2 {
  height: 100%;
}

/* Stacked (2) layout - ensure proper spacing */
.template-layout-2 .template-area:nth-child(1) {
  top: 0 !important;
  height: 48% !important;
}

.template-layout-2 .template-area:nth-child(2) {
  top: 52% !important;
  height: 48% !important;
}

/* Stacked (3) layout */
.template-layout-3 .template-area {
  width: 100% !important;
}


/* Ensure the center widget in the cross layout is properly sized and positioned */
.template-layout-4 .template-area:nth-child(3) {
  z-index: 1;
}

/* Grid (2x3) layout */
.template-layout-6 .template-area:nth-child(odd) {
  left: 0 !important;
  width: 48% !important;
}

.template-layout-6 .template-area:nth-child(even) {
  left: 52% !important;
  width: 48% !important;
}

/* Template error styling */
.template-error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  background-color: rgba(var(--ion-color-danger-rgb), 0.1);
  border: 2px dashed var(--ion-color-danger);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.template-error p {
  color: var(--ion-color-danger);
  font-weight: bold;
  font-size: 1.2rem;
}
</style>
