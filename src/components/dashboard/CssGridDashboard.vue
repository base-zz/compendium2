<template>
  <div class="dashboard-container">
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

      <!-- Template Layout with CSS Grid -->
      <div v-if="currentTemplate && isValidTemplate" class="grid-container" :class="'template-' + currentTemplate">
        <!-- Cross Layout (Template 4) -->
        <template v-if="currentTemplate === 4">
          <!-- Top Left -->
          <div class="grid-area area-topLeft">
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
          
          <!-- Top Right -->
          <div class="grid-area area-topRight">
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
          
          <!-- Center -->
          <div class="grid-area area-center">
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
          
          <!-- Bottom Left -->
          <div class="grid-area area-bottomLeft">
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
          
          <!-- Bottom Right -->
          <div class="grid-area area-bottomRight">
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
        </template>

        <!-- Single Widget (Template 1) -->
        <template v-else-if="currentTemplate === 1">
          <div class="grid-area area-main">
            <Widget 
              v-if="getWidgetForArea('main')"
              :widget="getWidgetForArea('main')" 
              :type="getWidgetForArea('main').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('main'))"
              @remove="$emit('delete-widget', getWidgetForArea('main'))"
            />
            <PlaceholderWidget 
              v-else
              area="main" 
              @add-widget="handleAddWidget('main')" 
            />
          </div>
        </template>

        <!-- Stacked 2 (Template 2) -->
        <template v-else-if="currentTemplate === 2">
          <div class="grid-area area-top">
            <Widget 
              v-if="getWidgetForArea('top')"
              :widget="getWidgetForArea('top')" 
              :type="getWidgetForArea('top').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('top'))"
              @remove="$emit('delete-widget', getWidgetForArea('top'))"
            />
            <PlaceholderWidget 
              v-else
              area="top" 
              @add-widget="handleAddWidget('top')" 
            />
          </div>
          
          <div class="grid-area area-bottom">
            <Widget 
              v-if="getWidgetForArea('bottom')"
              :widget="getWidgetForArea('bottom')" 
              :type="getWidgetForArea('bottom').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('bottom'))"
              @remove="$emit('delete-widget', getWidgetForArea('bottom'))"
            />
            <PlaceholderWidget 
              v-else
              area="bottom" 
              @add-widget="handleAddWidget('bottom')" 
            />
          </div>
        </template>

        <!-- Stacked 3 (Template 3) -->
        <template v-else-if="currentTemplate === 3">
          <div class="grid-area area-top">
            <Widget 
              v-if="getWidgetForArea('top')"
              :widget="getWidgetForArea('top')" 
              :type="getWidgetForArea('top').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('top'))"
              @remove="$emit('delete-widget', getWidgetForArea('top'))"
            />
            <PlaceholderWidget 
              v-else
              area="top" 
              @add-widget="handleAddWidget('top')" 
            />
          </div>
          
          <div class="grid-area area-middle">
            <Widget 
              v-if="getWidgetForArea('middle')"
              :widget="getWidgetForArea('middle')" 
              :type="getWidgetForArea('middle').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('middle'))"
              @remove="$emit('delete-widget', getWidgetForArea('middle'))"
            />
            <PlaceholderWidget 
              v-else
              area="middle" 
              @add-widget="handleAddWidget('middle')" 
            />
          </div>
          
          <div class="grid-area area-bottom">
            <Widget 
              v-if="getWidgetForArea('bottom')"
              :widget="getWidgetForArea('bottom')" 
              :type="getWidgetForArea('bottom').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('bottom'))"
              @remove="$emit('delete-widget', getWidgetForArea('bottom'))"
            />
            <PlaceholderWidget 
              v-else
              area="bottom" 
              @add-widget="handleAddWidget('bottom')" 
            />
          </div>
        </template>

        <!-- Grid 2x3 (Template 6) -->
        <template v-else-if="currentTemplate === 6">
          <div class="grid-area area-topLeft">
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
          
          <div class="grid-area area-topRight">
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
          
          <div class="grid-area area-middleLeft">
            <Widget 
              v-if="getWidgetForArea('middleLeft')"
              :widget="getWidgetForArea('middleLeft')" 
              :type="getWidgetForArea('middleLeft').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('middleLeft'))"
              @remove="$emit('delete-widget', getWidgetForArea('middleLeft'))"
            />
            <PlaceholderWidget 
              v-else
              area="middleLeft" 
              @add-widget="handleAddWidget('middleLeft')" 
            />
          </div>
          
          <div class="grid-area area-middleRight">
            <Widget 
              v-if="getWidgetForArea('middleRight')"
              :widget="getWidgetForArea('middleRight')" 
              :type="getWidgetForArea('middleRight').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('middleRight'))"
              @remove="$emit('delete-widget', getWidgetForArea('middleRight'))"
            />
            <PlaceholderWidget 
              v-else
              area="middleRight" 
              @add-widget="handleAddWidget('middleRight')" 
            />
          </div>
          
          <div class="grid-area area-bottomLeft">
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
          
          <div class="grid-area area-bottomRight">
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
        </template>

        <!-- Anchor Watch (Template 7) -->
        <template v-else-if="currentTemplate === 7">
          <div class="grid-area area-topLeft">
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

          <div class="grid-area area-topCenter">
            <Widget 
              v-if="getWidgetForArea('topCenter')"
              :widget="getWidgetForArea('topCenter')" 
              :type="getWidgetForArea('topCenter').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('topCenter'))"
              @remove="$emit('delete-widget', getWidgetForArea('topCenter'))"
            />
            <PlaceholderWidget 
              v-else
              area="topCenter" 
              @add-widget="handleAddWidget('topCenter')" 
            />
          </div>

          <div class="grid-area area-topRight">
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

          <div class="grid-area area-middleLeft">
            <Widget 
              v-if="getWidgetForArea('middleLeft')"
              :widget="getWidgetForArea('middleLeft')" 
              :type="getWidgetForArea('middleLeft').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('middleLeft'))"
              @remove="$emit('delete-widget', getWidgetForArea('middleLeft'))"
            />
            <PlaceholderWidget 
              v-else
              area="middleLeft" 
              @add-widget="handleAddWidget('middleLeft')" 
            />
          </div>

          <div class="grid-area area-middleCenter">
            <Widget 
              v-if="getWidgetForArea('middleCenter')"
              :widget="getWidgetForArea('middleCenter')" 
              :type="getWidgetForArea('middleCenter').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('middleCenter'))"
              @remove="$emit('delete-widget', getWidgetForArea('middleCenter'))"
            />
            <PlaceholderWidget 
              v-else
              area="middleCenter" 
              @add-widget="handleAddWidget('middleCenter')" 
            />
          </div>

          <div class="grid-area area-middleRight">
            <Widget 
              v-if="getWidgetForArea('middleRight')"
              :widget="getWidgetForArea('middleRight')" 
              :type="getWidgetForArea('middleRight').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('middleRight'))"
              @remove="$emit('delete-widget', getWidgetForArea('middleRight'))"
            />
            <PlaceholderWidget 
              v-else
              area="middleRight" 
              @add-widget="handleAddWidget('middleRight')" 
            />
          </div>

          <div class="grid-area area-bottom">
            <Widget 
              v-if="getWidgetForArea('bottom')"
              :widget="getWidgetForArea('bottom')" 
              :type="getWidgetForArea('bottom').type || 'placeholder'" 
              :is-editing="isEditing"
              @edit="$emit('edit-widget', getWidgetForArea('bottom'))"
              @remove="$emit('delete-widget', getWidgetForArea('bottom'))"
            />
            <PlaceholderWidget 
              v-else
              area="bottom" 
              @add-widget="handleAddWidget('bottom')" 
            />
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
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

