import { createLogger } from '@/services/logger';

const logger = createLogger('OpenStreetMapProvider');

// OpenLayers imports
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import { defaults as defaultInteractions } from 'ol/interaction';
import DragRotate from 'ol/interaction/DragRotate';
import PinchRotate from 'ol/interaction/PinchRotate';
import DragPan from 'ol/interaction/DragPan';

/**
 * OpenStreetMap Provider using OpenLayers
 * Implements the map provider interface for OpenStreetMap with OpenLayers
 */
export default class OpenStreetMapProvider {
  constructor() {
    this.map = null;
    this.vectorSource = new VectorSource();
    this.interactions = {};
  }

  /**
   * Initialize the map
   */
  async initialize({ element, isDarkMode = false, center = [0, 0], zoom = 15 }) {
    logger.info('Initializing OpenStreetMap with OpenLayers');

    const defaultCenter = fromLonLat(center);
    
    // Create the map with minimal interactions initially
    this.map = new Map({
      target: element,
      layers: [
        new TileLayer({ 
          source: isDarkMode 
            ? new XYZ({
                url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                attributions: null,
                preload: Infinity, // Preload all zoom levels for smooth zooming
                transition: 250 // Smooth transition between tiles
              })
            : new OSM({ 
                attributions: null,
                preload: Infinity, // Preload all zoom levels for smooth zooming
                transition: 250 // Smooth transition between tiles
              })
        }),
        new VectorLayer({ source: this.vectorSource, zIndex: 5 }),
      ],
      view: new View({
        center: defaultCenter,
        zoom: zoom,
        rotation: 0,
        enableRotation: false,
        minZoom: 5,
        maxZoom: 22,
      }),
      controls: defaultControls({ zoom: false, attribution: false }),
      interactions: defaultInteractions({
        // Start with minimal interactions
        dragPan: true,
        pinchZoom: true,
        altShiftDragRotate: false,
        pinchRotate: false,
        mouseWheelZoom: false, // Disable default and add our custom one below
      }),
      pixelRatio: window.devicePixelRatio,
    });

    // Hard lock map rotation (iOS pinch gestures can still rotate under some conditions)
    this._lockRotation();
    
    // Store reference for debugging and provider access
    if (element) {
      element.__ol_map__ = this.map;
    }
    window.__anchorMap = this.map;
    
    // Store provider reference on map instance
    this.map.__provider__ = this;

    logger.info('OpenStreetMap initialized successfully');
    return this.map;
  }

  /**
   * Lock map rotation to prevent unwanted rotation
   */
  _lockRotation() {
    try {
      const view = this.map.getView();
      if (view && typeof view.setRotation === "function") {
        view.setRotation(0);
      }

      this.map.getInteractions().forEach((interaction) => {
        if (interaction instanceof DragRotate || interaction instanceof PinchRotate) {
          this.map.removeInteraction(interaction);
        }
      });
    } catch (error) {
      logger.warn('Failed to lock rotation:', error);
    }
  }

  /**
   * Add feature to map
   */
  addFeature(feature) {
    if (!this.vectorSource) return;
    this.vectorSource.addFeature(feature);
  }

  /**
   * Remove feature from map
   */
  removeFeature(featureId) {
    if (!this.vectorSource) return;
    
    const features = this.vectorSource.getFeatures();
    const feature = features.find(f => f.getId() === featureId || f.get('id') === featureId);
    if (feature) {
      this.vectorSource.removeFeature(feature);
    }
  }

  /**
   * Clear all features
   */
  clearAllFeatures() {
    if (!this.vectorSource) return;
    this.vectorSource.clear();
  }

  /**
   * Set map center
   */
  setCenter(coordinates, zoom) {
    if (!this.map) return;
    
    const view = this.map.getView();
    const centerCoords = fromLonLat(coordinates);
    
    if (zoom !== undefined) {
      view.setCenter(centerCoords);
      view.setZoom(zoom);
    } else {
      view.setCenter(centerCoords);
    }
  }

  /**
   * Get map center
   */
  getCenter() {
    if (!this.map) return null;
    
    const view = this.map.getView();
    const center = view.getCenter();
    return toLonLat(center);
  }

  /**
   * Set map zoom
   */
  setZoom(zoom) {
    if (!this.map) return;
    
    const view = this.map.getView();
    view.setZoom(zoom);
  }

  /**
   * Get map zoom
   */
  getZoom() {
    if (!this.map) return null;
    
    const view = this.map.getView();
    return view.getZoom();
  }

  /**
   * Update map size
   */
  updateSize() {
    if (!this.map) return;
    this.map.updateSize();
  }

  /**
   * Add event listener
   */
  on(event, handler) {
    if (!this.map) return;
    this.map.on(event, handler);
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    if (!this.map) return;
    this.map.un(event, handler);
  }

  /**
   * Get features at pixel
   */
  getFeaturesAtPixel(pixel, options = {}) {
    if (!this.map) return [];
    return this.map.getFeaturesAtPixel(pixel, options);
  }

  /**
   * Convert coordinate from lon/lat to map projection
   */
  fromLonLat(coordinates) {
    return fromLonLat(coordinates);
  }

  /**
   * Convert coordinate from map projection to lon/lat
   */
  toLonLat(coordinates) {
    return toLonLat(coordinates);
  }

  /**
   * Get vector source for direct feature manipulation
   */
  getVectorSource() {
    return this.vectorSource;
  }

  /**
   * Get map interactions
   */
  getInteractions() {
    if (!this.map) return [];
    return this.map.getInteractions();
  }

  /**
   * Add interaction to map
   */
  addInteraction(interaction) {
    if (!this.map) return;
    this.map.addInteraction(interaction);
  }

  /**
   * Remove interaction from map
   */
  removeInteraction(interaction) {
    if (!this.map) return;
    this.map.removeInteraction(interaction);
  }

  /**
   * Get map view
   */
  getView() {
    if (!this.map) return null;
    return this.map.getView();
  }

  /**
   * Render map
   */
  render() {
    if (!this.map) return;
    this.map.render();
  }

  /**
   * Destroy map
   */
  destroy() {
    if (this.map) {
      this.map.setTarget(null);
      this.map = null;
    }
    if (this.vectorSource) {
      this.vectorSource = null;
    }
    
    // Clean up global references
    if (window.__anchorMap === this.map) {
      window.__anchorMap = null;
    }
    
    logger.info('OpenStreetMap destroyed');
  }
}
