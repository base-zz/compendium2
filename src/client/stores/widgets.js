import { defineStore } from "pinia";
import { Preferences } from "@capacitor/preferences";
import { ref } from "vue";

// Storage key constant
const WIDGETS_STORAGE_KEY = "navcc_widgets";

export const useWidgetStore = defineStore("widgets", () => {
  const widgets = ref([]);
  const isInitialized = ref(false);

  function getCleanWidgets() {
    return JSON.parse(JSON.stringify(widgets.value));
  }

  const init = async () => {
    if (isInitialized.value) return;
    
    try {
      const { value } = await Preferences.get({ key: WIDGETS_STORAGE_KEY });
      
      if (value) {
        widgets.value = JSON.parse(value);
      }
      isInitialized.value = true;
    } catch (error) {
      console.error('Error loading widgets from preferences:', error);
      isInitialized.value = true;
    }
  };

  const getWidgets = async () => {
    await init();
    try {
      const { value } = await Preferences.get({ key: WIDGETS_STORAGE_KEY });
      if (value) {
        widgets.value = JSON.parse(value);
      }
    } catch (error) {
      console.error('Error getting widgets from preferences:', error);
    }
    return widgets.value;
  };

  const addWidget = async (widget) => {
    await init();
    console.log("Adding widget:", widget);
    
    // Ensure widget is serializable
    const cleanWidget = JSON.parse(JSON.stringify(widget));
    const existingIndex = widgets.value.findIndex(w => w._id === cleanWidget._id);
    
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
    // Ensure widget is serializable
    const cleanWidget = JSON.parse(JSON.stringify(widget));
    const index = widgets.value.findIndex(w => w._id === id);
    if (index !== -1) {
      widgets.value[index] = cleanWidget;
      try {
        await Preferences.set({
          key: WIDGETS_STORAGE_KEY,
          value: JSON.stringify(getCleanWidgets())
        });
      } catch (error) {
        console.error('Error updating widget in preferences:', error);
      }
    }
  };

  // Keep track of recently deleted widgets to prevent duplicate deletion attempts
  const recentlyDeletedWidgets = new Set();

  const deleteWidget = async (id) => {
    await init();
    
    // Check if this widget was recently deleted to prevent duplicate deletion attempts
    if (recentlyDeletedWidgets.has(id)) {
      console.log("Skipping duplicate deletion attempt for widget:", id);
      return;
    }

    // Add to recently deleted set to prevent duplicate deletion attempts
    recentlyDeletedWidgets.add(id);
    
    // Set a timeout to remove from the set after a short period
    setTimeout(() => {
      recentlyDeletedWidgets.delete(id);
    }, 5000); // 5 seconds should be enough to prevent duplicates
    
    const index = widgets.value.findIndex(w => w._id === id);
    if (index !== -1) {
      widgets.value.splice(index, 1);
      try {
        await Preferences.set({
          key: WIDGETS_STORAGE_KEY,
          value: JSON.stringify(getCleanWidgets())
        });
      } catch (error) {
        console.error('Error deleting widget from preferences:', error);
      }
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
    // Just load from preferences
    await init();
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
