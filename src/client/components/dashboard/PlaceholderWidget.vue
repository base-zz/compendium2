<template>
  <div class="placeholder-widget">
    <div class="placeholder-content">
      <ion-icon :icon="addCircleOutline" size="large" class="add-icon" />
      <div class="area-name">{{ areaName }}</div>
      <ion-button expand="block" size="small" @click="addWidget" color="primary">
        Add Widget
      </ion-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { IonIcon, IonButton } from '@ionic/vue';
import { addCircleOutline } from 'ionicons/icons';

const props = defineProps({
  area: {
    type: String,
    required: true
  },
  widget: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['add-widget']);

// Function to emit add-widget event with area information
const addWidget = () => {
  console.log('PlaceholderWidget - addWidget called with area:', props.area);
  emit('add-widget', props.area);
};

// Format the area name to be more readable
const areaName = computed(() => {
  if (!props.area) return '';
  
  // Convert camelCase to separate words and capitalize first letter
  return props.area
    .replace(/([A-Z])/g, ' $1') // Insert a space before all capital letters
    .replace(/^./, str => str.toUpperCase()); // Capitalize the first letter
});
</script>

<style scoped>
.placeholder-widget {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(var(--ion-color-primary-rgb), 0.08);
  border: 2px dashed var(--ion-color-primary);
  border-radius: 12px;
  padding: 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  aspect-ratio: 1 / 1; /* Force square aspect ratio */
  box-sizing: border-box;
}

.placeholder-widget:hover {
  background-color: rgba(var(--ion-color-primary-rgb), 0.15);
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
  max-width: 200px;
}

.add-icon {
  color: var(--ion-color-primary);
  margin-bottom: 12px;
  font-size: 2.5rem;
}

.area-name {
  font-weight: bold;
  margin-bottom: 15px;
  color: var(--ion-color-dark);
  font-size: 1.1rem;
  text-transform: capitalize;
}
</style>
