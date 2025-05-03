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
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  
  const lat1Rad = toRad(lat1);
  const lon1Rad = toRad(lon1);
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
  
  return {
    latitude: lat2 * 180 / Math.PI,
    longitude: lon2 * 180 / Math.PI
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
  console.log('DEBUG - Before alerts check:', state.alerts);
  if (!state.alerts) {
    console.log('DEBUG - Creating alerts field because it does not exist');
    state.alerts = { active: [], processingQueue: [] };
  } else {
    console.log('DEBUG - Alerts field already exists with structure:', state.alerts);
  }

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
    hasActiveAlerts,
    pendingAlertCount,
    switchDataSource,
    breadcrumbs,
  };
});
