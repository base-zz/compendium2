import { watch } from "vue";

export function useAnchorViewWatchers({
  logger,
  map,
  stateStore,
  state,
  anchorState,
  boatPosition,
  anchorDropLocation,
  anchorDeployed,
  aisTargets,
  breadcrumbs,
  isAisInitialLoad,
  measureModeEnabled,
  hasAppliedDefaultFramingThisEntry,
  toLonLat,
  fromLonLat,
  featureTypes,
  clearFeature,
  updateBoatPosition,
  updateFenceFeatures,
  updateRodeLine,
  updateAnchorPoints,
  updateCriticalRangeCircle,
  updateBoatRangeCircle,
  updateAisTargets,
  updateBreadcrumbs,
  syncMeasurementWithBoat,
}) {
  watch(
    () => stateStore.state?.navigation?.position,
    (newPosition) => {
      if (newPosition && newPosition.latitude?.value && newPosition.longitude?.value) {
        if (map.value && !hasAppliedDefaultFramingThisEntry.value) {
          const view = map.value.getView();
          const currentCenter = view.getCenter();

          const currentLonLat = toLonLat(currentCenter);
          const isAtDefault = Math.abs(currentLonLat[0]) < 1 && Math.abs(currentLonLat[1]) < 1;

          if (isAtDefault) {
            const boatCoord = fromLonLat([newPosition.longitude.value, newPosition.latitude.value]);
            view.setCenter(boatCoord);
            hasAppliedDefaultFramingThisEntry.value = true;
          }
        }
      }
    },
    { immediate: true, deep: true }
  );

  watch(
    () => stateStore.state.navigation?.position,
    () => {
      updateBoatPosition();
      updateFenceFeatures();
      if (anchorState.value?.anchorDeployed) {
        updateRodeLine();
      }
    },
    { immediate: true, deep: true }
  );

  watch(
    () => stateStore.state.navigation?.course?.heading,
    () => {
      updateBoatPosition();
    },
    { immediate: true, deep: true }
  );

  watch(
    anchorState,
    () => {
      if (!anchorState.value) {
        return;
      }

      if (anchorState.value.anchorDeployed) {
        updateAnchorPoints();
        updateCriticalRangeCircle();
        updateRodeLine();
      } else {
        clearFeature(featureTypes.ANCHOR_DROP_LOCATION);
        clearFeature(featureTypes.ANCHOR_LOCATION);
        clearFeature(featureTypes.RODE);
        clearFeature(featureTypes.CIRCLE);
      }
    },
    { deep: true, immediate: true }
  );

  watch(
    boatPosition,
    (newPosition) => {
      logger.debug("Boat position updated", { position: newPosition });

      updateFenceFeatures();

      if (measureModeEnabled.value) {
        syncMeasurementWithBoat();
      }

      if (!anchorState.value) {
        return;
      }

      if (anchorState.value.anchorDeployed) {
        updateRodeLine();
      }
    },
    { deep: true }
  );

  watch(
    anchorState,
    (newState, oldState) => {
      if (!newState) return;

      if (
        newState.anchorLocation?.position &&
        oldState?.anchorLocation?.position &&
        (newState.anchorLocation.position.latitude?.value !==
          oldState.anchorLocation.position.latitude?.value ||
          newState.anchorLocation.position.longitude?.value !==
            oldState.anchorLocation.position.longitude?.value)
      ) {
        logger.debug("Anchor location updated by server", {
          oldPosition: oldState.anchorLocation.position,
          newPosition: newState.anchorLocation.position,
        });

        updateAnchorPoints();
        updateCriticalRangeCircle();
        updateRodeLine();
      }

      if (newState.dragging !== oldState?.dragging) {
        logger.debug("Anchor dragging state changed", {
          isDragging: newState.dragging,
        });

        updateCriticalRangeCircle();
      }
    },
    { deep: true }
  );

  watch(
    () => anchorState.value?.dragging,
    (isDragging) => {
      logger.debug("Anchor dragging state changed", {
        isDragging: isDragging,
      });
    },
    { immediate: true, deep: true }
  );

  watch(
    [() => anchorState.value?.criticalRange?.r, () => anchorState.value?.dragging],
    ([range, isDragging]) => {
      logger.debug("Critical anchor state changed:", {
        criticalRange: range,
        isDragging: isDragging,
      });

      if (!anchorState.value) {
        clearFeature(featureTypes.CIRCLE);
        return;
      }

      updateCriticalRangeCircle();
      updateBoatRangeCircle();
    },
    { immediate: true, deep: true }
  );

  watch(
    () => state.value.aisTargets,
    () => {
      if (typeof isAisInitialLoad === "function" && isAisInitialLoad() === true) {
        logger.debug("Skipping raw AIS targets update on initial load");
        return;
      }
      updateAisTargets();
      updateFenceFeatures();
    },
    { deep: true }
  );

  watch(
    () => anchorState.value?.fences,
    () => {
      updateFenceFeatures();
    },
    { deep: true }
  );

  watch(
    () => boatPosition.value,
    () => {
      updateBoatRangeCircle();
    },
    { deep: true }
  );

  watch(
    () => anchorState.value?.criticalRange?.r,
    (newVal) => {
      logger.debug("Critical range changed:", newVal);
      logger.debug("Anchor drop location:", anchorDropLocation.value);
      logger.debug("Anchor deployed:", anchorDeployed.value);
    },
    { immediate: true }
  );

  watch(
    aisTargets,
    () => {
      updateAisTargets();
    },
    { immediate: true, deep: true }
  );

  watch(
    breadcrumbs,
    () => {
      updateBreadcrumbs();
    },
    { immediate: true }
  );
}
