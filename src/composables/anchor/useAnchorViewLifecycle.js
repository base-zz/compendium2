import { nextTick, onMounted, onUnmounted, watch } from "vue";
import { onIonViewDidEnter, onIonViewDidLeave } from "@ionic/vue";

export function useAnchorViewLifecycle({
  logger,
  map,
  mapElement,
  anchorState,
  boatPosition,
  isAnchorViewActive,
  isMapRenderReady,
  isMapRenderReadyFromComposable,
  hasCenteredOnBoatThisEntry,
  hasLoggedFramingDebugThisEntry,
  hasAppliedDefaultFramingThisEntry,
  attachDefaultFramingListener,
  applyDefaultFramingOnEnter,
  updateBoatPosition,
  updateAnchorPoints,
  updateCriticalRangeCircle,
  updateRodeLine,
  initializeMap,
  handleAnchorDroppedEvent,
  resetFadeTimer,
  clearFadeTimer,
  stopAnimations,
  cleanupMeasureMode,
  clearAll,
  handleWheelEvent,
  onCleanup,
}) {
  let stopInitialFeatureWatcher = null;
  let hasDrawnInitialFeatures = false;

  const hasBoatPosition = () => {
    const boatLat = boatPosition.value?.latitude?.value;
    const boatLon = boatPosition.value?.longitude?.value;
    return typeof boatLat === "number" && typeof boatLon === "number";
  };

  const hasAnchoredFeatureData = () => {
    if (!hasBoatPosition()) return false;
    if (anchorState.value?.anchorDeployed !== true) return false;

    const anchorPos = anchorState.value?.anchorLocation?.position;
    const anchorLat = anchorPos?.latitude?.value ?? anchorPos?.latitude;
    const anchorLon = anchorPos?.longitude?.value ?? anchorPos?.longitude;
    const criticalRange = anchorState.value?.criticalRange?.r;
    const rodeLength = anchorState.value?.rode?.length;

    return (
      typeof anchorLat === "number" &&
      typeof anchorLon === "number" &&
      typeof criticalRange === "number" &&
      typeof rodeLength === "number"
    );
  };

  const drawInitialFeaturesIfReady = () => {
    if (hasDrawnInitialFeatures) return;
    if (!isMapRenderReadyFromComposable.value) return;

    if (anchorState.value?.anchorDeployed === true) {
      if (!hasAnchoredFeatureData()) return;

      logger.debug("Initial draw: anchored data ready, drawing boat+rode together");
      applyDefaultFramingOnEnter();
      updateAnchorPoints();
      updateCriticalRangeCircle();
      updateRodeLine();
      updateBoatPosition();
      hasDrawnInitialFeatures = true;
      return;
    }

    if (!hasBoatPosition()) return;

    logger.debug("Initial draw: not anchored, drawing boat");
    attachDefaultFramingListener();
    updateBoatPosition();
    hasDrawnInitialFeatures = true;
  };

  const startInitialFeatureWatcher = () => {
    if (stopInitialFeatureWatcher) {
      stopInitialFeatureWatcher();
      stopInitialFeatureWatcher = null;
    }

    stopInitialFeatureWatcher = watch(
      [
        () => isMapRenderReadyFromComposable.value,
        () => boatPosition.value?.latitude?.value,
        () => boatPosition.value?.longitude?.value,
        () => anchorState.value?.anchorDeployed,
        () => anchorState.value?.anchorLocation?.position?.latitude?.value,
        () => anchorState.value?.anchorLocation?.position?.longitude?.value,
        () => anchorState.value?.criticalRange?.r,
        () => anchorState.value?.rode?.length,
      ],
      () => {
        drawInitialFeaturesIfReady();
        if (hasDrawnInitialFeatures && stopInitialFeatureWatcher) {
          stopInitialFeatureWatcher();
          stopInitialFeatureWatcher = null;
        }
      },
      { immediate: true }
    );
  };

  onIonViewDidEnter(() => {
    hasCenteredOnBoatThisEntry.value = null;
    hasLoggedFramingDebugThisEntry.value = false;
    hasAppliedDefaultFramingThisEntry.value = false;
    isAnchorViewActive.value = true;
    updateBoatPosition();
    if (map.value) {
      map.value.updateSize();

      isMapRenderReady.value = false;
      map.value.once("postrender", () => {
        isMapRenderReady.value = true;
        if (isAnchorViewActive.value === true) {
          hasAppliedDefaultFramingThisEntry.value = false;
          attachDefaultFramingListener();
        }
      });
      if (typeof map.value.render === "function") {
        map.value.render();
      }
    }

    nextTick(() => {
      if (!map.value) return;
      map.value.updateSize();

      attachDefaultFramingListener();
    });
  });

  onIonViewDidLeave(() => {
    isAnchorViewActive.value = false;
  });

  watch(map, (nextMap) => {
    if (!nextMap) return;
    if (isAnchorViewActive.value !== true) return;
    if (hasAppliedDefaultFramingThisEntry.value === true) return;
    nextTick(() => {
      attachDefaultFramingListener();
    });
  });

  onMounted(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!map.value) return;
      map.value.updateSize();
      attachDefaultFramingListener();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    onUnmounted(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    });
  });

  onMounted(async () => {
    logger.info("Component mounted, initializing map...");

    try {
      hasDrawnInitialFeatures = false;
      await initializeMap();
      startInitialFeatureWatcher();

      window.addEventListener("anchor-dropped", handleAnchorDroppedEvent);
      logger.info("Data waiting setup complete and event listeners added");

      resetFadeTimer();

      document.addEventListener("touchstart", resetFadeTimer);
      document.addEventListener("click", resetFadeTimer);
    } catch (error) {
      logger.error("Error during component mount", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  });

  onUnmounted(() => {
    if (stopInitialFeatureWatcher) {
      stopInitialFeatureWatcher();
      stopInitialFeatureWatcher = null;
    }
    stopAnimations();
    cleanupMeasureMode();
    clearAll();
    window.removeEventListener("anchor-dropped", handleAnchorDroppedEvent);
    document.removeEventListener("anchor-dropped", handleAnchorDroppedEvent);

    clearFadeTimer();
    document.removeEventListener("touchstart", resetFadeTimer);
    document.removeEventListener("click", resetFadeTimer);
    document.removeEventListener("wheel", handleWheelEvent, { capture: true });
    if (mapElement.value) {
      mapElement.value.removeEventListener("wheel", handleWheelEvent);
    }
    if (typeof onCleanup === "function") {
      onCleanup();
    }
  });
}
