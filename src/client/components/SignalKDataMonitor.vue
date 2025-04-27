<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>SignalK Data Monitor</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Connection Status Card -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Connection Status</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="status-indicator">
            <div
              class="status-dot"
              :class="{
                connected: connectionStatus === 'connected',
                polling: connectionStatus === 'polling',
                connecting: connectionStatus === 'connecting',
                disconnected: connectionStatus === 'disconnected',
                flicker: isFlickering,
              }"
            ></div>
            <span>{{ connectionStatus }}</span>
          </div>

          <!-- Error message display -->
          <div v-if="errorMessage" class="error-message">
            <p>{{ errorMessage }}</p>
          </div>

          <ion-button
            expand="block"
            class="footer-button"
            @click="connect"
            :disabled="connectionStatus !== 'disconnected'"
          >
            <ion-icon :icon="connectIcon" slot="start"></ion-icon>
            Connect
          </ion-button>
          <ion-button
            expand="block"
            class="footer-button"
            color="danger"
            @click="disconnect"
            :disabled="connectionStatus === 'disconnected'"
          >
            <ion-icon :icon="disconnectIcon" slot="start"></ion-icon>
            Disconnect
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Configuration Card -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Connection Settings</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <!-- Server URL Configuration -->
          <ion-item>
            <ion-label position="stacked">Server URL</ion-label>
            <ion-input
              class="custom"
              v-model="serverUrl"
              placeholder="http://openplotter.local:3000/signalk/v1/api/"
              :disabled="connectionStatus !== 'disconnected'"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">WebSocket URL</ion-label>
            <ion-input
              class="custom"
              v-model="wsUrl"
              placeholder="ws://localhost:3000/signalk/v1/stream"
              :disabled="connectionStatus !== 'disconnected'"
            ></ion-input>
          </ion-item>

          <!-- Connection Mode -->
          <ion-item>
            <ion-label>Connection Mode</ion-label>
            <ion-segment v-model="usePolling" @ionChange="updateMode">
              <ion-segment-button :value="true" class="ion-text-capitalize">
                <ion-label>Polling</ion-label>
              </ion-segment-button>
              <ion-segment-button :value="false" class="ion-text-capitalize">
                <ion-label>WebSocket</ion-label>
              </ion-segment-button>
            </ion-segment>
          </ion-item>

          <!-- Polling Interval (only shown when polling is enabled) -->
          <ion-item v-if="usePolling">
            <ion-label>Polling Interval: {{ pollingInterval }}ms</ion-label>
            <ion-range
              v-model="pollingInterval"
              :min="1000"
              :max="30000"
              :step="1000"
              @ionChange="updatePollingInterval"
            >
              <ion-label slot="start">1s</ion-label>
              <ion-label slot="end">30s</ion-label>
            </ion-range>
          </ion-item>

          <!-- Throttle Delay -->
          <ion-item>
            <ion-label>Throttle Delay: {{ throttleDelay }}ms</ion-label>
            <ion-range
              v-model="throttleDelay"
              :min="0"
              :max="2000"
              :step="100"
              @ionChange="updateThrottleDelay"
            >
              <ion-label slot="start">0ms</ion-label>
              <ion-label slot="end">2000ms</ion-label>
            </ion-range>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- Data Display Card -->
      <ion-card v-if="data">
        <ion-card-header>
          <ion-card-title>SignalK Data</ion-card-title>
          <ion-note class="ion-padding-top">Showing raw data from server</ion-note>
          <ion-card-subtitle>
            Last updated: {{ lastUpdateTime }}
            <span
              v-if="connectionStatus === 'connected' && updateFrequency > 0"
              class="update-frequency"
            >
              ({{ updateFrequency }} updates/sec)
            </span>
            <div
              v-if="connectionStatus === 'connected' || connectionStatus === 'polling'"
              class="data-flow-indicator"
            >
              Data flow:
              <span :class="{ active: dataReceived }">{{
                dataReceived ? "Active" : "Inactive"
              }}</span>
            </div>
            <div class="connection-mode-indicator">
              Mode:
              <span :class="{ 'ws-mode': !usePolling, 'polling-mode': usePolling }">
                {{ usePolling ? "HTTP Polling" : "WebSocket" }}
              </span>
            </div>
          </ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="data-controls">
            <ion-button size="small" @click="toggleHistoryView">
              {{ showHistory ? "Show Current Data" : "Show History" }}
            </ion-button>
            <ion-button
              v-if="showHistory"
              size="small"
              color="danger"
              @click="clearHistory"
            >
              Clear History
            </ion-button>
            <ion-toggle v-model="storeDataLocally" label-placement="start"
              >Store Data Locally</ion-toggle
            >
          </div>

          <!-- Current Data View -->
          <pre v-if="!showHistory" class="data-display">{{
            JSON.stringify(data, null, 2)
          }}</pre>

          <!-- History View -->
          <div v-if="showHistory" class="history-container">
            <div class="history-list">
              <div v-if="dataHistory.length === 0" class="no-history">
                No history available
              </div>
              <div
                v-for="(item, index) in dataHistory"
                :key="index"
                class="history-item"
                :class="{
                  selected:
                    selectedDataPoint && selectedDataPoint.timestamp === item.timestamp,
                }"
                @click="viewHistoryItem(item)"
              >
                {{ item.formattedTime }}
              </div>
            </div>
            <div class="history-detail">
              <pre v-if="selectedDataPoint" class="data-display">{{
                JSON.stringify(selectedDataPoint.data, null, 2)
              }}</pre>
              <div v-else class="no-selection">Select a data point from history</div>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- No Data Message -->
      <ion-card v-else>
        <ion-card-content>
          <div class="no-data">
            <ion-icon :icon="dataIcon" size="large"></ion-icon>
            <p>No data available. Connect to see SignalK data.</p>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { initialize as initializeSignalK } from "@/utils/signalKClient.js";
