<template>
  <div class="dashboard-container" ref="dashboardContainer">
    <!-- Template selection (when explicitly choosing template) -->
    <div v-if="selectingTemplate" class="template-selection">
      <DashboardTemplate 
        v-model:selectedTemplate="selectedTemplateId" 
        @apply="applyTemplate"
      />
    </div>

    <!-- Show template selection if no template is applied -->
    <div v-else-if="!currentTemplate" class="template-selection">
      <DashboardTemplate 
        v-model:selectedTemplate="selectedTemplateId" 
        @apply="applyTemplate"
      />
    </div>

    <!-- Dashboard content when template is applied -->
    <template v-else>
      <!-- Add widget button - moved to top-right and made smaller -->
      <ion-fab vertical="top" horizontal="end" slot="fixed" v-if="isEditing" class="add-widget-fab">
        <ion-fab-button @click="$emit('add-widget')" size="small">
          <ion-icon :icon="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Template button - made smaller for consistency -->
      <ion-fab vertical="bottom" horizontal="start" slot="fixed" v-if="isEditing">
        <ion-fab-button @click="selectingTemplate = true" color="secondary" size="small">
          <ion-icon :icon="gridOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Template Layout with direct widget placement -->
      <div v-if="currentTemplate && isValidTemplate" class="template-container">
        <div 
          class="template-grid" 
          :class="'template-grid-' + currentTemplate"
          :style="gridStyles"
        >
          <!-- For each area in the template, show either a widget or a placeholder -->
          <div 
            v-for="(position, area) in templateLayout" 
            :key="area"
            class="template-area"
            :class="'area-' + area"
          >
            <!-- If there's a widget for this area, show it -->
            <Widget
              v-if="getWidgetForArea(area)"
              :widget="getWidgetForArea(area)"
              :type="getWidgetForArea(area).type || 'placeholder'"
              :is-editing="isEditing"
              :area="area.toString()"
              @edit="$emit('edit-widget', getWidgetForArea(area))"
              @remove="handleRemoveWidget(getWidgetForArea(area))"
            />
            <!-- Otherwise show a placeholder -->
            <PlaceholderWidget 
              v-else
              :area="area" 
              @add-widget="handleTemplateAddWidget(area)" 
            />
          </div>
        </div>
      </div>
      
      <!-- Free-form layout (no template) -->
      <div v-else class="free-layout">
        <!-- This is for free-form layouts without a template -->
        <div
          v-for="widget in widgets"
          :key="widget.id || widget.i"
          class="widget-container"
          :style="getWidgetStyle(widget)"
        >
          <Widget
            :widget="widget"
            :type="widget.type || 'placeholder'"
            :is-editing="isEditing"
            @edit="$emit('edit-widget', widget)"
            @remove="$emit('delete-widget', widget)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { IonFab, IonFabButton, IonIcon } from '@ionic/vue';
import { add, gridOutline } from 'ionicons/icons';
import { useDashboardStore } from '../../stores/dashboardStore';
import DashboardTemplate from './DashboardTemplate.vue';
import Widget from './Widget.vue';
import PlaceholderWidget from './PlaceholderWidget.vue';

