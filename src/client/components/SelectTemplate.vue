<template>
  <div class="layout-container">
    <div
      v-for="template in templates"
      :key="template.id"
      :class="`template-position-${template.id} image-container`"
    >
      <ion-button
        fill="clear"
        class="template-button"
        @click="selectTemplate(template.id)"
      >
        <img
          :class="`template-avatar template-${template.id}`"
          :src="`/img/template_avatars/template${template.id}.png`"
          :alt="`Select template ${template.id}`"
          style="visibility: hidden"
        />
      </ion-button>
    </div>
    <div class="template-position-empty image-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { IonButton } from "@ionic/vue";

const templates = [
  { id: 1 },
  { id: 2 },
  { id: 3 },
  { id: 4 },
  { id: 5 },
  { id: 6 },
  { id: 8 },
];

const emit = defineEmits(["update:selectedTemplate"]);

const selectTemplate = (id) => {
  console.log(`Selecting template ID: ${id}`);
  console.log(`Template ID type: ${typeof id}`);
  // Always emit as string to match the string keys in the templates object
  emit("update:selectedTemplate", id.toString());
};

onMounted(() => {
  templates.forEach((template) => {
    const pe = document.querySelector(`.template-position-${template.id}`);
    const av = pe?.querySelector("img");
    if (av) {
      av.style.visibility = "visible";

      const pb = pe.getBoundingClientRect();
      const sf = (0.4 * pb.height) / av.getBoundingClientRect().height;

      av.style.transform = `scale(${sf})`;
    }
  });
});
</script>

<style scoped>
.layout-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(4, 1fr);
  grid-column-gap: 1px;
  grid-row-gap: 1px;
  height: 100%;
  width: 100%;
  background: var(--ion-color-primary);
  padding: var(--ion-padding);
}

.layout-container > div {
  overflow: hidden;
  display: grid;
  justify-content: center;
  align-items: center;
  position: relative;
}

.template-button {
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  --background: transparent;
  height: 100%;
  width: 100%;
  min-width: 44px;
  min-height: 44px;
}

.template-button img {
  transform: scale(0.5);
  align-self: center;
  background-color: var(--ion-color-primary);
  border: 2px solid var(--ion-color-primary-contrast);
  border-radius: 8px;
  min-width: 44px;
  min-height: 44px;
}

.template-position-1 {
  grid-area: 1 / 1 / 2 / 2;
}
.template-position-2 {
  grid-area: 1 / 2 / 2 / 3;
}
.template-position-3 {
  grid-area: 2 / 1 / 3 / 2;
}
.template-position-4 {
  grid-area: 2 / 2 / 3 / 3;
}
.template-position-5 {
  grid-area: 3 / 1 / 4 / 2;
}
.template-position-6 {
  grid-area: 3 / 2 / 4 / 3;
}
.template-position-8 {
  grid-area: 4 / 1 / 5 / 2;
}
.template-position-empty {
  grid-area: 4 / 2 / 5 / 3;
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 8px;
}
</style>
