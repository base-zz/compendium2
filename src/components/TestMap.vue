<template>
  <div class="test-map-container">
    <div ref="mapElement" class="test-map"></div>
    <div class="map-status">{{ mapStatus }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';

const mapElement = ref(null);
const mapStatus = ref('Initializing map...');
let map = null;

onMounted(() => {
  console.log("TestMap component mounted");
  mapStatus.value = 'Component mounted, checking map element...';
  
  // Use setTimeout to ensure the DOM is fully rendered
  setTimeout(() => {
    try {
      console.log("Map element exists:", !!mapElement.value);
      mapStatus.value = `Map element exists: ${!!mapElement.value}`;
      
      if (!mapElement.value) {
        console.error("Map element reference is null");
        mapStatus.value = 'ERROR: Map element reference is null';
        return;
      }
      
      // Initialize a simple map
      mapStatus.value = 'Creating map...';
      map = new Map({
        target: mapElement.value,
        layers: [
          new TileLayer({
            source: new OSM()
          })
        ],
        view: new View({
          center: fromLonLat([-80.1918, 25.7617]), // Miami coordinates
          zoom: 12
        })
      });
      
      mapStatus.value = 'Map initialized successfully!';
      console.log("Test map initialized successfully");
    } catch (error) {
      console.error("Error initializing test map:", error);
      mapStatus.value = `ERROR: ${error.message}`;
    }
  }, 500);
});

onUnmounted(() => {
  if (map) {
    map.setTarget(null);
    map = null;
  }
});
</script>

<style scoped>
.test-map-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.test-map {
  width: 100%;
  height: 80%;
  border: 2px solid red;
}

.map-status {
  padding: 10px;
  background-color: #333;
  color: white;
  font-family: monospace;
  height: 20%;
  overflow: auto;
}
</style>
