import { computed, watch } from "vue";

export function useAnchorDropNowFlow({
  logger,
  stateStore,
  anchorState,
  showSetAnchorDialog,
  showDropAnchorDialog,
  dropNowSessionActive,
  dropNowCapturedDepth,
  dropNowValidationError,
  pendingAnchorUpdateAction,
  hasAppliedDropNowMeasuredPrefill,
  isLengthUnits,
  resolveRealtimeDropDepthDatum,
  applyDropNowMeasuredPrefill,
  resolveFinalizeBearingDegrees,
  resolveDropNowDepthForFinalize,
}) {
  const isDropNowDeploying = computed(() => {
    const deploymentPhase = anchorState.value?.deploymentPhase;
    if (deploymentPhase === "deploying") {
      return true;
    }
    if (typeof deploymentPhase === "string") {
      return false;
    }
    return dropNowSessionActive.value === true;
  });

  watch(
    () => [anchorState.value?.deploymentPhase, anchorState.value?.dropSession?.measured],
    ([deploymentPhase]) => {
      if (deploymentPhase === "deploying") {
        dropNowSessionActive.value = true;
        if (hasAppliedDropNowMeasuredPrefill.value !== true) {
          const prefillApplied = applyDropNowMeasuredPrefill();
          if (prefillApplied === true) {
            hasAppliedDropNowMeasuredPrefill.value = true;
          }
        }
        return;
      }

      if (typeof deploymentPhase === "string" && deploymentPhase !== "deploying") {
        dropNowSessionActive.value = false;
        dropNowCapturedDepth.value = null;
        dropNowValidationError.value = "";
        pendingAnchorUpdateAction.value = null;
        hasAppliedDropNowMeasuredPrefill.value = false;
        return;
      }

      if (dropNowSessionActive.value !== true) {
        hasAppliedDropNowMeasuredPrefill.value = false;
      }
    },
    { immediate: true, deep: true }
  );

  const confirmDropAnchor = () => {
    dropNowValidationError.value = "";

    const dropDepth = resolveRealtimeDropDepthDatum();
    if (!dropDepth) {
      logger.warn("Cannot start drop_now workflow - missing realtime depth datum");
      return;
    }

    dropNowCapturedDepth.value = dropDepth;
    dropNowSessionActive.value = true;

    if (anchorState.value) {
      anchorState.value.anchorDeployed = true;
      if (
        !anchorState.value.anchorDropLocation ||
        typeof anchorState.value.anchorDropLocation !== "object"
      ) {
        anchorState.value.anchorDropLocation = {};
      }
      anchorState.value.anchorDropLocation.depth = dropDepth;
      anchorState.value.anchorDropLocation.depthSource = "real_time_measurement";
    }

    const payload = {
      type: "anchor:update",
      data: {
        action: "drop_now",
        anchorDeployed: true,
        anchorDropLocation: {
          depth: dropDepth,
          depthSource: "real_time_measurement",
        },
      },
    };

    pendingAnchorUpdateAction.value = "drop_now";

    stateStore
      .sendMessageToServer("anchor:update", payload.data, {
        source: "AnchorView.confirmDropAnchor",
        timeout: 5000,
      })
      .then((success) => {
        if (success !== true) {
          pendingAnchorUpdateAction.value = null;
          dropNowSessionActive.value = false;
          dropNowCapturedDepth.value = null;
          showDropAnchorDialog.value = true;
          return;
        }

        showDropAnchorDialog.value = false;
      })
      .catch((error) => {
        pendingAnchorUpdateAction.value = null;
        dropNowSessionActive.value = false;
        dropNowCapturedDepth.value = null;
        showDropAnchorDialog.value = true;
        logger.error("Failed to send drop_now update", error);
      });
  };

  const handleFinalizeDropNow = () => {
    if (!anchorState.value) {
      logger.warn("Cannot finalize drop_now workflow - anchorState missing");
      return;
    }

    const rodeUnits = anchorState.value?.rode?.units;
    const warningRangeUnits = anchorState.value?.warningRange?.units;
    const criticalRangeUnits = anchorState.value?.criticalRange?.units;
    if (!isLengthUnits(rodeUnits) || !isLengthUnits(warningRangeUnits) || !isLengthUnits(criticalRangeUnits)) {
      dropNowValidationError.value = "Finalize requires explicit units for rode and ranges (ft or m).";
      logger.warn("Cannot finalize drop_now workflow - missing required units", {
        rodeUnits,
        warningRangeUnits,
        criticalRangeUnits,
      });
      return;
    }

    dropNowValidationError.value = "";

    const rodeAmount = anchorState.value?.rode?.amount;
    const warningRange = anchorState.value?.warningRange?.r;
    const criticalRange = anchorState.value?.criticalRange?.r;
    const bearingDegrees = resolveFinalizeBearingDegrees();

    if (typeof rodeAmount !== "number" || Number.isNaN(rodeAmount)) {
      logger.warn("Cannot finalize drop_now workflow - invalid rode amount", { rodeAmount });
      return;
    }
    if (typeof warningRange !== "number" || Number.isNaN(warningRange)) {
      logger.warn("Cannot finalize drop_now workflow - invalid warning range", { warningRange });
      return;
    }
    if (typeof criticalRange !== "number" || Number.isNaN(criticalRange)) {
      logger.warn("Cannot finalize drop_now workflow - invalid critical range", { criticalRange });
      return;
    }
    if (typeof bearingDegrees !== "number" || Number.isNaN(bearingDegrees)) {
      dropNowValidationError.value = "Finalize requires a valid bearing (device or server-measured).";
      logger.warn("Cannot finalize drop_now workflow - invalid set bearing", { bearingDegrees });
      return;
    }

    const dropDepth = resolveDropNowDepthForFinalize();
    if (!dropDepth || typeof dropDepth !== "object") {
      dropNowValidationError.value = "Finalize requires depth and depth source from drop_now.";
      logger.warn("Cannot finalize drop_now workflow - missing captured drop depth");
      return;
    }
    if (typeof dropDepth.value !== "number" || Number.isNaN(dropDepth.value)) {
      logger.warn("Cannot finalize drop_now workflow - invalid captured drop depth value", { dropDepth });
      return;
    }
    if (dropDepth.units !== "m" && dropDepth.units !== "ft") {
      logger.warn("Cannot finalize drop_now workflow - invalid captured drop depth units", { dropDepth });
      return;
    }

    const payload = {
      type: "anchor:update",
      data: {
        action: "finalize_drop_now",
        anchorDeployed: true,
        rode: {
          amount: rodeAmount,
          units: rodeUnits,
        },
        warningRange: {
          r: warningRange,
          units: warningRangeUnits,
        },
        criticalRange: {
          r: criticalRange,
          units: criticalRangeUnits,
        },
        setBearing: {
          value: bearingDegrees,
          units: "deg",
        },
        anchorDropLocation: {
          depth: dropDepth,
          depthSource: "real_time_measurement",
        },
      },
    };

    showSetAnchorDialog.value = false;

    pendingAnchorUpdateAction.value = "finalize_drop_now";

    stateStore
      .sendMessageToServer("anchor:update", payload.data, {
        source: "AnchorView.handleFinalizeDropNow",
        timeout: 5000,
      })
      .then((success) => {
        if (success !== true) {
          pendingAnchorUpdateAction.value = null;
          dropNowValidationError.value = "Unable to send finalize request. Please retry.";
          showSetAnchorDialog.value = true;
          return;
        }
      })
      .catch((error) => {
        pendingAnchorUpdateAction.value = null;
        dropNowValidationError.value = "Unable to send finalize request. Please retry.";
        logger.error("Failed to send finalize_drop_now update", error);
      });
  };

  const handleSetAnchorModalCancel = () => {
    if (isDropNowDeploying.value !== true) {
      return;
    }

    const payload = {
      type: "anchor:update",
      data: {
        action: "cancel_drop_now",
        anchorDeployed: false,
      },
    };

    pendingAnchorUpdateAction.value = "cancel_drop_now";
    dropNowSessionActive.value = false;
    dropNowCapturedDepth.value = null;
    dropNowValidationError.value = "";

    if (anchorState.value) {
      anchorState.value.anchorDeployed = false;
    }

    stateStore
      .sendMessageToServer("anchor:update", payload.data, {
        source: "AnchorView.handleSetAnchorModalCancel",
        timeout: 5000,
      })
      .then(() => {
        pendingAnchorUpdateAction.value = null;
      })
      .catch((error) => {
        pendingAnchorUpdateAction.value = null;
        logger.error("Failed to send cancel_drop_now update", error);
      });
  };

  return {
    isDropNowDeploying,
    confirmDropAnchor,
    handleFinalizeDropNow,
    handleSetAnchorModalCancel,
  };
}
