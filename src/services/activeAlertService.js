import { computed, ref, watch } from "vue";
import { useStateDataStore, calculateDistanceMeters } from "@/stores/stateDataStore";
import { storeToRefs } from "pinia";
import { stateUpdateProvider } from "@/services/stateUpdateProvider";

export const ALERT_KEYS = {
  ANCHOR_DRAGGING: "anchor_dragging",
  AIS_PROXIMITY: "ais_proximity", 
  FENCE_VIOLATION: "critical_range", // Server uses "critical_range" not "fence_violation"
};

const ALERT_PRIORITY = [
  ALERT_KEYS.ANCHOR_DRAGGING,
  ALERT_KEYS.AIS_PROXIMITY,
  ALERT_KEYS.FENCE_VIOLATION,
];

const ALERT_ROUTE_MAP = {
  [ALERT_KEYS.ANCHOR_DRAGGING]: "/anchor",
  [ALERT_KEYS.AIS_PROXIMITY]: "/anchor",
  [ALERT_KEYS.FENCE_VIOLATION]: "/anchor",
};

const ALERT_TITLE_MAP = {
  [ALERT_KEYS.ANCHOR_DRAGGING]: "ANCHOR DRAGGING",
  [ALERT_KEYS.AIS_PROXIMITY]: "AIS PROXIMITY",
  [ALERT_KEYS.FENCE_VIOLATION]: "CRITICAL RANGE", // Updated to match server terminology
};

export function getAlertDestination(alertKey) {
  if (!alertKey || typeof alertKey !== "string") {
    return null;
  }
  return ALERT_ROUTE_MAP[alertKey] || null;
}

