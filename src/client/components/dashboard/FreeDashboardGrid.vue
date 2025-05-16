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
      <!-- Add widget button -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed" v-if="isEditing">
        <ion-fab-button @click="$emit('add-widget')">
          <ion-icon :icon="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Template button -->
      <ion-fab vertical="bottom" horizontal="start" slot="fixed" v-if="isEditing">
        <ion-fab-button @click="selectingTemplate = true" color="secondary">
          <ion-icon :icon="gridOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Template Layout with placeholders for widgets -->
      <div v-if="currentTemplate && isValidTemplate" class="template-container">
        <!-- Use TemplateLayout with CSS Grid for all templates -->
        <TemplateLayout 
          :templateId="currentTemplate" 
          :widgets="widgets"
          :is-editing="isEditing"
          @add-widget="handleTemplateAddWidget"
          @edit-widget="editWidget"
          @delete-widget="removeWidget"
        />
      </div>
      
      <!-- Dashboard Grid with fixed positions (for custom layouts or when no template is applied) -->
      <div v-else class="dashboard-grid" :class="{ 'editing': isEditing }">
        <div
          v-for="widget in widgets"
          :key="widget.id || widget.i"
          class="widget-container"
          :class="{ 'editing': isEditing }"
          :style="getWidgetStyle(widget)"
          :data-id="widget.id || widget.i"
        >
          <!-- Edit controls (only visible in edit mode) -->
          <div v-if="isEditing" class="widget-controls">
            <div class="control-row">
              <button class="control-button" @click="moveWidget(widget, 0, -10)">
                <ion-icon :icon="chevronUp"></ion-icon>
              </button>
            </div>
            <div class="control-row">
              <button class="control-button" @click="moveWidget(widget, -10, 0)">
                <ion-icon :icon="chevronBack"></ion-icon>
              </button>
              <button class="control-button" @click="moveWidget(widget, 10, 0)">
                <ion-icon :icon="chevronForward"></ion-icon>
              </button>
            </div>
            <div class="control-row">
              <button class="control-button" @click="moveWidget(widget, 0, 10)">
                <ion-icon :icon="chevronDown"></ion-icon>
              </button>
            </div>
          </div>

          <!-- Widget Component -->
          <Widget
            :config="{
              ...widget,
              dataSource: widget.dataSource || widget.data?.dataSource,
              tankType: widget.tankType || widget.data?.tankType
            }"
            :type="widget.component || widget.type || widget.displayType"
            :is-editing="isEditing"
            @remove="removeWidget(widget)"
            @edit="$emit('edit-widget', widget)"
            @mounted="handleComponentMounted"
            @add-widget="$emit('add-widget', widget.data?.area || null)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue';
import { IonFab, IonFabButton, IonIcon } from '@ionic/vue';
import { add, gridOutline, chevronUp, chevronDown, chevronBack, chevronForward } from 'ionicons/icons';
import Widget from './Widget.vue';
import DashboardTemplate from './DashboardTemplate.vue';
import TemplateLayout from './TemplateLayout.vue';
import { useDashboardStore } from '../../stores/dashboardStore';

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

// Handle widget component mounted event
const handleComponentMounted = (data) => {
  console.log('Widget component mounted:', data);
};

// Get widget style based on its position and size
const getWidgetStyle = (widget) => {
  // If the widget has x and y as numbers without units, it's likely from a template
  // and should use percentages instead of pixels
  const isTemplateWidget = typeof widget.x === 'number' && widget.x <= 100 && 
                           typeof widget.y === 'number' && widget.y <= 100;
  
  if (isTemplateWidget) {
    // For cross layout (template 4), we need to force square widgets
    if (currentTemplate.value === 4) {
      // For cross layout, use the exact same width and height as defined in the template
      // This ensures widgets match their placeholders exactly
      return {
        left: `${widget.x}%`,
        top: `${widget.y}%`,
        width: `${widget.width}%`, // Use the exact width from the template
        height: `${widget.height}%`, // Use the exact height from the template
        position: 'absolute',
        boxSizing: 'border-box',
        margin: '0',
        padding: '0'
      };
    } else {
      // For other templates, use the provided width and height
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
    }
  } else {
    // For regular widgets, use pixels and force square
    const size = Math.min(widget.width || 200, widget.height || 200);
    
    return {
      left: `${widget.x || 0}px`,
      top: `${widget.y || 0}px`,
      width: `${size}px`,
      height: `${size}px`,
      position: 'absolute',
      boxSizing: 'border-box',
      margin: '0',
      padding: '0'
    };
  }
};

