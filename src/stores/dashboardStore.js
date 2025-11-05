import { defineStore } from "pinia";
import { Preferences } from "@capacitor/preferences";
import { ref } from "vue";
import { createWidgetModel } from "@/shared/widgetModel";
import { createLogger } from '../services/logger';
import { generateUuid } from '@/utils/uuid.js';

// Create logger instance
const logger = createLogger('dashboard-store');

/** @type {import('@/shared/types').Dashboard[]} */
const dashboardsList = [];

// Storage key constant
const DASHBOARD_STORAGE_KEY = "navcc_dashboards";

/**
 * Dashboard store for managing dashboard configurations
 */
export const useDashboardStore = defineStore("dashboards", () => {
  /** @type {import('vue').Ref<import('@/shared/types').Dashboard[]>} */
  const dashboards = ref(dashboardsList);
  const isInitialized = ref(false);
  const currentDashboardIndex = ref(0);

  /* strip out all the ref stuff before writing to storage */
  function getCleanDashboards() {
    return JSON.parse(JSON.stringify(dashboards.value));
  }

  /**
   * Get dashboard by index
   * @param {number} index - Index of the dashboard to retrieve
   * @returns {import('@/shared/types').Dashboard | null}
   */
  const getDashboard = (index) => {
    logger.debug(`Getting dashboard at index ${index}`);
    if (typeof index === 'undefined' || index < 0 || index >= dashboards.value.length) {
      logger.warn(`Invalid dashboard index: ${index}`);
      return null;
    }
    const dashboard = dashboards.value[index];
    logger.debug(`Retrieved dashboard: ${dashboard?.name || 'Unnamed'} (${index})`);
    return dashboard;
  };

  /* init from preferences */
  const init = async () => {
    /** @type {Error | null} */
    let error = null;
    if (isInitialized.value) {
      logger.debug('Already initialized');
      return;
    }
    
    logger.debug('Initializing dashboard store...');
    try {
      const { value } = await Preferences.get({ key: DASHBOARD_STORAGE_KEY });
      
      if (value) {
        logger.debug('Loading dashboards from storage');
        dashboards.value = JSON.parse(value);
        logger.debug(`Loaded ${dashboards.value.length} dashboards`);
      } else {
        logger.debug('No dashboards found in storage');
      }
      
      isInitialized.value = true;
      logger.debug('Dashboard store initialized successfully');
    } catch (error) {
      logger.error('Error initializing dashboard store', {
        error: error.message,
        stack: error.stack
      });
      isInitialized.value = true;
    }
  };

  /**
   * Get all dashboards
   * @returns {Promise<import('@/shared/types').Dashboard[]>}
   */
  const getDashboards = async () => {
    /** @type {Error | null} */
    let error = null;
    logger.debug('Fetching all dashboards');
    await init();
    try {
      const { value } = await Preferences.get({ key: DASHBOARD_STORAGE_KEY });
      if (value) {
        const parsed = JSON.parse(value);
        dashboards.value = parsed;
        logger.debug(`Retrieved ${parsed.length} dashboards`);
        return parsed;
      }
      logger.debug('No dashboards found in storage');
      return [];
    } catch (error) {
      logger.error('Error fetching dashboards', {
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  };

  /**
   * Add a new dashboard
   * @param {Omit<import('@/shared/types').Dashboard, 'id'>} dashboard - Dashboard to add
   * @returns {Promise<void>}
   */
  const addDashboard = async (dashboard) => {
    logger.debug('Adding new dashboard');
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
      logger(`Saving ${cleanDashboards.length} dashboards`);
      await Preferences.set({
        key: DASHBOARD_STORAGE_KEY,
        value: JSON.stringify(cleanDashboards)
      });
      logger('Dashboards saved successfully');
      dashboards.value = cleanDashboards;
    } catch (error) {
      logger.error('Error saving dashboards', {
        error: error.message,
        stack: error.stack
      });
    }
  };

  /**
   * Create a new dashboard with default values
   * @param {string} [name="New Dashboard"] - Name for the new dashboard
   * @returns {Promise<import('@/shared/types').Dashboard>}
   */
  const newDashboard = async (name = "New Dashboard") => {
    /** @type {Error | null} */
    let error = null;
    logger.debug('Creating new dashboard');
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
      logger.debug(`Saving ${cleanDashboards.length} dashboards`);
      await Preferences.set({
        key: DASHBOARD_STORAGE_KEY,
        value: JSON.stringify(cleanDashboards)
      });
      logger.debug('Dashboards saved successfully');
      dashboards.value = cleanDashboards;
    } catch (error) {
      logger.error('Error saving dashboards', {
        error: error.message,
        stack: error.stack
      });
    }
  };

  /**
   * Delete a dashboard by index
   * @param {number} index - Index of the dashboard to delete
   * @returns {Promise<void>}
   */
  const deleteDashboard = async (index) => {
    logger.debug(`Deleting dashboard at index ${index}`);
    await init();
    if (index > -1) {
      // Remove the dashboard
      dashboards.value.splice(index, 1);
      
      // Save to storage
      try {
        const cleanDashboards = getCleanDashboards();
        logger(`Saving ${cleanDashboards.length} dashboards`);
        await Preferences.set({
          key: DASHBOARD_STORAGE_KEY,
          value: JSON.stringify(cleanDashboards)
        });
        logger('Dashboards saved successfully');
        dashboards.value = cleanDashboards;
      } catch (error) {
        logger.error('Error saving dashboards', {
          error: error.message,
          stack: error.stack
        });
      }
    } else {
      logger.error('Invalid dashboard index:', index);
    }
  };

  /**
   * Delete all dashboards
   * @returns {Promise<void>}
   */
  const deleteAllDashboards = async () => {
    /** @type {Error | null} */
    let error = null;
    logger.debug('Deleting all dashboards');
    await init();
    // Clear all dashboards
    dashboards.value = [];
    
    const saveDashboards = async () => {
      logger.debug('Saving dashboards to storage');
      try {
        const cleanDashboards = getCleanDashboards();
        logger(`Saving ${cleanDashboards.length} dashboards`);
        
        await Preferences.set({
          key: DASHBOARD_STORAGE_KEY,
          value: JSON.stringify(cleanDashboards),
        });
        
        logger('Dashboards saved successfully');
      } catch (error) {
        logger.error('Error saving dashboards', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    };
    await saveDashboards();
  };

  /**
   * Update a dashboard
   * @param {number} index - Index of the dashboard to update
   * @param {Partial<import('@/shared/types').Dashboard>} dashboard - Updated dashboard data
   * @returns {Promise<void>}
   */
  const updateDashboard = async (index, dashboard) => {
    logger.debug(`Updating dashboard at index ${index}`);
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

  /**
   * Update dashboard layout
   * @param {number} index - Index of the dashboard to update
   * @param {any} layout - New layout configuration
   * @returns {Promise<void>}
   */
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

  /**
   * Add a widget to a dashboard
   * @param {number} dashboardIndex - Index of the dashboard
   * @param {Omit<import('@/shared/types').Widget, 'id'>} widget - Widget to add
   * @returns {Promise<void>}
   */
  const addWidget = async (dashboardIndex, widget) => {
    console.log('dashboardStore - addWidget called with dashboardIndex:', dashboardIndex, 'widget:', widget);
    await init();
    if (dashboardIndex > -1 && dashboards.value[dashboardIndex]) {
      console.log('Dashboard before adding widget:', JSON.parse(JSON.stringify(dashboards.value[dashboardIndex])));
      // Create a standardized widget using our model
      const standardWidget = createWidgetModel({
        ...widget,
        id: widget.id || generateUuid(),
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

  /**
   * Update a widget in a dashboard
   * @param {number} dashboardIndex - Index of the dashboard
   * @param {string} widgetId - ID of the widget to update
   * @param {Partial<import('@/shared/types').Widget>} updatedWidget - Updated widget data
   * @returns {Promise<void>}
   */
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

  /**
   * Remove a widget from a dashboard
   * @param {number} dashboardIndex - Index of the dashboard
   * @param {string} widgetId - ID of the widget to remove
   * @returns {Promise<void>}
   */
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
      deviceTypes: ['phone'],
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
      deviceTypes: ['phone'],
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
      deviceTypes: ['phone'],
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
      deviceTypes: ['phone'],
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
      deviceTypes: ['phone'],
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
      deviceTypes: ['phone'],
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
    },
    {
      id: 7,
      name: 'Anchor Watch',
      deviceTypes: ['tablet'],
      areas: [
        'topLeft',
        'topCenter',
        'topRight',
        'middleLeft',
        'middleCenter',
        'middleRight',
        'bottom'
      ],
      layout: {
        topLeft: { x: 0, y: 0, width: 32, height: 30 },
        topCenter: { x: 34, y: 0, width: 32, height: 30 },
        topRight: { x: 68, y: 0, width: 32, height: 30 },
        middleLeft: { x: 0, y: 34, width: 32, height: 30 },
        middleCenter: { x: 34, y: 34, width: 32, height: 30 },
        middleRight: { x: 68, y: 34, width: 32, height: 30 },
        bottom: { x: 0, y: 68, width: 100, height: 32 }
      },
      gridTemplate: {
        columns: '1fr 1fr 1fr',
        rows: '1fr 1fr 2fr',
        areas: [
          'topLeft topCenter topRight',
          'middleLeft middleCenter middleRight',
          'bottom bottom bottom'
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
