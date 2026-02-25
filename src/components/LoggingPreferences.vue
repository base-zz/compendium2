<template>
  <div class="logging-preferences">
    <!-- Logging Toggle -->
    <ion-list>
      <ion-list-header>
        <ion-label>Logging Settings</ion-label>
      </ion-list-header>

      <!-- Remote Logging Toggle -->

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

<!-- Reset Button -->
    <ion-button expand="block" fill="clear" @click="resetLogging">
      <ion-icon :icon="bug" slot="start"></ion-icon>
      Reset to Defaults
    </ion-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { bug } from 'ionicons/icons';
import { usePreferencesStore } from '@/stores/preferences';
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
} from '@ionic/vue';

const preferencesStore = usePreferencesStore();
const isLoading = ref(true);

interface LoggingState {
  remote: boolean;
  debug: boolean;
  data: boolean;
  info: boolean;
  warn: boolean;
  error: boolean;
  namespaces: string[];
  [key: string]: boolean | string[];
}

const logging = computed<LoggingState>(() => {
  const prefs = preferencesStore.preferences?.logging || {};
  return {
    remote: Boolean(prefs.remote),
    debug: Boolean(prefs.debug),
    data: Boolean(prefs.data),
    info: Boolean(prefs.info),
    warn: Boolean(prefs.warn),
    error: Boolean(prefs.error),
    namespaces: Array.isArray(prefs.namespaces) ? prefs.namespaces : []
  };
});

const presentToast = async (message: string, color: string = 'primary') => {
  try {
    const toast = await toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
      buttons: [{
        icon: 'close',
        role: 'cancel'
      }]
    });
    await toast.present();
  } catch (error) {
    console.error('Error presenting toast:', error);
  }
};

const updatePreference = async (key: string, value: boolean) => {
  try {
    (preferencesStore as any).$patch((state: any) => {
      if (!state.preferences) state.preferences = {};
      if (!state.preferences.logging) state.preferences.logging = {};
      state.preferences.logging[key] = value;
    });
    
    await (preferencesStore as any).savePreferences();
    await (preferencesStore as any).applyLoggingPreferences();
    presentToast(`${key} logging ${value ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Failed to update preference:', error);
    presentToast('Failed to update preference', 'danger');
  }
};

const updateLoggingPreference = (key: string, value: boolean) => {
  updatePreference(key, value);
};

const updateRemoteLogging = (key: string, value: boolean) => {
  updatePreference(key, value);
};

const resetLogging = async () => {
  try {
    await (preferencesStore as any).resetLoggingPreferences();
    presentToast('Logging preferences reset to defaults', 'success');
  } catch (error) {
    console.error('Failed to reset logging preferences:', error);
    presentToast('Failed to reset logging preferences', 'danger');
  }
};

onMounted(async () => {
  try {
    const loading = await loadingController.create({
      message: 'Loading preferences...',
      spinner: 'crescent',
    });

    await loading.present();

    if (!(preferencesStore as any).preferences) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await loading.dismiss();
    isLoading.value = false;
  } catch (error) {
    console.error('Failed to initialize preferences store:', error);
    presentToast('Failed to load preferences. Please refresh the page.', 'danger');
  }
});
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
