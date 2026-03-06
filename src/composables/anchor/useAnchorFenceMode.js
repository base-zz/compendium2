import { ref } from "vue";

export function useAnchorFenceMode({
  map,
  toLonLat,
  featureTypes,
  logger,
  getAnchorState,
  disableMeasureMode,
}) {
  const fenceModeEnabled = ref(false);
  const showFenceConfigModal = ref(false);
  const showFenceListModal = ref(false);
  const selectedFenceTarget = ref(null);
  const fenceName = ref("");
  const fenceRangeInput = ref("");
  const fenceReferenceType = ref("");
  const fenceValidationError = ref(null);

  const resetFenceDraft = () => {
    selectedFenceTarget.value = null;
    fenceName.value = "";
    fenceRangeInput.value = "";
    fenceReferenceType.value = "";
    fenceValidationError.value = null;
  };

  const handleFenceModalCancel = () => {
    showFenceConfigModal.value = false;
    resetFenceDraft();
  };

  const handleFenceReferenceChange = (event) => {
    const value = event?.target?.value;
    if (typeof value !== "string") {
      return;
    }
    fenceReferenceType.value = value;
    fenceValidationError.value = null;
  };

  const toggleFenceMode = () => {
    if (fenceModeEnabled.value === true) {
      fenceModeEnabled.value = false;
      return;
    }

    const anchorState = typeof getAnchorState === "function" ? getAnchorState() : null;
    if (Array.isArray(anchorState?.fences) && anchorState.fences.length > 0) {
      showFenceListModal.value = true;
      return;
    }

    fenceModeEnabled.value = true;
    if (fenceModeEnabled.value === true && typeof disableMeasureMode === "function") {
      disableMeasureMode();
    }
  };

  const startFenceSelectionFromList = () => {
    showFenceListModal.value = false;
    fenceModeEnabled.value = true;
    if (typeof disableMeasureMode === "function") {
      disableMeasureMode();
    }
  };

  const handleFenceMapClick = (event) => {
    if (fenceModeEnabled.value !== true) {
      return false;
    }

    const clickedFeaturesForFence = map.value?.getFeaturesAtPixel?.(event.pixel);
    const aisFeatureForFence = Array.isArray(clickedFeaturesForFence)
      ? clickedFeaturesForFence.find((feature) => feature.get("type") === featureTypes.AIS)
      : null;

    if (aisFeatureForFence) {
      const mmsi = aisFeatureForFence.get("mmsi");
      const name = aisFeatureForFence.get("name");
      if (mmsi != null) {
        selectedFenceTarget.value = {
          targetType: "ais",
          name: name || "AIS Target",
          targetRef: { mmsi },
        };
        fenceName.value = name || "";
        showFenceConfigModal.value = true;
        return true;
      }
    }

    const lonLatClicked = toLonLat(event.coordinate);
    if (!Array.isArray(lonLatClicked) || lonLatClicked.length < 2) {
      logger?.warn?.("Fence mode click ignored: invalid map coordinate", {
        coordinate: event.coordinate,
      });
      return true;
    }

    const clickedLon = lonLatClicked[0];
    const clickedLat = lonLatClicked[1];
    if (typeof clickedLat !== "number" || typeof clickedLon !== "number") {
      logger?.warn?.("Fence mode click ignored: non-numeric coordinate", {
        lonLatClicked,
      });
      return true;
    }

    selectedFenceTarget.value = {
      targetType: "point",
      name: "Map Point",
      targetRef: {
        latitude: clickedLat,
        longitude: clickedLon,
      },
    };
    fenceName.value = "";
    showFenceConfigModal.value = true;
    return true;
  };

  return {
    fenceModeEnabled,
    showFenceConfigModal,
    showFenceListModal,
    selectedFenceTarget,
    fenceName,
    fenceRangeInput,
    fenceReferenceType,
    fenceValidationError,
    toggleFenceMode,
    startFenceSelectionFromList,
    handleFenceModalCancel,
    handleFenceReferenceChange,
    handleFenceMapClick,
    resetFenceDraft,
  };
}
