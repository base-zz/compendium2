import { defineStore } from "pinia";
import { Preferences } from "@capacitor/preferences";
import { ref } from "vue";
import { createWidgetModel } from "@/shared/widgetModel";
import crypto from 'crypto';

// Storage key constant
const DASHBOARD_STORAGE_KEY = "navcc_dashboards";

/**
 * Dashboard store for managing dashboard configurations
 */
export const useDashboardStore = defineStore("dashboards", () => {
  /* the dashboards container */
  const dashboards = ref([]);
  const isInitialized = ref(false);
  const currentDashboardIndex = ref(0);

  /* strip out all the ref stuff before writing to storage */
  function getCleanDashboards() {
    return JSON.parse(JSON.stringify(dashboards.value));
  }

  const getDashboard = (index) => {
    if (typeof index === 'undefined' || index < 0 || index >= dashboards.value.length) {
      return null;
    }
    return dashboards.value[index];
  };

  /* init from preferences */
  const init = async () => {
    if (isInitialized.value) return;
    
    try {
      const { value } = await Preferences.get({ key: DASHBOARD_STORAGE_KEY });
      
      if (value) {
        dashboards.value = JSON.parse(value);
      }
      isInitialized.value = true;
    } catch (error) {
      console.error('Error loading dashboards from preferences:', error);
      isInitialized.value = true;
    }
  };

  const getDashboards = async () => {
    await init();
    try {
      const { value } = await Preferences.get({ key: DASHBOARD_STORAGE_KEY });
      if (value) {
        dashboards.value = JSON.parse(value);
      }
      return dashboards.value;
    } catch (error) {
      console.error('Error loading dashboards from preferences:', error);
      return [];
    }
  };

  const addDashboard = async (dashboard) => {
    await init();
    // Ensure widgets array exists
    if (!dashboard.widgets) {
      dashboard.widgets = [];
    }
    
    // Add the dashboard
    dashboards.value.push(dashboard);
    
    // Save to storage
    try {
      const cleanDashboards = getCleanDashboards();
      await Preferences.set({
        key: DASHBOARD_STORAGE_KEY,
        value: JSON.stringify(cleanDashboards)
      });
      dashboards.value = cleanDashboards;
    } catch (error) {
      console.error('Error saving dashboards to preferences:', error);
    }
  };

  const newDashboard = async (name = "New Dashboard") => {
    await init();
    const dashboard = {
      name,
      layout: [],
      widgets: []
    };
    
    // Add the dashboard
    dashboards.value.push(dashboard);
    
    // Save to storage
    try {
      const cleanDashboards = getCleanDashboards();
      await Preferences.set({
        key: DASHBOARD_STORAGE_KEY,
        value: JSON.stringify(cleanDashboards)
      });
      dashboards.value = cleanDashboards;
    } catch (error) {
      console.error('Error saving dashboards to preferences:', error);
    }
  };

  const deleteDashboard = async (index) => {
    await init();
    if (index > -1) {
      // Remove the dashboard
      dashboards.value.splice(index, 1);
      
      // Save to storage
      try {
        const cleanDashboards = getCleanDashboards();
        await Preferences.set({
          key: DASHBOARD_STORAGE_KEY,
          value: JSON.stringify(cleanDashboards)
        });
        dashboards.value = cleanDashboards;
      } catch (error) {
        console.error('Error saving dashboards to preferences:', error);
      }
    } else {
      console.error('Invalid dashboard index:', index);
    }
  };

  const deleteAllDashboards = async () => {
    await init();
    // Clear all dashboards
    dashboards.value = [];
    
    // Save to storage
    try {
      await Preferences.set({
        key: DASHBOARD_STORAGE_KEY,
        value: JSON.stringify([])
      });
    } catch (error) {
      console.error('Error saving dashboards to preferences:', error);
    }
  };

  const updateDashboard = async (index, dashboard) => {
    await init();
    if (index > -1) {
      // Create a clean copy of the dashboard
      const cleanDashboard = JSON.parse(JSON.stringify({
        name: dashboard.name || "Unnamed Dashboard",
        layout: dashboard.layout || [],
        template: dashboard.template || null,
        widgets: dashboard.widgets || []
      }));
      
      // Update the dashboard
      dashboards.value[index] = cleanDashboard;
      
      // Save to storage
      try {
        const cleanDashboards = getCleanDashboards();
        await Preferences.set({
          key: DASHBOARD_STORAGE_KEY,
          value: JSON.stringify(cleanDashboards)
        });
        dashboards.value = cleanDashboards;
      } catch (error) {
        console.error('Error saving dashboards to preferences:', error);
      }
    } else {
      console.error('Invalid dashboard index:', index);
    }
  };

  const updateLayout = async (index, layout) => {
    await init();
    if (index > -1 && dashboards.value[index]) {
      // Create standardized widgets from the layout
      const standardizedLayout = layout.map(widget => {
        // Preserve the widget's position and size
        return createWidgetModel({
          ...widget,
          // Ensure position properties are preserved
          x: widget.x,
          y: widget.y,
          width: widget.width || widget.w,
          height: widget.height || widget.h
        });
      });
      
      console.log('Saving standardized layout:', standardizedLayout);
      
      // Update the layout with standardized widgets
      dashboards.value[index].layout = standardizedLayout;
      
      // Ensure widgets array exists and is updated
      if (!dashboards.value[index].widgets) {
        dashboards.value[index].widgets = [];
      }
      
      // Add any new widgets to the widgets array
      standardizedLayout.forEach(widget => {
        if (!dashboards.value[index].widgets.find(w => w.id === widget.id)) {
          dashboards.value[index].widgets.push(widget);
        }
      });
      
      // Save to storage
      try {
        const cleanDashboards = getCleanDashboards();
        await Preferences.set({
          key: DASHBOARD_STORAGE_KEY,
          value: JSON.stringify(cleanDashboards)
        });
        dashboards.value = cleanDashboards;
      } catch (error) {
        console.error('Error saving dashboards to preferences:', error);
      }
    } else {
      console.error('Invalid dashboard index:', index);
    }
  };

  const addWidget = async (dashboardIndex, widget) => {
    console.log('dashboardStore - addWidget called with dashboardIndex:', dashboardIndex, 'widget:', widget);
    await init();
    if (dashboardIndex > -1 && dashboards.value[dashboardIndex]) {
      console.log('Dashboard before adding widget:', JSON.parse(JSON.stringify(dashboards.value[dashboardIndex])));
      // Create a standardized widget using our model
      const standardWidget = createWidgetModel({
        ...widget,
        id: widget.id || crypto.randomUUID(),
        area: typeof widget.area === 'object' && widget.area !== null && 'area' in widget.area
          ? widget.area.area
          : widget.area
      });
      
      // Ensure the widget has an area property
      if (!standardWidget.area) {
        console.warn('Widget missing area property, using default: top');
        standardWidget.area = 'top';
      }
      
      // Ensure layout array exists
      if (!dashboards.value[dashboardIndex].layout) {
        dashboards.value[dashboardIndex].layout = [];
      }
      
      // Add the widget to the widgets array
      dashboards.value[dashboardIndex].widgets.push(standardWidget);
      
      // Add the widget to the layout array
      console.log('Adding widget to layout array with ID:', standardWidget.id);
      dashboards.value[dashboardIndex].layout.push(standardWidget);
      
      // Log the state before saving
      console.log('Before saving:', {
        widgetsCount: dashboards.value[dashboardIndex].widgets.length,
        layoutCount: dashboards.value[dashboardIndex].layout.length,
        lastWidget: dashboards.value[dashboardIndex].widgets[dashboards.value[dashboardIndex].widgets.length - 1],
        lastLayoutItem: dashboards.value[dashboardIndex].layout[dashboards.value[dashboardIndex].layout.length - 1]
      });
      
      // Save to storage
      try {
        const cleanDashboards = getCleanDashboards();
        await Preferences.set({
          key: DASHBOARD_STORAGE_KEY,
          value: JSON.stringify(cleanDashboards)
        });
        dashboards.value = cleanDashboards;
      } catch (error) {
        console.error('Error saving dashboards to preferences:', error);
      }
      
      return standardWidget;
    } else {
      console.error('Invalid dashboard index:', dashboardIndex);
      return null;
    }
  };

  const updateWidget = async (dashboardIndex, widgetId, updatedWidget) => {
    console.log('Updating widget:', { dashboardIndex, widgetId, updatedWidget });
    await init();
    if (dashboardIndex > -1 && dashboards.value[dashboardIndex]) {
      // Log dashboard state for debugging
      console.log('Current dashboard state:', JSON.parse(JSON.stringify(dashboards.value[dashboardIndex])));
      console.log('Dashboard layout:', JSON.parse(JSON.stringify(dashboards.value[dashboardIndex].layout || [])));
      console.log('Dashboard widgets:', JSON.parse(JSON.stringify(dashboards.value[dashboardIndex].widgets || [])));
      
      // Find the widget in the layout using the original widget ID
      const layoutArray = dashboards.value[dashboardIndex].layout || [];
      const widgetIndex = layoutArray.findIndex(w => w.id === widgetId);
      console.log(`Looking for widget with ID ${widgetId} in layout, found at index: ${widgetIndex}`);
      
      if (widgetIndex > -1) {
        // Get the existing widget
        const existingWidget = layoutArray[widgetIndex];
        console.log('Existing widget:', existingWidget);
        
        // Create a standardized widget with updated configuration
        // Ensure we preserve the area property from the existing widget
        const standardWidget = createWidgetModel({
          ...updatedWidget,
          id: widgetId,
          area: existingWidget.area // Preserve the area property
        });

        // Preserve position and size from existing widget
        standardWidget.x = existingWidget.x;
        standardWidget.y = existingWidget.y;
        standardWidget.width = existingWidget.width;
        standardWidget.height = existingWidget.height;
        
        console.log('Updated widget:', standardWidget);
        
        // Update the widget in layout
        layoutArray[widgetIndex] = standardWidget;
        
        // Update the widget in widgets array
        const widgetsArray = dashboards.value[dashboardIndex].widgets || [];
        const widgetIndexInWidgets = widgetsArray.findIndex(w => w.id === widgetId);
        if (widgetIndexInWidgets > -1) {
          widgetsArray[widgetIndexInWidgets] = standardWidget;
        }
        
        // Force reactivity update by creating new arrays
        dashboards.value[dashboardIndex].layout = [...layoutArray];
        dashboards.value[dashboardIndex].widgets = [...widgetsArray];
        
        // Save to storage
        try {
          const cleanDashboards = getCleanDashboards();
          await Preferences.set({
            key: DASHBOARD_STORAGE_KEY,
            value: JSON.stringify(cleanDashboards)
          });
          dashboards.value = cleanDashboards;
        } catch (error) {
          console.error('Error saving dashboards to preferences:', error);
        }
        
        return standardWidget;
      } else {
        console.error('Widget not found with ID:', widgetId);
        return null;
      }
    } else {
      console.error('Invalid dashboard index:', dashboardIndex);
      return null;
    }
  };

  const removeWidget = async (dashboardIndex, widgetId) => {
    await init();
    if (dashboardIndex > -1 && dashboards.value[dashboardIndex]) {
      // Find the widget in the layout
      const layoutArray = dashboards.value[dashboardIndex].layout || [];
      const widgetIndex = layoutArray.findIndex(w => w.id === widgetId);
      
      if (widgetIndex > -1) {
        // Remove the widget from layout
        dashboards.value[dashboardIndex].layout.splice(widgetIndex, 1);
        
        // Find and remove from widgets array
        const widgetsArray = dashboards.value[dashboardIndex].widgets || [];
        const widgetIndexInWidgets = widgetsArray.findIndex(w => w.id === widgetId);
        if (widgetIndexInWidgets > -1) {
          widgetsArray.splice(widgetIndexInWidgets, 1);
        }
        
        // Save to storage
        try {
          const cleanDashboards = getCleanDashboards();
          await Preferences.set({
            key: DASHBOARD_STORAGE_KEY,
            value: JSON.stringify(cleanDashboards)
          });
          // Force reactivity update by creating a new array
          dashboards.value = [...cleanDashboards];
        } catch (error) {
          console.error('Error saving dashboards to preferences:', error);
        }
        
        return true;
      } else {
        console.error('Widget not found with ID:', widgetId);
        return false;
      }
    } else {
      console.error('Invalid dashboard index:', dashboardIndex);
      return false;
    }
  };

  // Template definitions
  const availableTemplates = [
    { 
      id: 1, 
      name: 'Single Widget', 
      areas: ['main'],
      layout: { 
        main: { x: 0, y: 0, width: 100, height: 100 } 
      },
      // New grid-based definition
      gridTemplate: {
        columns: '1fr',
        rows: '1fr',
        areas: [
          'main'
        ]
      }
    },
    { 
      id: 2, 
      name: 'Stacked (2)', 
      areas: ['top', 'bottom'],
      layout: { 
        top: { x: 0, y: 0, width: 100, height: 48 },
        bottom: { x: 0, y: 52, width: 100, height: 48 }
      },
      // New grid-based definition
      gridTemplate: {
        columns: '1fr',
        rows: '1fr 1fr',
        areas: [
          'top',
          'bottom'
        ]
      }
    },
    { 
      id: 3, 
      name: 'Stacked (3)', 
      areas: ['top', 'middle', 'bottom'],
      layout: { 
        top: { x: 0, y: 0, width: 100, height: 32 },
        middle: { x: 0, y: 34, width: 100, height: 32 },
        bottom: { x: 0, y: 68, width: 100, height: 32 }
      },
      // New grid-based definition
      gridTemplate: {
        columns: '1fr',
        rows: '1fr 1fr 1fr',
        areas: [
          'top',
          'middle',
          'bottom'
        ]
      }
    },
    { 
      id: 4, 
      name: 'Cross Layout', 
      areas: ['topLeft', 'topRight', 'center', 'bottomLeft', 'bottomRight'],
      layout: { 
        topLeft: { x: 0, y: 0, width: 50, height: 25 },
        topRight: { x: 50, y: 0, width: 50, height: 25 },
        center: { x: 0, y: 25, width: 100, height: 50 },
        bottomLeft: { x: 0, y: 75, width: 50, height: 25 },
        bottomRight: { x: 50, y: 75, width: 50, height: 25 }
      },
      // New grid-based definition
      gridTemplate: {
        columns: '1fr 1fr',
        rows: '2fr 4fr 2fr',
        areas: [
          'topLeft topRight',
          'center center',
          'bottomLeft bottomRight'
        ]
      }
    },
    { 
      id: 5, 
      name: 'Grid (2x2)', 
      areas: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
      layout: { 
        topLeft: { x: 0, y: 0, width: 48, height: 48 },
        topRight: { x: 52, y: 0, width: 48, height: 48 },
        bottomLeft: { x: 0, y: 52, width: 48, height: 48 },
        bottomRight: { x: 52, y: 52, width: 48, height: 48 }
      },
      // New grid-based definition
      gridTemplate: {
        columns: '1fr 1fr',
        rows: '1fr 1fr',
        areas: [
          'topLeft topRight',
          'bottomLeft bottomRight'
        ]
      }
    },
    { 
      id: 6, 
      name: 'Grid (2x3)', 
      areas: ['topLeft', 'topRight', 'middleLeft', 'middleRight', 'bottomLeft', 'bottomRight'],
      layout: { 
        topLeft: { x: 0, y: 0, width: 48, height: 32 }, 
        topRight: { x: 52, y: 0, width: 48, height: 32 }, 
        middleLeft: { x: 0, y: 34, width: 48, height: 32 }, 
        middleRight: { x: 52, y: 34, width: 48, height: 32 }, 
        bottomLeft: { x: 0, y: 68, width: 48, height: 32 }, 
        bottomRight: { x: 52, y: 68, width: 48, height: 32 } 
      },
      // New grid-based definition
      gridTemplate: {
        columns: '1fr 1fr',
        rows: '1fr 1fr 1fr',
        areas: [
          'topLeft topRight',
          'middleLeft middleRight',
          'bottomLeft bottomRight'
        ]
      }
    }
  ];

  // Get template by ID
  const getTemplateById = (templateId) => {
    if (templateId === null || templateId === undefined) {
      console.log('Template ID is null or undefined');
      return null;
    }
    
    // Convert templateId to number to ensure consistent comparison
    const id = Number(templateId);
    const template = availableTemplates.find(template => template.id === id);
    return template;
  };

  // Get all widgets for a specific dashboard
  const getWidgetsForDashboard = (dashboardIndex) => {
    const dashboard = getDashboard(dashboardIndex);
    if (!dashboard) return [];
    return [...(dashboard.widgets || [])]; // Return a copy to prevent mutation
  };

  // Set dashboard template
  const setDashboardTemplate = (dashboardIndex, templateId) => {
    const dashboard = getDashboard(dashboardIndex);
    if (!dashboard) return false;
    
    // Update the dashboard with the new template
    dashboard.template = templateId;
    
    // Save the changes
    updateDashboard(dashboardIndex, dashboard);
    return true;
  };

  // Update widgets array for a dashboard
  const updateWidgets = async (dashboardIndex, widgets) => {
    console.log('Updating widgets for dashboard:', dashboardIndex, 'with widgets:', widgets);
    await init();
    
    if (dashboardIndex > -1 && dashboards.value[dashboardIndex]) {
      // Update the widgets array
      dashboards.value[dashboardIndex].widgets = widgets;
      
      // Also update the layout to match the widgets
      // This ensures both arrays stay in sync
      dashboards.value[dashboardIndex].layout = widgets;
      
      // Save to storage
      try {
        const cleanDashboards = getCleanDashboards();
        await Preferences.set({
          key: DASHBOARD_STORAGE_KEY,
          value: JSON.stringify(cleanDashboards)
        });
        dashboards.value = cleanDashboards;
        console.log('Successfully updated widgets in local storage');
      } catch (error) {
        console.error('Error saving dashboards to preferences:', error);
      }
    } else {
      console.error('Invalid dashboard index:', dashboardIndex);
    }
  };

  return { 
    dashboards, 
    currentDashboardIndex,
    isInitialized,
    getDashboard,
    init,
    getDashboards, 
    addDashboard, 
    updateDashboard, 
    deleteDashboard, 
    deleteAllDashboards, 
    newDashboard, 
    updateLayout,
    addWidget,
    updateWidget,
    removeWidget,
    updateWidgets,
    availableTemplates,
    getTemplateById,
    getWidgetsForDashboard,
    setDashboardTemplate
  };
});
