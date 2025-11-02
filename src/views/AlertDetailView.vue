<template>
  <ion-page>
    <generic-header title="Alert Details" />

    <ion-content>
      <div class="alert-container" v-if="alert">
        <!-- Top half: Template Card -->
        <div class="template-section" ref="templateSection">
          <TemplateCard
            v-if="templateWidget && templateData"
            :tnum="0"
            :layout="templateLayout"
            :widget="templateWidget"
            :data="templateData"
          />
        </div>

        <!-- Alert Details -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{
              alert.alertdata?.title || alert.alertdata?.label
            }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list class="data-list">
              <ion-item class="data-item">
                <ion-label class="data-label">
                  <h2>Message</h2>
                  <p>{{ alert.alertdata?.message }}</p>
                </ion-label>
              </ion-item>

              <ion-item class="data-item">
                <ion-label class="data-label">
                  <h2>Type</h2>
                  <p>{{ alert.alertdata?.type }}</p>
                </ion-label>
              </ion-item>

              <ion-item class="data-item">
                <ion-label class="data-label">
                  <h2>Source</h2>
                  <p>{{ alert.alertdata?.dataSource }}</p>
                </ion-label>
              </ion-item>

              <ion-item class="data-item">
                <ion-label class="data-label">
                  <h2>Current Value</h2>
                  <p>
                    {{ alert.alertdata?.data?.value ?? 0 }}
                    {{ alert.alertdata?.data?.units }}
                  </p>
                </ion-label>
              </ion-item>

              <ion-item class="data-item">
                <ion-label class="data-label">
                  <h2>Triggered Value</h2>
                  <p>{{ alert.alertdata?.triggeredvalue }}</p>
                </ion-label>
              </ion-item>

              <ion-item class="data-item">
                <ion-label class="data-label">
                  <h2>Alert Definition ID</h2>
                  <p>{{ alert.alertdata?.alertDefId }}</p>
                </ion-label>
              </ion-item>

              <ion-item class="data-item">
                <ion-label class="data-label">
                  <h2>Triggered On</h2>
                  <p>
                    {{
                      alert.alertdata?.triggeredOn
                        ? new Date(alert.alertdata.triggeredOn).toLocaleString()
                        : ""
                    }}
                  </p>
                </ion-label>
              </ion-item>

              <ion-item class="data-item">
                <ion-label class="data-label">
                  <h2>Created At</h2>
                  <p>
                    {{ alert.created ? new Date(alert.created).toLocaleString() : "" }}
                  </p>
                </ion-label>
              </ion-item>

              <ion-item class="data-item">
                <ion-label class="data-label">
                  <h2>Threshold</h2>
                  <p>{{ alert.alertdata?.alertThreshold }}</p>
                </ion-label>
              </ion-item>

              <ion-item class="data-item">
                <ion-label class="data-label">
                  <h2>Alert Level</h2>
                  <p>{{ alert.alertdata?.alertLevel }}</p>
                </ion-label>
              </ion-item>

              <ion-item v-if="isMuted" class="data-item">
                <ion-label class="data-label">
                  <h2>Muted For</h2>
                  <p>
                    {{
                      formatTime(
                        alertRunner.getMuteStatus(alert.alertdata?.id)?.remainingMs
                      )
                    }}
                  </p>
                </ion-label>
              </ion-item>

              <ion-accordion-group v-if="alert.alertdata?.data">
                <ion-accordion>
                  <ion-item slot="header" class="accordion-header">
                    <ion-label>
                      <h2>Additional Data</h2>
                    </ion-label>
                  </ion-item>

                  <div slot="content" class="accordion-content">
                    <ion-list>
                      <ion-item
                        v-for="(value, key) in alert.alertdata.data"
                        :key="key"
                        lines="none"
                        class="data-item"
                      >
                        <ion-label>
                          <span class="data-key">{{ key }}</span>
                          <span class="data-value">{{ value }}</span>
                        </ion-label>
                      </ion-item>
                    </ion-list>
                  </div>
                </ion-accordion>
              </ion-accordion-group>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <!-- Alert Controls -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Alert Controls</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <div class="alert-controls">
              <ion-item>
                <ion-label>Mute Duration</ion-label>
                <ion-select v-model="muteDuration" placeholder="Select duration">
                  <ion-select-option value="300000">5 minutes</ion-select-option>
                  <ion-select-option value="900000">15 minutes</ion-select-option>
                  <ion-select-option value="1800000">30 minutes</ion-select-option>
                  <ion-select-option value="3600000">1 hour</ion-select-option>
                  <ion-select-option value="86400000">24 hours</ion-select-option>
                </ion-select>
                <ion-button slot="end" :disabled="!muteDuration" @click="muteAlert">
                  {{ isMuted ? "Unmute" : "Mute" }}
                </ion-button>
              </ion-item>

              <ion-item>
                <ion-label>Update Interval</ion-label>
                <ion-select v-model="updateInterval" placeholder="Select interval">
                  <ion-select-option value="5000">5 seconds</ion-select-option>
                  <ion-select-option value="10000">10 seconds</ion-select-option>
                  <ion-select-option value="30000">30 seconds</ion-select-option>
                  <ion-select-option value="60000">1 minute</ion-select-option>
                </ion-select>
                <ion-button
                  slot="end"
                  :disabled="!updateInterval"
                  @click="updateThrottleInterval"
                >
                  Update
                </ion-button>
              </ion-item>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { useAlertStore } from "../stores/alerts";
