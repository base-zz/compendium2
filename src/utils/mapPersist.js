// src/composables/mapPersist.js
import { debounce } from 'lodash-es';

export const useMapPersist = (mapRef) => {
  const saveViewState = debounce(() => {
    if (!mapRef.value) return;
    const view = mapRef.value.getView();
    localStorage.setItem("anchorMapViewState", JSON.stringify({
      center: view.getCenter(),
      zoom: view.getZoom(),
      rotation: view.getRotation()
    }));
  }, 500);

  const restoreViewState = () => {
    const saved = localStorage.getItem("anchorMapViewState");
    return saved ? JSON.parse(saved) : null;
  };

  return { saveViewState, restoreViewState };
};