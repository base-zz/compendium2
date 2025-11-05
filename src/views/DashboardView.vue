<template>
  <ion-page>
    <generic-header title="Dashboard" />
    <ion-content class="content-with-header">
      <loading-content v-if="loading">loading</loading-content>

      <swiper
        v-else
        :modules="modules"
        :pagination="{ clickable: true }"
        :navigation="true"
        :speed="400"
        :initial-slide="initialSlide"
        @swiper="setSwiperRef"
        @slideChange="onSlideChange"
        class="slides-container"
        :touchEventsTarget="'container'"
        :noSwiping="false"
        :touchReleaseOnEdges="true"
        :preventInteractionOnTransition="false"
        :touchStartPreventDefault="false"
      >
        <swiper-slide v-for="(dashboard, i) in dashboards" :key="'ss-' + i" class="slide-content">
          <div class="dashboard-container">
            <!-- Dashboard header removed for simplicity -->
            <div class="dashboard-content">
              <DirectPlacementGrid
                :dashboard-index="i"
                :is-editing="isEditing"
                @layout-updated="onLayoutUpdated"
                @add-widget="handleAddWidgetClick"
                @edit-widget="onWidgetEdited"
                @delete-widget="onWidgetRemoved"
                @widget-removed="onWidgetRemoved"
              />
            </div>
          </div>
        </swiper-slide>
      </swiper>

      <!-- Floating action buttons - made smaller -->
      <ion-fab vertical="bottom" horizontal="start" slot="fixed">
        <ion-fab-button id="add-dashboard-button" color="primary" @click="handleAddDashboardClick" size="small">
          <ion-icon :icon="addCircleOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed" v-if="dashboards.length > 0">
        <ion-fab-button
          id="edit-dashboard-button"
          :color="isEditing ? 'success' : 'primary'"
          @click="toggleEditMode"
          size="small"
        >
          <ion-icon :icon="isEditing ? checkmarkOutline : pencilOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
      
      <!-- Delete dashboard FAB - only visible in edit mode with more than one dashboard -->
      <ion-fab vertical="bottom" horizontal="center" slot="fixed" v-if="isEditing && dashboards.length > 1">
        <ion-fab-button
          id="delete-dashboard-button"
          color="danger"
          size="small"
          @click="handleDeleteDashboardClick"
        >
          <ion-icon :icon="trashOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Add widget FAB - only visible in edit mode -->
      <ion-fab vertical="top" horizontal="end" slot="fixed" v-if="isEditing && dashboards.length > 0">
        <ion-fab-button
          id="add-widget-button"
          color="secondary"
          @click="handleAddWidgetClick"
        >
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <div class="floating-container">
      <div class="page-indicator">
        <span
          class="bullet"
          :class="i === selectedDashboardIndex ? 'active-bullet' : ''"
          v-for="(d, i) in dashboards"
          :key="'bullet-' + i"
        >
          &bull;
        </span>
      </div>
    </div>
  </ion-page>
</template>

<script setup>
import { IonPage, IonContent, IonIcon, IonFab, IonFabButton, modalController } from "@ionic/vue";
import GenericHeader from "@/components/GenericHeader.vue";
import LoadingContent from "@/components/LoadingContent.vue";
import DirectPlacementGrid from '../components/dashboard/DirectPlacementGrid.vue';
import AddWidgetModal from "@/components/dashboard/AddWidgetModal.vue";
import { useDashboardStore } from "@/stores/dashboardStore";
import { computed, onMounted, ref } from "vue";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Pagination, Navigation } from "swiper/modules";
import { addCircleOutline, addOutline, pencilOutline, checkmarkOutline, trashOutline } from "ionicons/icons";
// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import "@ionic/vue/css/ionic-swiper.css";

// Define the dashboard store
const dashboardStore = useDashboardStore();

// Make dashboards reactive
const dashboards = computed(() => dashboardStore.dashboards);

// Loading state
const loading = ref(true);

// Edit mode
const isEditing = ref(false);

// Initial slide
const initialSlide = ref(0);

// Selected dashboard index
const selectedDashboardIndex = ref(0);

// Swiper modules
const modules = [Pagination, Navigation];

// Swiper reference
const swiperRef = ref(null);

// Set swiper reference
function setSwiperRef(swiper) {
  swiperRef.value = swiper;
}

