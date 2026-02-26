import { ref, computed, onUnmounted } from 'vue';
import { createLogger } from '@/services/logger';

const logger = createLogger('useMapManagement');

/**
 * Map Management Composable
 * Provides provider-agnostic map interface
 */
export function useMapManagement(provider = 'openstreetmap', isDarkModeRef = null) {
  const map = ref(null);
  const mapElement = ref(null);
  const isMapRenderReady = ref(false);
  const isDarkMode = computed(() => isDarkModeRef?.value || false);

  // Provider-specific implementations
  const providers = {
    openstreetmap: () => import('./providers/OpenStreetMapProvider.js'),
  };

  let mapProvider = null;

  /**
   * Initialize the map with specified provider
   */
  const initializeMap = async (options = {}) => {
    try {
      logger.info(`Initializing map with provider: ${provider}`);
      
      // Load provider
      const providerModule = await providers[provider]();
      mapProvider = new providerModule.default();
      
      // Initialize with provider
      map.value = await mapProvider.initialize({
        element: mapElement.value,
        isDarkMode: isDarkMode.value,
        ...options
      });

      isMapRenderReady.value = true;
      logger.info('Map initialized successfully');
      
      return map.value;
    } catch (error) {
      logger.error('Failed to initialize map:', error);
      throw error;
    }
  };

  /**
   * Add feature to map
   */
  const addFeature = (feature) => {
    if (!mapProvider || !map.value) return;
    return mapProvider.addFeature(feature);
  };

  /**
   * Remove feature from map
   */
  const removeFeature = (featureId) => {
    if (!mapProvider || !map.value) return;
    return mapProvider.removeFeature(featureId);
  };

  /**
   * Clear all features
   */
  const clearAllFeatures = () => {
    if (!mapProvider || !map.value) return;
    return mapProvider.clearAllFeatures();
  };

  /**
   * Set map center
   */
  const setCenter = (coordinates, zoom) => {
    if (!mapProvider || !map.value) return;
    return mapProvider.setCenter(coordinates, zoom);
  };

  /**
   * Get map center
   */
  const getCenter = () => {
    if (!mapProvider || !map.value) return null;
    return mapProvider.getCenter();
  };

  /**
   * Set map zoom
   */
  const setZoom = (zoom) => {
    if (!mapProvider || !map.value) return;
    return mapProvider.setZoom(zoom);
  };

  /**
   * Get map zoom
   */
  const getZoom = () => {
    if (!mapProvider || !map.value) return null;
    return mapProvider.getZoom();
  };

  /**
   * Update map size
   */
  const updateSize = () => {
    if (!mapProvider || !map.value) return;
    return mapProvider.updateSize();
  };

  /**
   * Add event listener
   */
  const on = (event, handler) => {
    if (!mapProvider || !map.value) return;
    return mapProvider.on(event, handler);
  };

  /**
   * Remove event listener
   */
  const off = (event, handler) => {
    if (!mapProvider || !map.value) return;
    return mapProvider.off(event, handler);
  };

  /**
   * Get features at pixel
   */
  const getFeaturesAtPixel = (pixel, options) => {
    if (!mapProvider || !map.value) return [];
    return mapProvider.getFeaturesAtPixel(pixel, options);
  };

  /**
   * Convert coordinate from lon/lat to map projection
   */
  const fromLonLat = (coordinates) => {
    if (!mapProvider) return coordinates;
    return mapProvider.fromLonLat(coordinates);
  };

  /**
   * Convert coordinate from map projection to lon/lat
   */
  const toLonLat = (coordinates) => {
    if (!mapProvider) return coordinates;
    return mapProvider.toLonLat(coordinates);
  };

  /**
   * Destroy map
   */
  const destroy = () => {
    if (mapProvider) {
      mapProvider.destroy();
      mapProvider = null;
    }
    map.value = null;
    isMapRenderReady.value = false;
  };

  // Cleanup on unmount
  onUnmounted(() => {
    destroy();
  });

  return {
    // Refs
    map,
    mapElement,
    isMapRenderReady,
    
    // Methods
    initializeMap,
    addFeature,
    removeFeature,
    clearAllFeatures,
    setCenter,
    getCenter,
    setZoom,
    getZoom,
    updateSize,
    on,
    off,
    getFeaturesAtPixel,
    fromLonLat,
    toLonLat,
    destroy,
  };
}
