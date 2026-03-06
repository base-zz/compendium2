export function useAnchorAnimation({
  fromLonLat,
  toLonLat,
  getFeatureByType,
  featureTypes,
  getState,
  getAnchorState,
  onRodeMissing,
}) {
  let currentBoatPosition = null;
  let boatAnimationFrame = null;
  let rodeAnimationFrame = null;

  const cancelBoatAnimation = () => {
    if (boatAnimationFrame) {
      cancelAnimationFrame(boatAnimationFrame);
      boatAnimationFrame = null;
    }
  };

  const cancelRodeAnimation = () => {
    if (rodeAnimationFrame) {
      cancelAnimationFrame(rodeAnimationFrame);
      rodeAnimationFrame = null;
    }
  };

  const updateBoatFeaturePosition = (x, y) => {
    const boatFeature = getFeatureByType(featureTypes.BOAT);
    if (!boatFeature) {
      return;
    }

    const geometry = boatFeature.getGeometry();
    if (geometry && typeof geometry.setCoordinates === "function") {
      geometry.setCoordinates([x, y]);
      boatFeature.changed();
    }
  };

  const updateRodeFeaturePosition = (boatX, boatY, anchorX, anchorY) => {
    const rodeFeature = getFeatureByType(featureTypes.RODE);
    if (!rodeFeature) {
      return;
    }

    const geometry = rodeFeature.getGeometry();
    if (geometry && typeof geometry.setCoordinates === "function") {
      geometry.setCoordinates([
        [boatX, boatY],
        [anchorX, anchorY],
      ]);
      rodeFeature.changed();
    }
  };

  const resolveAnchorCoord = () => {
    const state = typeof getState === "function" ? getState() : null;
    const anchorPos = state?.anchor?.anchorLocation?.position;
    if (!anchorPos) {
      return null;
    }

    const anchorLat = anchorPos.latitude?.value ?? anchorPos.latitude;
    const anchorLon = anchorPos.longitude?.value ?? anchorPos.longitude;

    if (typeof anchorLat !== "number" || typeof anchorLon !== "number") {
      return null;
    }

    return fromLonLat([anchorLon, anchorLat]);
  };

  const isAnchorDeployed = () => {
    const anchorState = typeof getAnchorState === "function" ? getAnchorState() : null;
    return anchorState?.anchorDeployed === true;
  };

  const setCurrentBoatPositionFromLatLon = (lat, lon) => {
    if (typeof lat !== "number" || !Number.isFinite(lat)) {
      return;
    }
    if (typeof lon !== "number" || !Number.isFinite(lon)) {
      return;
    }

    const coord = fromLonLat([lon, lat]);
    currentBoatPosition = { lat, lon, x: coord[0], y: coord[1] };
  };

  const animateBoatPosition = (targetLat, targetLon, duration = 500) => {
    if (typeof targetLat !== "number" || !Number.isFinite(targetLat)) {
      return;
    }
    if (typeof targetLon !== "number" || !Number.isFinite(targetLon)) {
      return;
    }

    const targetCoord = fromLonLat([targetLon, targetLat]);
    const anchorCoord = resolveAnchorCoord();

    if (!currentBoatPosition) {
      currentBoatPosition = {
        lat: targetLat,
        lon: targetLon,
        x: targetCoord[0],
        y: targetCoord[1],
      };
      updateBoatFeaturePosition(targetCoord[0], targetCoord[1]);

      if (anchorCoord) {
        const rodeFeature = getFeatureByType(featureTypes.RODE);
        if (!rodeFeature && isAnchorDeployed()) {
          if (typeof onRodeMissing === "function") {
            onRodeMissing();
          }
        } else {
          updateRodeFeaturePosition(targetCoord[0], targetCoord[1], anchorCoord[0], anchorCoord[1]);
        }
      }

      return;
    }

    cancelBoatAnimation();
    cancelRodeAnimation();

    const startX = currentBoatPosition.x;
    const startY = currentBoatPosition.y;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const currentX = startX + (targetCoord[0] - startX) * easeProgress;
      const currentY = startY + (targetCoord[1] - startY) * easeProgress;

      currentBoatPosition.x = currentX;
      currentBoatPosition.y = currentY;
      currentBoatPosition.lat = targetLat;
      currentBoatPosition.lon = targetLon;

      updateBoatFeaturePosition(currentX, currentY);

      if (isAnchorDeployed() && anchorCoord) {
        const rodeFeature = getFeatureByType(featureTypes.RODE);
        if (!rodeFeature) {
          if (typeof onRodeMissing === "function") {
            onRodeMissing();
          }
        } else {
          updateRodeFeaturePosition(currentX, currentY, anchorCoord[0], anchorCoord[1]);
        }
      }

      if (progress < 1) {
        boatAnimationFrame = requestAnimationFrame(step);
        return;
      }

      boatAnimationFrame = null;
    };

    boatAnimationFrame = requestAnimationFrame(step);
  };

  const getAnimatedBoatLonLat = () => {
    if (!boatAnimationFrame || !currentBoatPosition) {
      return null;
    }

    const coord = toLonLat([currentBoatPosition.x, currentBoatPosition.y]);
    if (!Array.isArray(coord) || coord.length < 2) {
      return null;
    }

    const lon = coord[0];
    const lat = coord[1];
    if (typeof lat !== "number" || !Number.isFinite(lat)) {
      return null;
    }
    if (typeof lon !== "number" || !Number.isFinite(lon)) {
      return null;
    }

    return { lat, lon };
  };

  const stopAnimations = () => {
    cancelBoatAnimation();
    cancelRodeAnimation();
  };

  return {
    animateBoatPosition,
    setCurrentBoatPositionFromLatLon,
    getAnimatedBoatLonLat,
    stopAnimations,
  };
}
