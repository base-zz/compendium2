<template>
  <div class="signalk-data-view">
    <h1>SignalK Data Viewer</h1>
    <SignalKDataViewer />
  </div>
</template>

<script setup>
import SignalKDataViewer from '../components/SignalKDataViewer.vue';
</script>

<style scoped>
.signalk-data-view {
  padding: 1rem;
}

h1 {
  margin-bottom: 1.5rem;
}
</style>