// Handle slide change
function onSlideChange(e) {
  selectedDashboardIndex.value = e.activeIndex;
  // Save last dashboard index to localStorage
  localStorage.setItem("lastDashboardIndex", e.activeIndex.toString());
}

// Handle layout updates
function onLayoutUpdated(layout) {
  console.log("Layout updated:", layout);
}

// This function has been replaced by handleAddWidgetClick
// which now handles both direct add and area-specific widget addition

// Handle widget removed
function onWidgetRemoved(widget) {
  console.log("Widget removed:", widget);
  
  // Get the current dashboard's widgets
  const dashboard = dashboardStore.getDashboard(selectedDashboardIndex.value);
  if (!dashboard) return;
  
  // Find the widget in the dashboard
  const widgets = dashboard.widgets || [];
  const widgetIndex = widgets.findIndex(w => 
    (widget.id && w.id === widget.id) || 
    (widget.i && w.i === widget.i) ||
    (w.area === widget.area)
  );
  
  if (widgetIndex !== -1) {
    // Remove the widget from the array
    widgets.splice(widgetIndex, 1);
    
    // Update the dashboard store
    dashboardStore.updateWidgets(selectedDashboardIndex.value, widgets);
    console.log("Widget successfully removed from dashboard");
  }
}

// Handle widget edited
async function onWidgetEdited(widget) {
  console.log("Widget edited:", widget);
  
  // Open the AddWidgetModal in edit mode with the widget data
  const modal = await modalController.create({
    component: AddWidgetModal,
    componentProps: {
      editMode: true,
      widgetData: widget,
      widgetType: widget.type || widget.displayType || widget.component,
      area: widget.data?.area || null
    }
  });

  await modal.present();

  // Handle modal dismiss
  const { data, role } = await modal.onDidDismiss();
  
  if (role === 'confirm' && data) {
    console.log('Widget updated:', data);
    console.log('Widget ID being updated:', widget.id);
    
    // Log current dashboard state before update
    const currentDashboard = dashboardStore.getDashboard(selectedDashboardIndex.value);
    console.log('Current dashboard before update:', currentDashboard);
    console.log('Current dashboard layout:', currentDashboard?.layout || []);
    console.log('Current dashboard widgets:', currentDashboard?.widgets || []);
    console.log('Widget IDs in layout:', currentDashboard?.layout?.map(w => w.id) || []);
    
    // Update the widget in the dashboard
    dashboardStore.updateWidget(selectedDashboardIndex.value, widget.id, data);
    
    // Log dashboard state after update
    setTimeout(() => {
      const updatedDashboard = dashboardStore.getDashboard(selectedDashboardIndex.value);
      console.log('Dashboard after update:', updatedDashboard);
      console.log('Updated widget IDs in layout:', updatedDashboard?.layout?.map(w => w.id) || []);
    }, 500);
  }
}

// Toggle edit mode
function toggleEditMode() {
  isEditing.value = !isEditing.value;
  console.log('DashboardView - Edit mode toggled to:', isEditing.value);
}

// Add a new dashboard
function handleAddDashboardClick() {
  const newDashboard = {
    id: `dashboard-${Date.now()}`,
    layout: [],
  };

  dashboardStore.addDashboard(newDashboard);

  selectedDashboardIndex.value = dashboards.value.length - 1;

  if (swiperRef.value) {
    swiperRef.value.slideTo(selectedDashboardIndex.value);
  }
}

// Delete the current dashboard
function handleDeleteDashboardClick() {
  if (dashboards.value.length <= 1) {
    alert('Cannot delete the last dashboard. At least one dashboard must exist.');
    return;
  }
  
  if (confirm('Are you sure you want to delete this dashboard?')) {
    const currentIndex = selectedDashboardIndex.value;
    
    dashboardStore.deleteDashboard(currentIndex);
    
    if (currentIndex >= dashboards.value.length) {
      selectedDashboardIndex.value = dashboards.value.length - 1;
    }
    
    if (swiperRef.value) {
      swiperRef.value.slideTo(selectedDashboardIndex.value);
    }
    
    console.log('Dashboard deleted, new index:', selectedDashboardIndex.value);
  }
}

