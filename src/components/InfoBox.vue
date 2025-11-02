<template>
  <div class="info-box square">
    <div class="label"> {{ props.label }} <span v-if="props.labelModifier">{{ props.labelModifier }}</span></div>
    <div class="metric">
      {{ props.value }} <span v-if="props.valueModifier">{{ props.valueModifier }}</span>
    </div>
  </div>
</template>
<script setup>

const props = defineProps({
  label: String,
  value: [String, Number],
  valueModifier: String,
  labelModifier: String,
  class: [String, Array]
});
</script>

<style scoped>
.info-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2vw
}

.label{font-size: smaller; padding-bottom: 1vw;}
.metric{font-size: larger;}

</style>