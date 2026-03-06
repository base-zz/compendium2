import { ref, nextTick } from "vue";
import Feature from "ol/Feature";
import { Style, Stroke, Fill, Text } from "ol/style";
import CircleStyle from "ol/style/Circle";
import { Point } from "ol/geom";
import LineString from "ol/geom/LineString";
import Collection from "ol/Collection";
import Translate from "ol/interaction/Translate";

export function useAnchorMeasureMode({ map, isDarkMode, isMetric, getVectorSource, featureTypes, clearFeature, calculateDistanceMeters, fromLonLat, toLonLat, getBoatLonLatForMeasure }) {
  const measureModeEnabled = ref(false);
  const measurePinAFollowsBoat = ref(false);
  const measurePinBFollowsBoat = ref(false);
  const measurePinA = ref(null);
  const measurePinB = ref(null);
  const measureLine = ref(null);
  const measureLabel = ref(null);
  const measureSnapDistanceMeters = 5;

  let modifyInteraction = null;
  const dragPanInteraction = null;

  const getSource = () => (typeof getVectorSource === "function" ? getVectorSource() : null);

  const getMeasurePinStyle = (labelText, isSnappedToBoat) => {
    const darkMode = isDarkMode.value === true;
    const alpha = isSnappedToBoat === true ? 0.2 : 0.95;
    const fillColor = labelText === "A" ? `rgba(239,68,68,${alpha})` : labelText === "B" ? `rgba(34,197,94,${alpha})` : (darkMode ? `rgba(248,250,252,${alpha})` : `rgba(99,102,241,${alpha})`);
    const strokeColor = isSnappedToBoat === true ? (darkMode ? "rgba(15,23,42,0.2)" : "rgba(255,255,255,0.2)") : (darkMode ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.95)");
    const textColor = isSnappedToBoat === true ? "rgba(255,255,255,0.2)" : "#ffffff";

    return new Style({
      image: new CircleStyle({ radius: 10, fill: new Fill({ color: fillColor }), stroke: new Stroke({ color: strokeColor, width: 3 }) }),
      text: new Text({ text: labelText, font: "700 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif", fill: new Fill({ color: textColor }), offsetY: 0 }),
      zIndex: 120,
    });
  };

  const MEASURE_LINE_STYLE = new Style({ stroke: new Stroke({ color: "rgba(250,204,21,0.95)", width: 4 }), zIndex: 110 });

  const getMeasureLabelStyle = (labelText) => {
    const darkMode = isDarkMode.value === true;
    const textColor = darkMode ? "#111827" : "#f9fafb";
    const bgColor = darkMode ? "rgba(248,250,252,0.92)" : "rgba(17,24,39,0.85)";
    const borderColor = darkMode ? "rgba(15,23,42,0.35)" : "rgba(248,250,252,0.25)";
    return new Style({
      text: new Text({ text: labelText, font: "600 13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif", fill: new Fill({ color: textColor }), backgroundFill: new Fill({ color: bgColor }), backgroundStroke: new Stroke({ color: borderColor, width: 2 }), padding: [6, 8, 6, 8], offsetY: -14 }),
      zIndex: 130,
    });
  };

  const clearMeasurementFeatures = () => {
    clearFeature(featureTypes.MEASURE_PIN_A);
    clearFeature(featureTypes.MEASURE_PIN_B);
    clearFeature(featureTypes.MEASURE_LINE);
    clearFeature(featureTypes.MEASURE_LABEL);
    measurePinA.value = null;
    measurePinB.value = null;
    measureLine.value = null;
    measureLabel.value = null;
    measurePinAFollowsBoat.value = false;
    measurePinBFollowsBoat.value = false;
  };

  const syncTranslateFeatures = () => {
    if (!modifyInteraction) return;
    const collection = modifyInteraction.getFeatures?.();
    if (!collection) return;
    collection.clear();
    if (measurePinA.value) collection.push(measurePinA.value);
    if (measurePinB.value) collection.push(measurePinB.value);
  };

  const updateMeasurementLineAndLabel = () => {
    const source = getSource();
    if (!source) return;
    if (!measurePinA.value || !measurePinB.value) {
      clearFeature(featureTypes.MEASURE_LINE);
      clearFeature(featureTypes.MEASURE_LABEL);
      measureLine.value = null;
      measureLabel.value = null;
      return;
    }

    const coordA = measurePinA.value.getGeometry?.()?.getCoordinates?.();
    const coordB = measurePinB.value.getGeometry?.()?.getCoordinates?.();
    if (!Array.isArray(coordA) || !Array.isArray(coordB)) return;

    const lineGeom = new LineString([coordA, coordB]);
    if (!measureLine.value) {
      const lineFeature = new Feature({ geometry: lineGeom });
      lineFeature.set("type", featureTypes.MEASURE_LINE);
      lineFeature.setStyle(MEASURE_LINE_STYLE);
      source.addFeature(lineFeature);
      measureLine.value = lineFeature;
    } else {
      measureLine.value.setGeometry(lineGeom);
    }

    const lonLatA = toLonLat(coordA);
    const lonLatB = toLonLat(coordB);
    const distanceValue = calculateDistanceMeters(lonLatA[1], lonLatA[0], lonLatB[1], lonLatB[0], isMetric.value);
    const unitLabel = isMetric.value ? "m" : "ft";
    const distanceText = typeof distanceValue === "number" ? `${Math.round(distanceValue)} ${unitLabel}` : "--";
    const midCoord = [(coordA[0] + coordB[0]) / 2, (coordA[1] + coordB[1]) / 2];
    const labelGeom = new Point(midCoord);

    if (!measureLabel.value) {
      const labelFeature = new Feature({ geometry: labelGeom });
      labelFeature.set("type", featureTypes.MEASURE_LABEL);
      labelFeature.setStyle(getMeasureLabelStyle(distanceText));
      source.addFeature(labelFeature);
      measureLabel.value = labelFeature;
    } else {
      measureLabel.value.setGeometry(labelGeom);
      measureLabel.value.setStyle(getMeasureLabelStyle(distanceText));
    }
  };

  const applyBoatFollowToPin = (pinType, pinRef, followsRef) => {
    const boatLonLat = getBoatLonLatForMeasure();
    if (!boatLonLat) return;
    const source = getSource();
    if (!source) return;
    const coord = fromLonLat(boatLonLat);
    if (!pinRef.value) {
      const feature = new Feature({ geometry: new Point(coord) });
      feature.set("type", pinType === "A" ? featureTypes.MEASURE_PIN_A : featureTypes.MEASURE_PIN_B);
      feature.setStyle(getMeasurePinStyle(pinType, true));
      source.addFeature(feature);
      pinRef.value = feature;
    } else {
      pinRef.value.setGeometry(new Point(coord));
      pinRef.value.setStyle(getMeasurePinStyle(pinType, true));
    }
    followsRef.value = true;
  };

  const tryCreateOrUpdateMeasurePin = (pinType, lonLatClicked) => {
    const source = getSource();
    if (!source) return;
    const clickedCoord = fromLonLat(lonLatClicked);
    const boatLonLat = getBoatLonLatForMeasure();
    const shouldSnapToBoat = (() => {
      if (!boatLonLat) return false;
      const d = calculateDistanceMeters(lonLatClicked[1], lonLatClicked[0], boatLonLat[1], boatLonLat[0], true);
      return typeof d === "number" && d <= measureSnapDistanceMeters;
    })();

    if (pinType === "A") {
      if (shouldSnapToBoat) {
        applyBoatFollowToPin("A", measurePinA, measurePinAFollowsBoat);
      } else {
        measurePinAFollowsBoat.value = false;
        if (!measurePinA.value) {
          const feature = new Feature({ geometry: new Point(clickedCoord) });
          feature.set("type", featureTypes.MEASURE_PIN_A);
          feature.setStyle(getMeasurePinStyle("A", false));
          source.addFeature(feature);
          measurePinA.value = feature;
        } else {
          measurePinA.value.setGeometry(new Point(clickedCoord));
          measurePinA.value.setStyle(getMeasurePinStyle("A", false));
        }
      }
    }

    if (pinType === "B") {
      if (shouldSnapToBoat) {
        applyBoatFollowToPin("B", measurePinB, measurePinBFollowsBoat);
      } else {
        measurePinBFollowsBoat.value = false;
        if (!measurePinB.value) {
          const feature = new Feature({ geometry: new Point(clickedCoord) });
          feature.set("type", featureTypes.MEASURE_PIN_B);
          feature.setStyle(getMeasurePinStyle("B", false));
          source.addFeature(feature);
          measurePinB.value = feature;
        } else {
          measurePinB.value.setGeometry(new Point(clickedCoord));
          measurePinB.value.setStyle(getMeasurePinStyle("B", false));
        }
      }
    }

    syncTranslateFeatures();
    updateMeasurementLineAndLabel();
  };

  const ensureTranslateInteraction = () => {
    if (!map.value || modifyInteraction) return;

    modifyInteraction = new Translate({ features: new Collection(), hitTolerance: 12 });

    modifyInteraction.on("translatestart", (evt) => {
      if (dragPanInteraction && typeof dragPanInteraction.setActive === "function") dragPanInteraction.setActive(false);
      const moved = evt?.features;
      if (!moved || typeof moved.forEach !== "function") return;
      moved.forEach((feature) => {
        const type = feature?.get?.("type");
        if (type === featureTypes.MEASURE_PIN_A) {
          measurePinAFollowsBoat.value = false;
          if (typeof feature?.setStyle === "function") feature.setStyle(getMeasurePinStyle("A", false));
        }
        if (type === featureTypes.MEASURE_PIN_B) {
          measurePinBFollowsBoat.value = false;
          if (typeof feature?.setStyle === "function") feature.setStyle(getMeasurePinStyle("B", false));
        }
      });
    });

    modifyInteraction.on("translateend", (evt) => {
      if (dragPanInteraction && typeof dragPanInteraction.setActive === "function") dragPanInteraction.setActive(true);
      const boatLonLat = getBoatLonLatForMeasure();
      if (boatLonLat) {
        const [boatLon, boatLat] = boatLonLat;
        const moved = evt?.features;
        if (moved && typeof moved.forEach === "function") {
          moved.forEach((feature) => {
            const type = feature?.get?.("type");
            if (type !== featureTypes.MEASURE_PIN_A && type !== featureTypes.MEASURE_PIN_B) return;
            const coord = feature?.getGeometry?.()?.getCoordinates?.();
            if (!Array.isArray(coord)) return;
            const lonLat = toLonLat(coord);
            if (!Array.isArray(lonLat) || lonLat.length < 2) return;
            const [lon, lat] = lonLat;
            if (typeof lon !== "number" || typeof lat !== "number" || Number.isNaN(lon) || Number.isNaN(lat)) return;
            const d = calculateDistanceMeters(lat, lon, boatLat, boatLon, true);
            if (typeof d !== "number" || Number.isNaN(d) || d > measureSnapDistanceMeters) return;
            if (type === featureTypes.MEASURE_PIN_A) applyBoatFollowToPin("A", measurePinA, measurePinAFollowsBoat);
            if (type === featureTypes.MEASURE_PIN_B) applyBoatFollowToPin("B", measurePinB, measurePinBFollowsBoat);
          });
        }
      }
      syncTranslateFeatures();
      updateMeasurementLineAndLabel();
    });

    const interactions = map.value.getInteractions?.();
    if (interactions && typeof interactions.insertAt === "function") interactions.insertAt(0, modifyInteraction);
    else map.value.addInteraction(modifyInteraction);
  };

  const handleMeasureMapClick = (event) => {
    if (measureModeEnabled.value !== true) return false;
    const lonLatClicked = toLonLat(event.coordinate);
    if (!measurePinA.value) {
      tryCreateOrUpdateMeasurePin("A", lonLatClicked);
      return true;
    }
    if (!measurePinB.value) {
      tryCreateOrUpdateMeasurePin("B", lonLatClicked);
      return true;
    }
    return true;
  };

  const syncMeasurementWithBoat = () => {
    if (measureModeEnabled.value !== true) return;
    let updated = false;
    if (measurePinAFollowsBoat.value === true) {
      applyBoatFollowToPin("A", measurePinA, measurePinAFollowsBoat);
      updated = true;
    }
    if (measurePinBFollowsBoat.value === true) {
      applyBoatFollowToPin("B", measurePinB, measurePinBFollowsBoat);
      updated = true;
    }
    if (updated) {
      syncTranslateFeatures();
      updateMeasurementLineAndLabel();
    }
  };

  const toggleMeasureMode = async () => {
    measureModeEnabled.value = !measureModeEnabled.value;
    if (measureModeEnabled.value === true) {
      await nextTick();
      const measureButton = document.querySelector(".measure-toggle");
      if (measureButton) measureButton.offsetHeight;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      setTimeout(() => {
        ensureTranslateInteraction();
        syncTranslateFeatures();
      }, 0);
      return;
    }

    clearMeasurementFeatures();
    if (modifyInteraction && map.value) {
      map.value.removeInteraction(modifyInteraction);
      modifyInteraction = null;
    }
  };

  const cleanupMeasureMode = () => {
    clearMeasurementFeatures();
    if (modifyInteraction && map.value) {
      map.value.removeInteraction(modifyInteraction);
      modifyInteraction = null;
    }
  };

  return {
    measureModeEnabled,
    measurePinAFollowsBoat,
    measurePinBFollowsBoat,
    measurePinA,
    measurePinB,
    toggleMeasureMode,
    handleMeasureMapClick,
    syncMeasurementWithBoat,
    cleanupMeasureMode,
  };
}