export function getAlertTitle(alertKey) {
  if (!alertKey || typeof alertKey !== "string") {
    return null;
  }
  return ALERT_TITLE_MAP[alertKey] || alertKey;
}

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  if (value && typeof value === "object") {
    if (typeof value.value === "number" && Number.isFinite(value.value)) {
      return value.value;
    }
    if (typeof value.value === "string") {
      const parsed = Number(value.value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function computeFenceAlertFromState(state) {
  const fences = state?.anchor?.fences;
  if (!Array.isArray(fences)) {
    return false;
  }

  const anchor = state?.anchor;
  const navigation = state?.navigation;
  const aisTargets = state?.aisTargets;

  const normalizeCoordinates = (source) => {
    if (!source) {
      return null;
    }

    const raw = source.position && typeof source.position === "object" ? source.position : source;
    const latitude = toFiniteNumber(raw.latitude ?? raw.lat);
    const longitude = toFiniteNumber(raw.longitude ?? raw.lon);

    if (latitude == null || longitude == null) {
      return null;
    }

    return { latitude, longitude };
  };

  const getFenceTargetCoordinates = (fence) => {
    if (!fence || !fence.targetType || !fence.targetRef) {
      return null;
    }

    if (fence.targetType === "point") {
      return normalizeCoordinates({
        latitude: fence.targetRef.latitude,
        longitude: fence.targetRef.longitude,
      });
    }

    if (fence.targetType === "ais") {
      const mmsi = fence.targetRef.mmsi;
      if (mmsi == null) {
        return null;
      }
      if (!aisTargets || typeof aisTargets !== "object") {
        return null;
      }
      const rawTarget = aisTargets[String(mmsi)];
      if (!rawTarget) {
        return null;
      }
      return normalizeCoordinates(rawTarget.position);
    }

    return null;
  };

  const getReferenceCoordinates = (fence) => {
    if (!fence || !fence.referenceType) {
      return null;
    }

    if (fence.referenceType === "boat") {
      return normalizeCoordinates(navigation?.position);
    }

    if (fence.referenceType === "anchor_drop") {
      return normalizeCoordinates(anchor?.anchorDropLocation);
    }

    return null;
  };

  return fences.some((fence) => {
    if (!fence || fence.enabled === false) {
      return false;
    }

    const alertRange = toFiniteNumber(fence.alertRange);
    const units = typeof fence.units === "string" ? fence.units : null;

    const targetCoordinates = getFenceTargetCoordinates(fence);
    const referenceCoordinates = getReferenceCoordinates(fence);

    const currentDistanceMeters =
      targetCoordinates && referenceCoordinates
        ? calculateDistanceMeters(
            referenceCoordinates.latitude,
            referenceCoordinates.longitude,
            targetCoordinates.latitude,
            targetCoordinates.longitude,
            true
          )
        : null;

    const computedDistance =
      Number.isFinite(currentDistanceMeters) && units
        ? units === "ft"
          ? currentDistanceMeters * 3.28084
          : currentDistanceMeters
        : null;

    const currentDistance =
      computedDistance != null ? computedDistance : toFiniteNumber(fence.currentDistance);

    if (!(typeof alertRange === "number" && Number.isFinite(alertRange))) {
      return false;
    }

    if (!(typeof currentDistance === "number" && Number.isFinite(currentDistance))) {
      return false;
    }

    return currentDistance <= alertRange;
  });
}

function getActiveAlertKeysFromState(state) {
  const keys = [];
  const alerts = state?.alerts?.active || [];

  // Check for specific alert types in server alerts using trigger field
  const anchorDraggingAlert = alerts.find(alert => alert.trigger === 'anchor_dragging');
  const aisProximityAlert = alerts.find(alert => alert.trigger === 'ais_proximity');
  const criticalRangeAlert = alerts.find(alert => alert.trigger === 'critical_range');

  if (anchorDraggingAlert) {
    keys.push(ALERT_KEYS.ANCHOR_DRAGGING);
  }

  if (aisProximityAlert) {
    keys.push(ALERT_KEYS.AIS_PROXIMITY);
  }

  if (criticalRangeAlert) {
    keys.push(ALERT_KEYS.FENCE_VIOLATION);
  }

  return keys;
}

export function useActiveAlerts() {
  const stateStore = useStateDataStore();
  const { state } = storeToRefs(stateStore);

  const acknowledgedKeys = ref(new Set());

  const loadAcknowledged = () => {
    if (typeof window === "undefined") {
      acknowledgedKeys.value = new Set();
      return;
    }

    try {
      const raw = localStorage.getItem("acknowledgedAlertKeys");
      if (!raw) {
        acknowledgedKeys.value = new Set();
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        acknowledgedKeys.value = new Set();
        return;
      }
      acknowledgedKeys.value = new Set(parsed.filter((k) => typeof k === "string"));
    } catch {
      acknowledgedKeys.value = new Set();
    }
  };

  const saveAcknowledged = () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(
        "acknowledgedAlertKeys",
        JSON.stringify(Array.from(acknowledgedKeys.value))
      );
    } catch {
      return;
    }
  };

  loadAcknowledged();

  const activeKeys = computed(() => getActiveAlertKeysFromState(state.value));
  const activeCount = computed(() => activeKeys.value.length);

  const primaryKey = computed(() => {
    const keys = activeKeys.value;
    if (!Array.isArray(keys) || keys.length === 0) {
      return null;
    }

    for (const key of ALERT_PRIORITY) {
      if (keys.includes(key) && !acknowledgedKeys.value.has(key)) {
        return key;
      }
    }

    return null;
  });

  watch(
    () => activeKeys.value,
    (nextKeys) => {
      const nextKeySet = new Set(Array.isArray(nextKeys) ? nextKeys : []);
      let changed = false;

      const updated = new Set();
      for (const key of acknowledgedKeys.value) {
        if (nextKeySet.has(key)) {
          updated.add(key);
        } else {
          changed = true;
        }
      }

      if (changed) {
        acknowledgedKeys.value = updated;
        saveAcknowledged();
      }
    },
    { immediate: true }
  );

  const acknowledge = (alertKey) => {
    if (!alertKey || typeof alertKey !== "string") {
      return;
    }
    
    // Find the alert to acknowledge
    const stateStore = useStateDataStore();
    const alert = stateStore.state?.alerts?.active?.find(a => a.trigger === alertKey);
    
    if (alert?.id) {
      // Send acknowledgment to server
      try {
        stateUpdateProvider.sendCommand("alert", "acknowledge", {
          alertId: alert.id,
          clientId: getClientId(), // Generate or get client ID
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to send acknowledgment to server:', error);
        // Fall back to local acknowledgment if server fails
        acknowledgeLocal(alertKey, alert.id);
      }
    } else {
      // No specific alert found, try bulk acknowledgment by trigger
      try {
        stateUpdateProvider.sendCommand("alert", "acknowledge", {
          trigger: alertKey,
          clientId: getClientId(),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to send bulk acknowledgment to server:', error);
        // Fall back to local acknowledgment
        acknowledgeLocal(alertKey);
      }
    }
    
    // Add to local acknowledged Set for immediate UI feedback
    acknowledgedKeys.value.add(alertKey);
    saveAcknowledged();
  };

  // Helper function for local acknowledgment (fallback)
  const acknowledgeLocal = (alertKey, alertId = null) => {
    // Also acknowledge any matching alerts in the state store
    const stateStore = useStateDataStore();
    const activeAlerts = stateStore.state.alerts?.active || [];
    const matchingAlerts = alertId 
      ? activeAlerts.filter(alert => alert.id === alertId)
      : activeAlerts.filter(alert => alert.trigger === alertKey);
    
    matchingAlerts.forEach(alert => {
      if (alert.id) {
        stateStore.acknowledgeAlert(alert.id);
      }
    });
  };

  // Helper function to get/generate client ID
  const getClientId = () => {
    let clientId = localStorage.getItem('compendiumnav:clientId');
    if (!clientId) {
      clientId = 'client-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('compendiumnav:clientId', clientId);
    }
    return clientId;
  };

  const clearAcknowledgements = () => {
    acknowledgedKeys.value = new Set();
    saveAcknowledged();
  };

  return {
    activeKeys,
    activeCount,
    primaryKey,
    acknowledge,
    clearAcknowledgements,
  };
}
