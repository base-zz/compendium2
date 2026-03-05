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

function isLikelyIOSClient() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = typeof navigator.userAgent === "string" ? navigator.userAgent : "";
  const platform = typeof navigator.platform === "string" ? navigator.platform : "";
  const maxTouchPoints = typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;

  const iOSUserAgent = /iPad|iPhone|iPod/i.test(ua);
  const iPadOSDesktopUA = platform === "MacIntel" && maxTouchPoints > 1;

  return iOSUserAgent || iPadOSDesktopUA;
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

const getActiveAlertKeysFromState = (state) => {
  const logIOS = isLikelyIOSClient();

    
  const activeAlertsRaw = state?.alerts?.active;
  const activeAlerts = Array.isArray(activeAlertsRaw)
    ? activeAlertsRaw
    : activeAlertsRaw && typeof activeAlertsRaw === "object"
      ? Object.values(activeAlertsRaw)
      : [];
  const keys = new Set();

  
  const toTriggerString = (value) => {
    if (typeof value === "string") {
      return value;
    }
    if (value && typeof value === "object" && typeof value.value === "string") {
      return value.value;
    }
    return "";
  };

  const toCanonicalTrigger = (value) => {
    if (typeof value !== "string") {
      return "";
    }
    return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  };

  // Check alerts from state.alerts.active (server alerts)
  activeAlerts.forEach((alert, index) => {
    if (!alert || typeof alert !== "object") {
      return;
    }

    const triggerCandidates = [
      toCanonicalTrigger(toTriggerString(alert.trigger)),
      toCanonicalTrigger(toTriggerString(alert.key)),
      toCanonicalTrigger(toTriggerString(alert.type)),
      toCanonicalTrigger(toTriggerString(alert.alertType)),
    ];

    
    let mappedKnownKey = false;

    if (triggerCandidates.includes("anchor_dragging")) {
      keys.add(ALERT_KEYS.ANCHOR_DRAGGING);
      mappedKnownKey = true;
    }
    if (triggerCandidates.includes("ais_proximity")) {
      keys.add(ALERT_KEYS.AIS_PROXIMITY);
      mappedKnownKey = true;
    }
    if (triggerCandidates.includes("critical_range")) {
      keys.add(ALERT_KEYS.FENCE_VIOLATION);
      mappedKnownKey = true;
    }

    // Non-breaking fallback: if alert is active but uses an unknown trigger label,
    // still surface a banner using that trigger string.
    if (mappedKnownKey !== true) {
      const fallbackTrigger = triggerCandidates.find((candidate) => candidate.length > 0);
      if (fallbackTrigger) {
        keys.add(fallbackTrigger);
      }
    }
  });

    return keys;
};

export function useActiveAlerts() {
  const stateStore = useStateDataStore();
  const { state } = storeToRefs(stateStore);
  const logIOS = isLikelyIOSClient();

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
    const first = keys.values().next().value;
    return first || null;
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

    const activeAlertsRaw = stateStore.state?.alerts?.active;
    const activeAlerts = Array.isArray(activeAlertsRaw)
      ? activeAlertsRaw
      : activeAlertsRaw && typeof activeAlertsRaw === "object"
        ? Object.values(activeAlertsRaw)
        : [];

    const toTriggerString = (value) => {
      if (typeof value === "string") {
        return value;
      }
      if (value && typeof value === "object" && typeof value.value === "string") {
        return value.value;
      }
      return "";
    };

    const toCanonicalTrigger = (value) => {
      if (typeof value !== "string") {
        return "";
      }
      return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
    };

    const canonicalAlertKey = toCanonicalTrigger(alertKey);
    const matchingAlerts = activeAlerts.filter((alert) => {
      if (!alert || typeof alert !== "object") {
        return false;
      }

      const triggerCandidates = [
        toCanonicalTrigger(toTriggerString(alert.trigger)),
        toCanonicalTrigger(toTriggerString(alert.key)),
        toCanonicalTrigger(toTriggerString(alert.type)),
        toCanonicalTrigger(toTriggerString(alert.alertType)),
      ];

      return triggerCandidates.includes(canonicalAlertKey);
    });

    // Immediate local update so banner ACK behaves the same as alert detail ACK.
    matchingAlerts.forEach((alert) => {
      if (alert.id) {
        stateStore.acknowledgeAlert(alert.id);
      }
    });

    const clientId = getClientId();
    const timestamp = new Date().toISOString();

    // Best-effort server acknowledgment after local UI/state update.
    if (matchingAlerts.length > 0) {
      matchingAlerts.forEach((alert) => {
        if (!alert?.id) {
          return;
        }

        try {
          stateUpdateProvider.sendCommand("alert", "acknowledge", {
            alertId: alert.id,
            clientId,
            timestamp,
          });
        } catch (error) {
          console.warn('Failed to send acknowledgment to server:', error);
        }
      });
    } else {
      try {
        stateUpdateProvider.sendCommand("alert", "acknowledge", {
          trigger: alertKey,
          clientId,
          timestamp,
        });
      } catch (error) {
        console.warn('Failed to send bulk acknowledgment to server:', error);
      }
    }
    
    // Add to local acknowledged Set for immediate UI feedback
    acknowledgedKeys.value.add(alertKey);
    saveAcknowledged();
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
