/**
 * StateDataStore - Pinia store adapter for the unified StateData
 *
 * This store provides a Vue-friendly interface to the unified StateData structure,
 * making it easy to use in Vue components with reactivity.
 */

import { defineStore } from "pinia";
import { stateUpdateProvider } from "../services/stateUpdateProvider";
import { ref, computed, onUnmounted, watch } from "vue";

/**
 * Calculate the distance (in meters) between two lat/lon points (Haversine formula)
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null || lon1 == null ||
    lat2 == null || lon2 == null
  ) return null;
  const R = 6371000; // meters
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Compute anchorLocation from anchorDropLocation, rode, bearing, and depth
 * Returns a fresh object each time
 */
export function getComputedAnchorLocation(anchorDropLocation, rode, bearing, depth, calculateDestinationLatLon) {
  // If missing data, return drop location as anchor location
  if (!anchorDropLocation?.latitude || !anchorDropLocation?.longitude || !rode || !bearing) {
    return { ...anchorDropLocation, distanceFromDropLocation: 0 };
  }
  // Calculate horizontal rode (exclude depth)
  let horizontalRode = rode;
  if (depth && rode > depth) {
    horizontalRode = Math.sqrt(rode * rode - depth * depth);
  }
  // Calculate anchor location from drop point, distance, and bearing
  const dest = calculateDestinationLatLon(
    anchorDropLocation.latitude,
    anchorDropLocation.longitude,
    horizontalRode,
    bearing
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
    depth: depth ?? null
  };
}

import { relayConnectionAdapter } from "../services/relayConnectionAdapter.js";
import { applyPatch } from "fast-json-patch";
import { connectionBridge } from "../services/connectionBridge";
import { EVENTS } from "../../shared/constants.js";
import { useDirectPiniaSync } from '../services/useDirectPiniaSync';
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

console.log('[PiniaStore] Store initialized');

