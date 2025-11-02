// In your mapUtils.js composable file
import * as olExtent from 'ol/extent';
import { fromLonLat } from 'ol/proj';

export const useMapTools = (mapRef, vectorSource) => {
  /**
   * Fits the map view to show specified feature types
   * @param {string[]} featureTypes - Array of FEATURE_TYPES to include
   * @param {number} [padding=50] - Padding in pixels around the features
   * @param {number} [maxZoom=18] - Maximum zoom level for fitting
   */
  const fitToFeatures = (featureTypes, padding = 50, maxZoom = 18) => {
    if (!mapRef.value || !vectorSource) {
      console.warn('Map or vector source not initialized');
      return;
    }

    try {
      // Directly use provided vectorSource
      const features = featureTypes.flatMap(type => 
        vectorSource.getFeatures().filter(f => f.get('type') === type)
      );

      if (features.length === 0) {
        console.debug('No features found to fit view');
        return;
      }

      const extent = features.reduce((acc, feature) => {
        const geometry = feature.getGeometry();
        return geometry ? olExtent.extend(acc, geometry.getExtent()) : acc;
      }, olExtent.createEmpty());

      if (olExtent.isEmpty(extent)) {
        console.warn('Empty extent calculated');
        return;
      }

      mapRef.value.getView().fit(extent, {
        padding: [padding, padding, padding, padding],
        maxZoom: maxZoom,
        duration: 500
      });

    } catch (error) {
      console.error('Error fitting to features:', error);
    }
  };

  /**
   * Alternative: Fit to specific coordinates
   */
  const fitToCoordinates = (coordsArray, padding = 50) => {
    if (!mapRef.value || !coordsArray?.length) return;
    
    const extent = coordsArray.reduce((acc, coord) => {
      return olExtent.extend(acc, fromLonLat(coord));
    }, olExtent.createEmpty());

    mapRef.value.getView().fit(extent, { padding });
  };

// In mapUtils.js - Update validateCoordinates
const validateCoordinates = (coord) => {
    if (!coord) return false;
    
    // Handle both nested and direct coordinate structures
    const lat = coord.latitude?.value ?? coord.latitude;
    const lon = coord.longitude?.value ?? coord.longitude;
    
    // If either lat or lon is null or undefined, return false
    if (lat === null || lat === undefined || lon === null || lon === undefined) {
      return false;
    }
    
    // If we have a number but it's NaN, return false
    if (typeof lat === 'number' && Number.isNaN(lat)) return false;
    if (typeof lon === 'number' && Number.isNaN(lon)) return false;
    
    // If we don't have valid numbers, return false
    if (typeof lat !== 'number' || typeof lon !== 'number') return false;
    
    // Check range for valid numbers
    const isLatValid = lat >= -90 && lat <= 90;
    const isLonValid = lon >= -180 && lon <= 180;
    
    return isLatValid && isLonValid;
  };

// Map utility helpers
 const formatPosition = (pos) => {
    if (!pos) return 'Unknown Position';
    const lat = pos.latitude?.value ?? pos.latitude;
    const lon = pos.longitude?.value ?? pos.longitude;
    return `Lat: ${lat?.toFixed(5) ?? '??'}, Lon: ${lon?.toFixed(5) ?? '??'}`;
  };

  return { fitToFeatures, fitToCoordinates, validateCoordinates, formatPosition };
};

 