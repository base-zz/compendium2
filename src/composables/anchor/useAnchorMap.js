import { ref, markRaw } from "vue";
import Map from "ol/Map";
import View from "ol/View";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { fromLonLat } from "ol/proj";
import { defaults as defaultInteractions } from "ol/interaction";
import { createLogger } from "@/services/logger";

const logger = createLogger("useAnchorMap");

export function useAnchorMap() {
  const mapElement = ref(null);
  const map = ref(null);
  const vectorSource = ref(null);
  const vectorLayer = ref(null);

  const initMap = (isDarkMode) => {
    if (!mapElement.value || map.value) return;

    try {
      vectorSource.value = new VectorSource();
      vectorLayer.value = new VectorLayer({
        source: vectorSource.value,
        zIndex: 10,
        updateWhileAnimating: true,
        updateWhileInteracting: true,
      });

      // Define map layers (Light / Dark mode)
      const baseMapUrl = isDarkMode
        ? "https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

      const baseLayer = new TileLayer({
        source: new XYZ({
          url: baseMapUrl,
          attributions: '© <a href="https://carto.com/">CARTO</a>',
          maxZoom: 20,
        }),
        zIndex: 0,
      });

      // Default starting center (will be updated)
      const initialCenter = fromLonLat([-73.935242, 40.73061]); 

      map.value = markRaw(
        new Map({
          target: mapElement.value,
          layers: [baseLayer, vectorLayer.value],
          view: new View({
            center: initialCenter,
            zoom: 16,
            maxZoom: 22,
            minZoom: 2,
            enableRotation: false,
          }),
          controls: [],
          interactions: defaultInteractions({
            doubleClickZoom: false,
            altShiftDragRotate: false,
            pinchRotate: false,
          }),
        })
      );

      return { map: map.value, vectorSource: vectorSource.value };
    } catch (error) {
      logger.error("Error initializing map:", error);
      return null;
    }
  };

  const updateMapTheme = (isDarkMode) => {
    if (!map.value) return;
    
    const baseMapUrl = isDarkMode
      ? "https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    const layers = map.value.getLayers().getArray();
    const baseLayer = layers.find((l) => l instanceof TileLayer);
    
    if (baseLayer) {
      baseLayer.setSource(
        new XYZ({
          url: baseMapUrl,
          attributions: '© <a href="https://carto.com/">CARTO</a>',
          maxZoom: 20,
        })
      );
    }
  };

  const destroyMap = () => {
    if (map.value) {
      map.value.setTarget(null);
      map.value = null;
    }
    vectorSource.value = null;
    vectorLayer.value = null;
  };

  return {
    mapElement,
    map,
    vectorSource,
    vectorLayer,
    initMap,
    updateMapTheme,
    destroyMap
  };
}