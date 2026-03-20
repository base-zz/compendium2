export function useAnchorFencePersistence({
  logger,
  stateStore,
  anchorState,
  navigationState,
  isMetric,
  selectedFenceTarget,
  fenceName,
  fenceRangeInput,
  fenceReferenceType,
  fenceValidationError,
  normalizeDepthDatum,
  updateFenceFeatures,
  onFenceSaved,
}) {
  const resolveFenceDropDepth = () => {
    if (typeof normalizeDepthDatum !== "function") {
      return null;
    }

    const currentAnchorState = anchorState?.value;
    const currentNavigationState = navigationState?.value;

    const existingFenceDropDepth = normalizeDepthDatum(currentAnchorState?.anchorDropLocation?.depth);
    const navigationFenceDepth = normalizeDepthDatum(currentNavigationState?.depth);

    if (existingFenceDropDepth?.value != null) {
      return existingFenceDropDepth;
    }
    if (navigationFenceDepth?.value != null) {
      return navigationFenceDepth;
    }
    return existingFenceDropDepth || navigationFenceDepth;
  };

  const applyFenceDropDepthIfAvailable = () => {
    const currentAnchorState = anchorState?.value;
    if (!currentAnchorState?.anchorDropLocation) {
      return;
    }

    const resolvedFenceDropDepth = resolveFenceDropDepth();
    if (!resolvedFenceDropDepth) {
      return;
    }

    currentAnchorState.anchorDropLocation = {
      ...currentAnchorState.anchorDropLocation,
      depth: resolvedFenceDropDepth,
      depthSource:
        typeof currentAnchorState.anchorDropLocation.depthSource === "string"
          ? currentAnchorState.anchorDropLocation.depthSource
          : "assumed_from_boat",
    };
  };

  const persistAnchorUpdate = async (sourceLabel) => {
    const payload = anchorState?.value;
    if (!payload) {
      return;
    }

    if (typeof stateStore?.sendMessageToServer !== "function") {
      return;
    }

    try {
      await stateStore.sendMessageToServer("anchor:update", payload, {
        source: sourceLabel,
        timeout: 5000,
      });
    } catch (error) {
      logger?.error?.("Failed to persist fence update", { source: sourceLabel, error });
    }
  };

  const handleFenceSave = async () => {
    const currentAnchorState = anchorState?.value;
    if (!currentAnchorState) {
      logger?.warn?.("Cannot save fence: anchorState is undefined");
      fenceValidationError.value = "Anchor state is unavailable.";
      return;
    }

    const target = selectedFenceTarget?.value;
    if (!target) {
      logger?.warn?.("Cannot save fence: selectedFenceTarget is undefined");
      fenceValidationError.value = "Select a fence target first.";
      return;
    }

    const referenceType = fenceReferenceType?.value;
    const supportedReferenceTypes = ["boat", "anchor_drop", "anchor_location"];
    if (!supportedReferenceTypes.includes(referenceType)) {
      logger?.warn?.("Cannot save fence: reference type is not selected");
      fenceValidationError.value = "Select a reference (Boat, Anchor Drop, or Anchor Location).";
      return;
    }

    const parsedRange = Number(fenceRangeInput?.value);
    if (!Number.isFinite(parsedRange) || parsedRange <= 0) {
      logger?.warn?.("Cannot save fence: invalid alert range", { value: fenceRangeInput?.value });
      fenceValidationError.value = "Enter a valid alert range.";
      return;
    }

    fenceValidationError.value = null;

    if (!Array.isArray(currentAnchorState.fences)) {
      currentAnchorState.fences = [];
    }

    const units = isMetric?.value ? "m" : "ft";
    const fallbackName = target.targetType === "ais" ? "AIS Fence" : "Point Fence";
    const draftName = fenceName?.value;

    const nextFence = {
      id: `fence-${Date.now()}`,
      name: draftName && draftName.trim() ? draftName.trim() : fallbackName,
      enabled: true,
      targetType: target.targetType,
      targetRef: target.targetRef,
      referenceType,
      alertRange: parsedRange,
      units,
      currentDistance: null,
      currentDistanceUnits: units,
      minimumDistance: null,
      minimumDistanceUnits: units,
      minimumDistanceUpdatedAt: null,
      distanceHistory: [],
      inAlert: false,
      createdAt: Date.now(),
    };

    currentAnchorState.fences.push(nextFence);
    applyFenceDropDepthIfAvailable();

    await persistAnchorUpdate("AnchorView.handleFenceSave");

    if (typeof updateFenceFeatures === "function") {
      updateFenceFeatures();
    }

    if (typeof onFenceSaved === "function") {
      onFenceSaved();
    }
  };

  const removeFence = async (fenceId) => {
    const currentAnchorState = anchorState?.value;
    if (!currentAnchorState || !Array.isArray(currentAnchorState.fences)) {
      return;
    }

    currentAnchorState.fences = currentAnchorState.fences.filter((fence) => fence.id !== fenceId);

    if (typeof updateFenceFeatures === "function") {
      updateFenceFeatures();
    }

    applyFenceDropDepthIfAvailable();
    await persistAnchorUpdate("AnchorView.removeFence");
  };

  return {
    handleFenceSave,
    removeFence,
  };
}