import { useAlertRunnerStore } from "../stores/alertRunner";
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { connectionBridge } from "../services/connectionBridge";
import TemplateCard from "../components/TemplateCard.vue";
import GenericHeader from "../components/GenericHeader.vue";
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonAccordion,
  IonAccordionGroup,
} from "@ionic/vue";

const route = useRoute();
const router = useRouter();
const alert = ref(null);
const muteDuration = ref(null);
const updateInterval = ref(null);
const templateSection = ref(null);
const statusInterval = ref(null);
const unsubscribe = ref([]);

// Stores
const alertStore = useAlertStore();
const alertRunner = useAlertRunnerStore();

// Computed properties
const isMuted = computed(() => {
  if (!alert.value?.alertdata?.id) return false;
  const muteStatus = alertRunner.getMuteStatus(alert.value.alertdata.id);
  return muteStatus?.isMuted || false;
});

const templateWidget = computed(() => {
  if (!alert.value?.alertdata) return null;

  const widgetData = {
    value: alert.value.alertdata.data?.value ?? 0,
    units: alert.value.alertdata.data?.units || "",
    label: alert.value.alertdata.data?.label || "",
    history: alert.value.alertdata.data?.history || [],
  };

  // Get alert definition from the nested structure
  const alertDef = alert.value.alertdata.alert?.alert || {};
  const dataSource = alertDef.dataSource || alert.value.alertdata.alert?.dataSource || "";

  const widget = {
    displayType: alertDef.displayType || "instrument",
    dataSource: dataSource,
    label: alert.value.alertdata.label || "",
    data: widgetData,
  };

  return widget;
});

const templateData = computed(() => {
  if (!alert.value?.alertdata)
    return {
      value: 0,
      units: "",
      label: "",
      history: [],
    };

  return {
    value: alert.value.alertdata.data?.value ?? 0,
    units: alert.value.alertdata.data?.units || "",
    label: alert.value.alertdata.data?.label || "",
    history: alert.value.alertdata.data?.history || [],
  };
});

const templateLayout = computed(() => {
  if (!templateSection.value) return null;
  const rect = templateSection.value.getBoundingClientRect();
  return {
    ...rect.toJSON(),
    height: window.innerHeight * 0.45,
  };
});

// Methods
const muteAlert = async () => {
  if (!alert.value?.alertdata?.id) return;

  try {
    if (isMuted.value) {
      await alertRunner.unmuteAlert(alert.value.alertdata.id);
    } else {
      await alertRunner.muteAlert(alert.value.alertdata.id, parseInt(muteDuration.value));
    }
    await checkMuteStatus();
  } catch (error) {
    console.error('Error toggling mute status:', error);
  }
};

const updateThrottleInterval = () => {
  if (!alert.value?.alertdata?.dataSource) return;

  try {
    alertRunner.setUpdateInterval(
      alert.value.alertdata.dataSource,
      parseInt(updateInterval.value)
    );
    console.log(`Updated throttle interval for ${alert.value.alertdata.dataSource} to ${updateInterval.value}ms`);
  } catch (error) {
    console.error('Error updating throttle interval:', error);
  }
};