// --- Pinia Store Export ---
export const useStateDataStore = defineStore("stateData", () => {
  // Subscribe to state updates from the provider (now has access to replaceState)
  stateUpdateProvider.subscribe((evt) => {
    console.log('[PiniaStore] Received update from stateUpdateProvider:', evt);
    if (evt.type === 'full-state' || evt.type === 'state-update') {
      replaceState(evt.data);
    }
  });
  const unsubs = [];
  // Cleanup function for listeners. Call this manually when needed.
  function cleanup() {
    unsubs.forEach((fn) => fn());
  }

  // --- Utility: replaceState ---
  function replaceState(newState) {
    // Map navigation (move wind to environment)
    if (newState.navigation && navigationState) {
      const { wind, value, ...navRest } = newState.navigation;
      navigationState.value = navRest;
      if (wind && environmentState?.value?.weather) {
        environmentState.value.weather.wind = wind;
      }
    }
    // Map anchor
    if (newState.anchor && anchorState) {
      let updatedAnchor = { ...anchorState.value, ...newState.anchor };
      if (updatedAnchor.anchorDropLocation) {
        const adl = updatedAnchor.anchorDropLocation;
        // Normalize lat/long to latitude/longitude
        if ('lat' in adl || 'long' in adl) {
          updatedAnchor.anchorDropLocation = {
            ...adl,
            latitude: adl.lat ?? adl.latitude ?? null,
            longitude: adl.long ?? adl.longitude ?? null,
          };
        }
      }
      anchorState.value = updatedAnchor;
      console.log("Anchor state updated:", anchorState.value);
    }
    // Map environment (excluding wind)
    if (newState.environment && environmentState) {
      const { weather, ...envRest } = newState.environment;
      environmentState.value = envRest;
      if (weather) {
        environmentState.value.weather = weather;
      }
    }
    // Map alerts
    if (newState.alerts && alertsState) {
      alertsState.value = newState.alerts;
    }
  }

  // --- Utility: applyStatePatch ---
  function applyStatePatch(patch) {
    // Remap /navigation/wind/... ops to /environment/weather/wind/...
    const remappedPatch = patch.map((op) => {
      if (op.path.startsWith("/navigation/wind/")) {
        return {
          ...op,
          path: op.path.replace(
            "/navigation/wind/",
            "/environment/weather/wind/"
          ),
        };
      }
      return op;
    });
    // Patch each state domain
    [
      { relayKey: "navigation", ref: navigationState },
      { relayKey: "anchor", ref: anchorState },
      { relayKey: "environment", ref: environmentState },
      { relayKey: "alerts", ref: alertsState },
    ].forEach(({ relayKey, ref }) => {
      const refVal = ref?.value;
      if (!refVal) return;
      const filteredPatch = remappedPatch.filter(
        (op) =>
          op.path.startsWith(`/${relayKey}`) ||
          (relayKey === "environment" &&
            op.path.startsWith("/environment/weather/wind/"))
      );

      if (filteredPatch.length > 0) {
        const adjustedPatch = filteredPatch.map((op) => ({
          ...op,
          path: op.path.replace(`/${relayKey}`, "") || "/",
        }));
        const result = applyPatch(refVal, adjustedPatch, true);
        ref.value = result.newDocument;
      }
    });
  }

  // State
  const navigationState = ref({
    position: {
      latitude: null,
      longitude: null,
      altitude: null,
      timestamp: null,
      source: null,
    },
    speed: null,
    course: {
      heading: null,
      cog: null,
      variation: null,
    },
    depth: {
      belowTransducer: null,
      belowKeel: null,
      belowSurface: null,
      timestamp: null,
    },
  });

  const anchorState = ref({
    // Anchor drop location
    anchorDropLocation: {
      latitude: null,
      longitude: null,
      time: null,
      depth: null,
      distanceFromCurrentLocation: 0,
      distanceFromDropLocation: 0,
      originalBearing: 0,
    },
    anchorLocation: {
      latitude: null,
      longitude: null,
      time: null,
      depth: null,
      distanceFromCurrentLocation: 0,
      distanceFromDropLocation: 0,
      originalBearing: 0,
      bearing: 0,
    },
    aisTargets: [],
    rode: {
      amount: 0,
      units: "m",
    },
    dragging: false,
    anchorDeployed: false, 
    criticalRange: {
      r: 0,
      units: "m",
    },
    warningRange: {
      r: 0,
      units: "m",
    },
    history: [], // breadcrumbs
    useDeviceGPS: true,
  });

  const environmentState = ref({
    weather: {
      temperature: {
        air: null,
        water: null,
      },
      wind: {
        speedTrue: null, // Wind speed in knots
        angleTrue: null, // Wind angle in degrees
        direction: null, // True wind direction
        speedApparent: null, // Apparent wind speed
        angleApparent: null, // Apparent wind angle
        reference: null, // Reference for wind measurements (true, apparent, etc.)
        timestamp: null,
        source: null,
      },
    },
    current: {
      speed: 0,
      angle: 0,
      updated: false,
      speedUnits: "kts",
      angleUnits: "°",
    },
    tide: {
      updated: false,
      low: 0,
      high: 0,
      units: "ft",
    },
  });

  const alertsState = ref({
    definitions: [],
    active: [],
    isRunning: false,
    processingQueue: [],
  });

  const lastUpdate = ref(null);
  const error = ref(null);
  const isConnected = ref(false);
  const connectionSource = ref(null);
  const vpsConnectionStatus = ref({
    status: "disconnected",
    lastError: null,
    lastUpdate: null,
    messageCount: 0,
  });

  // Cleanup function for listeners. Call this manually when needed.
  function cleanup() {
    unsubs.forEach((fn) => fn());
  }

  // --- Utility: replaceState ---
  function replaceState(newState) {
    // Map navigation (move wind to environment)
    if (newState.navigation && navigationState) {
      const { wind, value, ...navRest } = newState.navigation;
      navigationState.value = navRest;
      if (wind && environmentState?.value?.weather) {
        environmentState.value.weather.wind = wind;
      }
    }
    // Map anchor
    if (newState.anchor && anchorState) {
      anchorState.value = newState.anchor;
    }
    // Map environment (excluding wind)
    if (newState.environment && environmentState) {
      const { weather, ...envRest } = newState.environment;
      environmentState.value = envRest;
      if (weather) {
        environmentState.value.weather = weather;
      }
    }
    // Map alerts
    if (newState.alerts && alertsState) {
      alertsState.value = newState.alerts;
    }
  }

  // --- Utility: applyStatePatch ---
  function applyStatePatch(patch) {
    // Remap /navigation/wind/... ops to /environment/weather/wind/...
    const remappedPatch = patch.map((op) => {
      if (op.path.startsWith("/navigation/wind/")) {
        return {
          ...op,
          path: op.path.replace(
            "/navigation/wind/",
            "/environment/weather/wind/"
          ),
        };
      }
      return op;
    });
    // Patch each state domain
    [
      { relayKey: "navigation", ref: navigationState },
      { relayKey: "anchor", ref: anchorState },
      { relayKey: "environment", ref: environmentState },
      { relayKey: "alerts", ref: alertsState },
    ].forEach(({ relayKey, ref }) => {
      const refVal = ref?.value;
      if (!refVal) return;
      const filteredPatch = remappedPatch.filter(
        (op) =>
          op.path.startsWith(`/${relayKey}`) ||
          (relayKey === "environment" &&
            op.path.startsWith("/environment/weather/wind/"))
      );

      if (filteredPatch.length > 0) {
        const adjustedPatch = filteredPatch.map((op) => ({
          ...op,
          path: op.path.replace(`/${relayKey}`, "") || "/",
        }));
        const result = applyPatch(refVal, adjustedPatch, true);
        ref.value = result.newDocument;
      }
    });
  }

  // --- Alert Getters ---
  const hasActiveAlerts = computed(() => alertsState.value.active?.length > 0);
  const pendingAlertCount = computed(() => alertsState.value.processingQueue?.length || 0);

  // Compatibility layer for AnchorView
  const anchorData = computed(() => ({
    // All anchor fields are now a direct mapping from anchorState
    ...anchorState.value,
    // Optionally, preserve navigation/environment/tide as before
    position: anchorState.value.position,
    wind: anchorState.value.wind,
    current: anchorState.value.current,
    tide: anchorState.value.tide,
    aisTargets: anchorState.value.aisTargets,
    rode: anchorState.value.rode,
    anchorDropLocation: anchorState.value.anchorDropLocation,
    anchorLocation: anchorState.value.anchorLocation,
    criticalRange: anchorState.value.criticalRange,
    warningRange: anchorState.value.warningRange,
    dragging: anchorState.value.dragging,
    anchorDeployed: anchorState.value.anchorDeployed,
    history: anchorState.value.history,
    useDeviceGPS: anchorState.value.useDeviceGPS,
    // If you want to preserve the previous navigation/environment/tide structure, you can add them here as well.
  }));

  // Computed anchor location (reactive, always up-to-date)
  const anchorLocation = computed(() => {
    const anchorDropLocation = anchorState.value.anchorDropLocation;
    const rode = anchorState.value.rode?.amount;
    const bearing = anchorState.value.anchorLocation?.originalBearing;
    const depth = navigationState.value.depth?.belowTransducer;
    // You must provide your calculateDestinationLatLon function here (import or define above)
    return getComputedAnchorLocation(anchorDropLocation, rode, bearing, depth, calculateDestinationLatLon);
  });

  const currentPosition = computed(() => {
    const pos = navigationState.value.position;
    if (!pos.latitude || !pos.longitude) {
      console.warn("[STATE] No valid position available");
      return null;
    }
    return {
      latitude: pos.latitude,
      longitude: pos.longitude,
      timestamp: pos.timestamp,
      source: pos.source,
    };
  });

  const anchorPosition = computed(() => {
    return {
      latitude: anchorState.value.position.latitude,
      longitude: anchorState.value.position.longitude,
    };
  });

  const isDragging = computed(() => anchorState.value.status === "dragging");

  // Actions
  async function init() {
    try {
      // Determine connection mode
      const connectionMode = import.meta.env.VITE_CONNECTION_MODE || "relay";
      console.log(
        `[StateDataStore] Initializing with connection mode: ${connectionMode}`
      );

      // If using relay mode, connect via relay
      if (connectionMode === "relay") {
        await initRelayMode();
      } else {
        // Use direct Pinia sync for direct mode
        useDirectPiniaSync();
        // Otherwise use the standard stateData approach
        const { stateData } = await ensureStateDataLoaded();
        isConnected.value = true;

        // Set up event listeners
        const updateNavigation = () => {
          navigationState.value = JSON.parse(JSON.stringify(stateData.get('navigation')));
          lastUpdate.value = Date.now();
        };

        const updateAnchor = () => {
          anchorState.value = JSON.parse(JSON.stringify(stateData.get('anchor')));
          lastUpdate.value = Date.now();
        };

        const updateEnvironment = () => {
          const env = stateData.get("environment");
          if (!env) {
            // Optionally: set environmentState.value to a default/empty state
            return;
          }
          environmentState.value = JSON.parse(JSON.stringify(env));
          lastUpdate.value = Date.now();
        };

        const updateAlerts = () => {
          const alerts = stateData.get("alerts");
          if (!alerts) {
            // Optionally: set alertsState.value to a default/empty state
            return;
          }
          alertsState.value = JSON.parse(JSON.stringify(alerts));
          lastUpdate.value = Date.now();
        };

        // Subscribe to state changes
        stateData.on(EVENTS.PATH_CHANGED, (data) => {
          if (data.path.startsWith("navigation")) {
            updateNavigation();
          } else if (data.path.startsWith("anchor")) {
            updateAnchor();
          } else if (data.path.startsWith("environment")) {
            updateEnvironment();
          } else if (data.path.startsWith("alerts")) {
            updateAlerts();
          }
        });

        // Initial data load
        updateNavigation();
        updateAnchor();
        updateEnvironment();
        updateAlerts();
      }

      // Export or return cleanup if you want to call it from a component's onUnmounted.
    } catch (error) {
      console.error("Error initializing StateDataStore:", error);
      error.value = error.message;

      // Initialize with default local data for fallback
      navigationState.value.position = {
        latitude: null,
        longitude: null,
        timestamp: new Date().toISOString(),
        source: "local",
      };

      isConnected.value = true;
    }
  }

  function waitForValidPosition() {
    return new Promise((resolve) => {
      // Check immediately
      const pos = navigationState.value.position;
      if (
        pos &&
        typeof pos.latitude === "number" &&
        typeof pos.longitude === "number" &&
        pos.latitude !== 0 &&
        pos.longitude !== 0
      ) {
        resolve({
          latitude: pos.latitude,
          longitude: pos.longitude,
          timestamp: pos.timestamp || new Date().toISOString(),
          source: pos.source,
        });
        return;
      }
      // Otherwise, watch until valid
      const stop = watch(
        () => navigationState.value.position,
        (newPos) => {
          if (
            newPos &&
            typeof newPos.latitude === "number" &&
            typeof newPos.longitude === "number" &&
            newPos.latitude !== 0 &&
            newPos.longitude !== 0
          ) {
            stop();
            resolve({
              latitude: newPos.latitude,
              longitude: newPos.longitude,
              timestamp: newPos.timestamp,
              source: newPos.source,
            });
          }
        },
        { immediate: false }
      );
    });
  }

  /**
   * Initialize the store in relay mode
   * This connects to the relay server instead of directly to SignalK
   */
  async function initRelayMode() {
    switchDataSource("relay");
    try {
      console.log("[StateDataStore] Initializing relay mode");

      // Connect to the relay server
      console.log("[STATEDATA-RELAY] About to connect to relay");
      await relayConnectionAdapter.connect();
      console.log("[STATEDATA-RELAY] Connected to relay");
      isConnected.value = true;
      connectionSource.value = "vps";

      // Request the full state from the relay server after connecting
      try {
        const boatId = localStorage.getItem("activeBoatId");
        // console.log('[STATEDATA-RELAY] Preparing to send get-full-state. BoatId:', boatId);
        if (relayConnectionAdapter.send) {
          // console.log('[STATEDATA-RELAY] relayConnectionAdapter.send is available, sending...');
          relayConnectionAdapter.send(
            JSON.stringify({
              type: "get-full-state",
              boatId,
            })
          );
          // console.log('[STATEDATA-RELAY] Sent get-full-state directly:', boatId);
        } else {
          console.warn(
            "[STATEDATA-RELAY] relayConnectionAdapter.send is not available"
          );
        }
      } catch (err) {
        console.error("[STATEDATA-RELAY] Failed to request full state:", err);
      }

      // Listen for the full-state message and update the unified state
      // Global logger for all messages from the relay (for debugging)
      if (relayConnectionAdapter.on) {
        relayConnectionAdapter.on("message", (msg) => {
          console.log("[CLIENT][RAW MESSAGE]", msg);
        });
      }

      relayConnectionAdapter.on("full-state", async (msg) => {
        try {
          console.log(
            "[CLIENT] Received full-state message:",
            JSON.stringify(msg, null, 2)
          );
          const { stateData } = await ensureStateDataLoaded();
          if (msg && msg.data) {
            // Overwrite the unified stateData object (reactively)
            Object.keys(stateData).forEach((key) => {
              // Remove old keys not present in new state
              if (!(key in msg.data)) delete stateData[key];
            });
            Object.assign(stateData, msg.data);
            lastUpdate.value = Date.now();
            console.log(
              "[STATEDATA-RELAY] Full state received and applied:",
              msg.data
            );
          } else {
            console.warn(
              "[STATEDATA-RELAY] Received full-state without data:",
              msg
            );
          }
        } catch (err) {
          console.error("[STATEDATA-RELAY] Failed to apply full-state:", err);
        }
      });

      // Set up connection status listener
      relayConnectionAdapter.on("connection-status", (status) => {
        console.log(
          "[STATEDATA-RELAY] Connection status update:",
          JSON.stringify(status)
        );
        vpsConnectionStatus.value = {
          ...vpsConnectionStatus.value,
          status: status.status,
          lastError: status.lastError,
          lastUpdate: Date.now(),
        };
      });

      // Listen for unified state-update (JSON patch) messages from the relay
      relayConnectionAdapter.on("state-update", async (msg) => {
        try {
          // Ensure StateData is loaded
          const { stateData } = await ensureStateDataLoaded();
          if (Array.isArray(msg.data)) {
            // Apply JSON patch to the unified state
            applyPatch(stateData, msg.data, false);
            lastUpdate.value = Date.now();
            vpsConnectionStatus.value.messageCount++;
            vpsConnectionStatus.value.lastUpdate = Date.now();
            console.log(
              "[STATEDATA-RELAY] Applied JSON patch to unified state:",
              msg.data
            );
          } else {
            console.warn(
              "[STATEDATA-RELAY] state-update received without array data:",
              msg
            );
          }
        } catch (err) {
          console.error(
            "[STATEDATA-RELAY] Failed to apply state-update patch:",
            err
          );
        }
      });

      // Set up event listeners for navigation data
      relayConnectionAdapter.on("nav-position", (data) => {
        console.log("[STATEDATA-RELAY] Received nav-position event");
        console.log("[STATEDATA-RELAY] Raw data type:", typeof data);
        console.log("[STATEDATA-RELAY] Raw data value:", data);
        if (data) {
          console.log("[STATEDATA-RELAY] Data keys:", Object.keys(data));
          if (typeof data === "object") {
            for (const key in data) {
              console.log(`[STATEDATA-RELAY] Data[${key}] =`, data[key]);
            }
          }
        }

        // Check for nested data structure (data.data.position)
        if (data && data.data && data.data.position) {
          console.log(
            "[STATEDATA-RELAY] Received position update (nested format):",
            JSON.stringify(data.data.position)
          );
          navigationState.value.position = {
            latitude: data.data.position.latitude,
            longitude: data.data.position.longitude,
            altitude: data.data.position.altitude,
            timestamp: data.data.timestamp || new Date().toISOString(),
            source: "relay",
          };
          lastUpdate.value = Date.now();
          vpsConnectionStatus.value.messageCount++;
          vpsConnectionStatus.value.lastUpdate = Date.now();
          console.log(
            "[STATEDATA-RELAY] Updated navigation state:",
            JSON.stringify(navigationState.value.position)
          );
        }
        // Check for the original expected format (data.position) for backward compatibility
        else if (data && data.position) {
          console.log(
            "[STATEDATA-RELAY] Received position update:",
            JSON.stringify(data.position)
          );
          navigationState.value.position = {
            latitude: data.position.latitude,
            longitude: data.position.longitude,
            altitude: data.position.altitude,
            timestamp: data.timestamp || new Date().toISOString(),
            source: "relay",
          };
          lastUpdate.value = Date.now();
          vpsConnectionStatus.value.messageCount++;
          vpsConnectionStatus.value.lastUpdate = Date.now();
          console.log(
            "[STATEDATA-RELAY] Updated navigation state:",
            JSON.stringify(navigationState.value.position)
          );
        } else {
          console.warn(
            "[STATEDATA-RELAY] Received nav-position event but position data is missing or invalid"
          );
        }
      });

      // Listen for environment data (wind)
      relayConnectionAdapter.on("env-wind", (data) => {
        console.log("[STATEDATA-RELAY] Received env-wind event");
        console.log("[STATEDATA-RELAY] Wind data:", JSON.stringify(data));

        // Dump the current environment state before any updates
        console.log(
          "[STATEDATA-RELAY] Current environment state BEFORE update:",
          JSON.stringify(environmentState.value.weather.wind)
        );

        if (data && data.wind) {
          // Create a complete wind data object with all properties
          const mappedWindData = {
            // True wind data
            speedTrue:
              data.wind.speedTrue !== undefined
                ? data.wind.speedTrue
                : data.wind.speed,
            angleTrue:
              data.wind.angleTrue !== undefined
                ? data.wind.angleTrue
                : data.wind.angle,
            direction:
              data.wind.direction !== undefined ? data.wind.direction : null,

            // Apparent wind data
            speedApparent:
              data.wind.speedApparent !== undefined
                ? data.wind.speedApparent
                : null,
            angleApparent:
              data.wind.angleApparent !== undefined
                ? data.wind.angleApparent
                : null,

            // Metadata
            reference: data.wind.reference || "apparent",
            timestamp: data.timestamp || new Date().toISOString(),
            source: "relay",
          };

          // Update the environment state with the mapped wind data
          environmentState.value.weather.wind = {
            ...environmentState.value.weather.wind,
            ...mappedWindData,
          };

          console.log(
            "[STATEDATA-RELAY] Updated wind data:",
            JSON.stringify(environmentState.value.weather.wind)
          );
          console.log(
            "[STATEDATA-RELAY] Environment state AFTER wind update:",
            JSON.stringify(environmentState.value.weather)
          );
          lastUpdate.value = Date.now();
          vpsConnectionStatus.value.messageCount++;
          vpsConnectionStatus.value.lastUpdate = Date.now();
        }
      });

      // Listen for depth data
      relayConnectionAdapter.on("env-depth", (data) => {
        console.log("[STATEDATA-RELAY] Received env-depth event");
        console.log("[STATEDATA-RELAY] Depth data:", JSON.stringify(data));

        if (data && data.depth) {
          // Update the navigation state with depth data
          navigationState.value.depth = {
            ...navigationState.value.depth,
            ...data.depth,
            timestamp: data.timestamp || new Date().toISOString(),
            source: "relay",
          };

          console.log(
            "[STATEDATA-RELAY] Updated depth data:",
            JSON.stringify(navigationState.value.depth)
          );
          lastUpdate.value = Date.now();
          vpsConnectionStatus.value.messageCount++;
          vpsConnectionStatus.value.lastUpdate = Date.now();
        }
      });

      // Listen for environment data (temperature)
      relayConnectionAdapter.on("env-temperature", (data) => {
        console.log("[STATEDATA-RELAY] Received env-temperature event");
        console.log("[STATEDATA-RELAY] Temperature data:", data);

        if (data && data.temperature) {
          // Update the environment state with temperature data
          environmentState.value.weather.temperature = {
            ...environmentState.value.weather.temperature,
            ...data.temperature,
            timestamp: data.timestamp || new Date().toISOString(),
            source: "relay",
          };

          console.log(
            "[STATEDATA-RELAY] Updated temperature data:",
            environmentState.value.weather.temperature
          );
          lastUpdate.value = Date.now();
          vpsConnectionStatus.value.messageCount++;
          vpsConnectionStatus.value.lastUpdate = Date.now();
        }
      });

      // Listen for general environment data
      relayConnectionAdapter.on("environment", (data) => {
        console.log("[STATEDATA-RELAY] Received environment event");
        console.log("[STATEDATA-RELAY] Environment data:", data);

        // Process any environment data that wasn't handled by specific handlers
        if (data) {
          // Update relevant parts of the environment state
          if (data.weather) {
            environmentState.value.weather = {
              ...environmentState.value.weather,
              ...data.weather,
              timestamp: data.timestamp || new Date().toISOString(),
              source: "relay",
            };
          }

          lastUpdate.value = Date.now();
          vpsConnectionStatus.value.messageCount++;
          vpsConnectionStatus.value.lastUpdate = Date.now();
        }
      });

      // Also listen for unified navigation data format
      relayConnectionAdapter.on("navigation", (data) => {
        console.log(
          "[STATEDATA-RELAY] Received navigation event with data:",
          JSON.stringify(data)
        );
        // Check if this contains position data
        // First check the format that's coming from the relay server (data.data.position)
        if (data && data.data && data.data.position) {
          console.log(
            "[STATEDATA-RELAY] Extracting position from relay data format"
          );
          navigationState.value.position = {
            latitude: data.data.position.latitude,
            longitude: data.data.position.longitude,
            altitude: data.data.position.altitude || 0,
            timestamp: data.data.timestamp || new Date().toISOString(),
            source: "relay",
          };
          lastUpdate.value = Date.now();
          vpsConnectionStatus.value.messageCount++;
          vpsConnectionStatus.value.lastUpdate = Date.now();
        }
        // Also check the original expected format (data.position) for backward compatibility
        else if (data && data.position) {
          console.log(
            "[STATEDATA-RELAY] Extracting position from unified navigation data"
          );
          navigationState.value.position = {
            latitude: data.position.latitude,
            longitude: data.position.longitude,
            altitude: data.position.altitude || 0,
            timestamp: data.timestamp || new Date().toISOString(),
            source: "relay",
          };
          lastUpdate.value = Date.now();
          vpsConnectionStatus.value.messageCount++;
          vpsConnectionStatus.value.lastUpdate = Date.now();
        }
      });

      relayConnectionAdapter.on("nav-instruments", (data) => {
        console.log("[STATEDATA-RELAY] Received nav-instruments event");
        console.log(
          "[STATEDATA-RELAY] Raw instruments data type:",
          typeof data
        );
        console.log(
          "[STATEDATA-RELAY] Raw instruments data value:",
          JSON.stringify(data)
        );

        // Dump the current state before any updates
        console.log(
          "[STATEDATA-RELAY] Current navigation state BEFORE update:",
          JSON.stringify(navigationState.value)
        );

        if (data) {
          console.log(
            "[STATEDATA-RELAY] Instruments data keys:",
            Object.keys(data)
          );
          if (typeof data === "object") {
            for (const key in data) {
              console.log(`[STATEDATA-RELAY] Instruments[${key}] =`, data[key]);
            }
          }
        }
        console.log(
          "[STATEDATA-RELAY] Processing instruments data (original format):",
          JSON.stringify(data)
        );

        // Handle speedOverGround directly
        if (data && data.speedOverGround !== undefined) {
          navigationState.value.speed.sog = data.speedOverGround;
          console.log(
            "[STATEDATA-RELAY] Updated speed.sog from direct SOG:",
            data.speedOverGround
          );
          console.log(
            "[STATEDATA-RELAY] Navigation state AFTER speed update:",
            JSON.stringify(navigationState.value)
          );
          lastUpdate.value = Date.now();
          vpsConnectionStatus.value.messageCount++;
          vpsConnectionStatus.value.lastUpdate = Date.now();
        }

        // Handle headingMagnetic directly
        if (data && data.headingMagnetic !== undefined) {
          navigationState.value.course.heading = data.headingMagnetic;
          console.log(
            "[STATEDATA-RELAY] Updated heading from direct magnetic heading:",
            data.headingMagnetic
          );
          console.log(
            "[STATEDATA-RELAY] Navigation state AFTER heading update:",
            JSON.stringify(navigationState.value)
          );
          lastUpdate.value = Date.now();
          vpsConnectionStatus.value.messageCount++;
          vpsConnectionStatus.value.lastUpdate = Date.now();
        }

        // Check for nested data structure (data.data)
        if (data && data.data) {
          console.log(
            "[STATEDATA-RELAY] Processing instruments data (nested format):",
            JSON.stringify(data.data)
          );
          const instrumentData = data.data;

          // Update course information
          if (instrumentData.heading !== undefined) {
            navigationState.value.course.heading = instrumentData.heading;
            console.log(
              "[STATEDATA-RELAY] Updated heading:",
              instrumentData.heading
            );
          }
          if (instrumentData.cog !== undefined) {
            navigationState.value.course.cog = instrumentData.cog;
            console.log("[STATEDATA-RELAY] Updated COG:", instrumentData.cog);
          }
          if (instrumentData.variation !== undefined) {
            navigationState.value.course.variation = instrumentData.variation;
            console.log(
              "[STATEDATA-RELAY] Updated variation:",
              instrumentData.variation
            );
          }

          // Update speed
          if (instrumentData.speed !== undefined) {
            navigationState.value.speed = instrumentData.speed;
            console.log(
              "[STATEDATA-RELAY] Updated speed:",
              instrumentData.speed
            );
          }
          // Handle speedOverGround specifically
          if (instrumentData.speedOverGround !== undefined) {
            navigationState.value.speed = instrumentData.speedOverGround;
            console.log(
              "[STATEDATA-RELAY] Updated speed from SOG:",
              instrumentData.speedOverGround
            );
          }
        }
        // Check for original format for backward compatibility
        else if (data) {
          console.log(
            "[STATEDATA-RELAY] Processing instruments data (original format):",
            JSON.stringify(data)
          );

          // Update course information
          if (data.heading !== undefined) {
            navigationState.value.course.heading = data.heading;
            console.log("[STATEDATA-RELAY] Updated heading:", data.heading);
          }
          if (data.cog !== undefined) {
            navigationState.value.course.cog = data.cog;
            console.log("[STATEDATA-RELAY] Updated COG:", data.cog);
          }
          if (data.variation !== undefined) {
            navigationState.value.course.variation = data.variation;
            console.log("[STATEDATA-RELAY] Updated variation:", data.variation);
          }

          // Update speed
          if (data.speed !== undefined) {
            navigationState.value.speed = data.speed;
            console.log("[STATEDATA-RELAY] Updated speed:", data.speed);
          }
          // Handle speedOverGround specifically
          if (data.speedOverGround !== undefined) {
            navigationState.value.speed = data.speedOverGround;
            console.log(
              "[STATEDATA-RELAY] Updated speed from SOG:",
              data.speedOverGround
            );
          }
        }

        lastUpdate.value = Date.now();
      });

      // Set up event listeners for anchor data
      relayConnectionAdapter.on("anchor-position", (data) => {
        if (data && data.position) {
          console.log(
            "[STATEDATA-RELAY] Received anchor position update:",
            JSON.stringify(data.position)
          );
          anchorState.value.setPosition = {
            latitude: data.position.latitude,
            longitude: data.position.longitude,
          };
          lastUpdate.value = Date.now();
          console.log(
            "[STATEDATA-RELAY] Updated anchor position:",
            JSON.stringify(anchorState.value.setPosition)
          );
        }
      });

      relayConnectionAdapter.on("anchor-status", (data) => {
        if (data) {
          console.log(
            "[STATEDATA-RELAY] Received anchor status update:",
            JSON.stringify(data)
          );
          anchorState.value.status = data.status;
          anchorState.value.deployed = data.deployed;
          anchorState.value.alarmRadius = data.alarmRadius;
          anchorState.value.currentRadius = data.currentRadius;
          anchorState.value.maxRadius = data.maxRadius;
          anchorState.value.timestamp = data.timestamp;
          anchorState.value.source = "relay";
          anchorState.value.dragging = data.status === "dragging";
          lastUpdate.value = Date.now();
          console.log(
            "[STATEDATA-RELAY] Updated anchor status:",
            data.status,
            "dragging:",
            anchorState.value.dragging
          );
        }
      });

      // Set up event listeners for alert data
      relayConnectionAdapter.on("signalk-alert", (data) => {
        if (data) {
          console.log(
            "[STATEDATA-RELAY] Received alert data:",
            JSON.stringify(data)
          );
          // Process alert data
          processAlert(data);
          lastUpdate.value = Date.now();
          console.log("[STATEDATA-RELAY] Processed alert data");
        }
      });

      // Clean up when the component unmounts
      // This will be handled by the component's onUnmounted hook

      console.log("[StateDataStore] Relay mode initialized");
      return true;
    } catch (error) {
      console.error("[StateDataStore] Failed to initialize relay mode:", error);
      throw error;
    }
  }

  async function setAnchorDropLocation(position) {
    try {
      const { stateData } = await ensureStateDataLoaded();

      // Update the state data
      stateData.update("anchor.setPosition", {
        latitude: position.lat,
        longitude: position.lon,
      });

      stateData.update("anchor.status", "set");
      stateData.update("anchor.setTime", new Date().toISOString());

      // Update local state for UI
      anchorState.value.anchorDropLocation = {
        ...anchorState.value.anchorDropLocation,
        latitude: position.latitude,
        longitude: position.longitude,
        time: new Date().toISOString(),
        depth: navigationState.value.depth.belowTransducer,
      };

      return true;
    } catch (error) {
      console.error("Error setting anchor drop location:", error);
      return false;
    }
  }

  async function setRodeLength(length, units = "feet") {
    try {
      const { stateData } = await ensureStateDataLoaded();

      // Update the state data
      stateData.update("anchor.rode", {
        amount: length,
        units,
      });

      // Update local state for UI
      anchorState.value.rode = {
        amount: length,
        units,
      };

      // Calculate and update critical and warning ranges
      const depth = navigationState.value.depth.belowTransducer || 0;
      const criticalRange = Math.max(0, length - depth);
      const warningRange = criticalRange * 1.5;

      stateData.update("anchor.criticalRange", {
        r: criticalRange,
        units,
      });

      stateData.update("anchor.warningRange", {
        r: warningRange,
        units,
      });

      return true;
    } catch (error) {
      console.error("Error setting rode length:", error);
      return false;
    }
  }

  async function cancelAnchor() {
    try {
      const { stateData } = await ensureStateDataLoaded();

      // Update the state data
      stateData.update("anchor.status", "off");
      stateData.update("anchor.setPosition", {
        latitude: null,
        longitude: null,
      });
      stateData.update("anchor.currentRadius", null);
      stateData.update("anchor.maxRadius", null);

      // Reset local state
      anchorState.value.anchorDropLocation = {
        latitude: null,
        longitude: null,
        time: null,
        depth: null,
        distanceFromCurrentLocation: 0,
        originalBearing: 0,
      };

      return true;
    } catch (error) {
      console.error("Error canceling anchor:", error);
      return false;
    }
  }

  // Alert management functions
  async function initAlerts() {
    try {
      // Load alert definitions from storage
      await loadAlertDefinitions();

      // Set up event listeners for alert-related events
      setupAlertEventListeners();

      // Start alert monitoring
      startAlertMonitoring();

      return true;
    } catch (error) {
      console.error("Error initializing alerts:", error);
      return false;
    }
  }

  async function loadAlertDefinitions() {
    try {
      // Diagnostic logs to debug alert service availability
      console.log("connectionBridge:", connectionBridge);
      console.log("connectionBridge.services:", connectionBridge?.services);
      console.log("alert service:", connectionBridge?.services?.get?.("alert"));
      // Defensive check for connectionBridge and services
      if (!connectionBridge.services) {
        connectionBridge.services = new Map();
      }
      const alertService = connectionBridge?.services?.get?.("alert");
      if (!alertService || !alertService.active) {
        console.error("Alert service not available");
        alertsState.value.definitions = [];
        return [];
      }
      const data = await alertService.active.getUserDefinedAlerts();
      alertsState.value.definitions = Array.isArray(data) ? data : [];
      console.log(
        `Loaded ${alertsState.value.definitions.length} alert definitions`
      );
      return alertsState.value.definitions;
    } catch (error) {
      alertsState.value.definitions = [];
      console.error("Error loading alert definitions:", error);
      return [];
    }
  }

  function setupAlertEventListeners() {
    // Listen for alert definition changes
    connectionBridge.on("user-alert-created", (data) => {
      alertsState.value.definitions.push(data);
    });

    connectionBridge.on("user-alert-updated", (data) => {
      const index = alertsState.value.definitions.findIndex(
        (a) => a.id === data.id
      );
      if (index !== -1) {
        alertsState.value.definitions[index] = {
          ...alertsState.value.definitions[index],
          ...data,
        };
      }
    });

    connectionBridge.on("user-alert-deleted", (data) => {
      const index = alertsState.value.definitions.findIndex(
        (a) => a.id === data.id
      );
      if (index !== -1) {
        alertsState.value.definitions.splice(index, 1);
      }
    });
  }

  function startAlertMonitoring() {
    if (!alertsState.value.isRunning) {
      alertsState.value.isRunning = true;
      console.log("Alert monitoring started");

      // Check alerts immediately with current data
      if (stateData) {
        checkAlerts(stateData);
      }
    }
  }

  function stopAlertMonitoring() {
    alertsState.value.isRunning = false;
    console.log("Alert monitoring stopped");
  }

  function checkAlerts(data) {
    if (!alertsState.value.isRunning || !data) return;
    // Defensive: ensure definitions is always an array
    if (!Array.isArray(alertsState.value.definitions)) return;
    // Process each alert definition
    alertsState.value.definitions.forEach((alertDef) => {
      // Skip if this alert is already in the processing queue
      if (alertsState.value.processingQueue.includes(alertDef.id)) return;
      // Check if we should update this alert based on its interval
      if (
        connectionBridge?.services
          ?.get?.("alert")
          ?.active?.shouldUpdate?.(alertDef.dataSource)
      ) {
        alertsState.value.processingQueue.push(alertDef.id);
        processAlert(alertDef, data);
      }
    });
  }

  async function processAlert(alertDef, data) {
    try {
      // Use the alert service to process the alert
      const alert = await connectionBridge.services
        .get("alert")
        .active.processAlert(alertDef, data);

      // If an alert was triggered, add it to our local state
      if (alert) {
        alertsState.value.active.push(alert);
      }
    } catch (error) {
      console.error(`Error processing alert ${alertDef.id}:`, error);
    } finally {
      // Remove from processing queue
      const index = alertsState.value.processingQueue.indexOf(alertDef.id);
      if (index !== -1) {
        alertsState.value.processingQueue.splice(index, 1);
      }
    }
  }

  async function addAlertDefinition(alertDef) {
    try {
      // Use connectionBridge to create the alert definition
      const result = await connectionBridge.services
        .get("alert")
        .active.createUserDefinedAlert(alertDef);
      alertsState.value.definitions.push(result);
      return result;
    } catch (error) {
      console.error("Error adding alert definition:", error);
      throw error;
    }
  }

  async function updateAlertDefinition(alertId, alertDef) {
    try {
      // Use connectionBridge to update the alert definition
      const result = await connectionBridge.services
        .get("alert")
        .active.updateUserDefinedAlert(alertId, alertDef);

      // Update local state
      const index = alertsState.value.definitions.findIndex(
        (a) => a.id === alertId
      );
      if (index !== -1) {
        alertsState.value.definitions[index] = result;
      }

      return result;
    } catch (error) {
      console.error("Error updating alert definition:", error);
      throw error;
    }
  }

  async function deleteAlertDefinition(alertId) {
    try {
      // Use connectionBridge to delete the alert definition
      const result = await connectionBridge.services
        .get("alert")
        .active.deleteUserDefinedAlert(alertId);

      // Update local state
      const index = alertsState.value.definitions.findIndex(
        (a) => a.id === alertId
      );
      if (index !== -1) {
        alertsState.value.definitions.splice(index, 1);
      }

      return result;
    } catch (error) {
      console.error("Error deleting alert definition:", error);
      throw error;
    }
  }

  async function muteAlert(alertId, durationMs = 3600000) {
    // Default 1 hour
    try {
      await connectionBridge.services
        .get("alert")
        .active.muteAlert(alertId, durationMs);
      return true;
    } catch (error) {
      console.error("Error muting alert:", error);
      throw error;
    }
  }

  async function unmuteAlert(alertId) {
    try {
      await connectionBridge.services.get("alert").active.unmuteAlert(alertId);
      return true;
    } catch (error) {
      console.error("Error unmuting alert:", error);
      throw error;
    }
  }

  async function getMuteStatus(alertId) {
    try {
      return await connectionBridge.services
        .get("alert")
        .active.getMuteStatus(alertId);
    } catch (error) {
      console.error("Error getting mute status:", error);
      return { isMuted: false };
    }
  }

  function setUpdateInterval(dataSource, interval) {
    try {
      connectionBridge.services
        .get("alert")
        .active.setUpdateInterval(dataSource, interval);
    } catch (error) {
      console.error(`Error setting update interval for ${dataSource}:`, error);
    }
  }

  // Watch for changes in state data to trigger alert checks
  watch(
    () => stateData,
    (newVal) => {
      if (alertsState.value.isRunning && newVal) {
        checkAlerts(newVal);
      }
    },
    { deep: true }
  );

  // Clean up when component unmounts
  onUnmounted(() => {
    stopAlertMonitoring();
  });

  return {
    // State
    navigationState,
    anchorState,
    environmentState,
    alertsState,
    lastUpdate,
    error,
    isConnected,
    connectionSource,
    vpsConnectionStatus,
    anchorData,
    currentPosition,
    waitForValidPosition,

    // Actions/utilities
    replaceState,
    applyStatePatch,
    anchorPosition,
    isDragging,
    hasActiveAlerts,
    pendingAlertCount,

    // Actions
    init,
    initRelayMode,
    switchDataSource, // New method for hot swap
    setAnchorDropLocation,
    setRodeLength,
    cancelAnchor,

    // Alert management
    loadAlertDefinitions,
    startAlertMonitoring,
    stopAlertMonitoring,
    addAlertDefinition,
    updateAlertDefinition,
    deleteAlertDefinition,
    muteAlert,
    unmuteAlert,
    getMuteStatus,
    setUpdateInterval,

    // Alert methods
    initAlerts,
    setupAlertEventListeners,
    checkAlerts,
    processAlert,

    // Connection cleanup
    cleanup: () => {
      if (connectionSource.value === "vps") {
        console.log("[StateDataStore] Cleaning up relay connection");
        relayConnectionAdapter.cleanup();
      }
      isConnected.value = false;
      connectionSource.value = null;
    },
  };
});
