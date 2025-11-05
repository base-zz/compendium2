<template>
  <ion-page class="settings-page">
    <generic-header title="Settings" />
    <ion-content class="content-with-header settings-content">
      <ion-list class="settings-list">
        <ion-item button @click="logout" detail>
          <ion-icon :icon="logOut" slot="start"></ion-icon>
          <ion-label>Logout</ion-label>
        </ion-item>

        <ion-item button @click="() => router.push('/userinfo')" detail>
          <ion-icon :icon="personCircle" slot="start"></ion-icon>
          <ion-label>User Profile</ion-label>
        </ion-item>

        <ion-item button @click="() => router.push('/bluetooth')" detail>
          <ion-icon :icon="bluetooth" slot="start"></ion-icon>
          <ion-label>Bluetooth Management</ion-label>
        </ion-item>

        <ion-item button @click="() => router.push('/alert-rules')" detail>
          <ion-icon :icon="notificationsOutline" slot="start"></ion-icon>
          <ion-label>Alert Rules</ion-label>
        </ion-item>

        <ion-item lines="full">
          <ion-icon :icon="moon" slot="start"></ion-icon>
          <ion-label>Dark Mode</ion-label>
          <ion-toggle
            slot="end"
            :checked="isDarkModeEnabled"
            @ionChange="handleDarkModeToggle"
          ></ion-toggle>
        </ion-item>

        <!-- <ion-item button @click="() => router.push('/theme')" detail>
          <ion-icon src="/img/theme.svg" slot="start" class="external-icon"></ion-icon>
          <ion-label>Theme</ion-label>
        </ion-item>

        <ion-item button @click="() => router.push('/systemConfig')" detail>
          <ion-icon src="/img/cog.svg" slot="start"></ion-icon>
          <ion-label>System Configuration</ion-label>
        </ion-item> -->

        <!-- <ion-item button @click="() => router.push('/deviceconfig')" detail>
          <ion-icon :icon="desktop" slot="start"></ion-icon>
          <ion-label>Device Configuration</ion-label>
        </ion-item> -->

        <!-- Unit Preferences -->
        <ion-item>
          <ion-icon :icon="options" slot="start"></ion-icon>
          <ion-label>Unit Preferences</ion-label>
        </ion-item>
        <unit-preferences-editor />
        
        <!-- Logging Preferences -->
        <logging-preferences />
        
        <!-- Connection Status -->
        <!-- <ion-item>
          <ion-icon :icon="wifi" slot="start"></ion-icon>
          <ion-label>Connection Status</ion-label>
        </ion-item> -->
        <connectivity-component />
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed } from "vue";
import { IonPage, IonContent, IonList, IonItem, IonLabel, IonIcon, IonToggle } from "@ionic/vue";
import { personCircle, logOut, options, bluetooth, moon, notificationsOutline } from "ionicons/icons";
import { useRouter } from "vue-router";
import GenericHeader from "@/components/GenericHeader.vue";
import UnitPreferencesEditor from "@/components/UnitPreferencesEditor.vue";
import LoggingPreferences from "@/components/LoggingPreferences.vue";
import ConnectivityComponent from "@/components/ConnectivityComponent.vue";
import { usePreferencesStore } from "@/stores/preferences";

const router = useRouter();
const preferencesStore = usePreferencesStore();

const isDarkModeEnabled = computed(() => {
  const flag = preferencesStore?.darkMode;
  return typeof flag === "boolean" ? flag : false;
});

const handleDarkModeToggle = (event) => {
  const nextValue = Boolean(event?.detail?.checked);
  if (typeof preferencesStore?.setDarkMode === "function") {
    preferencesStore.setDarkMode(nextValue);
  } else {
    console.warn("setDarkMode is not defined on preferencesStore");
  }
};

const logout = async () => {
  try {
    // Clear authentication flags
    localStorage.removeItem('authenticated');
    localStorage.removeItem('isAuthenticated');
    
    // Clear any user-specific preferences or data if needed
    // await preferencesStore.clearUserData();
    
    // Navigate to login page
    await router.push('/login');
  } catch (error) {
    console.error('Error during logout:', error);
  }
};
</script>

<style scoped>
.settings-page {
  background: var(--app-background-color);
  color: var(--app-text-color);
}

.settings-content {
  --background: var(--app-background-color);
  color: var(--app-text-color);
}

.settings-list {
  background: transparent;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

.settings-list :deep(ion-item) {
  --background: var(--app-surface-color);
  --color: var(--app-text-color);
  --border-color: var(--app-border-color);
  --inner-border-width: 0 0 1px 0;
}

.settings-list :deep(ion-item:last-of-type) {
  --inner-border-width: 0;
}

.settings-list :deep(ion-label) {
  color: inherit;
}

.settings-list :deep(ion-icon) {
  color: var(--app-accent-color);
}

.settings-list :deep(ion-toggle) {
  --handle-background: var(--app-surface-color);
  --background: var(--app-border-color);
  --handle-background-checked: var(--app-accent-contrast-color);
  --background-checked: var(--app-accent-color);
}

.settings-list :deep(ion-button) {
  --background: var(--app-accent-color);
  --color: var(--app-accent-contrast-color);
  --border-radius: 18px;
}

.settings-list :deep(connectivity-component) {
  display: block;
  margin: 12px 0 0;
}
</style>