const formatTime = (ms) => {
  if (!ms) return "";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

const goBack = () => {
  router.replace("/alerts");
};

// Lifecycle hooks
onMounted(async () => {
  try {
    // Initialize stores if needed
    if (alertStore.alerts.length === 0) {
      await alertStore.initAlerts();
    }
    
    // Get alert from store first
    const storeAlert = alertStore.alerts.find(a => a._id === route.params.id);
    if (storeAlert) {
      alert.value = {
        id: storeAlert._id,
        alertdata: {
          ...storeAlert,
          id: storeAlert._id
        },
        created: new Date(storeAlert.timestamp).toISOString()
      };
      await checkMuteStatus();
      loadTemplateData();
    } else {
      // Fallback to fetching from PocketBase if not in store
      try {
        const result = await connectionBridge.services.get('alert').remote.commands('getAlert', { id: route.params.id });
        if (result) {
          alert.value = {
            id: result.id,
            alertdata: result,
            created: new Date(result.timestamp || Date.now()).toISOString()
          };
          await checkMuteStatus();
          loadTemplateData();
        }
      } catch (error) {
        console.error('Error fetching alert:', error);
        router.replace('/alerts');
        return;
      }
    }

    statusInterval.value = setInterval(() => {
      if (alert.value?.alertdata) {
        const now = new Date();
        const triggeredOn = new Date(alert.value.alertdata.triggeredOn);
        // Calculate time difference for display purposes
        now - triggeredOn;
        // timeAgo.value = formatTimeAgo(diff);
      }
    }, 1000);

    // Subscribe to real-time updates
    unsubscribe.value.push(
      connectionBridge.on('user-alert-updated', (data) => {
        if (data.id === route.params.id) {
          alert.value = {
            id: data.id,
            alertdata: data,
            created: new Date(data.timestamp || Date.now()).toISOString()
          };
          checkMuteStatus();
          loadTemplateData();
        }
      }),
      connectionBridge.on('user-alert-deleted', (data) => {
        if (data.id === route.params.id) {
          goBack();
        }
      })
    );

    // Also check for mute status changes
    unsubscribe.value.push(
      connectionBridge.on('alert-muted', (data) => {
        if (data.id === route.params.id) {
          checkMuteStatus();
        }
      }),
      connectionBridge.on('alert-unmuted', (data) => {
        if (data.id === route.params.id) {
          checkMuteStatus();
        }
      })
    );

  } catch (error) {
    console.error("Failed to load alert:", error);
    goBack();
  }
});

onBeforeUnmount(() => {
  if (statusInterval.value) {
    clearInterval(statusInterval.value);
    statusInterval.value = null;
  }

  // Clean up all subscriptions
  if (unsubscribe.value && unsubscribe.value.length) {
    unsubscribe.value.forEach(unsub => {
      if (typeof unsub === 'function') {
        try {
          unsub();
        } catch (error) {
          console.error("Error unsubscribing:", error);
        }
      }
    });
    unsubscribe.value = [];
  }
});

// Check if the alert is muted
const checkMuteStatus = async () => {
  if (!alert.value?.alertdata?.id) return;

  try {
    const status = await alertRunner.getMuteStatus(alert.value.alertdata.id);
    
    // If muted, start a timer to check again when it expires
    if (status.isMuted && status.remainingMs > 0) {
      setTimeout(() => checkMuteStatus(), Math.min(status.remainingMs + 100, 60000));
    }
  } catch (error) {
    console.error("Error checking mute status:", error);
  }
};

// Load template data for the alert visualization
const loadTemplateData = () => {
  // This function would load any additional data needed for the template
  console.log("Loading template data for alert", alert.value?.id);
  // Implementation depends on your specific requirements
};
</script>

<style scoped>
:deep(ion-card) {
  margin: 1rem;
}

.data-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.data-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.data-item:last-child {
  border-bottom: none;
}

.data-label {
  color: var(--ion-color-medium);
  font-weight: 500;
}

.data-value {
  color: var(--ion-text-color);
  font-weight: 600;
}

.alert-controls {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.alert-button {
  width: 100%;
  padding: 1rem;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.alert-button.primary {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border: none;
}

.alert-button.danger {
  background: var(--ion-color-danger);
  color: var(--ion-color-danger-contrast);
  border: none;
}

.alert-button:hover {
  opacity: 0.9;
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .data-item {
    border-bottom-color: var(--ion-color-dark-shade);
  }
}
</style>