// Move widget function with arrow buttons
const moveWidget = (widget, deltaX, deltaY) => {
  if (!props.isEditing) return;
  
  console.log(`Moving widget ${widget.id} by:`, { deltaX, deltaY });
  
  // Find the widget in the array
  const widgetIndex = widgets.value.findIndex(w => w.id === widget.id);
  if (widgetIndex !== -1) {
    // Calculate new position (ensure it stays within bounds)
    const newX = Math.max(0, (widget.x || 0) + deltaX);
    const newY = Math.max(0, (widget.y || 0) + deltaY);
    
    // Update the store with the new widget positions
    dashboardStore.updateWidgets(widgets.value);
    
    // Update the widget position
    widgets.value[widgetIndex].x = newX;
    widgets.value[widgetIndex].y = newY;
    
    console.log(`Widget ${widget.id} moved to:`, { x: newX, y: newY });
    
    // Save the updated layout
    saveLayout();
  }
};

// Edit widget function - emit event to parent component
const editWidget = (widget) => {
  console.log('Editing widget:', widget);
  emit('edit-widget', widget);
};

// Remove widget function
const removeWidget = (widget) => {
  console.log('Removing widget:', widget);
  
  // Find the widget in the array
  const widgetIndex = widgets.value.findIndex(w => 
    (w.id && w.id === widget.id) || (w.i && w.i === widget.i)
  );
  
  if (widgetIndex !== -1) {
    // Remove the widget from the array
    widgets.value.splice(widgetIndex, 1);
    
    // Update the store
    dashboardStore.updateWidgets(widgets.value);
    
    // Notify parent component
    emit('widget-removed', widget);
  }
};

// Load widgets from the dashboard store
const loadWidgets = () => {
  console.log('Loading widgets for dashboard index:', props.dashboardIndex);
  
  if (props.dashboardIndex !== undefined) {
    const dashboard = dashboardStore.getDashboard(props.dashboardIndex);
    if (dashboard) {
      console.log('Dashboard found:', dashboard);
      if (dashboard.layout) {
        widgets.value = dashboard.layout;
      } else {
        console.log('No layout found for dashboard');
        widgets.value = [];
      }
    } else {
      console.log('Dashboard not found for index:', props.dashboardIndex);
      widgets.value = [];
    }
  }
};

// Get the current template ID from the dashboard
const currentTemplate = computed(() => {
  if (props.dashboardIndex !== undefined) {
    const dashboard = dashboardStore.getDashboard(props.dashboardIndex);
    return dashboard?.template || null;
  }
  return null;
});

// Check if the template ID is valid and exists in the dashboardStore
const isValidTemplate = computed(() => {
  if (!currentTemplate.value) {
    console.log('No current template');
    return false;
  }
  console.log('Current template ID:', currentTemplate.value);
  const template = dashboardStore.getTemplateById(currentTemplate.value);
  console.log('Template found:', template);
  return template !== undefined;
});

// Handle add widget event from template layout
const handleTemplateAddWidget = (area) => {
  console.log('FreeDashboardGrid - handleTemplateAddWidget called with area:', area);
  emit('add-widget', area);
};



// Save the current layout to the dashboard store
const saveLayout = () => {
  if (props.dashboardIndex !== undefined) {
    dashboardStore.updateLayout(props.dashboardIndex, widgets.value);
    emit('layout-updated', widgets.value);
  }
};

