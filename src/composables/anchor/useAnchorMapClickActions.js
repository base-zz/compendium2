export function useAnchorMapClickActions({
  logger,
  map,
  featureTypes,
  state,
  handleMeasureMapClick,
  handleFenceMapClick,
  buildAisModalTarget,
  showAISModal,
  selectedAISTarget,
  updateAnchorPoints,
  updateCriticalRangeCircle,
  updateRodeLine,
  updateBoatRangeCircle,
}) {
  const openAISModal = (aisFeature) => {
    const mmsi = aisFeature.get("mmsi");
    const name = aisFeature.get("name");

    logger.debug(`[AIS Modal] Opening modal for MMSI: ${mmsi}, Name: ${name}`);

    const mmsiStr = String(mmsi);
    const raw = state.value.aisTargets?.[mmsiStr];
    if (!raw) {
      logger.warn(`[AIS Modal] No AIS target found in store for MMSI: ${mmsi}`);
    } else {
      logger.debug("[AIS Modal] Found raw target data:", raw);
    }

    selectedAISTarget.value = buildAisModalTarget({
      raw,
      mmsi,
      name,
      ownPosition: state.value?.navigation?.position,
    });

    showAISModal.value = true;
  };

  const handleMapClick = (event) => {
    logger.debug("Map click detected", {
      coordinate: event.coordinate,
      pixel: event.pixel,
      type: event.type,
    });

    if (handleMeasureMapClick(event)) {
      return;
    }

    if (handleFenceMapClick(event)) {
      return;
    }

    const clickedFeatures = map.value?.getFeaturesAtPixel?.(event.pixel);

    if (clickedFeatures && clickedFeatures.length > 0) {
      const aisFeature = clickedFeatures.find(
        (feature) => feature.get("type") === featureTypes.AIS
      );

      if (aisFeature) {
        const mmsi = aisFeature.get("mmsi");
        const name = aisFeature.get("name");

        logger.debug(`Clicked on AIS target: ${name || "Unnamed"} (MMSI: ${mmsi || "N/A"})`);

        openAISModal(aisFeature);
      }
    }
  };

  const handleAnchorDroppedEvent = (event) => {
    logger.debug("Received anchor-dropped event", event.detail);

    updateAnchorPoints();
    updateCriticalRangeCircle();
    updateRodeLine();
    updateBoatRangeCircle();
  };

  return {
    openAISModal,
    handleMapClick,
    handleAnchorDroppedEvent,
  };
}
