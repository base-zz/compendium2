<template>
  <div class="template-selector-container">
    <h3>Select a Dashboard Template</h3>
    <div class="template-grid">
      <div 
        v-for="(template, index) in filteredTemplates" 
        :key="index"
        class="template-option"
        :class="{ 'selected': selectedTemplate === template.id }"
        @click="selectTemplate(template.id)"
      >
        <div class="template-preview" :class="`template-${template.id}`">
          <div class="preview-grid">
            <div v-for="area in template.areas" :key="area" class="preview-area"></div>
          </div>
        </div>
        <div class="template-name">{{ template.name }}</div>
      </div>
    </div>
    <div class="template-actions">
      <button class="apply-button" @click="applyTemplate">Apply Template</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useDashboardStore } from '../../stores/dashboardStore';
import { isPlatform } from '@ionic/vue';

const emit = defineEmits(['update:selectedTemplate', 'apply']);
const dashboardStore = useDashboardStore();

const props = defineProps({
  selectedTemplate: {
    type: Number,
    default: null
  }
});

// Use templates from the dashboard store
const availableTemplates = dashboardStore.availableTemplates;

const currentDeviceType = computed(() => {
  if (isPlatform('tablet')) {
    return 'tablet';
  }
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    return 'tablet';
  }
  return 'phone';
});

const filteredTemplates = computed(() => {
  const device = currentDeviceType.value;
  return availableTemplates.filter((template) => {
    if (!Array.isArray(template.deviceTypes) || template.deviceTypes.length === 0) {
      return true;
    }
    return template.deviceTypes.includes(device);
  });
});

const selectTemplate = (templateId) => {
  emit('update:selectedTemplate', templateId);
};

const applyTemplate = () => {
  if (!props.selectedTemplate) {
    console.warn('No template selected');
    return;
  }
  
  console.log('Selected template ID:', props.selectedTemplate);
  const template = availableTemplates.find(t => t.id === props.selectedTemplate);
  
  if (template) {
    console.log('Emitting apply event with template:', template);
    emit('apply', template);
  } else {
    console.error('Template not found for ID:', props.selectedTemplate);
  }
};
</script>

<style scoped>
.template-selector-container {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  max-width: 800px;
  margin: 0 auto;
}

h3 {
  text-align: center;
  margin-bottom: 20px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: auto;
  gap: 15px;
  justify-content: center;
  margin-bottom: 20px;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

.template-option {
  width: 100%;
  cursor: pointer;
  transition: transform 0.2s;
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 8px;
}

.template-option:hover {
  transform: scale(1.05);
}

.template-option.selected {
  border-color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.template-preview {
  height: 120px;
  width: 70px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
  margin-left: auto;
  margin-right: auto;
  overflow: hidden;
}

.preview-grid {
  width: 90%;
  height: 90%;
  position: relative;
}

.template-1 .preview-grid {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
  gap: 4px;
}

.template-2 .preview-grid {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
}

.template-3 .preview-grid {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 8px;
}

.template-4 .preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 2fr 1fr;
  gap: 4px;
}

.template-4 .preview-area:nth-child(3) {
  grid-column: span 2;
}

.template-5 .preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 4px;
}

.template-6 .preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 4px;
}

.template-7 .preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1.5fr;
  gap: 4px;
}

.template-7 .preview-area:nth-last-child(1) {
  grid-column: 1 / span 3;
}

.template-8 .preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 2fr;
  gap: 4px;
}

.template-8 .preview-area:nth-last-child(1) {
  grid-column: 1 / span 3;
}

.template-9 .preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 3fr;
  gap: 4px;
}

.template-9 .preview-area:nth-last-child(1) {
  grid-column: 1 / span 3;
}

.template-10 .preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  grid-template-rows: 1fr 2fr;
  gap: 4px;
}

.template-10 .preview-area:nth-last-child(1) {
  grid-column: 1 / span 4;
}

.preview-area {
  background: #e0e0e0;
  border-radius: 2px;
}

.template-name {
  text-align: center;
  font-size: 14px;
}

.template-actions {
  display: flex;
  justify-content: center;
}

.apply-button {
  padding: 10px 20px;
  background: var(--ion-color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.apply-button:hover {
  background: var(--ion-color-primary-shade);
}
</style>
