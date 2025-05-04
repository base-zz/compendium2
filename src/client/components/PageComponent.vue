<template>
  <div class="page-container">
    <template v-if="resolvedTemplate">
      <component
        :is="resolvedTemplate"
        :widgets="page.widgets"
        :pageIndex="pageIndex"
        :template="page.template"
      />
    </template>
    <template v-else>
      <SelectTemplate v-model:selectedTemplate="selectedTemplate" />
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
import { usePageStore } from "../stores/pages.js";
import SelectTemplate from "./SelectTemplate.vue";
// import AnchorComponent from "./AnchorComponent.vue";
import Template1 from "./TemplateLayout1.vue";
import Template2 from "./TemplateLayout2.vue";
import Template3 from "./TemplateLayout3.vue";
import Template4 from "./TemplateLayout4.vue";
import Template5 from "./TemplateLayout5.vue";
import Template6 from "./TemplateLayout6.vue";
import Template8 from "./TemplateLayout8.vue";

const props = defineProps({
  page: { type: Object, required: true },
  pageIndex: { type: Number, required: true },
});

const pageStore = usePageStore();
const selectedTemplate = ref(null);

// Template mapping
const templates = {
  1: Template1,
  2: Template2,
  3: Template3,
  4: Template4,
  5: Template5,
  6: Template6,
  8: Template8,
};

// Resolve template component
const resolvedTemplate = computed(() => {
  if (!props.page?.template) {
    return null;
  }

  const templateId = props.page.template.toString().replace("template-", "");
  // console.log(`Resolving template ID: ${templateId}, type: ${typeof templateId}`);
  // console.log(`Available templates:`, Object.keys(templates));
  // console.log(`Resolved template:`, templates[templateId]);

  return templates[templateId] || null;
});

// Watch for template selection changes
watch(selectedTemplate, async (newTemplate) => {
  if (newTemplate) {
    // console.log(`PageComponent: Selected template changed to ${newTemplate}`);
    // console.log(`PageComponent: Template type: ${typeof newTemplate}`);

    const page = pageStore.getPage(props.pageIndex);
    if (page) {
      // console.log(`PageComponent: Updating page ${props.pageIndex} template to template-${newTemplate}`);
      page.template = `template-${newTemplate}`;
      await pageStore.updatePage(props.pageIndex, page);
    }
  }
});

// Initialize selectedTemplate from page
onMounted(() => {
  selectedTemplate.value = null;

  if (props.page?.template) {
    const templateId = props.page.template.toString().replace("template-", "");
    selectedTemplate.value = templateId;
  }
});
</script>

<style scoped>
.page-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--ion-color-primary);
  margin: 0;
  padding: 0;
}
</style>