// Apply a template to the dashboard
const applyTemplate = (template) => {
  console.log('Applying template:', template);
  
  if (!template || !template.layout) {
    console.error('Invalid template object:', template);
    return;
  }
  
  // If there are existing widgets, ask for confirmation
  if (widgets.value.length > 0 && !confirm('Applying a template will reset your current layout. Continue?')) {
    selectingTemplate.value = false;
    return;
  }
  
  // Clear existing widgets
  widgets.value = [];
  
  // Create widgets based on template areas
  const newWidgets = [];
  const timestamp = Date.now(); // Use a single timestamp for all widgets
  
  // For each area in the template, create a placeholder widget
  Object.entries(template.layout).forEach(([area, position], index) => {
    console.log(`Creating widget for area: ${area} at position:`, position);
    
    const widget = {
      id: `widget-${timestamp}-${index}`,
      title: `${area.charAt(0).toUpperCase() + area.slice(1)} Widget`,
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      component: 'placeholder', // Special placeholder component
      type: 'placeholder', // Type for component resolution
      displayType: 'placeholder',
      data: {
        area: area
      }
    };
    
    newWidgets.push(widget);
  });
  
  console.log('Created new widgets:', newWidgets);
  
  // Update the widgets array
  widgets.value = newWidgets;
  
  // Update the dashboard in the store with the new template and widgets
  if (props.dashboardIndex !== undefined) {
    const dashboard = dashboardStore.getDashboard(props.dashboardIndex);
    if (dashboard) {
      const updatedDashboard = {
        ...dashboard,
        template: template.id,
        widgets: newWidgets
      };
      
      console.log('Updating dashboard with new template and widgets:', updatedDashboard);
      dashboardStore.updateDashboard(props.dashboardIndex, updatedDashboard);
    } else {
      console.error('Dashboard not found for index:', props.dashboardIndex);
    }
  } else {
    console.error('Dashboard index is undefined');
  }
  
  // Exit template selection mode
  selectingTemplate.value = false;
};

// Watch for dashboard changes
watch(
  () => {
    const dashboard = dashboardStore.getDashboard(props.dashboardIndex);
    return dashboard ? dashboard.layout : [];
  },
  (newLayout) => {
    widgets.value = JSON.parse(JSON.stringify(newLayout || []));
    console.log('Dashboard layout updated with', widgets.value.length, 'widgets');
  },
  { immediate: true, deep: true }
);

// Watch for editing mode changes
watch(() => props.isEditing, (isEditing) => {
  console.log('Editing mode changed:', isEditing);
  
  // Wait for DOM to update
  nextTick(() => {
    console.log('DOM updated, edit mode:', isEditing);
    
    // Add class to body to prevent scrolling when in edit mode
    if (isEditing) {
      document.body.classList.add('dashboard-edit-mode');
    } else {
      document.body.classList.remove('dashboard-edit-mode');
    }
  });
}, { immediate: true });

// This is a duplicate function that we've removed

// Initialize
onMounted(() => {
  // Load widgets from the store
  loadWidgets();
  
  nextTick(() => {
    console.log('Dashboard mounted with', widgets.value.length, 'widgets');
  });
});

// Clean up
onUnmounted(() => {
  document.body.classList.remove('dashboard-edit-mode');
});
</script>

<style scoped>
.dashboard-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 10px;
}

.template-container {
  width: 100%;
  height: 100%;
  position: relative;
  padding: 0;
  box-sizing: border-box;
  margin: 0;
  overflow: hidden;
}

.template-selection {
  height: 100%;
  padding: 10px;
  overflow-y: auto;
}

.dashboard-grid {
  position: relative;
  width: 100%;
  height: 100%;
}

.empty-dashboard {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

.empty-content {
  text-align: center;
  color: #888;
}

.widget-container {
  position: absolute;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: visible;
  transition: box-shadow 0.3s ease;
}

.widget-container.editing {
  box-shadow: 0 0 0 2px #4a8bfc, 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* Widget Controls */
.widget-controls {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
  padding: 4px;
  z-index: 10;
  display: flex;
  justify-content: center;
}

.empty-dashboard {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
}

.empty-content {
  max-width: 400px;
  padding: 20px;
}

.empty-content h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.empty-content p {
  margin: 0;
  font-size: 14px;
}

/* Widgets overlay */
.template-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.widgets-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Allow clicks to pass through to the template layout */
  z-index: 10;
}

.widget-outer-container {
  position: absolute;
  pointer-events: auto; /* Make the widgets themselves clickable */
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.widget-square-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* Creates a 1:1 aspect ratio */
  overflow: hidden;
}

.widgets-overlay .widget-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto; /* Make the widgets themselves clickable */
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Ensure widget components fill their containers completely */
.widgets-overlay .widget-container > * {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  min-width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
</style>
