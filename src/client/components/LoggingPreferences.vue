<template>
  <div class="logging-preferences">
    <!-- Logging Toggle -->
    <ion-list>
      <ion-list-header>
        <ion-label>Logging Settings</ion-label>
      </ion-list-header>

      <!-- Remote Logging Toggle -->
      <ion-item>
        <ion-label>Enable Remote Logging</ion-label>
        <ion-toggle
          :checked="logging.remote"
          @ionChange="updateRemoteLogging('remote', $event.detail.checked)"
        ></ion-toggle>
      </ion-item>

      <!-- Log Level Toggles -->
      <ion-item>
        <ion-label>Debug Logging</ion-label>
        <ion-toggle
          :checked="logging.debug"
          @ionChange="updateLoggingPreference('debug', $event.detail.checked)"
        ></ion-toggle>
      </ion-item>

      <ion-item>
        <ion-label>Data Logging</ion-label>
        <ion-toggle
          :checked="logging.data"
          @ionChange="updateLoggingPreference('data', $event.detail.checked)"
        ></ion-toggle>
      </ion-item>

      <ion-item>
        <ion-label>Info Logging</ion-label>
        <ion-toggle
          :checked="logging.info"
          @ionChange="updateLoggingPreference('info', $event.detail.checked)"
        ></ion-toggle>
      </ion-item>

      <ion-item>
        <ion-label>Warning Logging</ion-label>
        <ion-toggle
          :checked="logging.warn"
          @ionChange="updateLoggingPreference('warn', $event.detail.checked)"
        ></ion-toggle>
      </ion-item>

      <ion-item>
        <ion-label>Error Logging</ion-label>
        <ion-toggle
          :checked="logging.error"
          @ionChange="updateLoggingPreference('error', $event.detail.checked)"
          color="danger"
        ></ion-toggle>
      </ion-item>
    </ion-list>

    <!-- Logger Selection -->
    <ion-list v-if="availableLoggers.length > 0">
      <ion-list-header>
        <ion-label>Logger Selection</ion-label>
      </ion-list-header>
      <ion-item v-for="logger in availableLoggers" :key="logger">
        <ion-label>{{ capitalize(logger) }}</ion-label>
        <ion-toggle
          :checked="isLoggerEnabled(logger)"
          @ionChange="toggleLogger(logger, $event.detail.checked)"
        ></ion-toggle>
      </ion-item>
    </ion-list>

    <!-- Reset Button -->
    <ion-button expand="block" fill="clear" @click="resetLogging">
      <ion-icon :icon="bug" slot="start"></ion-icon>
      Reset to Defaults
    </ion-button>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { bug, close } from "ionicons/icons";
import { usePreferencesStore } from "@client/stores/preferences";

// Debug store import
console.log('usePreferencesStore function:', typeof usePreferencesStore);

// Initialize the store
const preferencesStore = usePreferencesStore();

