import MouseWheelZoom from "ol/interaction/MouseWheelZoom";

export function useAnchorMapInitialization({
  logger,
  stateStore,
  map,
  mapElement,
  isDarkMode,
  isMapRenderReadyFromComposable,
  initializeMapComposable,
  getResponsiveZoom,
  getVectorSource,
  setVectorSource,
  resetFeatureRegistry,
  setupInteractions,
  attachDefaultFramingListener,
  hasAppliedDefaultFramingThisEntry,
  updateWindIndicatorScale,
  handleMapClick,
  handleWheelEvent,
}) {
  const initializeMap = async () => {
    logger.info("Initializing map...");
    logger.debug("Starting map initialization");

    const currentState = stateStore.state;
    const pos = currentState?.navigation?.position;
    const anchor = currentState?.anchor;

    logger.debug("Position data:", pos ? pos : "No position data");
    logger.debug("Position details:", {
      latitude: pos?.latitude?.value,
      longitude: pos?.longitude?.value,
      hasLat: pos?.latitude?.value != null,
      hasLon: pos?.longitude?.value != null,
    });
    logger.debug("Anchor state:", anchor);

    let centerLat = 0;
    let centerLon = 0;
    let hasValidPosition = false;

    if (anchor?.anchorDeployed) {
      const anchorLoc = anchor?.anchorLocation;
      const anchorPos = anchorLoc?.position ?? anchorLoc;
      const anchorLat = anchorPos?.latitude?.value ?? anchorPos?.latitude;
      const anchorLon = anchorPos?.longitude?.value ?? anchorPos?.longitude;

      if (anchorLat != null && anchorLon != null) {
        centerLat = anchorLat;
        centerLon = anchorLon;
        hasValidPosition = true;
        logger.debug("Centering on anchor location:", { lat: centerLat, lon: centerLon });
      } else {
        const dropLoc = anchor?.anchorDropLocation;
        const dropPos = dropLoc?.position ?? dropLoc;
        const dropLat = dropPos?.latitude?.value ?? dropPos?.latitude;
        const dropLon = dropPos?.longitude?.value ?? dropPos?.longitude;
        if (dropLat != null && dropLon != null) {
          centerLat = dropLat;
          centerLon = dropLon;
          hasValidPosition = true;
          logger.debug("Centering on anchor drop location:", { lat: centerLat, lon: centerLon });
        }
      }
    }

    if (!hasValidPosition && pos?.latitude?.value != null && pos?.longitude?.value != null) {
      centerLat = pos.latitude.value;
      centerLon = pos.longitude.value;
      hasValidPosition = true;
      logger.debug("Centering on boat position:", { lat: centerLat, lon: centerLon });
    }

    if (!hasValidPosition) {
      logger.debug("Using default position (0,0)");
    }

    try {
      await initializeMapComposable({
        center: [centerLon, centerLat],
        zoom: typeof getResponsiveZoom === "function" ? getResponsiveZoom() : 12,
        isDarkMode: isDarkMode.value,
      });

      isMapRenderReadyFromComposable.value = true;
      console.log("Map initialized and set as ready");

      const provider = map.value?.__provider__;
      if (provider && provider.getVectorSource) {
        const providerVectorSource = provider.getVectorSource();
        const features = getVectorSource()?.getFeatures?.() || [];
        features.forEach((feature) => providerVectorSource.addFeature(feature));

        setVectorSource(providerVectorSource);
        resetFeatureRegistry();
      }

      setupInteractions();

      if (map.value && typeof map.value.on === "function") {
        map.value.on("loadcomplete", () => {
          try {
            logger.debug("Map load complete event fired");
            updateWindIndicatorScale();
          } catch (error) {
            console.error("Error in map load complete:", error);
          }
        });
      } else {
        console.log("Map object not available for event listeners");
      }

      hasAppliedDefaultFramingThisEntry.value = false;
      attachDefaultFramingListener();

      setTimeout(() => {
        if (!isMapRenderReadyFromComposable.value) {
          console.log("Backup: setting map ready");
          isMapRenderReadyFromComposable.value = true;
        }
      }, 1000);

      logger.info("Map initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize map:", error);
      throw error;
    }

    setTimeout(() => {
      if (map.value) {
        const canvas = map.value.getViewport().querySelector("canvas");
        if (canvas) {
          canvas.getContext("2d", { willReadFrequently: true });
          logger.debug("Set willReadFrequently on map canvas for better performance");
        }
      }
    }, 100);

    const mouseWheelZoom = new MouseWheelZoom({
      duration: 250,
      timeout: 80,
      useAnchor: true,
    });
    map.value.addInteraction(mouseWheelZoom);

    setTimeout(() => {
      const attributionElements = document.querySelectorAll(
        ".ol-attribution, .ol-attribution-button, .ol-attribution ul"
      );
      attributionElements.forEach((el) => {
        el.style.visibility = "hidden";
        el.style.display = "none";
      });
    }, 100);

    const mapClickHandler = typeof handleMapClick === "function" ? handleMapClick() : null;
    if (typeof mapClickHandler === "function") {
      map.value.on("click", mapClickHandler);
    }

    const wheelHandler = typeof handleWheelEvent === "function" ? handleWheelEvent() : null;
    if (mapElement.value) {
      if (typeof wheelHandler === "function") {
        mapElement.value.addEventListener("wheel", wheelHandler, { passive: false });
      }
      mapElement.value.tabIndex = 0;
      mapElement.value.style.outline = "none";
      mapElement.value.focus();
    }
    if (typeof wheelHandler === "function") {
      document.addEventListener("wheel", wheelHandler, { passive: false, capture: true });
    }
  };

  return {
    initializeMap,
  };
}
