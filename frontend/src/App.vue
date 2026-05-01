<template>
  <div class="app-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>地图工具</h2>
      </div>
      <nav class="sidebar-nav">
        <button :class="{ active: activeTab === 'add' }" @click="activeTab = 'add'">添加位置</button>
        <button :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">位置清单</button>
        <button :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">设置</button>
      </nav>
      <div class="sidebar-content">
        <AddLocation v-if="activeTab === 'add'" />
        <LocationList v-else-if="activeTab === 'list'" />
        <Settings v-else-if="activeTab === 'settings'" />
      </div>
    </aside>
    <main class="main-content">
      <MapView ref="mapRef" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MapView from './components/MapView.vue'
import AddLocation from './components/AddLocation.vue'
import LocationList from './components/LocationList.vue'
import Settings from './components/Settings.vue'

const activeTab = ref('add')
const mapRef = ref(null)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: system-ui, -apple-system, sans-serif;
}

.app-container {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 320px;
  background: #f5f5f5;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  background: #333;
  color: #fff;
}

.sidebar-header h2 {
  font-size: 18px;
}

.sidebar-nav {
  display: flex;
  border-bottom: 1px solid #ddd;
}

.sidebar-nav button {
  flex: 1;
  padding: 12px;
  border: none;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
}

.sidebar-nav button.active {
  background: #e0e0e0;
  font-weight: 500;
}

.sidebar-nav button:hover {
  background: #f0f0f0;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.main-content {
  flex: 1;
  position: relative;
}
</style>