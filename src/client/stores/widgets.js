import { defineStore } from "pinia";
import { Preferences } from "@capacitor/preferences";
import { ref } from "vue";
import { createLogger } from '../services/logger';

const logger = createLogger('widget-store');

// Storage key constant
const WIDGETS_STORAGE_KEY = "navcc_widgets";

export const useWidgetStore = defineStore("widgets", () => {
  const widgets = ref([]);
  const isInitialized = ref(false);

  function getCleanWidgets() {
    return JSON.parse(JSON.stringify(widgets.value));
  }

  const init = async () => {
    if (isInitialized.value) {
      logger.debug('Already initialized');
      return;
    }
    
    logger('Initializing widget store');
    try {
      const { value } = await Preferences.get({ key: WIDGETS_STORAGE_KEY });
      
      if (value) {
        widgets.value = JSON.parse(value);
        logger(`Loaded ${widgets.value.length} widgets from storage`);
      } else {
        logger('No saved widgets found in storage');
      }
      
      isInitialized.value = true;
      logger('Widget store initialized successfully');
    } catch (error) {
      logger.error('Error initializing widget store', {
        error: error.message,
        stack: error.stack
      });
      isInitialized.value = true;
    }
  };

  const getWidgets = async () => {
    logger('Fetching widgets');
    await init();
    try {
      const { value } = await Preferences.get({ key: WIDGETS_STORAGE_KEY });
      if (value) {
        const parsed = JSON.parse(value);
        widgets.value = parsed;
        logger(`Retrieved ${parsed.length} widgets`);
        return parsed;
      }
      logger('No widgets found in storage');
      return [];
    } catch (error) {
      logger.error('Error fetching widgets', {
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  };

  const addWidget = async (widget) => {
    await init();
    logger('Adding widget', { widgetId: widget?._id, type: widget?.type });
    
    // Ensure widget is serializable
    const cleanWidget = JSON.parse(JSON.stringify(widget));
    const existingIndex = widgets.value.findIndex(w => w._id === cleanWidget._id);
    
    logger.debug('Widget add operation', {
      widgetId: cleanWidget._id,
      exists: existingIndex !== -1,
      currentWidgetCount: widgets.value.length
    });
    
    if (existingIndex !== -1) {
      // Update existing widget
      console.log("Updating existing widget at index:", existingIndex);
      widgets.value[existingIndex] = cleanWidget;
    } else {
      // Add new widget
      console.log("Adding new widget to array");
      widgets.value.push(cleanWidget);
    }
    
    console.log("Current widgets array:", widgets.value);
    
    try {
      await Preferences.set({
        key: WIDGETS_STORAGE_KEY,
        value: JSON.stringify(getCleanWidgets())
      });
      console.log("Widget saved to preferences");
    } catch (storageError) {
      console.error("Error saving to preferences:", storageError);
    }

    // Widget is only stored locally
    return cleanWidget;
  };

  const updateWidget = async (id, widget) => {
    await init();
    logger('Updating widget', { widgetId: id });
    
    const index = widgets.value.findIndex(w => w._id === id);
    
    if (index !== -1) {
      // Create a new array to ensure reactivity
      const updatedWidgets = [...widgets.value];
      updatedWidgets[index] = { ...updatedWidgets[index], ...widget };
      
      try {
        logger.debug('Saving updated widgets to storage', {
          widgetId: id,
          updateFields: Object.keys(widget)
        });
        
        await Preferences.set({
          key: WIDGETS_STORAGE_KEY,
          value: JSON.stringify(updatedWidgets)
        });
        
        widgets.value = updatedWidgets;
        logger('Widget updated successfully', { widgetId: id });
      } catch (error) {
        logger.error('Error saving widget update', {
          widgetId: id,
          error: error.message,
          stack: error.stack
        });
      }
    }
  };

  // Keep track of recently deleted widgets to prevent duplicate deletion attempts
  const recentlyDeletedWidgets = new Set();

  const deleteWidget = async (id) => {
    if (!id) {
      logger.warn('Attempted to delete widget with no ID');
      return false;
    }
    
    if (recentlyDeletedWidgets.has(id)) {
      logger.warn(`Skipping deletion of recently deleted widget: ${id}`);
      return false;
    }
    
    await init();
    const index = widgets.value.findIndex(w => w._id === id);
    
    if (index === -1) {
      logger.warn(`Widget not found for deletion: ${id}`);
      return false;
    }
    
    const widgetType = widgets.value[index]?.type || 'unknown';
    logger(`Deleting widget: ${id} (${widgetType})`);
    
    // Add to recently deleted set with a 5-second expiration
    recentlyDeletedWidgets.add(id);
    setTimeout(() => {
      recentlyDeletedWidgets.delete(id);
      logger.debug(`Removed widget ${id} from recently deleted cache`);
    }, 5000);
    
    // Create a new array without the deleted widget
    const updatedWidgets = widgets.value.filter(w => w._id !== id);
    
    try {
      logger.debug(`Saving ${updatedWidgets.length} widgets after deletion`);
      
      await Preferences.set({
        key: WIDGETS_STORAGE_KEY,
        value: JSON.stringify(updatedWidgets)
      });
      
      widgets.value = updatedWidgets;
      logger(`Widget deleted successfully: ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting widget', {
        widgetId: id,
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  };

  const newWidget = () => {
    return {
      displayType: null,
      dataSource: null,
      label: "",
      widgetName: "",
      widgetTitle: "",
      units: "",
      threshold: 0,
      color: "rgb(255,255,255)",
      _id: Date.now().toString(),
      alerts: [],
      alertIds: [],
    };
  };

  const refreshWidgets = async () => {
    logger('Refreshing widgets');
    await init();
    logger(`Refreshed ${widgets.value.length} widgets`);
    return widgets.value;
  };

  return {
    widgets,
    isInitialized,
    init,
    getWidgets,
    addWidget,
    updateWidget,
    deleteWidget,
    newWidget,
    refreshWidgets,
  };
});
