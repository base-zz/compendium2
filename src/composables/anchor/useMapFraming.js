import { ref } from "vue";
import { fromLonLat } from "ol/proj";

export function useMapFraming(map, isMapRenderReady) {
  const hasAppliedDefaultFramingThisEntry = ref(false);
  const isAnchorViewActive = ref(false);
  const hasCenteredOnBoatThisEntry = ref(null);
  const hasLoggedFramingDebugThisEntry = ref(false);

  const getAnchorTargetCoord = (anchorState) => {
    if (!anchorState) return null;
    if (anchorState.anchorDeployed !== true) return null;

    const dropPos = anchorState.anchorDropLocation?.position;
    const anchorPos = anchorState.anchorLocation?.position;
    const pos = anchorPos ?? dropPos;
    if (!pos) return null;

    const lat = pos.latitude?.value ?? pos.latitude;
    const lon = pos.longitude?.value ?? pos.longitude;
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return { lon, lat, coord: fromLonLat([lon, lat]) };
  };

  const getBoatCenterCoord = (boatPosition) => {
    if (!boatPosition || !boatPosition.latitude || !boatPosition.longitude) return null;
    if (boatPosition.latitude.value == null || boatPosition.longitude.value == null) return null;

    const lat = boatPosition.latitude.value;
    const lon = boatPosition.longitude.value;
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return fromLonLat([lon, lat]);
  };

  const applyDefaultFramingOnEnter = (anchorState, boatPosition, mapElement) => {
    if (!map.value) return false;
    const view = map.value.getView();
    if (!view) return false;

    map.value.updateSize();
    const size = map.value.getSize();

    // Validate map size
    if (!Array.isArray(size) || size.length !== 2) return false;
    if (typeof size[0] !== "number" || typeof size[1] !== "number") return false;
    if (!(size[0] >= 200) || !(size[1] >= 200)) return false;

    const isAnchorDeployed = anchorState?.anchorDeployed === true;
    const anchorTarget = getAnchorTargetCoord(anchorState);

    // If anchor deployed but no target coord yet, keep retrying
    if (isAnchorDeployed === true && !anchorTarget) return false;

    if (anchorTarget) {
      const critical = anchorState?.criticalRange;
      const rawRadius = critical?.r ?? critical?.value;
      const units = critical?.units || anchorState?.rode?.units;

      // Convert radius to meters
      let radiusMeters = null;
      if (typeof rawRadius === "number" && !Number.isNaN(rawRadius)) {
        const u = typeof units === "string" ? units.toLowerCase() : null;
        if (u && u.startsWith("m")) {
          radiusMeters = rawRadius;
        } else if (u && u.startsWith("ft")) {
          radiusMeters = rawRadius / 3.28084;
        }
      }

      if (typeof radiusMeters === "number" && radiusMeters > 0) {
        // Calculate zoom to fit critical range at 80% of smaller dimension
        const minDimPx = Math.min(size[0], size[1]);
        const targetRadiusPx = 0.8 * minDimPx / 2;

        // Account for latitude distortion in Web Mercator
        const latRad = (anchorTarget.lat * Math.PI) / 180;
        const scaleFactor = Math.cos(latRad);
        const projectedRadius = radiusMeters / scaleFactor;
        const resolution = projectedRadius / targetRadiusPx;

        if (resolution > 0 && Number.isFinite(resolution)) {
          // Get actual DOM element dimensions and force map to use them
          const domRect = mapElement ? mapElement.getBoundingClientRect() : null;
          
          if (domRect && domRect.width > 0 && domRect.height > 0) {
            // Use DOM dimensions for calculations
            const domWidth = Math.round(domRect.width);
            const domHeight = Math.round(domRect.height);
            const domMinDim = Math.min(domWidth, domHeight);
            const domTargetRadiusPx = 0.8 * domMinDim / 2;
            const domResolution = projectedRadius / domTargetRadiusPx;

            // Force the map to use the correct size
            map.value.setSize([domWidth, domHeight]);
            
            view.setResolution(domResolution);
            view.setCenter(anchorTarget.coord);
            map.value.render();
            
            hasAppliedDefaultFramingThisEntry.value = true;
            return true;
          }
        }
      }

      // Couldn't calculate zoom, just center on anchor
      view.setCenter(anchorTarget.coord);
      if (isAnchorDeployed === true) return false;

      hasAppliedDefaultFramingThisEntry.value = true;
      return true;
    }

    // No anchor, center on boat
    const boatCoord = getBoatCenterCoord(boatPosition);
    if (!boatCoord) return false;
    view.setCenter(boatCoord);
    hasAppliedDefaultFramingThisEntry.value = true;
    return true;
  };

  const attachDefaultFramingListener = (anchorState, boatPosition, mapElement) => {
    if (!map.value) return;
    if (isMapRenderReady.value !== true) return;
    if (hasAppliedDefaultFramingThisEntry.value === true) return;

    const attemptApply = () => {
      if (hasAppliedDefaultFramingThisEntry.value === true) {
        map.value?.un?.("postrender", attemptApply);
        return;
      }

      const applied = applyDefaultFramingOnEnter(anchorState, boatPosition, mapElement);
      if (applied === true) {
        map.value?.un?.("postrender", attemptApply);
      }
    };

    map.value.on("postrender", attemptApply);
    attemptApply();
    if (typeof map.value.render === "function") {
      map.value.render();
    }
  };

  const centerOnBoat = (boatPosition) => {
    if (!map.value) return;
    const boatCoord = getBoatCenterCoord(boatPosition);
    if (boatCoord) {
      map.value.getView().animate({
        center: boatCoord,
        duration: 500,
      });
    }
  };

  const centerOnAnchor = (anchorState) => {
    if (!map.value) return;
    const anchorTarget = getAnchorTargetCoord(anchorState);
    if (anchorTarget) {
      map.value.getView().animate({
        center: anchorTarget.coord,
        duration: 500,
      });
    }
  };

  const recenterMap = (anchorState, boatPosition, mapElement) => {
    hasAppliedDefaultFramingThisEntry.value = false;
    attachDefaultFramingListener(anchorState, boatPosition, mapElement);
  };

  const zoomIn = (boatPosition, updateWindIndicatorScale) => {
    if (!map.value) return;
    const view = map.value.getView();
    if (!view) return;

    const currentZoom = view.getZoom();
    const newZoom = currentZoom + 1;

    // Get boat position for centering
    if (boatPosition?.latitude?.value && boatPosition?.longitude?.value) {
      const boatCoords = fromLonLat([
        boatPosition.longitude.value,
        boatPosition.latitude.value,
      ]);

      // Animate to new zoom level centered on boat
      view.animate({
        zoom: newZoom,
        center: boatCoords,
        duration: 250,
      });
    } else {
      // If no valid boat position, just zoom in place
      view.animate({
        zoom: newZoom,
        duration: 250,
        center: view.getCenter(), // Keep current center
      });
    }

    if (updateWindIndicatorScale) {
      updateWindIndicatorScale();
    }
  };

  const zoomOut = (boatPosition, updateWindIndicatorScale) => {
    if (!map.value) return;
    const view = map.value.getView();
    if (!view) return;

    const currentZoom = view.getZoom();
    const newZoom = currentZoom - 1;

    // Get boat position for centering
    if (boatPosition?.latitude?.value && boatPosition?.longitude?.value) {
      const boatCoords = fromLonLat([
        boatPosition.longitude.value,
        boatPosition.latitude.value,
      ]);

      // Animate to new zoom level centered on boat
      view.animate({
        zoom: newZoom,
        center: boatCoords,
        duration: 250,
      });
    } else {
      // If no valid boat position, just zoom in place
      view.animate({
        zoom: newZoom,
        duration: 250,
        center: view.getCenter(), // Keep current center
      });
    }

    if (updateWindIndicatorScale) {
      updateWindIndicatorScale();
    }
  };

  return {
    hasAppliedDefaultFramingThisEntry,
    isAnchorViewActive,
    hasCenteredOnBoatThisEntry,
    hasLoggedFramingDebugThisEntry,
    getAnchorTargetCoord,
    getBoatCenterCoord,
    applyDefaultFramingOnEnter,
    attachDefaultFramingListener,
    centerOnBoat,
    centerOnAnchor,
    recenterMap,
    zoomIn,
    zoomOut
  };
}