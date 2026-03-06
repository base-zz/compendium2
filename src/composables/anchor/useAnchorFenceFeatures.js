import { Text } from "ol/style";

export function useAnchorFenceFeatures({
  state,
  anchorState,
  isDarkMode,
  fenceConnectorLinesVisible,
  featureTypes,
  clearFeature,
  fromLonLat,
  getVectorSource,
  Feature,
  Point,
  LineString,
  Style,
  Stroke,
  Fill,
  CircleStyle,
  createCircleWithRadius,
  calculateDistanceMeters,
}) {
  const toFenceCoordinateNumber = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    if (value && typeof value === "object") {
      if (typeof value.value === "number" && Number.isFinite(value.value)) {
        return value.value;
      }
      if (typeof value.value === "string") {
        const parsed = Number(value.value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  };

  const getFenceTargetLonLat = (fence) => {
    if (!fence || !fence.targetType || !fence.targetRef) {
      return null;
    }

    if (fence.targetType === "point") {
      const lat = fence.targetRef.latitude;
      const lon = fence.targetRef.longitude;
      if (typeof lat !== "number" || typeof lon !== "number") {
        return null;
      }
      return [lon, lat];
    }

    if (fence.targetType === "ais") {
      const mmsi = fence.targetRef.mmsi;
      if (mmsi == null) {
        return null;
      }
      const rawTarget = state.value?.aisTargets?.[String(mmsi)];
      const lat = rawTarget?.position?.latitude?.value ?? rawTarget?.position?.latitude;
      const lon = rawTarget?.position?.longitude?.value ?? rawTarget?.position?.longitude;
      if (typeof lat !== "number" || typeof lon !== "number") {
        return null;
      }
      return [lon, lat];
    }

    return null;
  };

  const getFenceReferenceLonLat = (fence) => {
    if (!fence || !fence.referenceType) {
      return null;
    }

    if (fence.referenceType === "boat") {
      const navPosition = state.value?.navigation?.position;
      let lat = toFenceCoordinateNumber(navPosition?.latitude);
      let lon = toFenceCoordinateNumber(navPosition?.longitude);
      if (lat == null || lon == null) {
        const topPosition = state.value?.position;
        lat = toFenceCoordinateNumber(topPosition?.latitude);
        lon = toFenceCoordinateNumber(topPosition?.longitude);
      }
      if (lat == null || lon == null) {
        return null;
      }
      return [lon, lat];
    }

    if (fence.referenceType === "anchor_drop") {
      const drop = anchorState.value?.anchorDropLocation;
      const lat = toFenceCoordinateNumber(drop?.latitude);
      const lon = toFenceCoordinateNumber(drop?.longitude);
      if (lat == null || lon == null) {
        return null;
      }
      return [lon, lat];
    }

    return null;
  };

  const updateFenceDistanceStats = (fence, targetLonLat) => {
    if (!fence || !Array.isArray(targetLonLat) || targetLonLat.length < 2) {
      return;
    }

    const referenceLonLat = getFenceReferenceLonLat(fence);
    if (!Array.isArray(referenceLonLat) || referenceLonLat.length < 2) {
      if (fence.currentDistance !== null) {
        fence.currentDistance = null;
      }
      return;
    }

    const distanceMeters = calculateDistanceMeters(
      referenceLonLat[1],
      referenceLonLat[0],
      targetLonLat[1],
      targetLonLat[0],
      true
    );

    if (!Number.isFinite(distanceMeters)) {
      if (fence.currentDistance !== null) {
        fence.currentDistance = null;
      }
      return;
    }

    const distanceInFenceUnits = fence.units === "ft" ? distanceMeters * 3.28084 : distanceMeters;
    const nowMs = Date.now();

    if (Number.isFinite(distanceInFenceUnits) && distanceInFenceUnits !== fence.currentDistance) {
      fence.currentDistance = distanceInFenceUnits;
      fence.currentDistanceUnits = fence.units;

      // Push to distance history for sparkline
      if (!Array.isArray(fence.distanceHistory)) {
        fence.distanceHistory = [];
      }
      fence.distanceHistory.push({
        t: nowMs,
        v: distanceInFenceUnits,
      });
      // Keep only last 100 readings to prevent memory bloat
      if (fence.distanceHistory.length > 100) {
        fence.distanceHistory = fence.distanceHistory.slice(-100);
      }
    }

    const existingMinimum =
      typeof fence.minimumDistance === "number" && Number.isFinite(fence.minimumDistance)
        ? fence.minimumDistance
        : null;

    let normalizedExistingMinimum = existingMinimum;
    if (
      normalizedExistingMinimum != null &&
      typeof fence.minimumDistanceUnits === "string" &&
      fence.minimumDistanceUnits !== fence.units
    ) {
      if (fence.minimumDistanceUnits === "ft" && fence.units !== "ft") {
        normalizedExistingMinimum = normalizedExistingMinimum / 3.28084;
      } else if (fence.minimumDistanceUnits !== "ft" && fence.units === "ft") {
        normalizedExistingMinimum = normalizedExistingMinimum * 3.28084;
      }
    }

    if (normalizedExistingMinimum == null || distanceInFenceUnits < normalizedExistingMinimum) {
      fence.minimumDistance = distanceInFenceUnits;
      fence.minimumDistanceUnits = fence.units;
      fence.minimumDistanceUpdatedAt = nowMs;
    }
  };

  const updateFenceFeatures = () => {
    clearFeature(featureTypes.FENCE_TARGET);
    clearFeature(featureTypes.FENCE_RANGE);
    clearFeature(featureTypes.FENCE_LINK);

    const vectorSource = getVectorSource();
    if (!vectorSource) {
      return;
    }

    const isDark = isDarkMode.value === true;

    const fences = anchorState.value?.fences;
    if (!Array.isArray(fences) || fences.length === 0) {
      return;
    }

    fences.forEach((fence) => {
      if (!fence || fence.enabled === false) {
        return;
      }

      const lonLat = getFenceTargetLonLat(fence);
      if (!Array.isArray(lonLat) || lonLat.length < 2) {
        return;
      }

      updateFenceDistanceStats(fence, lonLat);

      if (fenceConnectorLinesVisible.value === true) {
        const referenceLonLat = getFenceReferenceLonLat(fence);
        if (Array.isArray(referenceLonLat) && referenceLonLat.length >= 2) {
          const lineGeometry = new LineString([fromLonLat(referenceLonLat), fromLonLat(lonLat)]);
          if (isDark) {
            const lineFeature = new Feature({ geometry: lineGeometry });
            lineFeature.set("type", featureTypes.FENCE_LINK);
            lineFeature.setStyle(
              new Style({
                stroke: new Stroke({
                  color: "rgba(250, 204, 21, 0.22)",
                  width: 2,
                  lineDash: [8, 8],
                }),
                zIndex: 118,
              })
            );
            vectorSource.addFeature(lineFeature);
          } else {
            const lineFeatureLM = new Feature({ geometry: lineGeometry });
            lineFeatureLM.set("type", featureTypes.FENCE_LINK);
            lineFeatureLM.setStyle(
              new Style({
                stroke: new Stroke({
                  color: "#D97706",
                  width: 2.5,
                  lineDash: [10, 6],
                }),
                zIndex: 118,
              })
            );
            vectorSource.addFeature(lineFeatureLM);
          }
        }
      }

      const mapCoord = fromLonLat(lonLat);
      const labelText = fence.name || "Fence";
      const distanceText =
        fence.currentDistance != null
          ? `${Math.round(fence.currentDistance)}${fence.units === "ft" ? "ft" : "m"}`
          : "--";

      const marker = new Feature({ geometry: new Point(mapCoord) });
      marker.set("type", featureTypes.FENCE_TARGET);
      marker.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: "rgba(250, 204, 21, 0.95)" }),
            stroke: new Stroke({ color: "rgba(17, 24, 39, 0.95)", width: 2 }),
          }),
          text: new Text({
            text: labelText,
            font: "600 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            fill: new Fill({ color: "#f9fafb" }),
            stroke: new Stroke({ color: "rgba(17,24,39,0.8)", width: 3 }),
            offsetY: -14,
          }),
          zIndex: 140,
        })
      );
      vectorSource.addFeature(marker);

      // Add distance text as separate feature below the point
      const distanceMarker = new Feature({ geometry: new Point(mapCoord) });
      distanceMarker.set("type", featureTypes.FENCE_TARGET);
      distanceMarker.setStyle(
        new Style({
          text: new Text({
            text: distanceText,
            font: "600 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            fill: new Fill({ color: "#f9fafb" }),
            stroke: new Stroke({ color: "rgba(17,24,39,0.8)", width: 3 }),
            offsetY: 14,
          }),
          zIndex: 140,
        })
      );
      vectorSource.addFeature(distanceMarker);

      const rangeValue = Number(fence.alertRange);
      if (!Number.isFinite(rangeValue) || rangeValue <= 0) {
        return;
      }
      const rangeMeters = fence.units === "ft" ? rangeValue / 3.28084 : rangeValue;

      const circleGeometry = createCircleWithRadius(lonLat, rangeMeters);
      const rangeFeature = new Feature({ geometry: circleGeometry });
      rangeFeature.set("type", featureTypes.FENCE_RANGE);
      rangeFeature.setStyle(
        new Style({
          stroke: new Stroke({
            color: isDark ? "rgba(250, 204, 21, 0.65)" : "#D97706",
            width: 2,
          }),
          fill: new Fill({
            color: isDark ? "rgba(250, 204, 21, 0.12)" : "rgba(255, 255, 255, 0.25)",
          }),
          zIndex: 120,
        })
      );
      vectorSource.addFeature(rangeFeature);
    });
  };

  return {
    updateFenceFeatures,
  };
}
