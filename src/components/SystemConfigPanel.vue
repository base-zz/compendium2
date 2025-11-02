<template>
  <ion-list>
    <ion-item-group>
      <ion-item-divider>
        <ion-label class="divider-label">Maps / GPS</ion-label>
      </ion-item-divider>

      <ion-item class="config-item">
        <ion-label>Use Device GPS</ion-label>
        <ion-toggle v-model="useDeviceGPS" @ionChange="updateUseDeviceGPS"></ion-toggle>
      </ion-item>

      <ion-item class="config-item">
        <ion-label>Show Map Background on Anchor View</ion-label>
        <ion-toggle
          v-model="useMapBackground"
          @update:modelValue="saveMapBackgroundState"
        ></ion-toggle>
      </ion-item>
    </ion-item-group>

    <ion-item-group>
      <ion-item-divider>
        <ion-label class="divider-label">Connections</ion-label>
      </ion-item-divider>

      <ion-item class="config-item">
        <div class="status-container">
          <div class="status-content">
            <ion-label>Connected to Internet </ion-label>
            <div class="icon-container">
              <ion-icon
                class="status-icon"
                :icon="isIntenetConnected ? checkmarkCircleOutline : closeCircleOutline"
                :color="isIntenetConnected ? 'success' : 'warning'"
              ></ion-icon>
            </div>
          </div>
          <div class="pt">
            <small>
              Uses your device connection. Required for remote notifications and data
              synchronization.
            </small>
          </div>
        </div>
      </ion-item>

      <ion-item class="config-item">
        <div class="status-container">
          <div class="status-content">
            <ion-label>Connected to Signal K</ion-label>
            <div class="icon-container">
              <ion-icon
                class="status-icon"
                :icon="isSignalKConnected ? checkmarkCircleOutline : closeCircleOutline"
                :color="isSignalKConnected ? 'success' : 'warning'"
              ></ion-icon>
            </div>
          </div>
          <div class="pt">
            <small>
              Will only be active if you are on the same network as the SignalK server.
            </small>
          </div>
        </div>
      </ion-item>

      <ion-item class="config-item">
        <div class="status-container">
          <div class="status-content">
            <ion-label>Connected to Remote Server</ion-label>
            <div class="icon-container">
              <ion-icon
                class="status-icon"
                :icon="isServerConnected ? checkmarkCircleOutline : closeCircleOutline"
                :color="isServerConnected ? 'success' : 'warning'"
              ></ion-icon>
            </div>
          </div>
          <div class="pt">
            <small
              >This connection enables remote notifications and data synchronization.
            </small>
          </div>
        </div>
      </ion-item>
    </ion-item-group>

    <ion-item-group>
      <ion-item-divider>
        <ion-label class="divider-label">Alerts</ion-label>
      </ion-item-divider>

      <ion-item class="config-item">
        <ion-label>Remote Push Notify Critical Alerts </ion-label>
        <ion-toggle v-model="notifiyCriticalAlerts"></ion-toggle>
      </ion-item>

      <ion-item class="config-item">
        <ion-label>Display SignalK Alerts</ion-label>
        <ion-toggle v-model="useSignalKAlerts"></ion-toggle>
      </ion-item>
    </ion-item-group>
  </ion-list>
</template>

<script setup>
import {
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonList,
  IonLabel,
  IonToggle,
  IonIcon,
} from "@ionic/vue";

import { ref, onMounted } from "vue";
import { useSystemConfigStore } from "@/services/config/systemConfig";
import { checkmarkCircleOutline, closeCircleOutline } from "ionicons/icons";
import {
  checkServerHealth,
  checkSignalKServerHealth,
  checkInternetConnection,
} from "@/utils/serverUtils";

// Get the system config store
const systemConfigStore = useSystemConfigStore();

// Local reactive state
const useDeviceGPS = ref(false);
const notifiyCriticalAlerts = ref(false);

// Initialize component with current settings
onMounted(() => {
  useDeviceGPS.value = systemConfigStore.useDeviceGPS;
  notifiyCriticalAlerts.value = systemConfigStore.notifiyCriticalAlerts;
});

// Update device GPS setting in store when changed
const updateUseDeviceGPS = () => {
  systemConfigStore.setUseDeviceGPS(useDeviceGPS.value);
};

// Save map background state to localStorage and reload the page
async function saveMapBackgroundState(newValue) {
  console.log(`Map background changed to: ${newValue}`);

  // Save to localStorage immediately
  localStorage.setItem("anchorViewUseMapBackground", newValue.toString());
  console.log(`Saved to localStorage: anchorViewUseMapBackground=${newValue}`);

  // Wait a brief moment to ensure the localStorage is updated
  setTimeout(() => {
    // Reload the page to apply changes with a fresh state
    window.location.reload();
  }, 300);
}

// Function to get map background state from localStorage
function getStoredMapBackgroundState() {
  const storedValue = localStorage.getItem("anchorViewUseMapBackground");
  console.log(`Retrieved from localStorage: anchorViewUseMapBackground=${storedValue}`);
  return storedValue === null ? true : storedValue === "true";
}

// Initialize map background state from localStorage, default to true if not set
const useMapBackground = ref(getStoredMapBackgroundState());
const isServerConnected = ref(checkServerHealth());
const isSignalKConnected = ref(checkSignalKServerHealth());
const isIntenetConnected = ref(checkInternetConnection());
const useSignalKAlerts = ref(false);

// Update SignalK alerts setting in store when changed
const updateUseSignalKAlerts = () => {
  systemConfigStore.setUseSignalKAlerts(useSignalKAlerts.value);
};
</script>

<style scoped>
.system-config-card {
  margin: 16px 0;
}

ion-label.divider-label {
  font-size: 1.2rem;
  padding: 12px 0 12px 8px;
  --color: var(--ion-color-light);
  font-weight: 500;
}

.config-description {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f8f8f8;
  border-radius: 8px;
}
.status-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-icon {
  font-size: 1.5em;
}

.icon-container {
  margin-left: auto;
}

.pt {
  margin: 10px 15px;
  color: var(--ion-color-light);
  font-style: italic;
}

.config-item {
  margin: 0.25rem 1rem;
}
</style>
