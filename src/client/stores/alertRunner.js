import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useStateDataStore } from "./stateDataStore";
import { useAlertStore } from "./alerts";
import { connectionBridge } from "../services/connectionBridge";
import { createLogger } from '../services/logger';

const logger = createLogger('alert-runner');

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
    logger('🚀 Initializing AlertRunner');
    try {
      logger('Loading alert definitions...');
      const definitions = await loadAlertDefinitions();
      logger(`Loaded ${definitions?.length || 0} alert definitions`);
      
      logger('Setting up event listeners...');
      setupEventListeners();
      
      logger('✅ AlertRunner initialized successfully');
      return true;
    } catch (error) {
      logger.error('❌ Error initializing AlertRunner', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  
  /**
   * Load alert definitions from storage
   */
  async function loadAlertDefinitions() {
    try {
      logger('Loading alert definitions from storage...');
      // TODO: Load from persistent storage
      const definitions = [];
      alertDefinitions.value = definitions;
      logger(`Loaded ${definitions.length} alert definitions`);
      return definitions;
    } catch (error) {
      logger.error('Error loading alert definitions', {
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  }
  
  /**
   * Set up event listeners for alert-related events
   */
  function setupEventListeners() {
    logger('Setting up event listeners');
    
    // Listen for alert definitions updates
    connectionBridge.on('alerts:update', (data) => {
      if (data && Array.isArray(data.definitions)) {
        logger(`Received ${data.definitions.length} alert definitions update`);
        alertDefinitions.value = data.definitions;
      } else {
        logger.warn('Received invalid alert definitions update', { data });
      }
    });
    
    // Listen for alert triggers
    connectionBridge.on('alerts:triggered', (data) => {
      if (data && data.alert) {
        const alertId = data.alert.id;
        const existingIndex = alerts.value.findIndex(a => a.id === alertId);
        
        if (existingIndex >= 0) {
          logger(`Updating existing alert: ${alertId}`);
          alerts.value[existingIndex] = data.alert;
        } else {
          logger(`New alert triggered: ${alertId}`, { 
            type: data.alert.type,
            severity: data.alert.severity 
          });
          alerts.value.push(data.alert);
        }
      } else {
        logger.warn('Received invalid alert trigger', { data });
      }
    });
    
    // Listen for alert resolutions
    connectionBridge.on('alerts:resolved', (data) => {
      if (data && data.alertId) {
        const alertId = data.alertId;
        const beforeCount = alerts.value.length;
        alerts.value = alerts.value.filter(a => a.id !== alertId);
        const afterCount = alerts.value.length;
        
        if (beforeCount > afterCount) {
          logger(`Resolved alert: ${alertId}`);
        } else {
          logger.warn(`Attempted to resolve non-existent alert: ${alertId}`);
        }
      } else {
        logger.warn('Received invalid alert resolution', { data });
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
