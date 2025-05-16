<template>
  <div class="dashboard-grid-container">
    <!-- Use our new CSS Grid Dashboard implementation -->
    <CssGridDashboard
      v-if="dashboardIndex !== undefined"
      :dashboardIndex="dashboardIndex"
      :isEditing="isEditing"
      @add-widget="addWidget"
      @edit-widget="editWidget"
      @delete-widget="removeWidget"
    />
    
    <div v-else class="empty-dashboard">
      <div class="empty-content">
        <ion-icon :icon="gridOutline" size="large"></ion-icon>
        <h3>No Widgets</h3>
        <p>Click the + button to add widgets to your dashboard</p>
        <ion-button v-if="isEditing" @click="addWidget" color="primary">
          <ion-icon :icon="addOutline" slot="start"></ion-icon>
          Add Widget
        </ion-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { IonIcon, IonButton } from '@ionic/vue';
import { gridOutline, addOutline } from 'ionicons/icons';
import AddWidgetModal from './AddWidgetModal.vue';
import { modalController } from '@ionic/vue';
import { useDashboardStore } from '../../stores/dashboardStore';
import CssGridDashboard from './CssGridDashboard.vue';

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

const emit = defineEmits(['layout-updated', 'widget-added', 'widget-removed', 'widget-edited']);

// Initialize dashboard store
const dashboardStore = useDashboardStore();

// Local copy of layout
const layout = ref([]);

// Watch for dashboard changes
watch(
  () => {
    const dashboard = dashboardStore.getDashboard(props.dashboardIndex);
    return dashboard ? dashboard.layout : [];
  },
  (newLayout) => {
    layout.value = JSON.parse(JSON.stringify(newLayout || []));
  },
  { immediate: true, deep: true }
);

// Watch for edit mode changes
watch(
  () => props.isEditing,
  (newValue) => {
    console.log('DashboardGrid - Edit mode changed:', newValue);
  },
  { immediate: true }
);

// No longer need onLayoutUpdated as we're using CSS Grid

// Edit widget
const editWidget = async (widgetId) => {
  const widgetItem = layout.value.find(item => item.i === widgetId);
  if (!widgetItem) return;

  // Open edit modal
  const modal = await modalController.create({
    component: AddWidgetModal,
    componentProps: {
      editMode: true,
      widgetData: widgetItem.config,
      widgetType: widgetItem.component
    }
  });

  await modal.present();

  // Handle modal dismiss
  const { data, role } = await modal.onDidDismiss();
  
  if (role === 'confirm' && data) {
    // Update widget
    const updatedWidget = {
      ...widgetItem,
      component: data.displayType,
      config: data
    };
    
    // Find and update widget in layout
    const index = layout.value.findIndex(item => item.i === widgetId);
    if (index !== -1) {
      layout.value[index] = updatedWidget;
      await dashboardStore.updateLayout(props.dashboardIndex, layout.value);
      emit('widget-edited', updatedWidget);
    }
  }
};

// Remove widget
const removeWidget = async (widgetId) => {
  if (confirm('Are you sure you want to remove this widget?')) {
    // Remove widget from layout
    const index = layout.value.findIndex(item => item.i === widgetId);
    if (index !== -1) {
      layout.value.splice(index, 1);
      await dashboardStore.updateLayout(props.dashboardIndex, layout.value);
      emit('widget-removed', widgetId);
    }
  }
};

// Add widget
const addWidget = async () => {
  // Open add widget modal
  const modal = await modalController.create({
    component: AddWidgetModal,
    componentProps: {
      editMode: false
    }
  });

  await modal.present();

  // Handle modal dismiss
  const { data, role } = await modal.onDidDismiss();
  
  if (role === 'confirm' && data) {
    // Generate unique ID
    const widgetId = `widget-${Date.now()}`;
    
    // Create new widget
    const newWidget = {
      i: widgetId,
      x: 0, // Default position
      y: 0, // Will be adjusted by layout system
      w: 6, // Half width
      h: 6, // Default height
      component: data.displayType,
      config: data
    };
    
    // Add widget to layout
    layout.value.push(newWidget);
    await dashboardStore.updateLayout(props.dashboardIndex, layout.value);
    emit('widget-added', newWidget);
  }
};

// Initialize
onMounted(async () => {
  // Load dashboard layout
  const dashboard = dashboardStore.getDashboard(props.dashboardIndex);
  if (dashboard && dashboard.layout) {
    layout.value = JSON.parse(JSON.stringify(dashboard.layout));
  }
});
</script>

<style scoped>
.dashboard-grid-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background-color: var(--ion-color-light);
}

.grid-layout {
  background-color: var(--ion-color-light);
}

.grid-item {
  background-color: transparent;
  border-radius: 8px;
  overflow: visible;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.grid-item .vue-resizable-handle {
  position: absolute;
  width: 20px;
  height: 20px;
  bottom: 0;
  right: 0;
  background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pg08IS0tIEdlbmVyYXRvcjogQWRvYmUgRmlyZXdvcmtzIENTNiwgRXhwb3J0IFNWRyBFeHRlbnNpb24gYnkgQWFyb24gQmVhbGwgKGh0dHA6Ly9maXJld29ya3MuYWJlYWxsLmNvbSkgLiBWZXJzaW9uOiAwLjYuMSAgLS0+DTwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DTxzdmcgaWQ9IlVudGl0bGVkLVBhZ2UlMjAxIiB2aWV3Qm94PSIwIDAgNiA2IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjojZmZmZmZmMDAiIHZlcnNpb249IjEuMSINCXhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHhtbDpzcGFjZT0icHJlc2VydmUiDQl4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjZweCIgaGVpZ2h0PSI2cHgiDT4NCTxnIG9wYWNpdHk9IjAuMzAyIj4NCQk8cGF0aCBkPSJNIDYgNiBMIDAgNiBMIDAgNC4yIEwgNCA0LjIgTCA0LjIgNC4yIEwgNC4yIDAgTCA2IDAgTCA2IDYgTCA2IDYgWiIgZmlsbD0iIzAwMDAwMCIvPg0JPC9nPg08L3N2Zz4=');
  background-position: bottom right;
  padding: 0 3px 3px 0;
  background-repeat: no-repeat;
  background-origin: content-box;
  box-sizing: border-box;
  cursor: se-resize;
  z-index: 10;
}

.empty-dashboard {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background-color: var(--ion-color-light);
  border-radius: 8px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem;
  max-width: 300px;
}

.empty-content h3 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: var(--ion-color-medium);
}

.empty-content p {
  margin-bottom: 1.5rem;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.empty-content ion-icon {
  color: var(--ion-color-medium);
  opacity: 0.7;
}
</style>
