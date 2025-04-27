import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useStateDataStore } from "./stateDataStore";
import { useAlertStore } from "./alerts";
import { connectionBridge } from "../services/connectionBridge";

/**
 * AlertRunner - Monitors navigation data and triggers alerts based on defined conditions
 * Uses ConnectionBridge for alert operations
 */
export const useAlertRunnerStore = defineStore("alertRunner", () => {
  const stateStore = useStateDataStore();
  const alertStore = useAlertStore();
  
  const alertDefinitions = ref([]);
  const alerts = ref([]);
  const isRunning = ref(false);
  const processingQueue = ref([]);
  
  // Computed properties
  const hasActiveAlerts = computed(() => alerts.value.length > 0);
  const pendingAlertCount = computed(() => processingQueue.value.length);
  
  // Watch for changes in state data
  watch(() => stateStore.data, (newVal) => {
    if (isRunning.value && newVal) {
      checkAlerts(newVal);
    }
  }, { deep: true });
  
  /**
   * Initialize the alert runner
   */
  async function init() {
    console.log("Initializing AlertRunner");
    try {
      // Load alert definitions from storage
      await loadAlertDefinitions();
      
      // Set up event listeners
      setupEventListeners();
      
      return true;
    } catch (error) {
      console.error("Error initializing AlertRunner:", error);
      return false;
    }
  }
  
  /**
   * Load alert definitions from storage
   */
  async function loadAlertDefinitions() {
    try {
      // Use connectionBridge to get user-defined alerts
      const data = await connectionBridge.services.get('alert').active.getUserDefinedAlerts();
      alertDefinitions.value = data || [];
      console.log(`Loaded ${alertDefinitions.value.length} alert definitions`);
      return alertDefinitions.value;
    } catch (error) {
      console.error("Error loading alert definitions:", error);
      return [];
    }
  }
  
  /**
   * Set up event listeners for alert-related events
   */
  function setupEventListeners() {
    // Listen for alert definition changes
    connectionBridge.on('user-alert-created', (data) => {
      alertDefinitions.value.push(data);
    });
    
    connectionBridge.on('user-alert-updated', (data) => {
      const index = alertDefinitions.value.findIndex(a => a.id === data.id);
      if (index !== -1) {
        alertDefinitions.value[index] = { ...alertDefinitions.value[index], ...data };
      }
    });
    
    connectionBridge.on('user-alert-deleted', (data) => {
      const index = alertDefinitions.value.findIndex(a => a.id === data.id);
      if (index !== -1) {
        alertDefinitions.value.splice(index, 1);
      }
    });
  }
  
  /**
   * Start the alert runner
   */
  function start() {
    if (!isRunning.value) {
      isRunning.value = true;
      console.log("AlertRunner started");
      
      // Check alerts immediately with current navigation data
      if (stateStore.data) {
        checkAlerts(stateStore.data);
      }
    }
  }
  
  /**
   * Stop the alert runner
   */
  function stop() {
    isRunning.value = false;
    console.log("AlertRunner stopped");
  }
  
  /**
   * Check all alert definitions against the current navigation data
   */
  function checkAlerts(navData) {
    if (!isRunning.value || !navData) return;
    
    // Process each alert definition
    alertDefinitions.value.forEach(alertDef => {
      // Skip if this alert is already in the processing queue
      if (processingQueue.value.includes(alertDef.id)) return;
      
      // Check if we should update this alert based on its interval
      if (connectionBridge.services.get('alert').active.shouldUpdate(alertDef.dataSource)) {
        processingQueue.value.push(alertDef.id);
        processAlert(alertDef, navData);
      }
    });
  }
  
  /**
   * Process a single alert definition against navigation data
   */
  async function processAlert(alertDef, navData) {
    try {
      // Use the alert service to process the alert
      const alert = await connectionBridge.services.get('alert').active.processAlert(alertDef, navData);
      
      // If an alert was triggered, add it to our local state and the alert store
      if (alert) {
        alerts.value.push(alert);
        await alertStore.addAlert(alert);
      }
    } catch (error) {
      console.error(`Error processing alert ${alertDef.id}:`, error);
    } finally {
      // Remove from processing queue
      const index = processingQueue.value.indexOf(alertDef.id);
      if (index !== -1) {
        processingQueue.value.splice(index, 1);
      }
    }
  }
  
  /**
   * Add a new alert definition
   */
  async function addAlertDefinition(alertDef) {
    try {
      // Use connectionBridge to create the alert definition
      const result = await connectionBridge.services.get('alert').active.createUserDefinedAlert(alertDef);
      alertDefinitions.value.push(result);
      return result;
    } catch (error) {
      console.error("Error adding alert definition:", error);
      throw error;
    }
  }
  
  /**
   * Update an existing alert definition
   */
  async function updateAlertDefinition(alertId, alertDef) {
    try {
      // Use connectionBridge to update the alert definition
      const result = await connectionBridge.services.get('alert').active.updateUserDefinedAlert(alertId, alertDef);
      
      // Update local state
      const index = alertDefinitions.value.findIndex(a => a.id === alertId);
      if (index !== -1) {
        alertDefinitions.value[index] = result;
      }
      
      return result;
    } catch (error) {
      console.error("Error updating alert definition:", error);
      throw error;
    }
  }
  
  /**
   * Delete an alert definition
   */
  async function deleteAlertDefinition(alertId) {
    try {
      // Use connectionBridge to delete the alert definition
      const result = await connectionBridge.services.get('alert').active.deleteUserDefinedAlert(alertId);
      
      // Update local state
      const index = alertDefinitions.value.findIndex(a => a.id === alertId);
      if (index !== -1) {
        alertDefinitions.value.splice(index, 1);
      }
      
      return result;
    } catch (error) {
      console.error("Error deleting alert definition:", error);
      throw error;
    }
  }
  
  /**
   * Mute an alert for a specified duration
   */
  async function muteAlert(alertId, durationMs = 3600000) { // Default 1 hour
    try {
      await connectionBridge.services.get('alert').active.muteAlert(alertId, durationMs);
      return true;
    } catch (error) {
      console.error("Error muting alert:", error);
      throw error;
    }
  }
  
  /**
   * Unmute an alert
   */
  async function unmuteAlert(alertId) {
    try {
      await connectionBridge.services.get('alert').active.unmuteAlert(alertId);
      return true;
    } catch (error) {
      console.error("Error unmuting alert:", error);
      throw error;
    }
  }
  
  /**
   * Get the mute status of an alert
   */
  async function getMuteStatus(alertId) {
    try {
      return await connectionBridge.services.get('alert').active.getMuteStatus(alertId);
    } catch (error) {
      console.error("Error getting mute status:", error);
      return { isMuted: false };
    }
  }
  
  /**
   * Set the update interval for a specific data source
   */
  function setUpdateInterval(dataSource, interval) {
    try {
      connectionBridge.services.get('alert').active.setUpdateInterval(dataSource, interval);
    } catch (error) {
      console.error(`Error setting update interval for ${dataSource}:`, error);
    }
  }
  
  /**
   * Clean up resources
   */
  function cleanup() {
    stop();
    alerts.value = [];
    processingQueue.value = [];
  }
  
  return {
    alertDefinitions,
    alerts,
    isRunning,
    hasActiveAlerts,
    pendingAlertCount,
    init,
    loadAlertDefinitions,
    start,
    stop,
    addAlertDefinition,
    updateAlertDefinition,
    deleteAlertDefinition,
    muteAlert,
    unmuteAlert,
    getMuteStatus,
    setUpdateInterval,
    cleanup
  };
});
