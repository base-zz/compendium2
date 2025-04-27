import { defineStore } from "pinia";
import { Storage, Drivers } from "@ionic/storage";
import { ref } from "vue";

// Create a singleton storage instance
let localstore = null;

const initStorage = async () => {
  if (!localstore) {
    localstore = new Storage({
      name: "__navcc",
      driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
    });
    await localstore.create();
  }
  return localstore;
};

export const useWidgetStore = defineStore("widgets", () => {
  const widgets = ref([]);
  const isInitialized = ref(false);

  function getCleanWidgets() {
    return JSON.parse(JSON.stringify(widgets.value));
  }

  const init = async () => {
    if (isInitialized.value) return;
    
    const storage = await initStorage();
    const storedWidgets = await storage.get("widgets");
    
    if (storedWidgets) {
      widgets.value = storedWidgets;
    }
    isInitialized.value = true;
  };

  const getWidgets = async () => {
    await init();
    const storage = await initStorage();
    const storedWidgets = await storage.get("widgets");
    if (storedWidgets) {
      widgets.value = storedWidgets;
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
      const storage = await initStorage();
      await storage.set("widgets", getCleanWidgets());
      console.log("Widget saved to local storage");
    } catch (storageError) {
      console.error("Error saving to local storage:", storageError);
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
      const storage = await initStorage();
      await storage.set("widgets", getCleanWidgets());

      // Widget is only stored locally
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
      const storage = await initStorage();
      await storage.set("widgets", getCleanWidgets());

      // Widget is only stored locally
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
    // Just load from local storage
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
    refreshWidgets
  };
});
