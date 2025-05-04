<template>
  <div class="alert-rules-view">
    <router-view />
  </div>
</template>

<script setup>
// This is a container view that renders child routes for alert rule management
</script>

<style scoped>
.alert-rules-view {
  height: 100%;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.alert-rules-view > :deep(router-view) {
  flex: 1;
  overflow: auto;
}
</style>
