import { watch, onUnmounted } from "vue";
import { useStateDataStore, calculateDistanceMeters } from "@/stores/stateDataStore";
import { alarmSoundService } from "@/services/alarmSoundService";
import { createAnchorDraggingAlert } from "@/utils/anchorAlerts";

export function useAlarmSounds({ delayMs }) {
  const stateStore = useStateDataStore();

  const toFiniteNumber = (value) => {
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
  };

  const computeFenceAlert = () => {
    const fences = stateStore.state?.anchor?.fences;
    if (!Array.isArray(fences)) {
      return false;
    }

    const anchor = stateStore.state?.anchor;
    const navigation = stateStore.state?.navigation;
    const aisTargets = stateStore.state?.aisTargets;

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
        computedDistance != null
          ? computedDistance
          : toFiniteNumber(fence.currentDistance);

      if (!(typeof alertRange === "number" && Number.isFinite(alertRange))) {
        return false;
      }

      if (!(typeof currentDistance === "number" && Number.isFinite(currentDistance))) {
        return false;
      }

      return currentDistance <= alertRange;
    });
  };

  const enableOnce = () => {
    alarmSoundService.enableFromUserGesture();
  };

  window.addEventListener("pointerdown", enableOnce, { once: true });
  window.addEventListener("touchstart", enableOnce, { once: true });

  const stopAll = () => {
    alarmSoundService.stopAll();
  };

  let alternateIntervalId = null;
  let alternateWhich = "ais_proximity";
  let lastDragging = false;
  let lastAisWarning = false;
  let lastFenceAlert = false;
  let lastWasBoth = false;

  const stopAlternation = () => {
    if (alternateIntervalId != null) {
      clearInterval(alternateIntervalId);
      alternateIntervalId = null;
    }
  };

  const startAlternation = () => {
    if (alternateIntervalId != null) {
      return;
    }

    alternateIntervalId = setInterval(() => {
      if (alarmSoundService.isSilencedNow()) {
        stopAlternation();
        alarmSoundService.stopAll();
        return;
      }

      if (lastDragging) {
        stopAlternation();
        alarmSoundService.setAlarmActive("ais_proximity", false, { delayMs: 0 });
        alarmSoundService.setAlarmActive("fence_alert", false, { delayMs: 0 });
        return;
      }

      if (!(lastAisWarning && lastFenceAlert)) {
        stopAlternation();
        return;
      }

      alternateWhich = alternateWhich === "ais_proximity" ? "fence_alert" : "ais_proximity";

      const playAis = alternateWhich === "ais_proximity";
      alarmSoundService.setAlarmActive("ais_proximity", playAis, { delayMs: 0 });
      alarmSoundService.setAlarmActive("fence_alert", !playAis, { delayMs: 0 });
    }, 5000);
  };

  const stopWatch = watch(
    () => {
      const anchor = stateStore.state?.anchor;
      const dragging = anchor?.dragging === true;
      const aisWarning = anchor?.aisWarning === true;
      const fenceAlert = computeFenceAlert();
      const silencedUntilEpochMs = alarmSoundService.getSilencedUntilEpochMs();
      const settingsVersion = alarmSoundService.getSettingsVersion();
      return { dragging, aisWarning, fenceAlert, silencedUntilEpochMs, settingsVersion };
    },
    ({ dragging, aisWarning, fenceAlert, silencedUntilEpochMs }) => {
      lastDragging = dragging === true;
      lastAisWarning = aisWarning === true;
      lastFenceAlert = fenceAlert === true;

      const isSilenced =
        typeof silencedUntilEpochMs === "number" &&
        Number.isFinite(silencedUntilEpochMs) &&
        Date.now() < silencedUntilEpochMs;

      if (isSilenced) {
        stopAlternation();
        alarmSoundService.stopAll();
        return;
      }

      // Anchor has priority.
      if (dragging) {
        lastWasBoth = false;
        stopAlternation();
        alarmSoundService.setAlarmActive("anchor_dragging", true, { delayMs });
        alarmSoundService.setAlarmActive("ais_proximity", false, { delayMs: 0 });
        alarmSoundService.setAlarmActive("fence_alert", false, { delayMs: 0 });
        
        // Create visual alert for anchor dragging
        const state = stateStore.state;
        const distance = calculateDistanceMeters(
          state?.navigation?.position?.latitude?.value,
          state?.navigation?.position?.longitude?.value,
          state?.anchor?.anchorDropLocation?.position?.latitude?.value,
          state?.anchor?.anchorDropLocation?.position?.longitude?.value,
          state?.navigation?.position?.latitude?.value?.units === 'm'
        );
        const rodeLength = state?.anchor?.rode?.value || 0;
        const isMetric = state?.navigation?.position?.latitude?.value?.units === 'm';
        
        if (distance != null && rodeLength > 0) {
          createAnchorDraggingAlert(distance, rodeLength, isMetric);
        }
        
        return;
      }

      alarmSoundService.setAlarmActive("anchor_dragging", false, { delayMs: 0 });

      if (aisWarning && fenceAlert) {
        const enteringBoth = lastWasBoth !== true;
        lastWasBoth = true;
        startAlternation();
        const playAis = alternateWhich === "ais_proximity";
        const initialDelayMs = enteringBoth ? delayMs : 0;
        alarmSoundService.setAlarmActive("ais_proximity", playAis, { delayMs: initialDelayMs });
        alarmSoundService.setAlarmActive("fence_alert", !playAis, { delayMs: initialDelayMs });
        return;
      }

      lastWasBoth = false;
      stopAlternation();
      alarmSoundService.setAlarmActive("ais_proximity", aisWarning, { delayMs });
      alarmSoundService.setAlarmActive("fence_alert", fenceAlert, { delayMs });
    },
    { immediate: true }
  );

  onUnmounted(() => {
    stopWatch();
    stopAlternation();
    stopAll();
    window.removeEventListener("pointerdown", enableOnce);
    window.removeEventListener("touchstart", enableOnce);
  });
}
