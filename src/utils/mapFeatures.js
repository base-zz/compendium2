import { ref, reactive } from 'vue';
import { Feature } from 'ol';
import { fromLonLat } from 'ol/proj';
import { Circle } from 'ol/geom';
import VectorSource from 'ol/source/Vector';

export const useMapFeatures = (vectorSource) => {
  const features = ref({});
  const perfStats = reactive({
    updates: 0,
    lastUpdate: null,
    get featureCounts() {
      const allFeatures = vectorSource.getFeatures();
      return {
        total: allFeatures.length,
        byType: Object.fromEntries(
          Object.keys(features.value).map(type => [
            type, 
            allFeatures.filter(f => f.get('type') === type).length
          ])
        )
      };
    }
  });

  const updateFeature = (type, geometry, style) => {
    clearFeature(type);
    const feature = new Feature({ geometry });
    feature.set('type', type);
    if (style) feature.setStyle(style);
    vectorSource.addFeature(feature);
    features.value[type] = feature;
    perfStats.updates++;
    perfStats.lastUpdate = new Date();
  };

  const updateFeatureGroup = (type, featuresData, defaultStyle) => {
    clearFeature(type);
    const newFeatures = featuresData.map(data => {
      const feature = new Feature(data.geometry);
      feature.set('type', type);
      feature.setStyle(data.style || defaultStyle);
      return feature;
    });
    vectorSource.addFeatures(newFeatures);
    features.value[type] = newFeatures;
    perfStats.updates++;
    perfStats.lastUpdate = new Date();
  };

  const clearFeature = (type) => {
    // First, remove any tracked features of this type
    if (features.value[type]) {
      if (Array.isArray(features.value[type])) {
        features.value[type].forEach(f => vectorSource.removeFeature(f));
      } else {
        vectorSource.removeFeature(features.value[type]);
      }
      features.value[type] = null;
    }
    
    // Additionally, find and remove ALL features of this type from the source
    // This ensures we catch any features that might have been added directly
    // without being tracked in the features object
    const featuresToRemove = [];
    vectorSource.forEachFeature(feature => {
      if (feature.get('type') === type) {
        featuresToRemove.push(feature);
      }
    });
    
    // Remove the collected features
    featuresToRemove.forEach(feature => {
      vectorSource.removeFeature(feature);
    });
    
    // console.log(`Cleared ${featuresToRemove.length} features of type: ${type}`);
  };

  const clearAll = () => {
    Object.keys(features.value).forEach(clearFeature);
    vectorSource.clear();
    features.value = {};
  };
  
  const updateRangeRing = (source, center, radius, style) => {
    const existing = source.getFeatures().find(f => f.get('type') === 'critical-range');
    if (existing) source.removeFeature(existing);
  
    if (!center || !radius) return;
  
    const circle = new Circle(
      fromLonLat([
        center.longitude?.value ?? center.longitude, 
        center.latitude?.value ?? center.latitude
      ]),
      radius
    );
    
    const feature = new Feature({
      geometry: circle,
      type: 'critical-range'  // Consistent type identifier
    });
    feature.set('type', 'critical-range'); // Set as property too
    feature.setStyle(style);
    source.addFeature(feature);
  };

  return { 
    features,
    updateFeature,
    updateFeatureGroup,
    updateRangeRing,
    clearFeature,
    clearAll,
    perfStats
  };
};