/**
 * StateDataStore - Pinia store adapter for the unified StateData
 *
 * This store provides a Vue-friendly interface to the unified StateData structure,
 * making it easy to use in Vue components with reactivity.
 */

import { defineStore } from "pinia";
import { reactive, computed, watch } from "vue";
import { stateData as canonicalStateData } from "@/client/stateData.js";
import { stateUpdateProvider } from "../services/stateUpdateProvider";
import { relayConnectionAdapter } from "../services/relayConnectionAdapter.js";
import { applyPatch } from "fast-json-patch";
import { connectionBridge } from "../services/connectionBridge";
import { EVENTS } from "../../shared/constants.js";
import { useDirectPiniaSync } from "../services/useDirectPiniaSync";


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
// Utility: Deep clone to avoid reference sharing
function getInitialState() {
  return structuredClone(canonicalStateData.state);
}

export const useStateDataStore = defineStore("stateData", () => {
  // Single, canonical, deeply nested state object
  const state = reactive(getInitialState());

  // --- Patch and Replace Logic ---
  function replaceState(newState) {
    Object.keys(state).forEach(key => delete state[key]);
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

  function cancelAnchor() {
    if (state.anchor) {
      state.anchor.anchorDropLocation = null;
      state.anchor.rode = null;
      state.anchor.anchorLocation = null;
    }
  }

  // --- Alerts Logic ---
  if (!state.alerts) state.alerts = { active: [], processingQueue: [] };

  const hasActiveAlerts = computed(() => state.alerts.active?.length > 0);
  const pendingAlertCount = computed(() => state.alerts.processingQueue?.length || 0);

  // --- Relay/Connection Logic ---
  function switchDataSource(mode) {
    stateUpdateProvider.switchSource(mode);
  }

  // --- Subscriptions and Watchers ---
  stateUpdateProvider.subscribe((evt) => {
    if (evt.type === "state:full-update" && evt.data) {
      console.log('[PiniaStore] [FULL STATE UPDATE] Received at', new Date().toISOString(), 'Data keys:', Object.keys(evt.data), 'Full object:', evt.data);
      replaceState(evt.data);
    } else if (evt.type === "state:patch" && evt.data) {
      applyStatePatch(evt.data);
    }
  });

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
  };
}); 