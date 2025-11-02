<template>
  <div>
    <!-- Loop through all keys in the data -->
    <div v-for="(value, key) in data" :key="key" class="json-item">
      <div @click="handleClick" :data-path="`${path}${key}`" class="json-key">
        <!-- Display the key and value -->
        <span>{{ key }}: </span>
        <span
          v-if="typeof value === 'object' && value !== null"
          class="json-collapsible"
          @click.stop="toggleNested(key)"
        >
          <!-- Use a toggle icon to show/hide nested objects -->
          <span>{{ showNested[key] ? "-" : "+" }}</span>
        </span>
        <span v-else>{{ value }}</span>
      </div>

      <!-- If the value is an object and is expanded, recursively call JsonTree to display its properties -->
      <div
        v-if="typeof value === 'object' && value !== null && showNested[key]"
        class="json-nested"
      >
        <JsonTree :data="value" :path="`${path}${key}.`" @click="handleClick" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

// Define the incoming props
const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
});

// Define the event to be emitted
const emit = defineEmits();

// State to track which objects are expanded
const showNested = ref({});

// Initialize showNested for all keys to be true, so they start expanded
const initializeShowNested = (obj, prefix = "") => {
  Object.keys(obj).forEach((key) => {
    showNested.value[`${prefix}${key}`] = true; // Set the key to be expanded by default
    if (typeof obj[key] === "object" && obj[key] !== null) {
      initializeShowNested(obj[key], `${prefix}${key}.`);
    }
  });
};

// Initialize the nested objects to be expanded when the component is created
initializeShowNested(props.data);

const handleClick = (event) => {
  // Find the target of the click event
  const target = event.target;

  // Find the closest parent element with the class "json-key" (assuming it's the div containing the data-path)
  const closestElement = target.closest(".json-key");

  if (closestElement) {
    // Extract the data-path attribute from the closest element
    const dataPath = closestElement.getAttribute("data-path");
    console.log("Closest element:", closestElement);
    console.log("Data path:", dataPath); // Now logging the data-path value

    // Emit the data-path to the parent component
    emit("pathSelected", dataPath);
  } else {
    console.log("No closest element found.");
  }
};

// Toggle the visibility of nested objects
const toggleNested = (key) => {
  showNested.value[key] = !showNested.value[key];
};
</script>

<style scoped>
.json-item {
  padding-left: 20px;
}

.json-key {
  cursor: pointer;
}

.json-collapsible {
  font-weight: bold;
  color: blue;
  cursor: pointer;
}

.json-nested {
  margin-left: 20px;
}

.json-key:hover {
  text-decoration: underline;
}

.json-key span {
  display: inline-block;
  margin-left: 5px;
}
</style>