const emit = defineEmits(['add-widget', 'edit-widget', 'delete-widget']);

// Dashboard store
const dashboardStore = useDashboardStore();

// Template selection state
const selectingTemplate = ref(false);
const selectedTemplateId = ref(null);

// Get the current template ID from the dashboard
const currentTemplate = computed(() => {
  if (props.dashboardIndex !== undefined) {
    const dashboard = dashboardStore.getDashboard(props.dashboardIndex);
    return dashboard?.template || null;
  }
  return null;
});

// Get the template layout from the dashboard store
const templateLayout = computed(() => {
  if (!currentTemplate.value) return {};
  
  const template = dashboardStore.getTemplateById(currentTemplate.value);
  return template?.layout || {};
});

// Check if the template is valid
const isValidTemplate = computed(() => {
  return !!templateLayout.value && Object.keys(templateLayout.value).length > 0;
});

// Get widgets from the dashboard
const widgets = computed(() => {
  if (props.dashboardIndex === undefined) return [];
  
  const dashboard = dashboardStore.getDashboard(props.dashboardIndex);
  return dashboard?.widgets || [];
});

// Helper function to get widget for a specific area
const getWidgetForArea = (area) => {
  return widgets.value.find(widget => widget.area === area);
};

// Handle add widget event
const handleAddWidget = (area) => {
  console.log('Adding widget to area:', area);
  emit('add-widget', area);
};