import signalKConfig from "@/config/signalK";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonItem,
  IonLabel,
  IonRange,
  IonSegment,
  IonSegmentButton,
  IonNote,
  IonToggle,
} from "@ionic/vue";
import { powerOutline, analyticsOutline } from "ionicons/icons";

// Reactive state
const signalkService = ref(null);
const data = ref(null);
const connectionStatus = ref("disconnected");
const usePolling = ref(signalKConfig.connection.usePolling);
const pollingInterval = ref(signalKConfig.connection.pollingInterval);
const throttleDelay = ref(signalKConfig.connection.throttleDelay);
const lastUpdateTimestamp = ref(null);
const serverUrl = ref(signalKConfig.httpUrl);
const wsUrl = ref(signalKConfig.wsUrl);
const errorMessage = ref("");

// InfluxDB state
const useInfluxDB = ref(true); // Enable InfluxDB by default
const influxDBWriteInterval = ref(3000); // Default to 3 seconds

// Update frequency tracking
const updateCount = ref(0);
const updateStartTime = ref(null);
const updateFrequency = ref(0); // updates per second

// Flicker effect for the connection indicator
const isFlickering = ref(false);

// Data flow indicator
const dataReceived = ref(false);
let dataReceivedTimer = null;

// Data history storage (in-memory)
const dataHistory = ref([]);
const maxHistoryLength = 100; // Store last 100 data points
const showHistory = ref(false);
const selectedDataPoint = ref(null);

// Data storage settings
const storeDataLocally = ref(true); // Enable local storage by default

// Icons
const connectIcon = powerOutline;
const disconnectIcon = powerOutline;
const dataIcon = analyticsOutline;

// Computed properties
const lastUpdateTime = computed(() => {
  if (!lastUpdateTimestamp.value) return "Never";
  return new Date(lastUpdateTimestamp.value).toLocaleTimeString();
});

// Connect to SignalK
const connect = () => {
  if (signalkService.value) {
    signalkService.value.disconnect();
  }

  // Clear any previous error messages
  errorMessage.value = "";

  // Set initial connection status
  connectionStatus.value = "connecting";

  // Log connection attempt with current settings
  console.log("Connecting to SignalK with settings:", {
    mode: usePolling.value ? "HTTP Polling" : "WebSocket",
    pollingInterval: pollingInterval.value,
    throttleDelay: throttleDelay.value,
    httpUrl: serverUrl.value,
    wsUrl: wsUrl.value,
  });

  signalkService.value = initializeSignalK({
    usePolling: usePolling.value,
    pollingInterval: pollingInterval.value,
    throttleDelay: throttleDelay.value,
    httpUrl: serverUrl.value,
    wsUrl: wsUrl.value,
    useInfluxDB: true,
    influxDBWriteInterval: 3000, // Write to InfluxDB every 3 seconds
  });

  // InfluxDB integration enabled

  signalkService.value.subscribe(handleUpdate);
};

