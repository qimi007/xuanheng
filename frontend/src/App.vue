<template>
  <div class="app-container">
    <header class="app-header">
      <h1>地图工具</h1>
      <button class="menu-btn" @click="toggleMenu">
        {{ showMenu ? '✕' : '☰' }}
      </button>
    </header>
    
    <div class="app-body">
      <aside class="sidebar" :class="{ collapsed: !showMenu }">
        <nav class="tabs">
          <button :class="{ active: activeTab === 'add' }" @click="activeTab = 'add'">添加</button>
          <button :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">列表</button>
          <button :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">设置</button>
        </nav>
        
        <div class="tab-content">
          <AddLocation v-if="activeTab === 'add'" @added="activeTab = 'list'" />
          <LocationList v-else-if="activeTab === 'list'" />
          <Settings v-else-if="activeTab === 'settings'" />
        </div>
      </aside>
      
      <main class="map-area">
        <MapView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MapView from './components/MapView.vue'
import AddLocation from './components/AddLocation.vue'
import LocationList from './components/LocationList.vue'
import Settings from './components/Settings.vue'

const activeTab = ref('add')
const showMenu = ref(true)

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-header {
  height: 48px;
  background: #1a1a1a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
}

.app-header h1 {
  font-size: 16px;
  font-weight: 500;
}

.menu-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  background: #fafafa;
  border-right: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 0;
  overflow: hidden;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e5e5e5;
  background: #fff;
}

.tabs button {
  flex: 1;
  padding: 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  transition: all 0.2s;
}

.tabs button.active {
  color: #1a1a1a;
  font-weight: 500;
  border-bottom: 2px solid #1a1a1a;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.map-area {
  flex: 1;
  position: relative;
}
</style>