// Add a new widget to the current dashboard
async function handleAddWidgetClick(area = null) {
  console.log('DashboardView - handleAddWidgetClick called with area:', area, typeof area);
  
  // Extract the area string if it's an object
  let areaString = area;
  if (typeof area === 'object' && area !== null && 'area' in area) {
    areaString = area.area;
  }
  
  const modal = await modalController.create({
    component: AddWidgetModal,
    componentProps: {
      editMode: false,
      area: areaString
    }
  });

  await modal.present();

  // Handle modal dismiss
  const { data, role } = await modal.onDidDismiss();
  
  if (role === 'confirm' && data) {
    // Get current dashboard to find template layout
    const currentDashboard = dashboardStore.getDashboard(selectedDashboardIndex.value);
    let position = { x: 0, y: 0, width: 50, height: 150 }; // Default position
    
    // If we have a template, use the position from the template
    if (currentDashboard?.template) {
      // Find the template
      const templateId = currentDashboard.template;
      const template = dashboardStore.getTemplateById(templateId);
      
      console.log(`Template for area ${area}:`, template);
      
      // Extract area string if it's an object
      let areaString = area;
      if (typeof area === 'object' && area !== null && 'area' in area) {
        areaString = area.area;
      }
      
      // If we still have the old layout format, use it for backward compatibility
      if (template && template.layout && template.layout[areaString]) {
        position = template.layout[areaString];
        console.log(`Using position from template for area ${areaString}:`, position);
      }
    }
    
    // Ensure the area property is maintained and position is added
    const newWidget = {
      ...data,  // Spread all properties from the modal data
      area: area,  // Explicitly set the area property
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height
    };
    
    // Log the complete widget data for debugging
    console.log('Complete widget data being added to dashboard:', newWidget);
    
    console.log('Adding new widget to dashboard:', newWidget);
    
    try {
      // Add widget to current dashboard
      await dashboardStore.addWidget(selectedDashboardIndex.value, newWidget);
      
      // Force refresh the dashboard
      setTimeout(() => {
        if (swiperRef.value) {
          swiperRef.value.update();
        }
      }, 200);
    } catch (error) {
      console.error('Error adding widget:', error);
    }
  }
}

// Create a default dashboard if none exists
async function createDefaultDashboard() {
  try {
    await dashboardStore.newDashboard("Dashboard 1");
    console.log("Created default dashboard");
    return true;
  } catch (error) {
    console.error("Error creating default dashboard:", error);
    return false;
  }
}

// Initialize
onMounted(async () => {
  loading.value = true;
  
  // Initialize dashboard store
  await dashboardStore.init();
  
  // Get dashboards
  const d = await dashboardStore.getDashboards();
  
  // If no dashboards exist, create a default one
  if (!d || d.length === 0) {
    await createDefaultDashboard();
  }
  
  // Check if there's a saved dashboard index in localStorage
  const savedDashboardIndex = localStorage.getItem("lastDashboardIndex");
  
  if (savedDashboardIndex !== null) {
    const index = parseInt(savedDashboardIndex);
    if (!isNaN(index) && index >= 0 && index < dashboards.value.length) {
      selectedDashboardIndex.value = index;
      initialSlide.value = index;
    }
  }
  
  loading.value = false;
});
</script>

<style scoped>
.slides-container {
  width: 100%;
  height: 100%;
  touch-action: pan-y;
  background: #111827 !important;
}

.slide-content {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  touch-action: pan-y;
  background: #111827 !important;
}

:deep(.swiper) {
  background: #111827 !important;
}

:deep(.swiper-slide) {
  background: #111827 !important;
}

.dashboard-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #111827 !important;
  color: var(--app-text-color);
}

.dashboard-header {
  padding: 8px 16px;
  background-color: var(--app-surface-color);
  color: var(--app-text-color);
  border-bottom: 1px solid var(--app-border-color);
  z-index: 10;
}

.dashboard-name-input {
  --color: var(--app-text-color);
  --placeholder-color: var(--app-muted-text-color);
  --placeholder-opacity: 0.7;
  font-weight: 500;
}

.dashboard-content {
  flex: 1;
  overflow: hidden;
  padding: 8px;
  background: #111827 !important;
}

.page-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
}

.bullet {
  font-size: 24px;
  margin: 0 4px;
  color: var(--ion-color-medium);
  opacity: 0.5;
  transition: all 0.2s ease;
}

.active-bullet {
  color: var(--ion-color-primary);
  opacity: 1;
  transform: scale(1.2);
}

.floating-container {
  position: absolute;
  bottom: 80px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: 1000;
  pointer-events: none;
}

ion-content.content-with-header {
  --background: #111827 !important;
  background: #111827 !important;
}

ion-content.content-with-header::part(background) {
  background: #111827 !important;
}
</style>
