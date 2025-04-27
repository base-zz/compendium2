<template>
  <div class="mapping-manager">
    <div class="json-container">
      <div class="json-section">
        <h3>Source Data</h3>
        <div class="json-tree">
          <!-- Render source data recursively -->
          <JsonTree :data="sourceData" :path="''" @pathSelected="handlePathSelected" />
        </div>
      </div>

      <div class="json-section">
        <h3>Destination Data</h3>
        <div class="json-tree">
          <!-- Render destination data recursively -->
          <JsonTree
            :data="destinationData"
            :path="''"
            @pathSelected="handlePathSelected"
          />
        </div>
      </div>
    </div>

    <div v-if="currentPath" class="path-display">
      <p>Current Path: {{ currentPath }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import JsonTree from "./JsonTree.vue"; // Import the JsonTree component

// Source and Destination data
const sourceData = ref({
  mmsi: "123456789",
  name: "Vessel A",
  design: {
    length: { value: 50 },
    beam: { value: 15 },
  },
});

const destinationData = ref({
  vessel: {
    mmsi: "123456789",
    name: "Vessel A",
    design: {
      length: { value: 50 },
      beam: { value: 15 },
    },
  },
});

// Track the current path
const currentPath = ref("");

// Handle the selected path from JsonTree
const handlePathSelected = (dataPath) => {
  console.log("Selected Path:", dataPath);
  // You can now use the `dataPath` in the MappingManager as needed
  currentPath.value = dataPath;
};
</script>

<style scoped>
.json-container {
  display: flex;
  justify-content: space-between;
}

.json-section {
  width: 45%;
  border: 1px solid #ccc;
  padding: 10px;
}

.path-display {
  margin-top: 10px;
  font-weight: bold;
}

.json-tree {
  display: flex;
  flex-direction: column;
}
</style>
