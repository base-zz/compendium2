import { watch, onUnmounted } from "vue";
import { useStateDataStore } from "@/stores/stateDataStore";
import { alarmSoundService } from "@/services/alarmSoundService";

export function useAlarmSounds({ delayMs }) {
  const stateStore = useStateDataStore();

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
      const alerts = stateStore.state?.alerts?.active || [];
      const silencedUntilEpochMs = alarmSoundService.getSilencedUntilEpochMs();
      const settingsVersion = alarmSoundService.getSettingsVersion();
      
      // Check for specific alert types using trigger field from server
      const anchorDraggingAlert = alerts.find(alert => alert.trigger === 'anchor_dragging');
      const aisProximityAlert = alerts.find(alert => alert.trigger === 'ais_proximity');
      const criticalRangeAlert = alerts.find(alert => alert.trigger === 'critical_range');
      
      const dragging = !!anchorDraggingAlert;
      const aisWarning = !!aisProximityAlert;
      const fenceAlert = !!criticalRangeAlert; // Use server alert instead of local detection
      
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