// Debug store instance
console.log('preferencesStore instance:', preferencesStore);
console.log('Store methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(preferencesStore)));
console.log('preferences property:', preferencesStore.preferences);
console.log('Has savePreferences:', typeof preferencesStore.savePreferences === 'function');
console.log('Has setLoggingPreference:', typeof preferencesStore.setLoggingPreference === 'function');

import {
  IonLabel,
  IonList,
  IonItem,
  IonToggle,
  IonListHeader,
  IonButton,
  IonIcon,
  toastController,
  loadingController,
} from "@ionic/vue";

// Import the close icon from ionicons
const closeIcon = close;


// Debug what's actually available in the store
onMounted(() => {
  console.log('Full store instance:', preferencesStore)
  console.log('Available methods:', Object.keys(preferencesStore))
  
  // Try to access setLoggingPreference directly
  if (preferencesStore.setLoggingPreference) {
    console.log('setLoggingPreference is a:', typeof preferencesStore.setLoggingPreference)
  } else {
    console.error('setLoggingPreference is MISSING from store instance')
  }
})

const isLoading = ref(true);
const availableLoggers = ref([
  { name: "app", description: "Application logs" },
  { name: "state", description: "State management logs" },
  { name: "data", description: "Data logging" },
  { name: "network", description: "Network requests" },
  { name: "error", description: "Error logs" },
]);

// Get current logging preferences with safe defaults
const logging = computed(() => {
  const prefs = preferencesStore.preferences?.logging || {};
  return {
    debug: prefs.debug ?? false,
    data: prefs.data ?? false,
    info: prefs.info ?? true,
    warn: prefs.warn ?? true,
    error: prefs.error ?? true,
    remote: prefs.remote ?? false,
    namespaces: [...(prefs.namespaces || [])],
  };
});

// Initialize the store
const initializeStore = async () => {
  try {
    // Show loading indicator
    const loading = await loadingController.create({
      message: "Loading preferences...",
      spinner: "crescent",
    });

    await loading.present();

    // Ensure we have preferences loaded
    if (!preferencesStore.preferences) {
      // If no preferences exist, they will be loaded from localStorage by the store
      console.log("Waiting for preferences to be loaded...");
      // Wait a moment for the store to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await loading.dismiss();
    isLoading.value = false;
  } catch (error) {
    console.error("Failed to initialize preferences store:", error);
    presentToast("Failed to load preferences. Please refresh the page.", "danger");
    isLoading.value = false;
  }
};

// Initialize on mount
onMounted(initializeStore);
onMounted(() => {
  console.log("Store methods:", Object.keys(preferencesStore));
});


// Check if a logger is enabled
const isLoggerEnabled = (namespace) => {
  return logging.value.namespaces.includes(namespace);
};

// Present toast notification
const presentToast = async (message, color = "primary") => {
  try {
    const toast = await toastController.create({
      message: message,
      duration: 2000,
      position: "bottom",
      color: color,
      buttons: [
        {
          icon: closeIcon,
          role: "cancel",
        },
      ],
    });
    await toast.present();
  } catch (error) {
    console.error("Failed to show toast:", error);
  }
};

// Update a single logging preference
const updatePreference = async (key, value) => {
  try {
    console.log(`Updating preference: ${key} =`, value);
    
    // Update the preference in the store
    preferencesStore.$patch((state) => {
      // Ensure preferences object exists
      if (!state.preferences) {
        state.preferences = {};
      }
      // Ensure logging object within preferences exists
      if (!state.preferences.logging) {
        state.preferences.logging = {};
      }
      state.preferences.logging[key] = value;
    });
    
    // Save the preferences
    await preferencesStore.savePreferences();
    
    // Apply the logging preferences
    await preferencesStore.applyLoggingPreferences();

    presentToast(`${key} logging ${value ? "enabled" : "disabled"}`);
  } catch (error) {
    console.error("Failed to update preference:", error);
    presentToast(`Failed to update preference: ${error.message}`, "danger");
  }
};

// Toggle a logger namespace
const toggleLogger = async (namespace, enabled) => {
  try {
    const currentNamespaces = [
      ...(preferencesStore.preferences?.logging?.namespaces || []),
    ];
    let newNamespaces;

    if (enabled) {
      // Add the namespace if it's not already there
      newNamespaces = [...new Set([...currentNamespaces, namespace])];
    } else {
      // Remove the namespace
      newNamespaces = currentNamespaces.filter((ns) => ns !== namespace);
    }

    // Update the namespaces in the store using $patch
    preferencesStore.$patch((state) => {
      if (!state.preferences.logging) {
        state.preferences.logging = {};
      }
      state.preferences.logging.namespaces = newNamespaces;
    });

    // Save the preferences
    await preferencesStore.savePreferences();

    // Apply the logging preferences
    preferencesStore.applyLoggingPreferences();

    presentToast(`${namespace} logger ${enabled ? "enabled" : "disabled"}`);
  } catch (error) {
    console.error("Failed to toggle logger:", error);
    presentToast("Failed to update logger", "danger");
  }
};

// Reset all logging preferences to defaults
const resetLogging = async () => {
  try {
    if (!confirm("Are you sure you want to reset all logging preferences to defaults?")) {
      return;
    }

    await preferencesStore.resetLoggingPreferences();
    presentToast("Logging preferences reset to defaults");
  } catch (error) {
    console.error("Failed to reset logging preferences:", error);
    presentToast("Failed to reset preferences", "danger");
  }
};

// Alias for template compatibility
const updateLoggingPreference = (key, value) => {
  if (key === "namespaces") {
    toggleLogger(value, true);
  } else {
    updatePreference(key, value);
  }
};

// Alias for remote logging toggle
const updateRemoteLogging = (key, value) => {
  updatePreference(key, value);
};

// Helper to capitalize first letter
const capitalize = (value) => {
  if (!value && value !== 0) return "";
  const str = String(value);
  return str.charAt(0).toUpperCase() + str.slice(1);
};
</script>

<style scoped>
.logging-preferences {
  padding: 16px;
}

.setting-item {
  --padding-start: 0;
  --inner-padding-end: 0;
}

.logger-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
}

.reset-button {
  margin: 8px 0;
  --padding-start: 0;
  --padding-end: 0;
}

ion-list-header {
  padding-left: 0;
  margin-top: 8px;
  margin-bottom: 8px;
}
</style>
