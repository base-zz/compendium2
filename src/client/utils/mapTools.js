import * as olExtent from 'ol/extent';
import { debounce } from 'lodash-es';

export const useMapTools = (mapRef) => {
  const fitToFeatures = (featureTypes, padding = 50, maxZoom = 18) => {
    if (!mapRef.value) return;
    
    const source = mapRef.value.getAllLayers()
      .find(layer => layer.getSource()?.getFeatures)?.getSource();
    
    if (!source) return;

    const features = featureTypes.flatMap(type => 
      source.getFeatures().filter(f => f.get('type') === type)
    );

    if (features.length === 0) return;

    const extent = features.reduce((acc, feature) => {
      const geometry = feature.getGeometry();
      return geometry ? olExtent.extend(acc, geometry.getExtent()) : acc;
    }, olExtent.createEmpty());

    if (!olExtent.isEmpty(extent)) {
      mapRef.value.getView().fit(extent, {
        padding: [padding, padding, padding, padding],
        maxZoom,
        duration: 500
      });
    }
  };

  const saveViewState = debounce(() => {
    if (!mapRef.value) return;
    const view = mapRef.value.getView();
    localStorage.setItem("mapViewState", JSON.stringify({
      center: view.getCenter(),
      zoom: view.getZoom(),
      rotation: view.getRotation()
    }));
  }, 500);

  const restoreViewState = () => {
    const saved = localStorage.getItem("mapViewState");
    return saved ? JSON.parse(saved) : null;
  };

  return { fitToFeatures, saveViewState, restoreViewState };
};