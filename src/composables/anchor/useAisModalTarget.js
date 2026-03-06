export function useAisModalTarget({ isMetric, calculateDistanceMeters }) {
  const toNumericValue = (value) => {
    if (value == null) {
      return null;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "object" && value.value != null) {
      const numeric = Number(value.value);
      return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
  };

  const format1Dec = (value) => {
    if (value == null) {
      return null;
    }
    return Number(value).toFixed(1);
  };

  const formatSog = (sogKnots) => {
    if (sogKnots == null) {
      return null;
    }
    if (isMetric.value) {
      return format1Dec(sogKnots * 1.852) + " km/h";
    }
    return format1Dec(sogKnots * 1.15078) + " mph";
  };

  const formatCog = (raw) => {
    const cogObj = raw?.cog || raw?.navigationDetails?.courseOverGroundTrue;
    const cogNumeric = toNumericValue(cogObj);
    const cogDegrees = cogObj?.convertedValue ?? (cogNumeric != null ? (cogNumeric * 180) / Math.PI : null);
    if (cogDegrees == null) {
      return null;
    }
    return format1Dec(cogDegrees) + "°";
  };

  const formatDimension = (metersValue) => {
    if (metersValue == null) {
      return null;
    }
    if (isMetric.value) {
      return format1Dec(metersValue) + " m";
    }
    return format1Dec(metersValue * 3.28084) + " ft";
  };

  const resolveDimensions = (raw) => {
    const lengthMeters =
      toNumericValue(raw?.design?.length?.value?.overall) ??
      toNumericValue(raw?.design?.length?.overall) ??
      toNumericValue(raw?.length?.value?.overall) ??
      toNumericValue(raw?.length?.overall) ??
      toNumericValue(raw?.length?.value) ??
      toNumericValue(raw?.length);

    const beamMeters =
      toNumericValue(raw?.design?.beam?.value) ??
      toNumericValue(raw?.design?.beam) ??
      toNumericValue(raw?.beam?.value) ??
      toNumericValue(raw?.beam);

    const draftMeters =
      toNumericValue(raw?.design?.draft?.value?.current) ??
      toNumericValue(raw?.design?.draft?.current) ??
      toNumericValue(raw?.draft?.value?.current) ??
      toNumericValue(raw?.draft?.current) ??
      toNumericValue(raw?.draft?.value) ??
      toNumericValue(raw?.draft);

    return {
      length: formatDimension(lengthMeters),
      beam: formatDimension(beamMeters),
      draft: formatDimension(draftMeters),
    };
  };

  const resolveDistance = (lat, lon, ownPosition) => {
    if (lat == null || lon == null || !ownPosition) {
      return null;
    }

    const ownLat = toNumericValue(ownPosition.latitude);
    const ownLon = toNumericValue(ownPosition.longitude);
    if (ownLat == null || ownLon == null) {
      return null;
    }

    const distanceMeters = calculateDistanceMeters(ownLat, ownLon, lat, lon, true);
    if (!Number.isFinite(distanceMeters)) {
      return null;
    }

    if (isMetric.value) {
      if (distanceMeters >= 1000) {
        return format1Dec(distanceMeters / 1000) + " km";
      }
      return format1Dec(distanceMeters) + " m";
    }

    const distanceNm = distanceMeters / 1852;
    if (distanceNm >= 0.1) {
      return format1Dec(distanceNm) + " nm";
    }

    return format1Dec(distanceMeters * 3.28084) + " ft";
  };

  const buildAisModalTarget = ({ raw, mmsi, name, ownPosition }) => {
    if (!raw) {
      return {
        mmsi,
        name: name || "Unknown Vessel",
      };
    }

    const lat = toNumericValue(raw.position?.latitude);
    const lon = toNumericValue(raw.position?.longitude);
    const sogKnots = toNumericValue(raw.sog) ?? toNumericValue(raw.navigationDetails?.speedOverGround);

    const dimensions = resolveDimensions(raw);

    return {
      mmsi: raw.mmsi || mmsi,
      name: raw.name || name || "Unknown Vessel",
      latitude: lat,
      longitude: lon,
      sog: formatSog(sogKnots),
      cog: formatCog(raw),
      vesselType: raw.shipType || raw.shipTypeDetails?.name || null,
      navStatus: raw.status || raw.navigationDetails?.status || null,
      callsign: raw.callsign || raw.communication?.callsignVhf || null,
      destination: raw.destination || null,
      length: dimensions.length,
      beam: dimensions.beam,
      draft: dimensions.draft,
      distance: resolveDistance(lat, lon, ownPosition),
    };
  };

  return {
    buildAisModalTarget,
  };
}
