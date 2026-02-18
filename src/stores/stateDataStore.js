/**
 * StateDataStore - Pinia store adapter for the unified StateData
 *
 * This store provides a Vue-friendly interface to the unified StateData structure,
 * making it easy to use in Vue components with reactivity.
 */

import { defineStore } from "pinia";
import { ref, reactive, computed, watch } from "vue";
import { stateData as canonicalStateData } from "@/stateData.js";
import { stateUpdateProvider } from "../services/stateUpdateProvider";

import { BASE_ALERT_DATUM } from "@/shared/alertDatum.js";
import { ALERT_RULE_OPERATORS } from "@/shared/alertRuleModel.js";


import {
  setUnitPreference,
  setUnitPreset,
  UNIT_TYPES,
  UNIT_PRESETS,
} from "@/shared/unitPreferences";
import { UnitConversion } from "@/shared/unitConversion";
import { createLogger } from "../services/logger";
import { generateUuid } from "@/utils/uuid.js";
import { usePreferencesStore } from "@/stores/preferences";


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
    logger.data(message, ...args);
  };

  // --- Patch and Replace Logic ---
  // Handle full state updates from the server
  function replaceState(newState) {
    if (!newState || typeof newState !== "object") {
      logger.warn("replaceState called with invalid state payload");
      return;
    }

    try {
      let updatedState;
      try {
        updatedState = structuredClone(newState);
      } catch (cloneError) {
        try {
          updatedState = JSON.parse(JSON.stringify(newState));
          logger.warn("structuredClone failed, used JSON fallback", cloneError);
        } catch (jsonError) {
          logger.error("Failed to clone new state payload", {
            cloneError,
            jsonError,
          });
          updatedState = { ...newState };
        }
      }

      if (!updatedState || typeof updatedState !== "object") {
        logger.warn("replaceState received non-object after cloning");
        return;
      }

      const currentAnchorFences = state.anchor?.fences;
      const incomingAnchorFences = updatedState.anchor?.fences;
      if (Array.isArray(currentAnchorFences) && Array.isArray(incomingAnchorFences)) {
        const historyByFenceId = new Map();
        currentAnchorFences.forEach((fence) => {
          if (!fence || typeof fence.id !== "string") {
            return;
          }
          if (!Array.isArray(fence.distanceHistory) || fence.distanceHistory.length === 0) {
            return;
          }
          historyByFenceId.set(fence.id, fence.distanceHistory);
        });

        if (historyByFenceId.size > 0) {
          updatedState.anchor.fences = incomingAnchorFences.map((fence) => {
            if (!fence || typeof fence.id !== "string") {
              return fence;
            }
            const existingHistory = historyByFenceId.get(fence.id);
            if (!Array.isArray(existingHistory) || existingHistory.length === 0) {
              return fence;
            }
            if (Array.isArray(fence.distanceHistory) && fence.distanceHistory.length > existingHistory.length) {
              return fence;
            }
            return {
              ...fence,
              distanceHistory: existingHistory,
            };
          });
        }
      }

      // Preserve valid navigation position if the incoming position has null values
      const currentPos = state.navigation?.position;
      const newPos = updatedState.navigation?.position;

      if (currentPos?.latitude?.value && currentPos?.longitude?.value) {
        if (!newPos?.latitude?.value || !newPos?.longitude?.value) {
          dataLogger(
            "Will preserve current position due to missing values in update"
          );
        } else {
          dataLogger("Will update with new position data");
        }
      }

      // Preserve bluetooth data if not included in the update
      const currentBluetooth = state.bluetooth;
      const newBluetooth = updatedState.bluetooth;

      if (currentBluetooth && !newBluetooth) {
        dataLogger("Preserving bluetooth data - not included in server update");
        updatedState.bluetooth = currentBluetooth;
      } else if (currentBluetooth && newBluetooth) {
        // Let the server-provided bluetooth state win when it is present
        dataLogger("Replacing bluetooth data with server-provided state");
        updatedState.bluetooth = newBluetooth;
      }

      // Preserve anchor fences if server sends anchor state without fences
      const currentAnchor = state.anchor;
      const newAnchor = updatedState.anchor;

      if (currentAnchor && newAnchor && Array.isArray(currentAnchor.fences)) {
        if (!Array.isArray(newAnchor.fences)) {
          dataLogger("Preserving anchor fences - not included in server update");
          updatedState.anchor = { ...newAnchor, fences: currentAnchor.fences };
        }
      }

      dataLogger(`Updating ${Object.keys(updatedState).length} keys, preserving others`);

      // Update or initialize root-level keys
      Object.keys(updatedState).forEach((key) => {
        if (key === "navigation") {
          if (!state.navigation) state.navigation = {};
        } else {
          state[key] = updatedState[key];
        }
      });

      if (updatedState.navigation?.position) {
        if (!state.navigation) state.navigation = {};
        state.navigation.position = { ...updatedState.navigation.position };
        state.position = state.navigation.position;
        // Navigation position updates are now handled silently; any debug logging has been removed.
        delete updatedState.navigation.position;
      }

      Object.keys(updatedState).forEach((key) => {
        if (key !== "navigation") {
          if (key === "weather") {
            state.forecast = updatedState[key];
          } else {
            state[key] = updatedState[key];
          }
        } else if (updatedState.navigation) {
          if (!state.navigation) state.navigation = {};
          Object.keys(updatedState.navigation).forEach((navKey) => {
            if (navKey !== "position") {
              state.navigation[navKey] = updatedState.navigation[navKey];
            }
          });
        }
      });

      if (currentPos && state.navigation?.position) {
        const latChanged =
          currentPos.latitude?.value !==
          state.navigation.position.latitude?.value;
        const lonChanged =
          currentPos.longitude?.value !==
          state.navigation.position.longitude?.value;

        if (latChanged || lonChanged) {
          dataLogger("Position changed", {
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
        ...options,
      };

      // Send using stateUpdateProvider, which routes to the correct adapter
      await stateUpdateProvider.sendCommand("state", messageType, message);
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

  const cancelAnchor = async () => {
    try {
      // Request an anchor reset from the server. The server will reset its
      // internal anchor model and broadcast the updated /anchor state back
      // via state:patch/state:full-update. We do not send a full anchor
      // payload here and we do not mutate local anchor state directly.
      await stateUpdateProvider.sendCommand("state", "anchor:reset", {});
    } catch (error) {
      logger.error("Failed to send anchor:reset command", error);
    }
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
      id: generateUuid(),
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
    if (!alert.id) alert.id = generateUuid();
    if (!alert.timestamp) alert.timestamp = new Date().toISOString();
    if (!alert.status) alert.status = "active";

    // Add to active alerts
    state.alerts.active.push(alert);

    logger.info(`New alert added: ${alert.title || alert.label}`);
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

    logger.info(
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
        logger.info(`Prevented alert due to ${strategy} strategy: ${signature}`);
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

  // Evaluate if a rule condition is met using the same operator semantics
  // as the AlertRuleEditor. This works directly with rule.operator,
  // rule.threshold, and rule.secondaryThreshold.
  function evaluateRule(rule, currentValue) {
    if (!rule || !rule.enabled) return false;

    if (currentValue === null || currentValue === undefined) {
      return false;
    }

    const operator = rule.operator;
    const threshold = rule.threshold;
    const secondary = rule.secondaryThreshold;

    const opEquals =
      operator === ALERT_RULE_OPERATORS.EQUALS || operator === "EQUALS";
    const opNotEquals =
      operator === ALERT_RULE_OPERATORS.NOT_EQUALS || operator === "NOT_EQUALS";
    const opLt =
      operator === ALERT_RULE_OPERATORS.LESS_THAN || operator === "LESS_THAN";
    const opLte =
      operator === ALERT_RULE_OPERATORS.LESS_THAN_EQUALS ||
      operator === "LESS_THAN_EQUALS";
    const opGt =
      operator === ALERT_RULE_OPERATORS.GREATER_THAN ||
      operator === "GREATER_THAN";
    const opGte =
      operator === ALERT_RULE_OPERATORS.GREATER_THAN_EQUALS ||
      operator === "GREATER_THAN_EQUALS";
    const opBetween =
      operator === ALERT_RULE_OPERATORS.BETWEEN || operator === "BETWEEN";
    const opNotBetween =
      operator === ALERT_RULE_OPERATORS.NOT_BETWEEN ||
      operator === "NOT_BETWEEN";
    const opContains = operator === "CONTAINS";
    const opNotContains = operator === "NOT_CONTAINS";

    if (opEquals) {
      return currentValue === threshold;
    }

    if (opNotEquals) {
      return currentValue !== threshold;
    }

    if (opLt) {
      return Number(currentValue) < Number(threshold);
    }

    if (opLte) {
      return Number(currentValue) <= Number(threshold);
    }

    if (opGt) {
      return Number(currentValue) > Number(threshold);
    }

    if (opGte) {
      return Number(currentValue) >= Number(threshold);
    }

    if (opBetween) {
      if (
        threshold === null ||
        threshold === undefined ||
        secondary === null ||
        secondary === undefined
      ) {
        return false;
      }
      const low = Number(threshold);
      const high = Number(secondary);
      const value = Number(currentValue);
      return value >= Math.min(low, high) && value <= Math.max(low, high);
    }

    if (opNotBetween) {
      if (
        threshold === null ||
        threshold === undefined ||
        secondary === null ||
        secondary === undefined
      ) {
        return false;
      }
      const low = Number(threshold);
      const high = Number(secondary);
      const value = Number(currentValue);
      return value < Math.min(low, high) || value > Math.max(low, high);
    }

    if (opContains) {
      return String(currentValue).includes(String(threshold ?? ""));
    }

    if (opNotContains) {
      return !String(currentValue).includes(String(threshold ?? ""));
    }

    return false;
  }

  // Process alert rules for a specific data path
  function processAlertRules() {
    // Legacy function retained for backward compatibility.
    // Alert rules are now evaluated generically via a deep watcher on state.
    return;
  }

  // Resolve a dot-path like "navigation.depth.belowKeel" against the state tree
  // and return a simple value (unwrapping objects with a .value field when present).
  function getValueForPath(root, path) {
    if (!root || !path) {
      return { hasValue: false, value: null };
    }

    const parts = String(path).split(".");
    let node = root;

    for (const part of parts) {
      if (!node || typeof node !== "object" || !(part in node)) {
        return { hasValue: false, value: null };
      }
      node = node[part];
    }

    let value = node;
    if (value && typeof value === "object" && "value" in value) {
      value = value.value;
    }

    if (value === null || value === undefined || Number.isNaN(value)) {
      return { hasValue: false, value: null };
    }

    return { hasValue: true, value };
  }

  // Evaluate all alert rules against the new state, only triggering when the
  // underlying value for a rule's source path has actually changed.
  function evaluateAllAlertRules(newState, oldState) {
    if (!alertRules.value || alertRules.value.length === 0) return;

    alertRules.value.forEach((rule) => {
      if (!rule || !rule.enabled || !rule.source) return;

      const { hasValue: hasNew, value: newValue } = getValueForPath(
        newState,
        rule.source
      );
      const { hasValue: hasOld, value: oldValue } = getValueForPath(
        oldState || {},
        rule.source
      );

      if (!hasNew) return;

      // Only consider rules when the underlying value actually changed
      if (hasOld && newValue === oldValue) return;

      const isConditionMet = evaluateRule(rule, newValue);
      if (!isConditionMet) return;

      const alert = {
        id: `alert_${Date.now()}`,
        ruleId: rule.id,
        message: rule.message || `Alert: ${rule.source} condition met`,
        severity: rule.alertLevel || rule.severity || "WARNING",
        timestamp: new Date().toISOString(),
        data: {
          path: rule.source,
          value: newValue,
          threshold: rule.threshold,
          secondaryThreshold: rule.secondaryThreshold,
          operator: rule.operator,
        },
      };

      addAlert(alert);
    });
  }

  // Watch the entire state object deeply and evaluate all alert rules
  // whenever any part of the state changes. This aligns alert rule
  // evaluation with how anchor-related alerts respond to state updates.
  watch(
    () => state,
    (newState, oldState) => {
      if (!alertRules.value || alertRules.value.length === 0) return;
      evaluateAllAlertRules(newState, oldState || {});
    },
    { deep: true }
  );

  const hasActiveAlerts = computed(() => state.alerts.active?.length > 0);
  const pendingAlertCount = computed(
    () => state.alerts.processingQueue?.length || 0
  );

  // Evaluate a single rule immediately against the current store state and,
  // if the condition is met, create an alert. This is primarily used when a
  // rule is first created or updated so the user can immediately see the
  // effect of a rule whose condition is already true.
  function evaluateRuleNow(rule) {
    if (!rule || !rule.enabled || !rule.source) return null;

    const { hasValue, value } = getValueForPath(state, rule.source);

    console.log("[ALERT][evaluateRuleNow]", {
      ruleId: rule.id,
      name: rule.name,
      source: rule.source,
      hasValue,
      value,
      operator: rule.operator,
      threshold: rule.threshold,
      secondaryThreshold: rule.secondaryThreshold,
    });

    if (!hasValue) return null;

    const isConditionMet = evaluateRule(rule, value);

    console.log("[ALERT][evaluateRuleNow] condition result", {
      ruleId: rule.id,
      isConditionMet,
    });

    if (!isConditionMet) return null;

    const alert = {
      id: `alert_${Date.now()}`,
      ruleId: rule.id,
      message: rule.message || `Alert: ${rule.source} condition met`,
      severity: rule.alertLevel || rule.severity || "WARNING",
      timestamp: new Date().toISOString(),
      data: {
        path: rule.source,
        value,
        threshold: rule.threshold,
        secondaryThreshold: rule.secondaryThreshold,
        operator: rule.operator,
      },
    };

    const added = addAlert(alert);

    console.log("[ALERT][evaluateRuleNow] alert added", {
      ruleId: rule.id,
      alertId: added?.id,
      activeCount: state.alerts?.active?.length,
    });

    return added;
  }

  // --- Relay/Connection Logic ---
  function switchDataSource(mode) {
    stateUpdateProvider.switchSource(mode);
  }

  /**
   * Ensure parent paths exist before applying patches
   * Similar to server's StateManager implementation
   * @param {Object} state - The state object
   * @param {Array} patches - Array of JSON Patch operations
   */
  function ensureParentPaths(state, patches) {
    patches.forEach(operation => {
      if (operation.op === 'add' || operation.op === 'replace') {
        const pathParts = operation.path.substring(1).split('/');
        
        let current = state;
        // Go through all parts except the last one (which is the property to set)
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          if (!current[part] || typeof current[part] !== 'object') {
            // Create parent object if it doesn't exist or isn't an object
            current[part] = {};
            dataLogger(`Created parent path: ${part} for ${operation.path}`);
          }
          current = current[part];
        }
      }
    });
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
      // Ensure all parent paths exist before applying patches
      ensureParentPaths(state, patches);
      
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

  // --- Subscriptions and Watchers ---
  stateUpdateProvider.subscribe((evt) => {
    // Only log non-routine event types to reduce console noise
    // Uncomment for debugging:
    // if (evt.type !== 'state:patch' && evt.type !== 'state:full-update') {
    //   console.log(`[StateDataStore] Received event type: ${evt.type}`, evt.data ? { dataKeys: Object.keys(evt.data) } : {});
    // }
    
    // Check for tide:update and weather:update specifically
    if (evt.type === 'tide:update') {
      if (!state.tides) state.tides = {};
      // Store tide data in state
      if (evt.data) {
        state.tides = { ...state.tides, ...evt.data };
        dataLogger('Updated tides data', { keys: Object.keys(evt.data) });
      }
      return;
    }
    
    if (evt.type === 'weather:update') {
      if (!state.forecast) state.forecast = {};
      
      // Store weather data in state
      if (evt.data) {
        try {
          // Extract the weather data, ensuring we have the expected structure
          const weatherData = evt.data;
          
          // Update the forecast state with the new data
          state.forecast = { ...state.forecast, ...weatherData };
          
          // Log successful update
          dataLogger('Updated forecast data', { 
            keys: Object.keys(weatherData),
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          logger.error('Error processing weather update:', error.message || error, 
            'Data keys:', evt.data ? Object.keys(evt.data).join(', ') : 'none');
        }
      } else {
        logger.warn('Received weather:update event with no data');
      }
      return;
    }
    
    // Only process state update events we care about
    if (!['state:patch', 'state:full-update', 'patch-update', 'full-update'].includes(evt.type)) {
      return; // Silently ignore other event types
    }

    // Log basic event info at debug level
    dataLogger(`[StateDataStore] Processing ${evt.type} event`);

    // Handle wind data updates from patch events
    if (evt.type === "state:patch" && Array.isArray(evt.data)) {
      const windPatches = evt.data.filter((patch) =>
        typeof patch.path === "string" && patch.path.startsWith("/navigation/wind/")
      );

      if (windPatches.length > 0) {
        dataLogger("Processing wind data from patch:", windPatches);

        if (!state.navigation) state.navigation = {};
        if (!state.navigation.wind) state.navigation.wind = {};

        windPatches.forEach((patch) => {
          const pathParts = patch.path.split("/").filter(Boolean);
          if (pathParts.length < 4) {
            return;
          }

          const [root, section, windType, property, ...rest] = pathParts;

          if (root !== "navigation" || section !== "wind") {
            return;
          }

          if (windType !== "apparent" && windType !== "true") {
            return;
          }

          if (!state.navigation.wind[windType]) {
            state.navigation.wind[windType] = {};
          }

          if (!property) {
            return;
          }

          // Ensure the property container exists when we have nested paths
          if (!state.navigation.wind[windType][property] || typeof state.navigation.wind[windType][property] !== "object") {
            state.navigation.wind[windType][property] = {};
          }

          const target = state.navigation.wind[windType][property];

          if (rest.length === 0) {
            state.navigation.wind[windType][property] = patch.value;
            dataLogger(`Updated wind.${windType}.${property} =`, patch.value);
            return;
          }

          let current = target;
          for (let i = 0; i < rest.length - 1; i += 1) {
            const key = rest[i];
            if (!current[key] || typeof current[key] !== "object") {
              current[key] = {};
            }
            current = current[key];
          }

          const finalKey = rest[rest.length - 1];
          current[finalKey] = patch.value;
          dataLogger(`Updated wind.${windType}.${property}.${rest.join(".")} =`, patch.value);
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
      dataLogger("Full state payload received", {
        eventType: evt.type,
        payload: evt.data,
        timestamp: new Date().toISOString(),
      });
      dataLogger("Applying full state update", {
        eventType: evt.type,
        dataKeys: Object.keys(evt.data || {}),
        timestamp: new Date().toISOString()
      });
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
      if (
        typeof newPos?.latitude?.value !== "number" ||
        typeof newPos?.longitude?.value !== "number" ||
        Number.isNaN(newPos.latitude.value) ||
        Number.isNaN(newPos.longitude.value)
      ) {
        return;
      }

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

        // Add a breadcrumb on any movement
        if (distance > 0) {
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
  const preferencesStore = usePreferencesStore();
  const serverDefaultUnitPreferences = { ...UNIT_PRESETS.IMPERIAL };
  const unitPreferences = computed(() => {
    const current = preferencesStore.rawPreferences;
    if (current && Object.keys(current).length > 0) {
      return current;
    }
    return serverDefaultUnitPreferences;
  });

  // Load unit preferences
  async function loadUnitPreferences() {
    try {
      const loaded = unitPreferences.value;
      logger.debug(
        "[StateDataStore] Loaded unit preferences:",
        loaded
      );
      return loaded;
    } catch (error) {
      logger.error("[StateDataStore] Failed to load unit preferences:", error);
      return serverDefaultUnitPreferences;
    }
  }

  // Update unit preferences
  async function updateUnitPreference(unitType, unit) {
    try {
      const updatedPrefs = await setUnitPreference(unitType, unit);
      preferencesStore.applyServerPreferences(updatedPrefs);
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
      preferencesStore.applyServerPreferences(updatedPrefs);
      await updateUnitsToPreferences();
      return updatedPrefs;
    } catch (error) {
      logger.error("[StateDataStore] Failed to update unit preset:", error);
      throw error;
    }
  }

  // Convert all values in state to match user preferences
  async function updateUnitsToPreferences() {
    // Apply conversions to the state
    convertStateToPreferredUnits(state);

    return unitPreferences.value;
  }

  // Convert a specific state object to preferred units
  function convertStateToPreferredUnits(stateObj) {
    const currentUnitPreferences = unitPreferences.value;
    if (!currentUnitPreferences || !stateObj) return;

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

    // True wind values are already normalized server-side; leave untouched
  }

  // Helper function to convert anchor values
  function convertAnchorValues(anchorObj) {
    if (!anchorObj) return anchorObj;
    
    // Deep clone to avoid modifying the original
    const converted = { ...anchorObj };
    
    // Convert rode length
    if (converted.rode && typeof converted.rode === 'object') {
      if (converted.rode.length !== undefined) {
        const unitType = state.unitPreferences?.distance || 'feet';
        converted.rode = {
          ...converted.rode,
          length: UnitConversion.convertDistance(
            converted.rode.length,
            'feet',
            unitType
          ),
          units: unitType
        };
      }
    }
    
    // Convert depth if present
    if (converted.depth !== undefined) {
      const unitType = state.unitPreferences?.depth || 'feet';
      converted.depth = UnitConversion.convertDistance(
        converted.depth,
        'feet',
        unitType
      );
      converted.depthUnits = unitType;
    }
    
    return converted;
  }
  
  /**
   * Update forecast data in the state
   * @param {Object} forecastData - The forecast data to update
   */
  function updateForecastData(forecastData) {
    if (!forecastData) {
      logger.warn('Received updateForecastData call with no data');
      return;
    }
    
    try {
      // Initialize forecast object if it doesn't exist
      if (!state.forecast) state.forecast = {};
      
      // Update the forecast state with the new data
      state.forecast = { ...state.forecast, ...forecastData };
    } catch (error) {
      logger.error('Error in updateForecastData:', error.message || error);
    }
  }
  
  /**
   * Update tide data in the state
   * @param {Object} tideData - The tide data to update
   */
  function updateTideData(tideData) {
    if (!tideData) {
      logger.warn('Received updateTideData call with no data');
      return;
    }
    
    try {
      // Initialize tides object if it doesn't exist
      if (!state.tides) state.tides = {};
      
      // Update the tides state with the new data
      state.tides = { ...state.tides, ...tideData };
      
      // Log successful update
      dataLogger('Updated tide data via updateTideData', { 
        keys: Object.keys(tideData),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in updateTideData:', error.message || error);
    }
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
    });

  // Return the store object with all functions and state
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
    evaluateRuleNow,
    processAlertRules,

    // Unit Preferences Management
    unitPreferences,
    loadUnitPreferences,
    updateUnitPreference,
    updateUnitPreset,
    updateUnitsToPreferences,
    
    // Weather and Tide Data Management
    updateForecastData,
    updateTideData,
  };
});
