<template>
  <div
    class="template-card"
    style="
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      user-select: none;
    "
  >
    <div
      class="card-content"
      style="
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        user-select: none;
      "
    >
      <WidgetComponent
        v-if="widget"
        :data="widget"
        :template="template"
        :layout="layout"
      />
      <div
        v-else
        class="empty-widget"
        style="
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          user-select: none;
        "
        @click="openAddWidget"
      >
        <ion-icon :icon="addCircleOutline" size="large" />
        <div class="empty-text">Add Widget</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { IonIcon } from "@ionic/vue";
import { addCircleOutline } from "ionicons/icons";
import { modalController } from "@ionic/vue";
import AddWidgetComponent from "./AddWidgetComponent.vue";
import WidgetComponent from "./WidgetComponent.vue";
import { usePageStore } from "../stores/pages";
import { onMounted } from "vue";

const props = defineProps({
  template: { type: String, required: true },
  widget: { type: Object, required: false },
  layout: { type: Object, required: false },
  pageIndex: { type: Number, required: true },
  tnum: { type: Number, required: true },
});

const emit = defineEmits(["widget-added"]);

onMounted(() => {
  // console.log(`TemplateCard ${props.template} mounted with widget:`, props.widget);
});

async function openAddWidget() {
  const addwidgetModal = await modalController.create({
    component: AddWidgetComponent,
    componentProps: {
      template: props.template,
    },
  });

  await addwidgetModal.present();

  // Handle the modal result
  const { data, role } = await addwidgetModal.onDidDismiss();
  // console.log("Modal dismissed with role:", role);
  // console.log("Modal data:", data);

  if (role === "confirm" && data) {
    // Update the page with the new widget
    try {
      const pageStore = usePageStore();
      const page = pageStore.getPage(props.pageIndex);

      if (page) {
        // Initialize widgets object if it doesn't exist
        if (!page.widgets) {
          page.widgets = {};
        }

        // Add the widget to the page
        const widgetKey = `templateCard${props.tnum}`;
        //console.log(`Adding widget to page at key: ${widgetKey}`, data);
        page.widgets[widgetKey] = data;

        // Update the page
        await pageStore.updatePage(props.pageIndex, page);

        // Emit an event to notify parent components that a widget was added
        emit("widget-added", { pageIndex: props.pageIndex, widgetKey, data });

        //console.log("Widget added successfully, no page reload needed");
      } else {
        console.error("Page not found at index:", props.pageIndex);
      }
    } catch (error) {
      console.error("Error updating page with widget:", error);
    }
  }
}
</script>

<style scoped>
.template-card {
  height: 100%;
  width: 100%;
  position: relative;
  background-color: var(--ion-color-primary);
  filter: brightness(0.925);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: none;
  margin: 0;
  padding: 0;
}

.card-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  border-radius: 8px;
  margin: 0;
  padding: 0;
}

.empty-widget {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--ion-color-light);
}

.empty-text {
  margin-top: 8px;
  font-size: 14px;
  color: var(--ion-color-light);
}

/* Make sure widget component takes full space */
:deep(.widget-container) {
  height: 100%;
  width: 100%;
}
</style>