const props = defineProps({
  dashboardIndex: {
    type: Number,
    required: true
  },
  isEditing: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['add-widget', 'edit-widget', 'delete-widget', 'layout-updated', 'widget-removed']);

// Store
const dashboardStore = useDashboardStore();

// Refs
const widgets = ref([]);
const dashboardContainer = ref(null);
const selectingTemplate = ref(false);
const selectedTemplateId = ref(null);

// Get the current template ID
const currentTemplate = computed(() => {
  const templateId = dashboardStore.dashboards[props.dashboardIndex]?.template || null;
  return templateId;
});

// Get the template layout
const templateLayout = computed(() => {
  const template = dashboardStore.getTemplateById(currentTemplate.value);
  return template?.layout || {};
});

// Get the grid template for dynamic CSS Grid styling
const gridTemplate = computed(() => {
  const template = dashboardStore.getTemplateById(currentTemplate.value);
  return template?.gridTemplate || null;
});

// Generate CSS Grid styles from the grid template
const gridStyles = computed(() => {
  if (!gridTemplate.value) return {};
  
  return {
    'grid-template-columns': gridTemplate.value.columns,
    'grid-template-rows': gridTemplate.value.rows,
    'grid-template-areas': gridTemplate.value.areas.map(area => `"${area}"`).join(' ')
  };
});

// Check if the template is valid
const isValidTemplate = computed(() => {
  const isValid = dashboardStore.getTemplateById(currentTemplate.value) !== null;
  return isValid;
});

// Get widget for a specific area
const getWidgetForArea = (area) => {
  // Find widget with matching area property
  const widget = widgets.value.find(widget => {
    // Check if widget has an area property and if it matches
    if (!widget.area) {
      console.warn('Widget missing area property:', widget);
      return false;
    }
    // Ensure widget area is always a string
    const widgetArea = typeof widget.area === 'object' && widget.area !== null && 'area' in widget.area 
      ? widget.area.area 
      : widget.area;
    return widgetArea === area;
  });
  return widget;
};

// Handle adding a widget from the template
const handleTemplateAddWidget = (area) => {
  emit('add-widget', { area });
};

// Handle removing a widget
const handleRemoveWidget = (widget) => {
  // Store the widget's area before removing it
  const area = widget.area;
  
  // Emit the delete event
  emit('delete-widget', widget);
  
  // Emit the widget-removed event with the area
  emit('widget-removed', { area });
};

// Apply a template
const applyTemplate = (template) => {
  
  if (template && template.id) {
    // Update the dashboard template
    dashboardStore.setDashboardTemplate(props.dashboardIndex, template.id);
    
    // Reset the template selection
    selectingTemplate.value = false;
    
    // Clear existing widgets
    widgets.value = [];
    
    // Emit layout updated event
    emit('layout-updated');
  } else {
    console.error('Invalid template:', template);
  }
};

// Get widget style based on its position and size
const getWidgetStyle = (widget) => {
  // For free-form layout
  return {
    left: `${widget.x}%`,
    top: `${widget.y}%`,
    width: `${widget.width}%`,
    height: `${widget.height}%`,
    position: 'absolute',
    boxSizing: 'border-box',
    margin: '0',
    padding: '0'
  };
};

// Load widgets when the component is mounted
onMounted(() => {
  // Load widgets for the current dashboard
  widgets.value = dashboardStore.getWidgetsForDashboard(props.dashboardIndex);
});

// Watch for changes to the dashboard index
watch(() => props.dashboardIndex, () => {
  // Load widgets for the new dashboard
  widgets.value = dashboardStore.getWidgetsForDashboard(props.dashboardIndex);
});

// Watch for changes to the dashboard in the store
watch(() => dashboardStore.getDashboard(props.dashboardIndex), (newDashboard) => {
  if (newDashboard) {
    // Update the local widgets array
    widgets.value = newDashboard.widgets || [];
  }
}, { deep: true });
</script>

<style scoped>
@import './TemplateGridStyles.css';

.dashboard-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Custom positioning for the add widget FAB button */
.add-widget-fab {
  margin-top: 10px; /* Move it higher up from the top */
  z-index: 1000; /* Ensure it's above other elements */
}

/* Make sure the FAB button is properly sized */
.add-widget-fab ion-fab-button {
  --size: 32px; /* Force a smaller size */
  width: 32px;
  height: 32px;
}

.template-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.template-grid {
  width: 100%;
  height: 100%;
  display: grid;
  gap: 8px;
  box-sizing: border-box;
  max-width: 100vw;
  max-height: 100vh;
}

/* Template 1 - Single Widget */
.template-grid-1 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
  grid-template-areas: "main";
}

.template-grid-1 .area-main {
  grid-area: main;
}

/* Template 2 - Stacked (2) */
.template-grid-2 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr;
  grid-template-areas:
    "top"
    "bottom";
}

.template-grid-2 .area-top {
  grid-area: top;
}

.template-grid-2 .area-bottom {
  grid-area: bottom;
}

/* Template 3 - Stacked (3) */
.template-grid-3 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-areas:
    "top"
    "middle"
    "bottom";
}

.template-grid-3 .area-top {
  grid-area: top;
}

.template-grid-3 .area-middle {
  grid-area: middle;
}

.template-grid-3 .area-bottom {
  grid-area: bottom;
}

/* Template 5 - Dashboard */
.template-grid-5 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 2fr 1fr;
  grid-template-areas:
    "header header"
    "left right"
    "bottom bottom";
}

.template-grid-5 .area-header {
  grid-area: header;
}

.template-grid-5 .area-left {
  grid-area: left;
}

.template-grid-5 .area-right {
  grid-area: right;
}

.template-grid-5 .area-bottom {
  grid-area: bottom;
}

/* Template 6 - Grid (2x3) */
.template-grid-6 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-areas:
    "topLeft topRight"
    "middleLeft middleRight"
    "bottomLeft bottomRight";
}

.template-grid-6 .area-topLeft {
  grid-area: topLeft;
}

.template-grid-6 .area-topRight {
  grid-area: topRight;
}

.template-grid-6 .area-middleLeft {
  grid-area: middleLeft;
}

.template-grid-6 .area-middleRight {
  grid-area: middleRight;
}

.template-grid-6 .area-bottomLeft {
  grid-area: bottomLeft;
}

.template-grid-6 .area-bottomRight {
  grid-area: bottomRight;
}

