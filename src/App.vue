<template>
  <ion-app>
    <div class="page-wrapper" :class="{ 'has-alert-banner': hasAlertBanner }">
      <div class="alert-banner-container" v-if="hasAlertBanner">
        <alert-banner-component />
      </div>
      <div class="content-wrapper">
        <router-view />
      </div>
    </div>
    <!-- Notification toast will be shown here -->
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp } from '@ionic/vue';
import { onMounted, computed } from 'vue';
import { useStateDataStore } from '@/stores/stateDataStore';
import { useRelayPiniaSync } from '@/services/useRelayPiniaSync';
import { useDirectPiniaSync } from '@/services/useDirectPiniaSync';
import { useAlarmSounds } from '@/services/useAlarmSounds';
import { createLogger } from '@/services/logger';
import { notificationService } from '@/services/NotificationService';
import AlertBannerComponent from '@/components/AlertBannerComponent.vue';
import { useActiveAlerts } from '@/services/activeAlertService';

const logger = createLogger('App') as any;
logger.info('Initializing application...');

// Check if banner has content
const { primaryKey } = useActiveAlerts();
const hasAlertBanner = computed(() => !!primaryKey.value);

// Initialize state data store
useStateDataStore();

// Start relay-to-pinia data sync
logger.info('Initializing relay-to-pinia sync...');
useRelayPiniaSync();

// Start direct-to-pinia data sync
logger.info('Initializing direct-to-pinia sync...');
useDirectPiniaSync();

useAlarmSounds({ delayMs: 3000 });

onMounted(() => {
  logger.info('App component mounted');
  
  // Force dark mode check
  const isDark = localStorage.getItem('userPreferences');
  if (isDark) {
    const prefs = JSON.parse(isDark);
    if (prefs.display?.darkMode) {
      document.body.classList.add('dark');
    }
  }
  
  // Initialize push notifications
  notificationService.initialize().catch(error => {
    logger.error('Failed to initialize push notifications', { 
      error: error instanceof Error ? error.message : String(error) 
    });
  });
  
  // The smartConnectionManager will handle initialization and switching.
});
</script>

<style>
/* Page transition animations */
.page-transition {
  animation: pageTransitionIn 0.5s ease-out forwards;
}

@keyframes pageTransitionIn {
  from {
    opacity: 0;
    transform: perspective(1000px) rotateY(-10deg);
    transform-origin: left center;
  }
  to {
    opacity: 1;
    transform: perspective(1000px) rotateY(0);
  }
}

/* Ensure the app takes full height */
ion-app {
  min-height: 100vh;
  overflow: hidden;
  position: relative;
  background: var(--app-background-color);
  color: var(--app-text-color);
}

body.dark ion-app {
  background: #111827 !important;
}

/* Page wrapper - flex column */
.page-wrapper {
  --alert-banner-offset: calc(40px + env(safe-area-inset-top));
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* Alert banner container - pinned to app top */
.alert-banner-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

/* Content takes remaining space */
.content-wrapper {
  flex: 1;
  min-height: 100%;
}

/* Push Ionic pages down by banner + safe area when banner is present */
.page-wrapper.has-alert-banner .content-wrapper > .ion-page {
  top: var(--alert-banner-offset);
  height: calc(100% - var(--alert-banner-offset));
}

/* Smooth transitions for all elements */
* {
  transition: background-color 0.3s ease, color 0.3s ease;
}

.container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: var(--app-text-color);
  margin-bottom: 1.5rem;
  font-size: 1.75rem;
  border-bottom: 2px solid color-mix(in srgb, var(--app-border-color) 70%, transparent);
  padding-bottom: 0.75rem;
}

.connection-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--app-surface-color);
  border-radius: 8px;
  box-shadow: 0 18px 32px color-mix(in srgb, var(--app-text-color) 9%, transparent);
  border: 1px solid var(--app-border-color);
}

.buttons {
  display: flex;
  gap: 0.75rem;
}

.not-connected {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background-color: var(--app-surface-color);
  border-radius: 8px;
  margin-top: 2rem;
  text-align: center;
  border: 1px solid var(--app-border-color);
  box-shadow: 0 18px 32px color-mix(in srgb, var(--app-text-color) 8%, transparent);
}

.large-icon {
  font-size: 4rem;
  color: var(--app-muted-text-color);
  margin-bottom: 1rem;
}

.hint {
  color: var(--app-muted-text-color);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}
</style>