// Handle updates from SignalK
const handleUpdate = (update) => {
  if (update.type === "data") {
    data.value = update.data;
    const timestamp = Date.now();
    lastUpdateTimestamp.value = timestamp;

    // Store data in history if enabled
    if (storeDataLocally.value) {
      // Add data to history with timestamp
      dataHistory.value.push({
        timestamp,
        data: JSON.parse(JSON.stringify(update.data)), // Deep clone to prevent reference issues
        formattedTime: new Date(timestamp).toLocaleTimeString(),
      });

      // Limit history length to prevent memory issues
      if (dataHistory.value.length > maxHistoryLength) {
        dataHistory.value.shift(); // Remove oldest entry
      }

      // Optionally save to localStorage for persistence across sessions
      try {
        localStorage.setItem("signalK_last_data", JSON.stringify(update.data));
        localStorage.setItem("signalK_last_update", timestamp.toString());
      } catch (e) {
        console.warn("Failed to save data to localStorage:", e);
      }
    }

    // Trigger flicker effect when data is updated
    if (connectionStatus.value === "connected") {
      isFlickering.value = true;
      setTimeout(() => {
        isFlickering.value = false;
      }, 400); // Flicker for 400ms (longer duration for more visibility)

      // Update data flow indicator
      dataReceived.value = true;
      clearTimeout(dataReceivedTimer);
      dataReceivedTimer = setTimeout(() => {
        dataReceived.value = false;
      }, 3000); // Show active for 3 seconds after receiving data

      // Data update received (logging disabled)
    }

    // Track update frequency
    updateCount.value++;
    if (!updateStartTime.value) {
      updateStartTime.value = Date.now();
    } else {
      const elapsedSeconds = (Date.now() - updateStartTime.value) / 1000;
      if (elapsedSeconds >= 1) {
        // Calculate frequency after at least 1 second
        updateFrequency.value = (updateCount.value / elapsedSeconds).toFixed(2);
      }
    }

    // Reset counters every 10 seconds to get a recent average
    if (updateCount.value > 50 || Date.now() - updateStartTime.value > 10000) {
      updateCount.value = 0;
      updateStartTime.value = Date.now();
    }

    // Clear error message when data is successfully received
    errorMessage.value = "";
  } else if (update.type === "connection") {
    connectionStatus.value = update.status;
    // Clear error message when connection status changes to connected or polling
    if (update.status === "connected" || update.status === "polling") {
      errorMessage.value = "";
      // Reset update tracking when connection status changes
      updateCount.value = 0;
      updateStartTime.value = null;
      updateFrequency.value = 0;
    }
  } else if (update.type === "error") {
    // SignalK error occurred
    // Display error message to the user
    errorMessage.value =
      update.error.message || "An error occurred while connecting to the SignalK server";
  }
};

// Update polling/websocket mode
const updateMode = () => {
  if (signalkService.value) {
    signalkService.value.togglePolling(usePolling.value);
  }
};

// Update polling interval
const updatePollingInterval = () => {
  if (signalkService.value) {
    signalkService.value.setPollingInterval(pollingInterval.value);
  }
};

// Update throttle delay
const updateThrottleDelay = () => {
  if (signalkService.value) {
    signalkService.value.setThrottleDelay(throttleDelay.value);
  }
};

// Toggle InfluxDB integration
const toggleInfluxDBIntegration = (event) => {
  useInfluxDB.value = event.detail.checked;
  if (signalkService.value) {
    signalkService.value.toggleInfluxDB(useInfluxDB.value);
    // InfluxDB integration toggled
  }
};

// Update InfluxDB write interval
const updateInfluxDBWriteInterval = (event) => {
  influxDBWriteInterval.value = event.detail.value;
  if (signalkService.value) {
    signalkService.value.setInfluxDBWriteInterval(influxDBWriteInterval.value);
    // InfluxDB write interval updated
  }
};

// Disconnect from SignalK
const disconnect = () => {
  if (signalkService.value) {
    signalkService.value.disconnect();
    signalkService.value = null;
    data.value = null;

    // Reset update tracking when disconnected
    updateCount.value = 0;
    updateStartTime.value = null;
    updateFrequency.value = 0;
  }
};

// Load previously stored data from localStorage if available
const loadStoredData = () => {
  try {
    const storedData = localStorage.getItem("signalK_last_data");
    const storedTimestamp = localStorage.getItem("signalK_last_update");

    if (storedData && storedTimestamp) {
      const parsedData = JSON.parse(storedData);
      dataHistory.value.push({
        timestamp: parseInt(storedTimestamp),
        data: parsedData,
        formattedTime: new Date(parseInt(storedTimestamp)).toLocaleTimeString(),
      });
      // Loaded previously stored data from localStorage
    }
  } catch (e) {
    // Failed to load data from localStorage
  }
};

