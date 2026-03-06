export function useAnchorResetCommands({
  logger,
  stateStore,
  anchorState,
  boatPosition,
  vectorSource,
  featureTypes,
  styles,
  updateBoatPosition,
  updateFenceFeatures,
  dropNowSessionActive,
  dropNowCapturedDepth,
  showUpdateDialog,
  showUpdateDropConfirm,
  showCancelDialog,
}) {
  const handleUpdateDropLocation = () => {
    const anchorPos = anchorState.value?.anchorLocation?.position;
    if (!anchorPos) {
      logger.warn("Cannot update drop location - anchorLocation.position is missing");
      return;
    }

    const lat =
      typeof anchorPos.latitude === "object" ? anchorPos.latitude.value : anchorPos.latitude;
    const lon =
      typeof anchorPos.longitude === "object" ? anchorPos.longitude.value : anchorPos.longitude;

    if (
      lat === null ||
      lat === undefined ||
      lon === null ||
      lon === undefined ||
      typeof lat !== "number" ||
      typeof lon !== "number" ||
      Number.isNaN(lat) ||
      Number.isNaN(lon)
    ) {
      logger.warn("Cannot update drop location - invalid anchorLocation.position coordinates", {
        latitude: anchorPos.latitude,
        longitude: anchorPos.longitude,
      });
      return;
    }

    anchorState.value.anchorDropLocation.position = {
      latitude: { value: lat, units: "deg" },
      longitude: { value: lon, units: "deg" },
    };

    showUpdateDialog.value = false;
  };

  const confirmUpdateDropLocation = () => {
    logger.info("Confirming update of drop location...");
    handleUpdateDropLocation();
    try {
      const updatedAnchor = anchorState.value;
      if (updatedAnchor) {
        const payload = {
          type: "anchor:update",
          data: {
            action: "reset_anchor_here",
          },
        };

        console.log("[AnchorView] Sending to server - reset anchor here payload:", payload);

        stateStore
          .sendMessageToServer("anchor:update", payload.data, {
            source: "AnchorView.confirmUpdateDropLocation",
            timeout: 5000,
          })
          .then((response) => {
            logger.info("Server acknowledged updated drop location", response);
            console.log("[AnchorView] Server response for reset anchor here:", {
              fullResponse: response,
              responseData: response.data,
              serverAnchorLocation: response?.data?.anchorLocation,
              serverDropLocation: response?.data?.anchorDropLocation,
              serverBearing: response?.data?.anchorDropLocation?.bearing,
              serverTimes: response?.data?.anchorDropLocation?.time,
            });
          })
          .catch((error) => {
            logger.error("Failed to send updated drop location to server", error);
          });
      }
    } catch (error) {
      logger.error("Error preparing anchor update for server", error);
    }
    showUpdateDropConfirm.value = false;
    showCancelDialog.value = false;
  };

  const handleCancelAnchor = () => {
    logger.info("Handling cancel anchor action...");
    const boatFeatures = [];
    const aisFeatures = [];

    vectorSource.forEachFeature((feature) => {
      const featureType = feature.get("type");
      if (featureType === featureTypes.BOAT) {
        boatFeatures.push(feature);
      } else if (featureType === featureTypes.AIS) {
        aisFeatures.push(feature);
      }
    });

    logger.debug("Found features to preserve", {
      boatFeatures: boatFeatures.length,
      aisFeatures: aisFeatures.length,
    });

    vectorSource.clear();

    boatFeatures.forEach((feature) => {
      vectorSource.addFeature(feature);
    });

    aisFeatures.forEach((feature) => {
      feature.set("isInWarningRange", false);
      feature.setStyle(styles.AIS_VESSEL);
      vectorSource.addFeature(feature);
    });

    if (boatFeatures.length === 0 && boatPosition.value) {
      updateBoatPosition();
    }

    if (anchorState.value && Array.isArray(anchorState.value.fences)) {
      anchorState.value.fences = [];
    }
    dropNowSessionActive.value = false;
    dropNowCapturedDepth.value = null;
    stateStore.cancelAnchor();
    updateFenceFeatures();

    showCancelDialog.value = false;
  };

  return {
    handleUpdateDropLocation,
    confirmUpdateDropLocation,
    handleCancelAnchor,
  };
}