/* Template 8 - Anchor Watch (Compact) */
.template-grid-8 {
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 2fr;
  grid-template-areas:
    "topLeft topCenter topRight"
    "bottom bottom bottom";
}

.template-grid-8 .area-topLeft {
  grid-area: topLeft;
}

.template-grid-8 .area-topCenter {
  grid-area: topCenter;
}

.template-grid-8 .area-topRight {
  grid-area: topRight;
}

.template-grid-8 .area-bottom {
  grid-area: bottom;
}

/* Template 9 - Anchor Watch (Map Focus) */
.template-grid-9 {
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 3fr;
  grid-template-areas:
    "topLeft topCenter topRight"
    "bottom bottom bottom";
}

.template-grid-9 .area-topLeft {
  grid-area: topLeft;
}

.template-grid-9 .area-topCenter {
  grid-area: topCenter;
}

.template-grid-9 .area-topRight {
  grid-area: topRight;
}

.template-grid-9 .area-bottom {
  grid-area: bottom;
}

/* Template 10 - Anchor Watch (Wide Row) */
.template-grid-10 {
  grid-template-columns: 1fr 1fr 1fr 1fr;
  grid-template-rows: 1fr 2fr;
  grid-template-areas:
    "topLeft topCenterLeft topCenterRight topRight"
    "bottom bottom bottom bottom";
}

.template-grid-10 .area-topLeft {
  grid-area: topLeft;
}

.template-grid-10 .area-topCenterLeft {
  grid-area: topCenterLeft;
}

.template-grid-10 .area-topCenterRight {
  grid-area: topCenterRight;
}

.template-grid-10 .area-topRight {
  grid-area: topRight;
}

.template-grid-10 .area-bottom {
  grid-area: bottom;
}

/* Template 1 - Single Widget */
.template-grid-1 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
  grid-template-areas: "main";
}

.template-grid-1 .area-main {
  grid-area: main;
}

/* Template 2 - Stacked (2) */
.template-grid-2 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr;
  grid-template-areas:
    "top"
    "bottom";
}

.template-grid-2 .area-top {
  grid-area: top;
}

.template-grid-2 .area-bottom {
  grid-area: bottom;
}

/* Template 3 - Stacked (3) */
.template-grid-3 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-areas:
    "top"
    "middle"
    "bottom";
}

.template-grid-3 .area-top {
  grid-area: top;
}

.template-grid-3 .area-middle {
  grid-area: middle;
}

.template-grid-3 .area-bottom {
  grid-area: bottom;
}

/* Template 5 - Dashboard */
.template-grid-5 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 2fr 1fr;
  grid-template-areas:
    "header header"
    "left right"
    "bottom bottom";
}

.template-grid-5 .area-header {
  grid-area: header;
}

.template-grid-5 .area-left {
  grid-area: left;
}

.template-grid-5 .area-right {
  grid-area: right;
}

.template-grid-5 .area-bottom {
  grid-area: bottom;
}

/* Template 6 - Grid (2x3) */
.template-grid-6 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-areas:
    "topLeft topRight"
    "middleLeft middleRight"
    "bottomLeft bottomRight";
}

.template-grid-6 .area-topLeft {
  grid-area: topLeft;
}

.template-grid-6 .area-topRight {
  grid-area: topRight;
}

.template-grid-6 .area-middleLeft {
  grid-area: middleLeft;
}

.template-grid-6 .area-middleRight {
  grid-area: middleRight;
}

.template-grid-6 .area-bottomLeft {
  grid-area: bottomLeft;
}

.template-grid-6 .area-bottomRight {
  grid-area: bottomRight;
}

/* Template 4 - Cross layout */
.template-grid-4 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 2fr 4fr 2fr;
  grid-template-areas:
    "topLeft topRight"
    "center center"
    "bottomLeft bottomRight";
  width: 100%;
  height: 100%;
  gap: 8px;
}

.template-grid-4 .area-topLeft {
  grid-area: topLeft;
}

.template-grid-4 .area-topRight {
  grid-area: topRight;
}

.template-grid-4 .area-center {
  grid-area: center;
}

.template-grid-4 .area-bottomLeft {
  grid-area: bottomLeft;
}

.template-grid-4 .area-bottomRight {
  grid-area: bottomRight;
}

/* Template areas */
.template-area {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
  overflow: hidden;
}

.area-topLeft {
  grid-area: topLeft;
}

.area-topRight {
  grid-area: topRight;
}

.area-center {
  grid-area: center;
}

.area-bottomLeft {
  grid-area: bottomLeft;
}

.area-bottomRight {
  grid-area: bottomRight;
}

.free-layout {
  position: relative;
  width: 100%;
  height: 100%;
}

.widget-container {
  box-sizing: border-box;
  overflow: hidden;
}

.template-selection {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--app-background-color);
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
