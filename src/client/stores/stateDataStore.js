/**
 * StateDataStore - Pinia store adapter for the unified StateData
 *
 * This store provides a Vue-friendly interface to the unified StateData structure,
 * making it easy to use in Vue components with reactivity.
 */

import { defineStore } from "pinia";
import { ref, reactive, computed, watch } from "vue";
import { stateData as canonicalStateData } from "@/client/stateData.js";
import { stateUpdateProvider } from "../services/stateUpdateProvider";
import { applyPatch } from "fast-json-patch";
import { BASE_ALERT_DATUM } from "@/shared/alertDatum.js";
import { createDefaultRule, ALERT_RULE_OPERATORS } from "@/shared/alertRuleModel.js";
import { Preferences } from "@capacitor/preferences";

/**
 * Calculate the distance (in meters) between two lat/lon points (Haversine formula)
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371000; // meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate destination coordinates based on start point, distance, and bearing
 * Uses Haversine formula for accurate distance calculations
 */
export function calculateDestinationLatLon(lat1, lon1, distance, bearing) {
  // Input validation
  if (lat1 < -90 || lat1 > 90 || isNaN(lat1)) throw new Error("Invalid latitude");
  if (lon1 < -180 || lon1 > 180 || isNaN(lon1)) throw new Error("Invalid longitude");
  if (distance < 0 || isNaN(distance)) throw new Error("Distance must be non-negative");
  if (isNaN(bearing)) throw new Error("Invalid bearing");

  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  
  const lat1Rad = toRad(lat1);
  const lon1Rad = toRad(lon1);
  // Use standard navigation bearing directly
  // 0° = North, 90° = East, 180° = South, 270° = West
  const bearingRad = toRad(bearing);
  
  const angularDistance = distance / R;
  
  const lat2 = Math.asin(
    Math.sin(lat1Rad) * Math.cos(angularDistance) +
    Math.cos(lat1Rad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );
  
  const lon2 = lon1Rad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1Rad),
    Math.cos(angularDistance) - Math.sin(lat1Rad) * Math.sin(lat2)
  );

  // Normalize longitude to [-180, 180]
  const normalizeLon = (lon) => ((lon % 360) + 540) % 360 - 180;

  return {
    latitude: lat2 * 180 / Math.PI,
    longitude: normalizeLon(lon2 * 180 / Math.PI)
  };
}

/**
 * Compute anchorLocation from anchorDropLocation, rode, bearing, and depth
 * Returns a fresh object each time
 */
export function getComputedAnchorLocation(
  anchorDropLocation,
  rode,
  bearing,
  depth
) {
  // If missing data, return drop location as anchor location
  if (
    !anchorDropLocation?.latitude ||
    !anchorDropLocation?.longitude ||
    !rode ||
    !bearing
  ) {
    return { ...anchorDropLocation, distanceFromDropLocation: 0 };
  }
  // Calculate horizontal rode (exclude depth)
  let horizontalRode = rode;
  if (depth && rode > depth) {
    horizontalRode = Math.sqrt(rode * rode - depth * depth);
  }
  // Calculate anchor location from drop point, distance, and bearing
  // Convert bearing from radians to degrees if it's in radians
  const bearingDegrees = bearing * 180 / Math.PI; // Convert from radians to degrees
  
  // Log the bearing for debugging
  console.log('BEARING DEBUG - Original bearing (rad):', bearing);
  console.log('BEARING DEBUG - Converted bearing (deg):', bearingDegrees);
  
  const dest = calculateDestinationLatLon(
    anchorDropLocation.latitude,
    anchorDropLocation.longitude,
    horizontalRode,
    bearingDegrees
  );
  // Calculate distance from drop
  const distanceFromDrop = calculateDistanceMeters(
    anchorDropLocation.latitude,
    anchorDropLocation.longitude,
    dest.latitude,
    dest.longitude
  );
  return {
    ...dest,
    distanceFromDropLocation: distanceFromDrop,
    originalBearing: bearing,
    time: Date.now(),
    depth: depth ?? null,
  };
}
// Import the StateData singleton and StateService
// Using dynamic import for SSR compatibility
let stateData;

