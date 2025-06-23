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

import { BASE_ALERT_DATUM } from "@/shared/alertDatum.js";


import {
  getUserUnitPreferences,
  setUnitPreference,
  setUnitPreset,
  UNIT_TYPES,
} from "@/shared/unitPreferences";
import { createStateDataModel } from "@/shared/stateDataModel.js";
import { UnitConversion } from "@/shared/unitConversion";
import { createLogger } from "../services/logger";


const logger = createLogger("state-data-store");

/**
 * Calculate the distance between two lat/lon points (Haversine formula)
 * Returns distance in meters or feet based on unit preferences
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2, useMetric) {
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
  const distanceInMeters = R * c;

  // Convert to feet if not using metric
  return useMetric ? distanceInMeters : distanceInMeters * 3.28084;
}

/**
 * Calculate destination coordinates based on start point, distance, and bearing
 * Uses Haversine formula for accurate distance calculations
 */
export function calculateDestinationLatLon(lat1, lon1, distance, bearing) {
  // Input validation
  if (lat1 < -90 || lat1 > 90 || isNaN(lat1))
    throw new Error("Invalid latitude");
  if (lon1 < -180 || lon1 > 180 || isNaN(lon1))
    throw new Error("Invalid longitude");
  if (distance < 0 || isNaN(distance))
    throw new Error("Distance must be non-negative");
  if (isNaN(bearing)) throw new Error("Invalid bearing");

  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const lat1Rad = toRad(lat1);
  const lon1Rad = toRad(lon1);
  // Use standard navigation bearing directly
  // 0 degrees  = North, 90 degrees  = East, 180 degrees  = South, 270 degrees  = West
  const bearingRad = toRad(bearing);

  const angularDistance = distance / R;

  const lat2 = Math.asin(
    Math.sin(lat1Rad) * Math.cos(angularDistance) +
      Math.cos(lat1Rad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const lon2 =
    lon1Rad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1Rad),
      Math.cos(angularDistance) - Math.sin(lat1Rad) * Math.sin(lat2)
    );

  // Convert back to degrees
  const lat2Deg = (lat2 * 180) / Math.PI;
  let lon2Deg = (lon2 * 180) / Math.PI;

  // Normalize longitude to [-180, 180] in a more straightforward way
  lon2Deg = ((((lon2Deg + 180) % 360) + 360) % 360) - 180;

  // Debug logging
  logger.debug("[calculateDestinationLatLon]", {
    input: { lat1, lon1, distance, bearing },
    output: { lat2: lat2Deg, lon2: lon2Deg },
    normalizedLon: lon2Deg,
  });

  return {
    latitude: lat2Deg,
    longitude: lon2Deg,
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
  depth,
  isMetric = true
) {
  // If missing data, return drop location as anchor location
  if (
    !anchorDropLocation?.latitude ||
    !anchorDropLocation?.longitude ||
    !rode ||
    bearing === undefined
  ) {
    logger.warn("Missing data for anchor location computation", {
      anchorDropLocation,
      rode,
      bearing,
      depth,
    });
    return { ...anchorDropLocation, distanceFromDropLocation: 0 };
  }

  // Calculate horizontal rode (exclude depth)
  let horizontalRode = rode;
  if (depth && rode > depth) {
    horizontalRode = Math.sqrt(rode * rode - depth * depth);
  }

  // Ensure horizontalRode is in meters for the calculation
  const horizontalRodeMeters = isMetric
    ? horizontalRode
    : horizontalRode / 3.28084;

  // Determine if bearing is in radians or degrees
  // If bearing is likely in radians (between -pi and pi or 0 and 2pi)
  let bearingDegrees = bearing;
  if (Math.abs(bearing) <= Math.PI * 2) {
    // Likely in radians, convert to degrees
    bearingDegrees = ((bearing * 180) / Math.PI + 360) % 360;
    logger.debug(
      "Converting bearing from radians to degrees:",
      bearing,
      "->",
      bearingDegrees
    );
  }

  // Ensure bearing is between 0 and 360 degrees
  bearingDegrees = (bearingDegrees + 360) % 360;

  logger.debug("Computing anchor location with:", {
    dropLocation: [anchorDropLocation.longitude, anchorDropLocation.latitude],
    horizontalRode: horizontalRodeMeters,
    bearing: bearingDegrees,
    isMetric,
  });

  const dest = calculateDestinationLatLon(
    anchorDropLocation.latitude,
    anchorDropLocation.longitude,
    horizontalRodeMeters,
    bearingDegrees
  );

  // Calculate distance from drop (in the correct units)
  const distanceFromDrop = calculateDistanceMeters(
    anchorDropLocation.latitude,
    anchorDropLocation.longitude,
    dest.latitude,
    dest.longitude,
    isMetric
  );

  return {
    ...dest,
    distanceFromDropLocation: distanceFromDrop,
    originalBearing: bearing,
    time: Date.now(),
    depth: depth ?? null,
  };
}

// --- Pinia Store Export ---
// Utility: Deep clone to avoid reference sharing
function getInitialState() {
  logger.debug(
    "DEBUG - Original state structure:",
    Object.keys(canonicalStateData.state)
  );
  const clonedState = structuredClone(canonicalStateData.state);
  console.log("---------INITIAL STATE---------- ");
  console.log(clonedState);
  return clonedState;
}

export const useStateDataStore = defineStore("stateData", () => {
  // Single, canonical, deeply nested state object
  const state = reactive({
    ...getInitialState(),
    tides: {},
    forecast: {},
  });

  // Create a data logger that uses the 'data' log level
  const dataLogger = (message, ...args) => {
    const logger = createLogger("state-data-store");
    logger.data(message, ...args);
  };

  // --- Patch and Replace Logic ---
  // Handle full state updates from the server
  function replaceState(newState) {
    dataLogger("Replacing full state", {
      stateKeys: Object.keys(newState || {}),
    });
    try {
      dataLogger("Starting state replacement", {
        currentStateKeys: Object.keys(state),
        newStateKeys: Object.keys(newState),
      });

      // Create a deep copy of the new state to avoid modifying the original
      const updatedState = JSON.parse(JSON.stringify(newState));

      // Preserve valid navigation position if the incoming position has null values
      const currentPos = state.navigation?.position;
      const newPos = updatedState.navigation?.position;

      // Log detailed position state before update
      dataLogger("Position State Before Update", {
        currentPos: currentPos,
        newPos: newPos,
      });

      // Log if we're about to preserve position
      if (currentPos?.latitude?.value && currentPos?.longitude?.value) {
        if (!newPos?.latitude?.value || !newPos?.longitude?.value) {
          dataLogger(
            "Will preserve current position due to missing values in update"
          );
        } else {
          dataLogger("Will update with new position data");
        }
      }

      // Only delete keys that exist in the new state
      const keysToUpdate = Object.keys(updatedState);
      const keysToRemove = Object.keys(state).filter(
        (key) => !keysToUpdate.includes(key)
      );

      if (keysToRemove.length > 0) {
        dataLogger(`Removing ${keysToRemove.length} keys:`, keysToRemove);
        keysToRemove.forEach((key) => delete state[key]);
      }

      // Update state properties reactively, being careful with nested objects
      dataLogger("Applying new state values");

      // Handle navigation position separately to ensure proper reactivity
      if (updatedState.navigation?.position) {
        if (!state.navigation) state.navigation = {};
        state.navigation.position = { ...updatedState.navigation.position };
        delete updatedState.navigation.position; // Remove to avoid overwriting
      }

      // Update all other state properties
      Object.keys(updatedState).forEach((key) => {
        if (key !== "navigation") {
          // Skip navigation as we handled it
          state[key] = updatedState[key];
        } else if (updatedState.navigation) {
          // Update other navigation properties if any
          Object.keys(updatedState.navigation).forEach((navKey) => {
            if (navKey !== "position") {
              if (!state.navigation) state.navigation = {};
              state.navigation[navKey] = updatedState.navigation[navKey];
            }
          });
        }
      });

      // Log detailed position state after update
      dataLogger("State Update Complete", {
        finalPos: state.navigation?.position,
      });

      // Log if the position changed
      if (currentPos && state.navigation?.position) {
        const latChanged =
          currentPos.latitude?.value !==
          state.navigation.position.latitude?.value;
        const lonChanged =
          currentPos.longitude?.value !==
          state.navigation.position.longitude?.value;

        if (latChanged || lonChanged) {
          dataLogger("Position changed:", {
            lat: {
              from: currentPos.latitude?.value,
              to: state.navigation.position.latitude?.value,
              changed: latChanged,
            },
            lon: {
              from: currentPos.longitude?.value,
              to: state.navigation.position.longitude?.value,
              changed: lonChanged,
            },
          });
        } else {
          dataLogger("Position unchanged");
        }
      }
    } catch (error) {
      logger.error("Error in replaceState:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Generic function to send messages to the server
   * @param {string} messageType - Type of message (e.g., 'anchor:update')
   * @param {Object} data - Message data
   * @param {Object} options - Additional options
   * @returns {boolean} - Success status
   */
  async function sendMessageToServer(messageType, data, options = {}) {
    dataLogger(`Sending message to server: ${messageType}`, { data, options });
    try {
      // Get boatId from localStorage if available
      let boatId;
      try {
        // Try to get active boat ID from localStorage
        const storedBoatId = localStorage.getItem("activeBoatId");
        if (storedBoatId && storedBoatId !== "null") {
          boatId = storedBoatId;
        } else {
          // Fallback: Try to get from boatIds array
          const boatIdsStr = localStorage.getItem("boatIds");
          if (boatIdsStr) {
            const boatIds = JSON.parse(boatIdsStr);
            if (Array.isArray(boatIds) && boatIds.length > 0) {
              boatId = boatIds[0];
              // Store this as the active boat ID for future use
              localStorage.setItem("activeBoatId", boatId);
            }
          }
        }
      } catch (e) {
        logger.warn("Could not access localStorage for boatId:", e);
        return false;
      }

      // If we still don't have a boat ID, we can't route the message
      if (!boatId) {
        logger.warn(`Cannot send ${messageType}: No boat ID available for routing`);
        return false;
      }

      // Prepare the message with metadata
      const message = {
        ...data,
        boatId,
        timestamp: Date.now(),
        ...options
      };

      // Send using stateUpdateProvider, which routes to the correct adapter
      console.log('[stateDataStore->stateUpdateProvider] Sending command:', { service: 'state', action: messageType, data: '...' });
      await stateUpdateProvider.sendCommand('state', messageType, message);
      dataLogger(`Sent ${messageType} to server for boat ${boatId}`);
      return true;
    } catch (error) {
      logger.error(`Error sending ${messageType} to server:`, error);
      return false;
    }
  }

  // --- Anchor Actions ---
  function setAnchorDropLocation(position) {
    if (!state.anchor) state.anchor = {};
    state.anchor.anchorDropLocation = position;

    // Send update to server
    if (state.anchor.anchorDropLocation) {
      sendMessageToServer("anchor:update", state.anchor);
    }
  }

  function setRodeLength(length, units = "feet") {
    if (!state.anchor) state.anchor = {};
    state.anchor.rode = { value: length, units };

    // Send update to server
    if (state.anchor.anchorDropLocation) {
      sendMessageToServer("anchor:update", state.anchor);
    }
  }

  const cancelAnchor = () => {
    // Get the default anchor state from the state data model
    const defaultState = createStateDataModel();

    // Create the new anchor state and make it reactive
    const newAnchor = reactive(defaultState.anchor);

    // Update the state with the new anchor
    state.anchor = newAnchor;

    // Send update to server
    sendMessageToServer("anchor:update", state.anchor);
  };

  // --- Alerts Logic ---
  // Initialize alerts structure if it doesn't exist
  if (!state.alerts) {
    state.alerts = {
      active: [], // Currently active alerts/notifications
      history: [], // Past/resolved alerts (optional)
      definitions: [], // User/system-defined alert rules (optional)
      processingQueue: [], // Alert ids currently being processed (optional)
      muted: [], // Alert ids currently muted (optional)
      deviceSubscriptions: {}, // deviceId => [alert types/categories] (optional)
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
      status: "active",
      actions: ["acknowledge", "mute"],
      source: "application",
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
    hysteresisValues: new Map(), // signature -> { value, direction }
  };

  /**
   * Alert prevention strategies
   */
  const AlertPreventionStrategy = {
    NONE: "none", // No prevention, always trigger
    COOLDOWN: "cooldown", // Prevent duplicate alerts for a cooldown period
    STATE_TRACKING: "state", // Only trigger when crossing from normal to alert state
    DEBOUNCE: "debounce", // Wait for value to stabilize before triggering
    HYSTERESIS: "hysteresis", // Require crossing back by a margin before retriggering
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
    if (!alert.status) alert.status = "active";

    // Add to active alerts
    state.alerts.active.push(alert);

    logger(`New alert added: ${alert.title || alert.label}`);
    return alert;
  };

  /**
   * Resolve alerts by trigger type when conditions return to normal
   * @param {string} triggerType - The trigger type of alerts to resolve
   * @param {Object} resolutionData - Data about the resolution
   * @returns {Array} The resolved alerts
   */
  const resolveAlertsByTrigger = (triggerType, resolutionData = {}) => {
    // Find active alerts with this trigger that are auto-resolvable and not acknowledged
    const alertsToResolve = state.alerts.active.filter(
      (alert) =>
        alert.trigger === triggerType &&
        alert.autoResolvable === true &&
        !alert.acknowledged
    );

    if (alertsToResolve.length === 0) return [];

    logger(
      `Auto-resolving ${alertsToResolve.length} alerts with trigger: ${triggerType}`
    );

    // Process each alert to resolve
    alertsToResolve.forEach((alert) => {
      // Update alert status
      alert.status = "resolved";
      alert.resolvedAt = new Date().toISOString();
      alert.resolutionData = {
        ...resolutionData,
        autoResolved: true,
      };

      // Move from active to resolved
      const index = state.alerts.active.findIndex((a) => a.id === alert.id);
      if (index !== -1) {
        state.alerts.active.splice(index, 1);
        state.alerts.resolved.push(alert);
      }
    });

    // Create a resolution notification if any alerts were resolved
    if (alertsToResolve.length > 0) {
      const resolutionAlert = newAlert();
      resolutionAlert.type = "system";
      resolutionAlert.category = alertsToResolve[0].category;
      resolutionAlert.source = alertsToResolve[0].source;
      resolutionAlert.level = "info";
      resolutionAlert.label = "Condition Resolved";

      // Create appropriate message based on trigger type
      let message = "An alert condition has been resolved.";
      switch (triggerType) {
        case "critical_range":
          message = `Boat has returned within critical range. Distance to anchor: ${resolutionData.distance} ${resolutionData.units}.`;
          break;
        case "ais_proximity":
          message = `No vessels detected within warning radius of ${resolutionData.warningRadius} ${resolutionData.units}.`;
          break;
        default:
          message = `The ${triggerType.replace(
            "_",
            " "
          )} condition has been resolved.`;
      }

      resolutionAlert.message = message;
      resolutionAlert.data = resolutionData;
      resolutionAlert.autoExpire = true;
      resolutionAlert.expiresIn = 60000; // 1 minute
      resolutionAlert.trigger = `${triggerType}_resolved`;

      addAlert(resolutionAlert);
    }

    return alertsToResolve;
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
      hysteresisMargin = 0.1 * Math.abs(threshold), // Default 10% of threshold
    } = options;

    // Convert single strategy to array
    const strategyArray = Array.isArray(strategies) ? strategies : [strategies];

    // If no prevention is requested, just add the alert
    if (
      strategyArray.includes(AlertPreventionStrategy.NONE) &&
      strategyArray.length === 1
    ) {
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
        logger(`Prevented alert due to ${strategy} strategy: ${signature}`);
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
        if (Math.random() < 0.1) {
          // 10% chance to clean up
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
          lastCrossTime: 0,
        };

        // Determine if we're in an alert state based on the threshold and direction
        const isInAlertState = isHigherBad
          ? value > threshold
          : value < threshold;

        // Only allow alert when transitioning from normal to alert state
        const shouldAllow = isInAlertState && !state.inAlertState;

        // Update state
        alertTracking.alertStates.set(signature, {
          inAlertState: isInAlertState,
          lastValue: value,
          lastCrossTime: shouldAllow ? now : state.lastCrossTime,
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
        const hysteresisState = alertTracking.hysteresisValues.get(
          signature
        ) || {
          value: null,
          direction: null, // 1 for rising, -1 for falling
        };

        // First time seeing this alert
        if (hysteresisState.value === null) {
          alertTracking.hysteresisValues.set(signature, {
            value,
            direction: isHigherBad ? 1 : -1, // Initial direction based on threshold type
          });
          return false; // Allow first alert
        }

        // Determine current direction
        const currentDirection = value > hysteresisState.value ? 1 : -1;

        // Check if we've crossed back by the hysteresis margin
        const hasCrossedBack =
          Math.abs(value - hysteresisState.value) >= hysteresisMargin &&
          currentDirection !== hysteresisState.direction;

        // Update state
        if (hasCrossedBack) {
          alertTracking.hysteresisValues.set(signature, {
            value,
            direction: currentDirection,
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
      cooldownMs,
    });
  };

  /**
   * Acknowledge an alert
   * @param {string} alertId - The ID of the alert to acknowledge
   * @returns {boolean} Success status
   */
  const acknowledgeAlert = (alertId) => {
    const alertIndex = state.alerts.active.findIndex((a) => a.id === alertId);
    if (alertIndex !== -1) {
      // Mark as acknowledged
      state.alerts.active[alertIndex].acknowledged = true;

      // Move to history
      const alert = {
        ...state.alerts.active[alertIndex],
        status: "acknowledged",
      };
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
    const alertIndex = state.alerts.active.findIndex((a) => a.id === alertId);
    if (alertIndex !== -1) {
      const mutedUntil = new Date(Date.now() + duration).toISOString();
      state.alerts.active[alertIndex].muted = true;
      state.alerts.active[alertIndex].mutedUntil = mutedUntil;
      state.alerts.active[alertIndex].mutedBy = "user";

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
    const alertIndex = state.alerts.active.findIndex((a) => a.id === alertId);
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

  // Initialize logger for alert rules
  const alertLogger = createLogger("alert-rules");

  // Get all alert rules
  function getAlertRules() {
    return alertRules.value;
  }

  // Load alert rules from storage
  async function loadAlertRules() {
    try {
      const savedRules = localStorage.getItem("alertRules");
      if (savedRules) {
        alertRules.value = JSON.parse(savedRules);
        alertLogger.info("Loaded alert rules from storage");
      }
    } catch (error) {
      alertLogger.error("Failed to load alert rules", error);
    }
  }

  // Save alert rules to storage
  async function saveAlertRules() {
    try {
      localStorage.setItem("alertRules", JSON.stringify(alertRules.value));
      alertLogger.info("Saved alert rules to storage");
      return true;
    } catch (error) {
      alertLogger.error("Failed to save alert rules", error);
      return false;
    }
  }

  // Create a new alert rule
  function createAlertRule(rule) {
    const newRule = {
      id: `rule_${Date.now()}`,
      enabled: true,
      ...rule,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    alertRules.value.push(newRule);
    saveAlertRules();
    return newRule;
  }

  // Update an existing alert rule
  function updateAlertRule(id, updates) {
    const ruleIndex = alertRules.value.findIndex((r) => r.id === id);
    if (ruleIndex === -1) return null;

    const updatedRule = {
      ...alertRules.value[ruleIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    alertRules.value[ruleIndex] = updatedRule;
    saveAlertRules();
    return updatedRule;
  }

  // Delete an alert rule
  function deleteAlertRule(id) {
    const ruleIndex = alertRules.value.findIndex((r) => r.id === id);
    if (ruleIndex === -1) return false;

    alertRules.value.splice(ruleIndex, 1);
    saveAlertRules();
    return true;
  }

  // Toggle an alert rule's enabled state
  function toggleAlertRule(id) {
    const rule = alertRules.value.find((r) => r.id === id);
    if (!rule) return null;

    rule.enabled = !rule.enabled;
    rule.updatedAt = new Date().toISOString();
    saveAlertRules();
    return rule;
  }

  // Evaluate if a rule condition is met
  function evaluateRule(rule, currentValue) {
    if (!rule.enabled) return false;

    const { operator, threshold } = rule.condition;

    switch (operator) {
      case "gt":
        return currentValue > threshold;
      case "gte":
        return currentValue >= threshold;
      case "lt":
        return currentValue < threshold;
      case "lte":
        return currentValue <= threshold;
      case "eq":
        return currentValue === threshold;
      case "neq":
        return currentValue !== threshold;
      default:
        return false;
    }
  }

  // Process alert rules for a specific data path
  function processAlertRules(dataPath, currentValue) {
    if (!alertRules.value || alertRules.value.length === 0) return;

    // Find rules that match the data path
    const matchingRules = alertRules.value.filter(
      (rule) => rule.condition && rule.condition.dataPath === dataPath
    );

    if (matchingRules.length === 0) return;

    // Process each matching rule
    matchingRules.forEach((rule) => {
      const isConditionMet = evaluateRule(rule, currentValue);

      if (isConditionMet) {
        // Create an alert if the condition is met
        const alert = {
          id: `alert_${Date.now()}`,
          ruleId: rule.id,
          message: rule.message || `Alert: ${dataPath} condition met`,
          severity: rule.severity || "warning",
          timestamp: new Date().toISOString(),
          data: {
            path: dataPath,
            value: currentValue,
            threshold: rule.condition.threshold,
            operator: rule.condition.operator,
          },
        };

        addAlert(alert);
      }
    });
  }

  // Watch for navigation data changes to evaluate alert rules
  watch(
    () => state.navigation,
    (newVal, oldVal) => {
      // Only process if we have alert rules
      if (alertRules.value.length === 0) return;

      // Check depth rules
      if (newVal?.depth?.belowKeel?.value !== oldVal?.depth?.belowKeel?.value) {
        processAlertRules(
          "navigation.depth.belowKeel",
          newVal?.depth?.belowKeel?.value
        );
      }

      // Check speed rules
      if (newVal?.speed?.sog?.value !== oldVal?.speed?.sog?.value) {
        processAlertRules(
          "navigation.position.speed",
          newVal?.speed?.sog?.value
        );
      }

      // Check speed through water rules
      if (newVal?.speed?.stw?.value !== oldVal?.speed?.stw?.value) {
        processAlertRules(
          "navigation.speedThroughWater",
          newVal?.speed?.stw?.value
        );
      }
    },
    { deep: true }
  );

  // Watch for environment data changes
  watch(
    () => state.environment,
    (newVal, oldVal) => {
      // Only process if we have alert rules
      if (alertRules.value.length === 0) return;

      // Check wind speed rules
      if (
        newVal?.wind?.apparent?.speed?.value !==
        oldVal?.wind?.apparent?.speed?.value
      ) {
        processAlertRules(
          "environment.wind.speedApparent",
          newVal?.wind?.apparent?.speed?.value
        );
      }

      if (
        newVal?.wind?.true?.speed?.value !== oldVal?.wind?.true?.speed?.value
      ) {
        processAlertRules(
          "environment.wind.speedTrue",
          newVal?.wind?.true?.speed?.value
        );
      }

      // Check temperature rules
      if (
        newVal?.weather?.temperature?.air?.value !==
        oldVal?.weather?.temperature?.air?.value
      ) {
        processAlertRules(
          "environment.outside.temperature",
          newVal?.weather?.temperature?.air?.value
        );
      }
    },
    { deep: true }
  );

  // Watch for electrical data changes
  watch(
    () => state.vessel?.systems?.electrical,
    (newVal, oldVal) => {
      // Only process if we have alert rules
      if (alertRules.value.length === 0) return;

      // Check battery voltage
      if (
        newVal?.batteries?.voltage?.value !== oldVal?.batteries?.voltage?.value
      ) {
        processAlertRules(
          "electrical.batteries.voltage",
          newVal?.batteries?.voltage?.value
        );
      }

      // Check battery capacity
      if (
        newVal?.batteries?.capacity?.value !==
        oldVal?.batteries?.capacity?.value
      ) {
        processAlertRules(
          "electrical.batteries.capacity",
          newVal?.batteries?.capacity?.value
        );
      }
    },
    { deep: true }
  );

  // Watch for tank data changes
  watch(
    () => state.vessel?.tanks,
    (newVal, oldVal) => {
      // Only process if we have alert rules
      if (alertRules.value.length === 0) return;

      // Check fuel tank level
      if (newVal?.fuel?.level?.value !== oldVal?.fuel?.level?.value) {
        processAlertRules("tanks.fuel.level", newVal?.fuel?.level?.value);
      }

      // Check fresh water tank level
      if (
        newVal?.freshWater?.level?.value !== oldVal?.freshWater?.level?.value
      ) {
        processAlertRules(
          "tanks.freshWater.level",
          newVal?.freshWater?.level?.value
        );
      }

      // Check waste water tank level
      if (
        newVal?.wasteWater?.level?.value !== oldVal?.wasteWater?.level?.value
      ) {
        processAlertRules(
          "tanks.wasteWater.level",
          newVal?.wasteWater?.level?.value
        );
      }
    },
    { deep: true }
  );

  // Watch for engine data changes
  watch(
    () => state.vessel?.propulsion?.engine,
    (newVal, oldVal) => {
      // Only process if we have alert rules
      if (alertRules.value.length === 0) return;

      // Check engine temperature
      if (newVal?.temperature?.value !== oldVal?.temperature?.value) {
        processAlertRules(
          "propulsion.engine.temperature",
          newVal?.temperature?.value
        );
      }

      // Check oil pressure
      if (newVal?.oilPressure?.value !== oldVal?.oilPressure?.value) {
        processAlertRules(
          "propulsion.engine.oilPressure",
          newVal?.oilPressure?.value
        );
      }
    },
    { deep: true }
  );

  const hasActiveAlerts = computed(() => state.alerts.active?.length > 0);
  const pendingAlertCount = computed(
    () => state.alerts.processingQueue?.length || 0
  );

  // --- Relay/Connection Logic ---
  function switchDataSource(mode) {
    stateUpdateProvider.switchSource(mode);
  }

  /**
   * Apply a JSON Patch to the state
   * @param {Array} patches - Array of JSON Patch operations
   * @returns {boolean} - True if successful, false otherwise
   */
  function applyStatePatch(patches) {
    if (!Array.isArray(patches)) {
      logger.error('Invalid patches format - expected array, got:', typeof patches);
      return false;
    }

    if (patches.length === 0) {
      dataLogger('Empty patches array, nothing to apply');
      return true;
    }

    dataLogger(`Applying ${patches.length} patch operations`);

    try {
      // Apply each patch operation
      for (const patch of patches) {
        if (patch.op === 'replace' || patch.op === 'add') {
          // Handle replace and add operations
          const path = patch.path.split('/').filter(Boolean);
          let target = state;
          
          // Navigate to the parent of the target
          for (let i = 0; i < path.length - 1; i++) {
            const part = path[i];
            if (!target[part]) {
              target[part] = {};
            }
            target = target[part];
          }
          
          // Set the value
          target[path[path.length - 1]] = patch.value;
        }
        // Add support for other patch operations if needed
      }
      return true;
    } catch (error) {
      logger.error('Error applying patches:', {
        error: error.message,
        stack: error.stack,
        patches
      });
      return false;
    }
  }

  // Helper function to get nested property by path, handling Vue reactive proxies
  function getValueByPath(obj, path) {
    if (!path || !obj) return undefined;

    // Handle root path
    if (path === "/") return obj;

    // Remove leading slash if present and split
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    const parts = cleanPath.split("/").filter(Boolean);

    let current = obj;

    for (const part of parts) {
      // Handle array indices (e.g., 'items/0/name')
      if (Array.isArray(current) && /^\d+$/.test(part)) {
        const index = parseInt(part, 10);
        if (index >= 0 && index < current.length) {
          current = current[index];
          continue;
        }
        return undefined;
      }

      // Handle regular object properties
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  function ensurePathExists(obj, path) {
    const parts = path.split("/").filter(Boolean);
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    return current;
  }

  // --- Subscriptions and Watchers ---
  stateUpdateProvider.subscribe((evt) => {
    // Only process events we care about
    if (!['state:patch', 'state:full-update', 'patch-update', 'full-update'].includes(evt.type)) {
      return; // Silently ignore other event types
    }

    // Log basic event info at debug level
    dataLogger(`[StateDataStore] Processing ${evt.type} event`);

    // Handle wind data updates from patch events
    if (evt.type === "state:patch" && Array.isArray(evt.data)) {
      const windPatches = evt.data.filter((patch) =>
        patch.path?.startsWith("/navigation/wind/")
      );

      if (windPatches.length > 0) {
        dataLogger("Processing wind data from patch:", windPatches);

        // Ensure the wind structure exists
        if (!state.navigation) state.navigation = {};
        if (!state.navigation.wind) state.navigation.wind = {};

        // Process each wind-related patch
        windPatches.forEach((patch) => {
          const [, , windType, property] = patch.path.split("/");

          if (
            (windType === "apparent" || windType === "true") &&
            (property === "speed" || property === "angle")
          ) {
            // Initialize the structure if it doesn't exist
            if (!state.navigation.wind[windType]) {
              state.navigation.wind[windType] = {};
            }
            if (!state.navigation.wind[windType][property]) {
              state.navigation.wind[windType][property] = { value: null };
            }

            // Update the value
            state.navigation.wind[windType][property].value = patch.value;
            dataLogger(`Updated wind.${windType}.${property} =`, patch.value);
          }
        });
        return; // Skip the rest of the handler for wind patches
      }
    }

    // Handle state updates
    if (evt.type === "state:full-update" || evt.type === "full-update") {
      if (!evt.data) {
        logger.debug("[StateDataStore] Received full update with no data");
        return;
      }
      dataLogger("Applying full state update");
      replaceState(evt.data);
    } 
    else if (evt.type === "state:patch" || evt.type === "patch-update") {
      if (!evt.data) {
        logger.debug("[StateDataStore] Received patch with no data");
        return;
      }
      dataLogger(`Applying patch with ${evt.data?.length || 0} operations`);
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
      if (!newPos) return;
      logger.debug("Position updated", { position: newPos });
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
        logger.debug("[Breadcrumbs] Added first position entry");
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
          logger.debug(
            `[Breadcrumbs] Added new position entry, moved ${distance.toFixed(
              2
            )}m`
          );

          // Limit to 50 entries
          if (breadcrumbs.value.length > 50) {
            breadcrumbs.value.shift();
            logger.debug("[Breadcrumbs] Removed oldest entry, keeping 50 max");
          }
        }
      }
    },
    { deep: true }
  );

  // --- Export everything needed for components ---
  // Unit preferences state
  const unitPreferences = ref(null);

  // Load unit preferences
  async function loadUnitPreferences() {
    try {
      unitPreferences.value = await getUserUnitPreferences();
      logger.debug(
        "[StateDataStore] Loaded unit preferences:",
        unitPreferences.value
      );
      return unitPreferences.value;
    } catch (error) {
      logger.error("[StateDataStore] Failed to load unit preferences:", error);
      return null;
    }
  }

  // Update unit preferences
  async function updateUnitPreference(unitType, unit) {
    try {
      const updatedPrefs = await setUnitPreference(unitType, unit);
      unitPreferences.value = updatedPrefs;
      await updateUnitsToPreferences();
      return updatedPrefs;
    } catch (error) {
      logger.error("[StateDataStore] Failed to update unit preference:", error);
      throw error;
    }
  }

  // Set unit preset
  async function updateUnitPreset(preset) {
    try {
      const updatedPrefs = await setUnitPreset(preset);
      unitPreferences.value = updatedPrefs;
      await updateUnitsToPreferences();
      return updatedPrefs;
    } catch (error) {
      logger.error("[StateDataStore] Failed to update unit preset:", error);
      throw error;
    }
  }

  // Convert all values in state to match user preferences
  async function updateUnitsToPreferences() {
    // Make sure preferences are loaded
    if (!unitPreferences.value) {
      await loadUnitPreferences();
    }

    // Apply conversions to the state
    convertStateToPreferredUnits(state);

    return unitPreferences.value;
  }

  // Convert a specific state object to preferred units
  function convertStateToPreferredUnits(stateObj) {
    if (!unitPreferences.value || !stateObj) return;

    // Process navigation data
    if (stateObj.navigation) {
      // Depth - special handling
      if (stateObj.navigation.depth) {
        convertDepthValues(stateObj.navigation.depth);
      }

      // Speed
      convertMeasurementValues(stateObj.navigation.speed, UNIT_TYPES.SPEED);

      // Position (no conversion needed for lat/lon)

      // Course (convert angles to degrees)
      convertAngleValues(stateObj.navigation.course);

      // Wind
      convertWindValues(stateObj.navigation.wind);

      // Trip
      convertMeasurementValues(stateObj.navigation.trip, UNIT_TYPES.LENGTH);
    }

    // Process environment data
    if (stateObj.environment?.weather) {
      // Temperature
      convertMeasurementValues(
        stateObj.environment.weather.temperature,
        UNIT_TYPES.TEMPERATURE
      );

      // Pressure
      convertMeasurementValues(
        stateObj.environment.weather,
        UNIT_TYPES.PRESSURE
      );
    }

    // Process vessel data
    if (stateObj.vessel) {
      // Dimensions
      convertMeasurementValues(
        stateObj.vessel.info?.dimensions,
        UNIT_TYPES.LENGTH
      );

      // Fuel
      convertMeasurementValues(
        stateObj.vessel.systems?.propulsion?.fuel,
        UNIT_TYPES.VOLUME
      );

      // Tanks
      convertMeasurementValues(
        stateObj.vessel.systems?.tanks,
        UNIT_TYPES.VOLUME
      );
    }

    // Process anchor data
    if (stateObj.anchor) {
      // Anchor locations
      convertAnchorValues(stateObj.anchor);
    }
  }

  // Helper function to convert measurement values
  function convertMeasurementValues(obj, unitType) {
    if (!obj || !unitPreferences.value) return;

    const preferredUnit = unitPreferences.value[unitType];
    if (!preferredUnit) return;

    // Process each property in the object
    Object.keys(obj).forEach((key) => {
      const item = obj[key];

      // Handle nested objects recursively
      if (item && typeof item === "object" && !Array.isArray(item)) {
        // Check if this is a value object with units
        if (item.value !== undefined && item.units) {
          const currentUnit = item.units;

          // Handle special case for depth with feet property
          if (
            item.feet &&
            typeof item.feet === "object" &&
            item.feet.value !== undefined
          ) {
            if (preferredUnit === "ft") {
              // Use the feet value directly
              item.value = item.feet.value;
              item.units = "ft";
            } else if (currentUnit !== preferredUnit) {
              // Convert to preferred unit
              item.value = UnitConversion.convert(
                item.value,
                currentUnit,
                preferredUnit
              );
              item.units = preferredUnit;
            }
            // Keep the feet property for backward compatibility, but update it
            if (item.units !== "ft") {
              item.feet.value = UnitConversion.mToFt(item.value);
            }
          } else {
            // Normal case - only convert if units don't match preference
            if (currentUnit !== preferredUnit) {
              // Special handling for angles - always use degrees for display
              if (unitType === UNIT_TYPES.ANGLE && currentUnit === "rad") {
                item.value = UnitConversion.radToDeg(item.value);
                item.units = "deg";
              } else {
                item.value = UnitConversion.convert(
                  item.value,
                  currentUnit,
                  preferredUnit
                );
                item.units = preferredUnit;
              }
            }
          }
        } else {
          // Recurse into nested objects
          convertMeasurementValues(item, unitType);
        }
      }
    });
  }

  // Helper function to specifically handle depth values with feet property
  function convertDepthValues(depthObj) {
    if (!depthObj || !unitPreferences.value) return;

    const preferredUnit = unitPreferences.value[UNIT_TYPES.LENGTH];
    if (!preferredUnit) return;

    // Process each depth measurement
    Object.keys(depthObj).forEach((key) => {
      const item = depthObj[key];
      if (!item || typeof item !== "object") return;

      // Handle the special case where we have a feet sub-object
      if (preferredUnit === "ft") {
        // If we want feet as the primary unit
        if (
          item.feet &&
          typeof item.feet === "object" &&
          item.feet.value !== null
        ) {
          // Use the feet value directly
          item.value = item.feet.value;
          item.units = "ft";
        } else if (item.value !== null && item.units === "m") {
          // Convert from meters to feet
          item.value = UnitConversion.mToFt(item.value);
          item.units = "ft";
          // Ensure feet property exists for backward compatibility
          if (!item.feet) item.feet = { value: item.value };
          else item.feet.value = item.value;
        }
      } else if (
        preferredUnit === "m" &&
        item.units !== "m" &&
        item.value !== null
      ) {
        // Convert back to meters if needed
        if (item.units === "ft") {
          item.value = UnitConversion.ftToM(item.value);
          item.units = "m";
          // Update feet property for backward compatibility
          if (!item.feet)
            item.feet = { value: UnitConversion.mToFt(item.value) };
          else item.feet.value = UnitConversion.mToFt(item.value);
        }
      }
    });
  }

  // Helper function to convert angle values
  function convertAngleValues(courseObj) {
    if (!courseObj) return;

    // Convert all angle values to degrees for display
    const convertAngle = (obj) => {
      if (!obj) return;

      if (obj.value !== undefined && obj.units === "rad") {
        obj.degrees = UnitConversion.radToDeg(obj.value);

        // If user prefers degrees as primary unit, swap values
        if (unitPreferences.value[UNIT_TYPES.ANGLE] === "deg") {
          obj.value = obj.degrees;
          obj.units = "deg";
        }
      }
    };

    // Apply to all angle measurements in course
    if (courseObj.cog) convertAngle(courseObj.cog);
    if (courseObj.heading?.magnetic) convertAngle(courseObj.heading.magnetic);
    if (courseObj.heading?.true) convertAngle(courseObj.heading.true);
    if (courseObj.variation) convertAngle(courseObj.variation);
    if (courseObj.rateOfTurn) {
      if (
        courseObj.rateOfTurn.value !== undefined &&
        courseObj.rateOfTurn.units === "rad/s"
      ) {
        courseObj.rateOfTurn.degPerMin =
          Math.round(
            UnitConversion.radToDeg(courseObj.rateOfTurn.value) * 60 * 10
          ) / 10;
      }
    }
  }

  // Helper function to convert wind values
  function convertWindValues(windObj) {
    if (!windObj) return;

    // Convert apparent wind
    if (windObj.apparent) {
      // Speed
      convertMeasurementValues(windObj.apparent, UNIT_TYPES.SPEED);

      // Angle
      if (windObj.apparent.angle) {
        convertAngleValues({ cog: windObj.apparent.angle });

        // Set side based on angle
        if (windObj.apparent.angle.value !== undefined) {
          windObj.apparent.angle.side =
            windObj.apparent.angle.value >= 0 ? "starboard" : "port";
        }
      }

      // Direction
      if (windObj.apparent.direction) {
        convertAngleValues({ cog: windObj.apparent.direction });
      }
    }

    // Convert true wind
    if (windObj.true) {
      // Speed
      convertMeasurementValues(windObj.true, UNIT_TYPES.SPEED);

      // Direction
      if (windObj.true.direction) {
        convertAngleValues({ cog: windObj.true.direction });
      }
    }
  }

  // Helper function to convert anchor values
  function convertAnchorValues(anchorObj) {
    if (!anchorObj) return;

    // Helper for location objects
    const convertLocation = (location) => {
      if (!location) return;

      // Depth
      convertMeasurementValues({ depth: location.depth }, UNIT_TYPES.LENGTH);

      // Distances
      convertMeasurementValues(
        {
          distancesFromCurrent: location.distancesFromCurrent,
          distancesFromDrop: location.distancesFromDrop,
        },
        UNIT_TYPES.LENGTH
      );

      // Bearings
      if (location.originalBearing) {
        convertAngleValues({ cog: location.originalBearing });
      }
      if (location.bearing) {
        convertAngleValues({ cog: location.bearing });
      }
    };

    // Apply to anchor locations
    convertLocation(anchorObj.anchorDropLocation);
    convertLocation(anchorObj.anchorLocation);

    // Rode and ranges
    convertMeasurementValues(
      {
        rode: anchorObj.rode,
        criticalRange: anchorObj.criticalRange,
        warningRange: anchorObj.warningRange,
      },
      UNIT_TYPES.LENGTH
    );
  }

  // Initialize unit preferences and apply conversions immediately
  loadUnitPreferences()
    .then(() => {
      dataLogger("Unit preferences loaded, applying to state");
      // Apply unit conversions to initial state
      convertStateToPreferredUnits(state);
      dataLogger("Unit conversions applied to initial state");

      // Load alert rules after unit preferences are loaded
      return loadAlertRules();
    })
    .then(() => {
      dataLogger("Alert rules loaded");
    })
    .catch((error) => {
      logger.error("Failed to initialize store", {
        error: error.message,
        stack: error.stack,
      });
    });

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
    sendMessageToServer,

    // Alert functions
    newAlert,
    addAlert,
    addAlertWithSignature,
    addAlertWithPrevention,
    resolveAlertsByTrigger,
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

    // Unit Preferences Management
    unitPreferences,
    loadUnitPreferences,
    updateUnitPreference,
    updateUnitPreset,
    updateUnitsToPreferences,
  };
});
