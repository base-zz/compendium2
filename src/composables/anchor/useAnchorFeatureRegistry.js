import Feature from "ol/Feature";

export function useAnchorFeatureRegistry(getVectorSource) {
  const featureByType = new Map();

  const isSourceValid = () => {
    const source = typeof getVectorSource === "function" ? getVectorSource() : null;
    return !!source && typeof source.getFeatures === "function";
  };

  const getSource = () => {
    if (!isSourceValid()) {
      return null;
    }
    return getVectorSource();
  };

  const removeTrackedFeature = (source, tracked) => {
    if (!tracked) {
      return;
    }

    if (Array.isArray(tracked)) {
      tracked.forEach((entry) => {
        if (entry) {
          source.removeFeature(entry);
        }
      });
      return;
    }

    source.removeFeature(tracked);
  };

  const clearTypeFromSource = (source, type) => {
    const toRemove = [];
    source.forEachFeature((feature) => {
      if (feature?.get?.("type") === type) {
        toRemove.push(feature);
      }
    });

    toRemove.forEach((feature) => {
      source.removeFeature(feature);
    });
  };

  const clearFeature = (type) => {
    const source = getSource();
    if (!source || typeof type !== "string" || type.length < 1) {
      return;
    }

    const tracked = featureByType.get(type);
    removeTrackedFeature(source, tracked);
    featureByType.delete(type);
    clearTypeFromSource(source, type);
  };

  const clearAll = () => {
    const source = getSource();
    if (!source) {
      featureByType.clear();
      return;
    }

    const knownTypes = Array.from(featureByType.keys());
    knownTypes.forEach((type) => {
      clearFeature(type);
    });

    source.clear();
    featureByType.clear();
  };

  const getFeatureByType = (type) => {
    const source = getSource();
    if (!source || typeof type !== "string" || type.length < 1) {
      return null;
    }

    const tracked = featureByType.get(type);
    if (tracked && !Array.isArray(tracked)) {
      return tracked;
    }

    const found = source.getFeatures().find((feature) => feature?.get?.("type") === type) || null;
    if (found) {
      featureByType.set(type, found);
    }
    return found;
  };

  const updateFeature = (type, geometry, style) => {
    const source = getSource();
    if (!source || typeof type !== "string" || type.length < 1 || !geometry) {
      return;
    }

    clearFeature(type);

    const feature = new Feature({ geometry });
    feature.set("type", type);
    if (style) {
      feature.setStyle(style);
    }

    source.addFeature(feature);
    featureByType.set(type, feature);
  };

  const updateFeatureGroup = (type, featuresData, defaultStyle) => {
    const source = getSource();
    if (
      !source ||
      typeof type !== "string" ||
      type.length < 1 ||
      !Array.isArray(featuresData)
    ) {
      return;
    }

    clearFeature(type);

    const nextFeatures = featuresData.map((entry) => {
      if (entry instanceof Feature) {
        if (entry.get("type") !== type) {
          entry.set("type", type);
        }
        if (!entry.getStyle() && defaultStyle) {
          entry.setStyle(defaultStyle);
        }
        return entry;
      }

      const feature = new Feature({ geometry: entry.geometry });
      feature.set("type", type);
      feature.setStyle(entry.style || defaultStyle);
      return feature;
    });

    source.addFeatures(nextFeatures);
    featureByType.set(type, nextFeatures);
  };

  const resetCache = () => {
    featureByType.clear();
  };

  return {
    clearFeature,
    clearAll,
    getFeatureByType,
    updateFeature,
    updateFeatureGroup,
    resetCache,
  };
}
