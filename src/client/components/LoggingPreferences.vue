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
import { computed } from 'vue';
import { bug } from 'ionicons/icons';
import { usePreferencesStore } from '@/client/stores/preferences';
import { IonLabel, IonList, IonItem, IonToggle, IonListHeader, IonButton, IonIcon, toastController } from "@ionic/vue"

const preferencesStore = usePreferencesStore();

// Use the preferences directly from the store
const logging = computed(() => ({
  ...preferencesStore.preferences?.logging,
  // Ensure we have all required levels with defaults
  debug: preferencesStore.preferences?.logging?.debug ?? false,
  data: preferencesStore.preferences?.logging?.data ?? false,
  info: preferencesStore.preferences?.logging?.info ?? true,
  warn: preferencesStore.preferences?.logging?.warn ?? true,
  error: preferencesStore.preferences?.logging?.error ?? true,
  remote: preferencesStore.preferences?.logging?.remote ?? false,
  namespaces: [...(preferencesStore.preferences?.logging?.namespaces || [])]
}));

// Available loggers from preferences store
const availableLoggers = computed(() => {
  return preferencesStore.availableLoggers || [];
});

// Check if a logger is enabled
const isLoggerEnabled = (namespace) => {
  return logging.value.namespaces.includes(namespace);
};

// Toggle logger on/off
const toggleLogger = (namespace, enabled) => {
  preferencesStore.setLoggingPreference(namespace, enabled);
};

// Present toast notification
const presentToast = async (message) => {
  const toast = await toastController.create({
    message: message,
    duration: 1500,
    position: 'bottom',
    color: 'primary'
  });
  await toast.present();
};

// Update logging preferences
const updateLoggingPreference = (key, value) => {
  try {
    // Use the store's setLoggingPreference method
    preferencesStore.setLoggingPreference(key, value);
    
    // Show a toast notification
    presentToast(`${key} logging ${value ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Error updating logging preference:', error);
  }
};

// Alias for backward compatibility
const updateRemoteLogging = updateLoggingPreference;

// Reset logging preferences to defaults
const resetLogging = async () => {
  if (confirm('Reset all logging settings to defaults?')) {
    await preferencesStore.resetLoggingPreferences();
  }
};

// Helper to capitalize first letter
const capitalize = (value) => {
  if (!value && value !== 0) return '';
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