// Toggle history view
const toggleHistoryView = () => {
  showHistory.value = !showHistory.value;
};

// View a specific data point from history
const viewHistoryItem = (item) => {
  selectedDataPoint.value = item;
};

// Clear history
const clearHistory = () => {
  dataHistory.value = [];
  selectedDataPoint.value = null;
  try {
    localStorage.removeItem("signalK_last_data");
    localStorage.removeItem("signalK_last_update");
  } catch (e) {
    // Failed to clear localStorage
  }
};

// Connect on mount, disconnect on unmount
onMounted(() => {
  loadStoredData();
  connect();
});

onUnmounted(() => {
  disconnect();
});

// Expose functions to fix lint errors
defineExpose({
  toggleInfluxDBIntegration,
  updateInfluxDBWriteInterval
});
</script>

<style scoped>
/* Use global theme variables for consistent styling */
.status-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--ion-color-primary-contrast);
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
  background-color: #ccc;
}

.status-dot.connected {
  background-color: #2dd36f; /* green */
  transition: opacity 0.1s ease-in-out;
}

.status-dot.flicker {
  animation: flicker 0.2s ease-in-out;
}

.status-dot.polling {
  background-color: #ffc409; /* yellow */
}

.status-dot.disconnected {
  background-color: #eb445a; /* red */
}

.status-dot.connecting {
  background-color: #3dc2ff; /* blue */
  animation: pulse 1.5s infinite;
}

.data-display {
  max-height: 400px;
  overflow-y: auto;
  background-color: var(--ion-color-light);
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--ion-color-dark);
  border: 1px solid var(--ion-color-medium);
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--ion-color-medium);
  font-size: 1.1rem;
}

.error-message {
  background-color: var(--ion-color-light);
  border-left: 3px solid var(--ion-color-danger);
  padding: 10px;
  margin: 10px 0;
  color: var(--ion-color-danger);
  font-size: 0.95rem;
  font-weight: 500;
}

/* Apply global button styling */
ion-button.footer-button {
  margin: 8px 0;
  --border-radius: 4px;
  font-weight: 500;
}

/* Update frequency styling */
.update-frequency {
  margin-left: 8px;
  font-size: 0.85rem;
  color: var(--ion-color-success);
  font-weight: 500;
}

/* Data flow indicator styling */
.data-flow-indicator {
  margin-top: 5px;
  font-size: 0.85rem;
}

.data-flow-indicator .active {
  color: var(--ion-color-success);
  font-weight: bold;
}

.data-flow-indicator span:not(.active) {
  color: var(--ion-color-danger);
}

/* Connection mode indicator */
.connection-mode-indicator {
  margin-top: 5px;
  font-size: 0.85rem;
}

.ws-mode {
  color: var(--ion-color-tertiary);
  font-weight: bold;
}

.polling-mode {
  color: var(--ion-color-warning);
  font-weight: bold;
}

/* Data controls styling */
.data-controls {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
}

/* History view styling */
.history-container {
  display: flex;
  height: 350px;
  border: 1px solid var(--ion-color-medium);
  border-radius: 4px;
}

.history-list {
  width: 150px;
  overflow-y: auto;
  border-right: 1px solid var(--ion-color-medium);
  background-color: var(--ion-color-light);
}

.history-item {
  padding: 8px;
  border-bottom: 1px solid var(--ion-color-medium-shade);
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--ion-color-dark);
}

.history-item:hover {
  background-color: rgba(var(--ion-color-primary-rgb), 0.1);
}

.history-item.selected {
  background-color: rgba(var(--ion-color-primary-rgb), 0.2);
  font-weight: bold;
}

.history-detail {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.no-history,
.no-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--ion-color-medium);
  font-style: italic;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

@keyframes flicker {
  0% {
    opacity: 1;
    transform: scale(1);
    background-color: #2dd36f;
  }
  50% {
    opacity: 1;
    transform: scale(1.5);
    background-color: #ffffff;
    box-shadow: 0 0 12px #2dd36f, 0 0 20px #2dd36f;
  }
  100% {
    opacity: 1;
    transform: scale(1);
    background-color: #2dd36f;
  }
}
</style>