async function ensureStateDataLoaded() {
  if (!stateData) {
    try {
      const stateModule = await import("@/client/stateData.js");
      stateData = stateModule.stateData;
    } catch (error) {
      console.error("Failed to load StateData:", error);
      throw error;
    }
  }
  return { stateData };
}

function switchDataSource(mode) {
  stateUpdateProvider.switchSource(mode);
}

console.log("[PiniaStore] Store initialized");

// --- Pinia Store Export ---
// Utility: Deep clone to avoid reference sharing
function getInitialState() {
  console.log('DEBUG - Original state structure:', Object.keys(canonicalStateData.state));
  console.log('DEBUG - Does alerts exist in original?', 'alerts' in canonicalStateData.state);
  
  const clonedState = structuredClone(canonicalStateData.state);
  console.log('DEBUG - Cloned state structure:', Object.keys(clonedState));
  console.log('DEBUG - Does alerts exist in clone?', 'alerts' in clonedState);
  
  return clonedState;
}

export const useStateDataStore = defineStore("stateData", () => {
  // Single, canonical, deeply nested state object
  const state = reactive(getInitialState());
  
  console.log('DEBUG - Reactive state structure:', Object.keys(state));
  console.log('DEBUG - Does alerts exist in reactive state?', 'alerts' in state);

  // --- Patch and Replace Logic ---
  function replaceState(newState) {
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, structuredClone(newState));
  }

  function applyStatePatch(patch) {
    applyPatch(state, patch);
  }

  // --- Anchor Actions ---
  function setAnchorDropLocation(position) {
    if (!state.anchor) state.anchor = {};
    state.anchor.anchorDropLocation = position;
  }

  function setRodeLength(length, units = "feet") {
    if (!state.anchor) state.anchor = {};
    state.anchor.rode = { value: length, units };
  }

  const cancelAnchor = () => {
    // Create the new anchor state and make it reactive
    const newAnchor = reactive({
      anchorDropLocation: {
        position: {
          latitude: { value: null, units: "deg" },
          longitude: { value: null, units: "deg" },
        },
        time: null,
        depth: { value: null, units: "m", feet: null },
        distancesFromCurrent: {
          value: 0,
          units: "m",
          nauticalMiles: null,
        },
        distancesFromDrop: {
          value: 0,
          units: "m",
          nauticalMiles: null,
        },
        originalBearing: { value: 0, units: "rad", degrees: null },
        bearing: { value: 0, units: "rad", degrees: null },
      },
      anchorLocation: {
        position: {
          latitude: { value: null, units: "deg" },
          longitude: { value: null, units: "deg" },
        },
        time: null,
        depth: { value: null, units: "m", feet: null },
        distancesFromCurrent: { value: 0, units: "m", nauticalMiles: null },
        distancesFromDrop: { value: 0, units: "m", nauticalMiles: null },
        originalBearing: { value: 0, units: "rad", degrees: null },
        bearing: { value: 0, units: "rad", degrees: null },
      },
      aisTargets: state.anchor.aisTargets,
      rode: {
        amount: 0,
        units: "m",
      },
      criticalRange: {
        r: 0,
        units: "m",
      },
      warningRange: {
        r: 0,
        units: "m",
      },
      defaultScope: {
        value: 5,
        units: "ratio",
      },
      dragging: false,
      anchorDeployed: false,
      history: [],
      useDeviceGPS: true,
    });

    // Update the state using the store instance
    state.anchor = newAnchor;
  };

  // --- Alerts Logic ---
  // Initialize alerts structure if it doesn't exist
  if (!state.alerts) {
    state.alerts = {
      active: [],           // Currently active alerts/notifications
      history: [],          // Past/resolved alerts (optional)
      definitions: [],      // User/system-defined alert rules (optional)
      processingQueue: [],  // Alert ids currently being processed (optional)
      muted: [],            // Alert ids currently muted (optional)
      deviceSubscriptions: {} // deviceId => [alert types/categories] (optional)
    };
  }
  
  /**
   * Create a new alert object with default values
   * @returns {Object} A new alert object based on BASE_ALERT_DATUM
   */
  const newAlert = () => {
    return {
      ...JSON.parse(JSON.stringify(BASE_ALERT_DATUM)),
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      status: 'active',
      actions: ['acknowledge', 'mute'],
      source: 'application'
    };
  };
  
  // --- Alert Prevention System ---
  
  // Store for tracking alert states
  const alertTracking = {
    // For cooldown strategy
    activeSignatures: new Map(), // signature -> expiry timestamp
    
    // For state tracking strategy
    alertStates: new Map(), // signature -> { inAlertState, lastValue, lastCrossTime }
    
    // For debouncing strategy
    debounceTimers: new Map(), // signature -> timeout ID
    
    // For hysteresis strategy
    hysteresisValues: new Map() // signature -> { value, direction }
  };
  
  /**
   * Alert prevention strategies
   */
  const AlertPreventionStrategy = {
    NONE: 'none',           // No prevention, always trigger
    COOLDOWN: 'cooldown',   // Prevent duplicate alerts for a cooldown period
    STATE_TRACKING: 'state', // Only trigger when crossing from normal to alert state
    DEBOUNCE: 'debounce',   // Wait for value to stabilize before triggering
    HYSTERESIS: 'hysteresis' // Require crossing back by a margin before retriggering
  };
  
  /**
   * Add an alert to the active alerts array
   * @param {Object} alert - The alert object to add
   * @returns {Object} The added alert
   */
  const addAlert = (alert) => {
    // Ensure required fields
    if (!alert.id) alert.id = crypto.randomUUID();
    if (!alert.timestamp) alert.timestamp = new Date().toISOString();
    if (!alert.status) alert.status = 'active';
    
    // Add to active alerts
    state.alerts.active.push(alert);
    
    console.log(`New alert added: ${alert.title || alert.label}`);
    return alert;
  };
  
  /**
   * Add an alert with prevention strategies
   * @param {Object} alert - The alert object to add
   * @param {Object} options - Alert prevention options
   * @param {string|string[]} options.strategies - Prevention strategy or array of strategies
   * @param {string} options.signature - Unique signature identifying the alert condition
   * @param {number} options.value - Current value that triggered the alert
   * @param {number} options.threshold - Threshold value that defines the alert condition
   * @param {boolean} options.isHigherBad - Whether higher values are bad (true) or lower values are bad (false)
   * @param {number} options.cooldownMs - Cooldown period in milliseconds (for COOLDOWN strategy)
   * @param {number} options.debounceMs - Debounce period in milliseconds (for DEBOUNCE strategy)
   * @param {number} options.hysteresisMargin - Margin to cross back before retriggering (for HYSTERESIS strategy)
   * @returns {Object|null} The added alert or null if prevention occurred
   */
  const addAlertWithPrevention = (alert, options) => {
    const {
      strategies = AlertPreventionStrategy.COOLDOWN,
      signature,
      value,
      threshold,
      isHigherBad = false,
      cooldownMs = 300000,
      debounceMs = 10000,
      hysteresisMargin = 0.1 * Math.abs(threshold) // Default 10% of threshold
    } = options;
    
    // Convert single strategy to array
    const strategyArray = Array.isArray(strategies) ? strategies : [strategies];
    
    // If no prevention is requested, just add the alert
    if (strategyArray.includes(AlertPreventionStrategy.NONE) && strategyArray.length === 1) {
      return addAlert(alert);
    }
    
    // Apply each prevention strategy
    for (const strategy of strategyArray) {
      // Skip NONE strategy
      if (strategy === AlertPreventionStrategy.NONE) continue;
      
      // Apply the strategy
      const shouldPrevent = applyPreventionStrategy(
        strategy,
        signature,
        value,
        threshold,
        isHigherBad,
        cooldownMs,
        debounceMs,
        hysteresisMargin
      );
      
      // If any strategy says to prevent, don't add the alert
      if (shouldPrevent) {
        console.log(`Prevented alert due to ${strategy} strategy: ${signature}`);
        return null;
      }
    }
    
    // If we get here, all strategies allowed the alert
    return addAlert(alert);
  };
  
  /**
   * Apply a specific prevention strategy
   * @private
   */
  const applyPreventionStrategy = (
    strategy,
    signature,
    value,
    threshold,
    isHigherBad,
    cooldownMs,
    debounceMs,
    hysteresisMargin
  ) => {
    const now = Date.now();
    
    switch (strategy) {
      case AlertPreventionStrategy.COOLDOWN: {
        // Check if we're in the cooldown period
        const expiry = alertTracking.activeSignatures.get(signature);
        if (expiry && now < expiry) {
          return true; // Prevent the alert
        }
        
        // Set new cooldown
        alertTracking.activeSignatures.set(signature, now + cooldownMs);
        
        // Clean up expired entries occasionally
        if (Math.random() < 0.1) { // 10% chance to clean up
          for (const [sig, exp] of alertTracking.activeSignatures.entries()) {
            if (now > exp) {
              alertTracking.activeSignatures.delete(sig);
            }
          }
        }
        
        return false; // Allow the alert
      }
      
      case AlertPreventionStrategy.STATE_TRACKING: {
        // Get current state or initialize
        const state = alertTracking.alertStates.get(signature) || {
          inAlertState: false,
          lastValue: null,
          lastCrossTime: 0
        };
        
        // Determine if we're in an alert state based on the threshold and direction
        const isInAlertState = isHigherBad ? (value > threshold) : (value < threshold);
        
        // Only allow alert when transitioning from normal to alert state
        const shouldAllow = isInAlertState && !state.inAlertState;
        
        // Update state
        alertTracking.alertStates.set(signature, {
          inAlertState: isInAlertState,
          lastValue: value,
          lastCrossTime: shouldAllow ? now : state.lastCrossTime
        });
        
        return !shouldAllow; // Prevent if we shouldn't allow
      }
      
      case AlertPreventionStrategy.DEBOUNCE: {
        // Clear any existing timer
        const existingTimer = alertTracking.debounceTimers.get(signature);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        // Set a new timer
        const timerId = setTimeout(() => {
          // When timer fires, add the alert directly
          addAlert(alert);
          alertTracking.debounceTimers.delete(signature);
        }, debounceMs);
        
        alertTracking.debounceTimers.set(signature, timerId);
        
        return true; // Always prevent immediate alert with debounce
      }
      
      case AlertPreventionStrategy.HYSTERESIS: {
        // Get current hysteresis state or initialize
        const hysteresisState = alertTracking.hysteresisValues.get(signature) || {
          value: null,
          direction: null // 1 for rising, -1 for falling
        };
        
        // First time seeing this alert
        if (hysteresisState.value === null) {
          alertTracking.hysteresisValues.set(signature, {
            value,
            direction: isHigherBad ? 1 : -1 // Initial direction based on threshold type
          });
          return false; // Allow first alert
        }
        
        // Determine current direction
        const currentDirection = value > hysteresisState.value ? 1 : -1;
        
        // Check if we've crossed back by the hysteresis margin
        const hasCrossedBack = Math.abs(value - hysteresisState.value) >= hysteresisMargin &&
                               currentDirection !== hysteresisState.direction;
        
        // Update state
        if (hasCrossedBack) {
          alertTracking.hysteresisValues.set(signature, {
            value,
            direction: currentDirection
          });
          return false; // Allow alert after crossing back
        }
        
        return true; // Prevent if we haven't crossed back enough
      }
      
      default:
        return false; // Unknown strategy, allow the alert
    }
  };
  
  /**
   * Legacy method for backward compatibility
   * @deprecated Use addAlertWithPrevention instead
   */
  const addAlertWithSignature = (alert, signature, cooldownMs = 300000) => {
    return addAlertWithPrevention(alert, {
      strategies: AlertPreventionStrategy.COOLDOWN,
      signature,
      cooldownMs
    });
  };
  
  /**
   * Acknowledge an alert
   * @param {string} alertId - The ID of the alert to acknowledge
   * @returns {boolean} Success status
   */
  const acknowledgeAlert = (alertId) => {
    const alertIndex = state.alerts.active.findIndex(a => a.id === alertId);
    if (alertIndex !== -1) {
      // Mark as acknowledged
      state.alerts.active[alertIndex].acknowledged = true;
      
      // Move to history
      const alert = {...state.alerts.active[alertIndex], status: 'acknowledged'};
      state.alerts.history.push(alert);
      state.alerts.active.splice(alertIndex, 1);
      
      return true;
    }
    return false;
  };
  
  /**
   * Mute an alert for a specified duration
   * @param {string} alertId - The ID of the alert to mute
   * @param {number} duration - Duration in milliseconds
   * @returns {boolean} Success status
   */
  const muteAlert = (alertId, duration = 3600000) => {
    const alertIndex = state.alerts.active.findIndex(a => a.id === alertId);
    if (alertIndex !== -1) {
      const mutedUntil = new Date(Date.now() + duration).toISOString();
      state.alerts.active[alertIndex].muted = true;
      state.alerts.active[alertIndex].mutedUntil = mutedUntil;
      state.alerts.active[alertIndex].mutedBy = 'user';
      
      // Add to muted list if not already there
      if (!state.alerts.muted.includes(alertId)) {
        state.alerts.muted.push(alertId);
      }
      
      return true;
    }
    return false;
  };
  
  /**
   * Unmute an alert
   * @param {string} alertId - The ID of the alert to unmute
   * @returns {boolean} Success status
   */
  const unmuteAlert = (alertId) => {
    const alertIndex = state.alerts.active.findIndex(a => a.id === alertId);
    if (alertIndex !== -1) {
      state.alerts.active[alertIndex].muted = false;
      state.alerts.active[alertIndex].mutedUntil = null;
      
      // Remove from muted list
      const mutedIndex = state.alerts.muted.indexOf(alertId);
      if (mutedIndex !== -1) {
        state.alerts.muted.splice(mutedIndex, 1);
      }
      
      return true;
    }
    return false;
  };
  
  /**
   * Clear all alerts
   * @returns {number} Number of alerts cleared
   */
  const clearAllAlerts = () => {
    const count = state.alerts.active.length;
    state.alerts.active = [];
    return count;
  };
  
  // --- Alert Rules Management ---
  
  // Store for alert rules
  const alertRules = ref([]);
  
  // Computed property to safely access alert rules
  const getAlertRules = computed(() => alertRules.value || []);
  
  /**
   * Load alert rules from storage
   * @returns {Promise<Array>} The loaded alert rules
   */
  const loadAlertRules = async () => {
    try {
      const { value } = await Preferences.get({ key: 'navcc_alert_rules' });
      if (value) {
        alertRules.value = JSON.parse(value);
        console.log(`Loaded ${alertRules.value.length} alert rules`);
      }
      return alertRules.value;
    } catch (error) {
      console.error('Error loading alert rules:', error);
      return [];
    }
  };
  
  /**
   * Save alert rules to storage
   * @returns {Promise<boolean>} Success status
   */
  const saveAlertRules = async () => {
    try {
      await Preferences.set({
        key: 'navcc_alert_rules',
        value: JSON.stringify(alertRules.value)
      });
      console.log(`Saved ${alertRules.value.length} alert rules`);
      return true;
    } catch (error) {
      console.error('Error saving alert rules:', error);
      return false;
    }
  };
  
  /**
   * Create a new alert rule
   * @param {Object} rule - The rule to create
   * @returns {Object} The created rule
   */
  const createAlertRule = (rule) => {
    const newRule = {
      ...createDefaultRule(rule.source),
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    alertRules.value.push(newRule);
    saveAlertRules();
    return newRule;
  };
  
  /**
   * Update an existing alert rule
   * @param {string} id - The ID of the rule to update
   * @param {Object} updates - The updates to apply
   * @returns {Object|null} The updated rule or null if not found
   */
  const updateAlertRule = (id, updates) => {
    const index = alertRules.value.findIndex(rule => rule.id === id);
    if (index !== -1) {
      alertRules.value[index] = {
        ...alertRules.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      saveAlertRules();
      return alertRules.value[index];
    }
    return null;
  };
  
  /**
   * Delete an alert rule
   * @param {string} id - The ID of the rule to delete
   * @returns {boolean} Success status
   */
  const deleteAlertRule = (id) => {
    const index = alertRules.value.findIndex(rule => rule.id === id);
    if (index !== -1) {
      alertRules.value.splice(index, 1);
      saveAlertRules();
      return true;
    }
    return false;
  };
  
  /**
   * Enable or disable an alert rule
   * @param {string} id - The ID of the rule to toggle
   * @param {boolean} enabled - Whether to enable or disable the rule
   * @returns {boolean} Success status
   */
  const toggleAlertRule = (id, enabled) => {
    const index = alertRules.value.findIndex(rule => rule.id === id);
    if (index !== -1) {
      alertRules.value[index].enabled = enabled;
      saveAlertRules();
      return true;
    }
    return false;
  };
  
  /**
   * Evaluate if a rule should trigger an alert
   * @param {Object} rule - The rule to evaluate
   * @param {any} value - The value to evaluate
   * @returns {boolean} Whether the rule condition is met
   */
  const evaluateRule = (rule, value) => {
    if (!rule.enabled) return false;
    
    switch (rule.operator) {
      case ALERT_RULE_OPERATORS.EQUALS:
        return value === rule.threshold;
      case ALERT_RULE_OPERATORS.NOT_EQUALS:
        return value !== rule.threshold;
      case ALERT_RULE_OPERATORS.LESS_THAN:
        return value < rule.threshold;
      case ALERT_RULE_OPERATORS.LESS_THAN_EQUALS:
        return value <= rule.threshold;
      case ALERT_RULE_OPERATORS.GREATER_THAN:
        return value > rule.threshold;
      case ALERT_RULE_OPERATORS.GREATER_THAN_EQUALS:
        return value >= rule.threshold;
      case ALERT_RULE_OPERATORS.BETWEEN:
        return value > rule.threshold && value < rule.secondaryThreshold;
      case ALERT_RULE_OPERATORS.NOT_BETWEEN:
        return value < rule.threshold || value > rule.secondaryThreshold;
      case ALERT_RULE_OPERATORS.CONTAINS:
        return String(value).includes(String(rule.threshold));
      case ALERT_RULE_OPERATORS.NOT_CONTAINS:
        return !String(value).includes(String(rule.threshold));
      default:
        return false;
    }
  };
  
  /**
   * Create an alert from a rule
   * @param {Object} rule - The rule to create an alert from
   * @param {any} value - The value that triggered the alert
   * @returns {Object} The created alert
   */
  const createAlertFromRule = (rule, value) => {
    const alert = newAlert();
    
    alert.title = rule.name;
    alert.message = rule.message.replace('{value}', value);
    alert.type = rule.alertType;
    alert.category = rule.alertCategory;
    alert.level = rule.alertLevel;
    alert.data = {
      ruleId: rule.id,
      value: value,
      threshold: rule.threshold,
      source: rule.source
    };
    
    if (rule.notifyOnMobile) {
      alert.phoneNotification = true;
    }
    
    return alert;
  };
  
  /**
   * Process all alert rules against new data
   * @param {string} dataPath - The data path that changed
   * @param {any} newValue - The new value
   */
  const processAlertRules = (dataPath, newValue) => {
    // Skip if value is null or undefined
    if (newValue === null || newValue === undefined) return;
    
    // Find rules that match this data path
    const matchingRules = alertRules.value.filter(rule => 
      rule.enabled && rule.source === dataPath
    );
    
    // Evaluate each matching rule
    matchingRules.forEach(rule => {
      const shouldAlert = evaluateRule(rule, newValue);
      
      if (shouldAlert) {
        // Create and add the alert
        const alert = createAlertFromRule(rule, newValue);
        
        // Apply prevention strategies from the rule
        addAlertWithPrevention(alert, {
          strategies: rule.strategies,
          signature: `rule-${rule.id}`,
          value: newValue,
          threshold: rule.threshold,
          isHigherBad: rule.strategyOptions.isHigherBad,
          cooldownMs: rule.strategyOptions.cooldownMs,
          debounceMs: rule.strategyOptions.debounceMs,
          hysteresisMargin: rule.strategyOptions.hysteresisMargin
        });
      }
    });
  };
  
  // Initialize alert rules
  loadAlertRules();
  
  // Watch for navigation data changes to evaluate alert rules
  watch(() => state.navigation, (newVal, oldVal) => {
    // Only process if we have alert rules
    if (alertRules.value.length === 0) return;
    
    // Check depth rules
    if (newVal?.depth?.belowKeel?.value !== oldVal?.depth?.belowKeel?.value) {
      processAlertRules('navigation.depth.belowKeel', newVal?.depth?.belowKeel?.value);
    }
    
    // Check speed rules
    if (newVal?.speed?.sog?.value !== oldVal?.speed?.sog?.value) {
      processAlertRules('navigation.position.speed', newVal?.speed?.sog?.value);
    }
    
    // Check speed through water rules
    if (newVal?.speed?.stw?.value !== oldVal?.speed?.stw?.value) {
      processAlertRules('navigation.speedThroughWater', newVal?.speed?.stw?.value);
    }
  }, { deep: true });
  
  // Watch for environment data changes
  watch(() => state.environment, (newVal, oldVal) => {
    // Only process if we have alert rules
    if (alertRules.value.length === 0) return;
    
    // Check wind speed rules
    if (newVal?.wind?.apparent?.speed?.value !== oldVal?.wind?.apparent?.speed?.value) {
      processAlertRules('environment.wind.speedApparent', newVal?.wind?.apparent?.speed?.value);
    }
    
    if (newVal?.wind?.true?.speed?.value !== oldVal?.wind?.true?.speed?.value) {
      processAlertRules('environment.wind.speedTrue', newVal?.wind?.true?.speed?.value);
    }
    
    // Check temperature rules
    if (newVal?.weather?.temperature?.air?.value !== oldVal?.weather?.temperature?.air?.value) {
      processAlertRules('environment.outside.temperature', newVal?.weather?.temperature?.air?.value);
    }
  }, { deep: true });
  
  // Watch for electrical data changes
  watch(() => state.vessel?.systems?.electrical, (newVal, oldVal) => {
    // Only process if we have alert rules
    if (alertRules.value.length === 0) return;
    
    // Check battery voltage
    if (newVal?.batteries?.voltage?.value !== oldVal?.batteries?.voltage?.value) {
      processAlertRules('electrical.batteries.voltage', newVal?.batteries?.voltage?.value);
    }
    
    // Check battery capacity
    if (newVal?.batteries?.capacity?.value !== oldVal?.batteries?.capacity?.value) {
      processAlertRules('electrical.batteries.capacity', newVal?.batteries?.capacity?.value);
    }
  }, { deep: true });
  
  // Watch for tank data changes
  watch(() => state.vessel?.tanks, (newVal, oldVal) => {
    // Only process if we have alert rules
    if (alertRules.value.length === 0) return;
    
    // Check fuel tank level
    if (newVal?.fuel?.level?.value !== oldVal?.fuel?.level?.value) {
      processAlertRules('tanks.fuel.level', newVal?.fuel?.level?.value);
    }
    
    // Check fresh water tank level
    if (newVal?.freshWater?.level?.value !== oldVal?.freshWater?.level?.value) {
      processAlertRules('tanks.freshWater.level', newVal?.freshWater?.level?.value);
    }
    
    // Check waste water tank level
    if (newVal?.wasteWater?.level?.value !== oldVal?.wasteWater?.level?.value) {
      processAlertRules('tanks.wasteWater.level', newVal?.wasteWater?.level?.value);
    }
  }, { deep: true });
  
  // Watch for engine data changes
  watch(() => state.vessel?.propulsion?.engine, (newVal, oldVal) => {
    // Only process if we have alert rules
    if (alertRules.value.length === 0) return;
    
    // Check engine temperature
    if (newVal?.temperature?.value !== oldVal?.temperature?.value) {
      processAlertRules('propulsion.engine.temperature', newVal?.temperature?.value);
    }
    
    // Check oil pressure
    if (newVal?.oilPressure?.value !== oldVal?.oilPressure?.value) {
      processAlertRules('propulsion.engine.oilPressure', newVal?.oilPressure?.value);
    }
  }, { deep: true });

  const hasActiveAlerts = computed(() => state.alerts.active?.length > 0);
  const pendingAlertCount = computed(
    () => state.alerts.processingQueue?.length || 0
  );

  // --- Relay/Connection Logic ---
  function switchDataSource(mode) {
    stateUpdateProvider.switchSource(mode);
  }

  // --- Subscriptions and Watchers ---
  stateUpdateProvider.subscribe((evt) => {
    if (evt.type === "state:full-update" && evt.data) {
      console.log(
        "[PiniaStore] [FULL STATE UPDATE] Received at",
        new Date().toISOString(),
        "Data keys:",
        Object.keys(evt.data),
        "Full object:",
        evt.data
      );
      replaceState(evt.data);
    } else if (evt.type === "state:patch" && evt.data) {
      applyStatePatch(evt.data);
    }
  });

  const breadcrumbs = ref([]);

  // Calculate distance between two coordinates in meters (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Watch for position changes and add to breadcrumbs if moved more than 0.5m
  watch(
    () => state.value?.navigation?.position,
    (newPos) => {
      // Skip if state or position is not available
      if (!newPos?.latitude?.value || !newPos?.longitude?.value) return;

      const lat = newPos.latitude.value;
      const lon = newPos.longitude.value;
      const timestamp = Date.now();

      // Create new breadcrumb entry
      const newEntry = {
        latitude: lat,
        longitude: lon,
        time: timestamp,
      };

      // Check if we should add this entry (if it's the first one or if we've moved enough)
      if (breadcrumbs.value.length === 0) {
        breadcrumbs.value.push(newEntry);
        console.log("[Breadcrumbs] Added first position entry");
      } else {
        // Get the most recent breadcrumb
        const lastEntry = breadcrumbs.value[breadcrumbs.value.length - 1];

        // Calculate distance from last entry
        const distance = calculateDistance(
          lastEntry.latitude,
          lastEntry.longitude,
          lat,
          lon
        );

        // Only add if we've moved more than 0.5 meters
        if (distance > 0.5) {
          breadcrumbs.value.push(newEntry);
          console.log(
            `[Breadcrumbs] Added new position entry, moved ${distance.toFixed(
              2
            )}m`
          );

          // Limit to 50 entries
          if (breadcrumbs.value.length > 50) {
            breadcrumbs.value.shift();
            console.log("[Breadcrumbs] Removed oldest entry, keeping 50 max");
          }
        }
      }
    },
    { deep: true }
  );

  // --- Export everything needed for components ---
  return { 
    state, 
    replaceState,
    applyStatePatch,
    setAnchorDropLocation,
    setRodeLength,
    cancelAnchor,
    switchDataSource,
    breadcrumbs,
    calculateDistance,
    
    // Alert functions
    newAlert,
    addAlert,
    addAlertWithSignature,
    addAlertWithPrevention,
    AlertPreventionStrategy,
    acknowledgeAlert,
    muteAlert,
    unmuteAlert,
    clearAllAlerts,
    hasActiveAlerts,
    pendingAlertCount,
    
    // Alert Rule Management
    alertRules,
    getAlertRules,
    loadAlertRules,
    saveAlertRules,
    createAlertRule,
    updateAlertRule,
    deleteAlertRule,
    toggleAlertRule,
    evaluateRule,
    processAlertRules,
  };
});