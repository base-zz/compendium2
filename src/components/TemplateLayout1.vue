<template>
  <div v-if="inSetup" class="template-container">
    <div ref="template1" class="template template-1"><span>1</span></div>
  </div>
  <div v-else class="template-container active">
    <div ref="template0" class="template template-1 active">
      <TemplateCard
        key="templateCard0"
        template="templateCard0"
        :tnum="0"
        :layout="layout[0]"
        :widget="props.widgets['templateCard0']"
        :pageIndex="props.pageIndex"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted, useTemplateRef, ref } from "vue";
import TemplateCard from "./TemplateCard.vue";

const props = defineProps({
  widgets: { type: Object, required: false, default: () => {} },
  pageIndex: { type: Number, required: true },
});

const template1 = useTemplateRef("template1");
const templateAr = [template1];
const layout = ref([]);
const inSetup = ref(true);

function calcLayout() {
  templateAr.forEach((t) => {
    const dim = t.value.getBoundingClientRect().toJSON();
    layout.value.push(dim);
  });
}

onMounted(() => {
  setTimeout(() => {
    calcLayout();
    inSetup.value = false;
  }, 100);
});
</script>

<style scoped>
ion-content {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.template-container {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
  grid-row-gap: 1px;
  grid-column-gap: 1px;
  height: 100%;
  position: relative;
  margin: 0;
  padding: 0;
  border-radius: 8px;
}

.template {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0;
  margin: 0;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-content: center;
  background-color: var(--ion-color-primary);
  border-radius: 8px;
}

.template > * {
  /* position: relative; */
  top: 0;
  left: 0;
  align-items: center;
}

.template-1 {
  grid-area: 1 / 1 / 2 / 2;
}

.template-container.active {
  height: 100%;
  width: 100%;
  position: relative;
  margin: 0;
  padding: 0;
  border-radius: 8px;
  /* background-color: red; */
}

.template.active {
  position: absolute;
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
}
</style>
