<template>
  <div v-if="inSetup" class="template-container">
    <div ref="template1" class="template template-1"><span>1</span></div>
    <div ref="template2" class="template template-2"><span>2</span></div>
    <div ref="template3" class="template template-3"><span>3</span></div>
    <div ref="template4" class="template template-4"><span>4</span></div>
    <div ref="template5" class="template template-5"><span>5</span></div>
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
    <div ref="template2" class="template template-3 active">
      <TemplateCard
        key="templateCard2"
        template="templateCard2"
        :tnum="2"
        :layout="layout[2]"
        :widget="props.widgets['templateCard2']"
        :pageIndex="props.pageIndex"
      />
    </div>
    <div ref="template3" class="template template-4 active">
      <TemplateCard
        key="templateCard3"
        template="templateCard3"
        :tnum="3"
        :layout="layout[3]"
        :widget="props.widgets['templateCard3']"
        :pageIndex="props.pageIndex"
      />
    </div>
    <div ref="template4" class="template template-5 active">
      <TemplateCard
        key="templateCard4"
        template="templateCard4"
        :tnum="4"
        :layout="layout[4]"
        :widget="props.widgets['templateCard4']"
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
const template3 = useTemplateRef("template3");
const template4 = useTemplateRef("template4");
const template5 = useTemplateRef("template5");
const templateAr = [template1, template2, template3, template4, template5];
const layout = ref([]);
const inSetup = ref(true);

function calcLayout() {
  templateAr.forEach((t) => {
    const dim = t.value.getBoundingClientRect().toJSON();
    layout.value.push(dim);
    // t.value.style.height = dim.height + "px";
    // t.value.style.width = dim.width + "px";
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
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 2fr 4fr 2fr;
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
  grid-area: 1 / 2 / 2 / 3;
}
.template-3 {
  grid-area: 3 / 1 / 4 / 2;
}
.template-4 {
  grid-area: 3 / 2 / 4 / 3;
}
.template-5 {
  grid-area: 2 / 1 / 3 / 3;
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
