<template>
  <div v-if="inSetup" class="template-container">
    <div ref="template1" class="template template-1"><span>1</span></div>
    <div ref="template2" class="template template-2"><span>2</span></div>
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
    <div ref="template1" class="template template-2 active">
      <TemplateCard
        key="templateCard1"
        template="templateCard1"
        :tnum="1"
        :layout="layout[1]"
        :widget="props.widgets['templateCard1']"
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
const template2 = useTemplateRef("template2");
const templateAr = [template1, template2];
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
  grid-template-rows: repeat(2, 1fr);
  grid-row-gap: 1px;
  grid-column-gap: 1px;
  height: 100%;
  position: relative;
  margin: 0;
  padding: 0;
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
.template-2 {
  grid-area: 2 / 1 / 3 / 2;
}

.template-container.active {
  height: 100%;
  width: 100%;
  position: relative;
  margin: 0;
  padding: 0;
  /* background-color: red; */
}

.template.active {
  position: absolute;
  height: 100%;
  width: 100%;
}
</style>
