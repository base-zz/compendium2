import { ref, computed } from 'vue';
import { createLogger } from '@/services/logger';

// OpenLayers imports
import Feature from 'ol/Feature';
import { Point } from 'ol/geom';
import LineString from 'ol/geom/LineString';
import DragPan from 'ol/interaction/DragPan';

const logger = createLogger('useMapInteractions');

/**
 * Map Interactions Composable
 * Handles user interactions like click, measure mode, fence mode
 */
export function useMapInteractions(map, vectorSource) {
  const measureModeEnabled = ref(false);
  const fenceModeEnabled = ref(false);
  
  // Measurement state
  const measurePinA = ref(null);
  const measurePinB = ref(null);
  const measureLine = ref(null);
  const measureLabel = ref(null);
  const measurePinAFollowsBoat = ref(true);
  const measurePinBFollowsBoat = ref(true);
  
  // Interaction state
  const modifyInteraction = ref(null);
  const dragPanInteraction = ref(null);
  let isDraggingMeasurePin = false;
  let draggedMeasureFeature = null;

  /**
   * Handle map click
   */
  const handleMapClick = (event) => {
    if (!map.value) return;
    
    const pixel = event.pixel;
    const coordinate = event.coordinate;
    
    if (measureModeEnabled.value) {
      handleMeasureModeClick(pixel, coordinate);
    } else if (fenceModeEnabled.value) {
      handleFenceModeClick(coordinate);
    }
  };

  /**
   * Handle measure mode click
   */
  const handleMeasureModeClick = (pixel, coordinate) => {
    // Check if clicking on existing measure pin
    const featuresAtPixel = map.value.getFeaturesAtPixel(pixel, { hitTolerance: 18 });
    const measurePinFeature = featuresAtPixel?.find((feature) => {
      const type = feature?.get?.("type");
      return type === "MEASURE_PIN_A" || type === "MEASURE_PIN_B";
    });

    if (measurePinFeature) {
      // Start dragging the pin
      startDraggingMeasurePin(measurePinFeature);
    } else {
      // Place new pin
      placeMeasurePin(coordinate);
    }
  };

  /**
   * Handle fence mode click
   */
  const handleFenceModeClick = (coordinate) => {
    // Emit fence creation event
    // This will be handled by the parent component
    logger.debug('Fence mode click at coordinate:', coordinate);
  };

  /**
   * Place measurement pin
   */
  const placeMeasurePin = (coordinate) => {
    if (!vectorSource) return;

    // Place pin A if it doesn't exist, otherwise place pin B
    if (!measurePinA.value) {
      const feature = new Feature({ geometry: new Point(coordinate) });
      feature.set("type", "MEASURE_PIN_A");
      // Style will be set by parent component
      vectorSource.addFeature(feature);
      measurePinA.value = feature;
    } else if (!measurePinB.value) {
      const feature = new Feature({ geometry: new Point(coordinate) });
      feature.set("type", "MEASURE_PIN_B");
      // Style will be set by parent component
      vectorSource.addFeature(feature);
      measurePinB.value = feature;
    } else {
      // Both pins exist, move pin A to new location
      measurePinA.value.setGeometry(new Point(coordinate));
      measurePinAFollowsBoat.value = false;
    }

    updateMeasurementLineAndLabel();
  };

  /**
   * Start dragging measure pin
   */
  const startDraggingMeasurePin = (feature) => {
    if (!dragPanInteraction.value) return;
    
    isDraggingMeasurePin = true;
    draggedMeasureFeature = feature;
    dragPanInteraction.value.setActive(false);

    const draggedType = draggedMeasureFeature?.get?.("type");
    if (draggedType === "MEASURE_PIN_A") {
      measurePinAFollowsBoat.value = false;
    } else if (draggedType === "MEASURE_PIN_B") {
      measurePinBFollowsBoat.value = false;
    }

    syncTranslateFeatures();
  };

  /**
   * Update measurement line and label
   */
  const updateMeasurementLineAndLabel = () => {
    if (!measurePinA.value || !measurePinB.value || !vectorSource) return;

    const coordA = measurePinA.value.getGeometry().getCoordinates();
    const coordB = measurePinB.value.getGeometry().getCoordinates();

    // Update or create line
    const lineGeom = new LineString([coordA, coordB]);
    if (!measureLine.value) {
      const lineFeature = new Feature({ geometry: lineGeom });
      lineFeature.set("type", "MEASURE_LINE");
      // Style will be set by parent component
      vectorSource.addFeature(lineFeature);
      measureLine.value = lineFeature;
    } else {
      measureLine.value.setGeometry(lineGeom);
    }

    // Calculate distance and update label
    const distance = calculateDistance(coordA, coordB);
    updateMeasurementLabel(coordA, coordB, distance);
  };

  /**
   * Calculate distance between coordinates
   */
  const calculateDistance = (coordA, coordB) => {
    // This will use the parent component's distance calculation
    // For now, return a placeholder
    return 0;
  };

  /**
   * Update measurement label
   */
  const updateMeasurementLabel = (coordA, coordB, distance) => {
    if (!vectorSource) return;

    const midCoord = [(coordA[0] + coordB[0]) / 2, (coordA[1] + coordB[1]) / 2];
    const labelGeom = new Point(midCoord);
    
    const distanceText = typeof distance === "number" ? `${Math.round(distance)} m` : "--";

    if (!measureLabel.value) {
      const labelFeature = new Feature({ geometry: labelGeom });
      labelFeature.set("type", "MEASURE_LABEL");
      // Style will be set by parent component
      vectorSource.addFeature(labelFeature);
      measureLabel.value = labelFeature;
    } else {
      measureLabel.value.setGeometry(labelGeom);
    }
  };

  /**
   * Sync translate features
   */
  const syncTranslateFeatures = () => {
    if (!modifyInteraction.value) return;
    
    const features = [];
    if (measurePinA.value) features.push(measurePinA.value);
    if (measurePinB.value) features.push(measurePinB.value);
    if (measureLine.value) features.push(measureLine.value);
    
    modifyInteraction.value.setFeatures(features);
  };

  /**
   * Clear measurement features
   */
  const clearMeasurementFeatures = () => {
    if (!vectorSource) return;

    const featuresToRemove = [];
    if (measurePinA.value) featuresToRemove.push(measurePinA.value);
    if (measurePinB.value) featuresToRemove.push(measurePinB.value);
    if (measureLine.value) featuresToRemove.push(measureLine.value);
    if (measureLabel.value) featuresToRemove.push(measureLabel.value);

    featuresToRemove.forEach(feature => {
      vectorSource.removeFeature(feature);
    });

    // Reset refs
    measurePinA.value = null;
    measurePinB.value = null;
    measureLine.value = null;
    measureLabel.value = null;
    measurePinAFollowsBoat.value = true;
    measurePinBFollowsBoat.value = true;
  };

  /**
   * Toggle measure mode
   */
  const toggleMeasureMode = () => {
    measureModeEnabled.value = !measureModeEnabled.value;
    
    if (measureModeEnabled.value) {
      fenceModeEnabled.value = false;
      logger.debug('Measure mode enabled');
    } else {
      clearMeasurementFeatures();
      logger.debug('Measure mode disabled');
    }
  };

  /**
   * Toggle fence mode
   */
  const toggleFenceMode = () => {
    fenceModeEnabled.value = !fenceModeEnabled.value;
    
    if (fenceModeEnabled.value) {
      measureModeEnabled.value = false;
      logger.debug('Fence mode enabled');
    } else {
      logger.debug('Fence mode disabled');
    }
  };

  /**
   * Setup interaction handlers
   */
  const setupInteractions = () => {
    if (!map.value) return;

    // Setup drag pan interaction capture
    dragPanInteraction.value = null;
    map.value.getInteractions().forEach((interaction) => {
      if (interaction instanceof DragPan) {
        dragPanInteraction.value = interaction;
      }
    });

    // Setup pointer handlers
    map.value.on('pointerdown', handlePointerDown);
    map.value.on('pointerdrag', handlePointerDrag);
    map.value.on('pointerup', handlePointerUp);
    map.value.on('click', handleMapClick);
  };

  /**
   * Handle pointer down
   */
  const handlePointerDown = (evt) => {
    if (measureModeEnabled.value !== true) return;
    if (!dragPanInteraction.value || typeof dragPanInteraction.value.setActive !== "function") return;
    
    const pixel = evt?.pixel;
    if (!pixel) return;
    
    const featuresAtPixel = map.value.getFeaturesAtPixel(pixel, { hitTolerance: 18 });
    const measurePinFeature = featuresAtPixel?.find((feature) => {
      const type = feature?.get?.("type");
      return type === "MEASURE_PIN_A" || type === "MEASURE_PIN_B";
    });
    
    if (measurePinFeature) {
      startDraggingMeasurePin(measurePinFeature);
    }
  };

  /**
   * Handle pointer drag
   */
  const handlePointerDrag = (evt) => {
    if (measureModeEnabled.value !== true) return;
    if (!isDraggingMeasurePin) return;
    if (!draggedMeasureFeature) return;
    
    const coord = evt?.coordinate;
    if (!coord || coord.length < 2) return;
    
    const geom = draggedMeasureFeature.getGeometry?.();
    if (!geom || typeof geom.setCoordinates !== "function") return;
    
    geom.setCoordinates(coord);
    updateMeasurementLineAndLabel();
  };

  /**
   * Handle pointer up
   */
  const handlePointerUp = () => {
    if (!dragPanInteraction.value || typeof dragPanInteraction.value.setActive !== "function") return;
    if (!isDraggingMeasurePin) return;

    isDraggingMeasurePin = false;
    draggedMeasureFeature = null;
    dragPanInteraction.value.setActive(true);
  };

  /**
   * Cleanup interactions
   */
  const cleanup = () => {
    if (map.value) {
      map.value.un('pointerdown', handlePointerDown);
      map.value.un('pointerdrag', handlePointerDrag);
      map.value.un('pointerup', handlePointerUp);
      map.value.un('click', handleMapClick);
    }
    
    clearMeasurementFeatures();
    modifyInteraction.value = null;
    dragPanInteraction.value = null;
  };

  return {
    // State
    measureModeEnabled,
    fenceModeEnabled,
    measurePinA,
    measurePinB,
    measureLine,
    measureLabel,
    measurePinAFollowsBoat,
    measurePinBFollowsBoat,
    
    // Methods
    toggleMeasureMode,
    toggleFenceMode,
    clearMeasurementFeatures,
    setupInteractions,
    cleanup,
    
    // Internal methods (exposed for parent component)
    updateMeasurementLineAndLabel,
    placeMeasurePin,
  };
}