// Apply template to dashboard
const applyTemplate = (template) => {
  console.log('Applying template:', template);
  
  // Get the dashboard
  const dashboard = dashboardStore.getDashboard(props.dashboardIndex);
  
  if (dashboard) {
    // Update the dashboard with the new template
    dashboardStore.updateDashboard(props.dashboardIndex, {
      ...dashboard,
      template: template.id
    });
    
    // Reset template selection
    selectingTemplate.value = false;
  }
};

// Initialize component
onMounted(() => {
  console.log('CssGridDashboard mounted with dashboard index:', props.dashboardIndex);
  console.log('Current template:', currentTemplate.value);
  console.log('Template layout:', templateLayout.value);
  console.log('Widgets:', widgets.value);
});
</script>

<style scoped>
.dashboard-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.template-selection {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid-container {
  width: 100%;
  height: 100%;
  display: grid;
  gap: 4px;
  box-sizing: border-box;
  padding: 4px;
}

/* Grid area styling */
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

/* Ensure all direct children fill the entire area */
.grid-area > * {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

/* Template 1: Single Widget */
.grid-container.template-1 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.template-1 .area-main {
  grid-area: 1 / 1 / 2 / 2;
}

/* Template 2: Stacked 2 */
.grid-container.template-2 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr;
}

.template-2 .area-top {
  grid-area: 1 / 1 / 2 / 2;
}

.template-2 .area-bottom {
  grid-area: 2 / 1 / 3 / 2;
}

/* Template 3: Stacked 3 */
.grid-container.template-3 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr 1fr;
}

.template-3 .area-top {
  grid-area: 1 / 1 / 2 / 2;
}

.template-3 .area-middle {
  grid-area: 2 / 1 / 3 / 2;
}

.template-3 .area-bottom {
  grid-area: 3 / 1 / 4 / 2;
}

/* Template 4: Cross Layout */
.grid-container.template-4 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 2fr 4fr 2fr;
}

.template-4 .area-topLeft {
  grid-area: 1 / 1 / 2 / 2;
}

.template-4 .area-topRight {
  grid-area: 1 / 2 / 2 / 3;
}

.template-4 .area-center {
  grid-area: 2 / 1 / 3 / 3;
}

.template-4 .area-bottomLeft {
  grid-area: 3 / 1 / 4 / 2;
}

.template-4 .area-bottomRight {
  grid-area: 3 / 2 / 4 / 3;
}

/* Template 6: Grid 2x3 */
.grid-container.template-6 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
}

.template-6 .area-topLeft {
  grid-area: 1 / 1 / 2 / 2;
}

.template-6 .area-topRight {
  grid-area: 1 / 2 / 2 / 3;
}

.template-6 .area-middleLeft {
  grid-area: 2 / 1 / 3 / 2;
}

.template-6 .area-middleRight {
  grid-area: 2 / 2 / 3 / 3;
}

.template-6 .area-bottomLeft {
  grid-area: 3 / 1 / 4 / 2;
}

.template-6 .area-bottomRight {
  grid-area: 3 / 2 / 4 / 3;
}

/* Template 7: Anchor Watch */
.grid-container.template-7 {
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1.5fr;
}

.template-7 .area-topLeft {
  grid-area: 1 / 1 / 2 / 2;
}

.template-7 .area-topCenter {
  grid-area: 1 / 2 / 2 / 3;
}

.template-7 .area-topRight {
  grid-area: 1 / 3 / 2 / 4;
}

.template-7 .area-middleLeft {
  grid-area: 2 / 1 / 3 / 2;
}

.template-7 .area-middleCenter {
  grid-area: 2 / 2 / 3 / 3;
}

.template-7 .area-middleRight {
  grid-area: 2 / 3 / 3 / 4;
}

.template-7 .area-bottom {
  grid-area: 3 / 1 / 4 / 4;
}
</style>
