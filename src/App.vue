<script setup lang="ts">
import TopBar from './components/TopBar.vue'
import MapView from './views/MapView.vue'
</script>

<template>
  <div class="app">
    <TopBar />
    <MapView />
  </div>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
