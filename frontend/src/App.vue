<template>
  <div class="app-container">
    <!-- 左侧功能栏 -->
    <aside class="sidebar">
      <div class="sidebar-top">
        <button class="icon-btn" :class="{ active: activeFeature === 'add' }" @click="toggleFeature('add')" title="添加位置">
          <span class="icon">📍</span>
        </button>
        <button class="icon-btn" :class="{ active: activeFeature === 'list' }" @click="toggleFeature('list')" title="位置列表">
          <span class="icon">📋</span>
        </button>
      </div>
      <div class="sidebar-bottom">
        <button class="icon-btn" :class="{ active: activeFeature === 'settings' }" @click="toggleFeature('settings')" title="设置">
          <span class="icon">⚙️</span>
        </button>
      </div>
    </aside>

    <!-- 悬浮卡片：位置列表 -->
    <div class="float-card" v-if="showListCard">
      <LocationList @close="showListCard = false" />
    </div>

    <!-- 右侧地图区域 -->
    <main class="main-area">
      <MapView />
    </main>

    <!-- 右侧对话框遮罩 -->
    <div class="dialog-overlay" v-if="showDialog" @click="closeDialog">
      <div class="dialog" @click.stop>
        <AddLocation v-if="activeFeature === 'add'" @added="closeDialog" />
        <Settings v-else-if="activeFeature === 'settings'" @close="closeDialog" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MapView from './components/MapView.vue'
import AddLocation from './components/AddLocation.vue'
import LocationList from './components/LocationList.vue'
import Settings from './components/Settings.vue'

const activeFeature = ref(null)
const showDialog = ref(false)
const showListCard = ref(false)

const toggleFeature = (feature) => {
  if (feature === 'list') {
    showListCard.value = !showListCard.value
    activeFeature.value = showListCard.value ? 'list' : null
  } else {
    if (activeFeature.value === feature && showDialog.value) {
      showDialog.value = false
      activeFeature.value = null
    } else {
      activeFeature.value = feature
      showDialog.value = true
    }
  }
}

const closeDialog = () => {
  showDialog.value = false
  activeFeature.value = null
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
  height: 100vh;
  position: relative;
}

/* 左侧功能栏 */
.sidebar {
  width: 56px;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 0;
  flex-shrink: 0;
  z-index: 100;
}

.sidebar-top,
.sidebar-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #333;
}

.icon-btn.active {
  background: #333;
}

.icon-btn .icon {
  font-size: 20px;
}

/* 悬浮卡片 */
.float-card {
  position: absolute;
  left: 56px;
  top: 0;
  width: 280px;
  height: 100%;
  background: #fff;
  border-right: 1px solid #e5e5e5;
  z-index: 90;
  overflow-y: auto;
  box-shadow: 2px 0 8px rgba(0,0,0,0.1);
}

/* 右侧地图区域 */
.main-area {
  flex: 1;
  position: relative;
}

/* 右侧对话框遮罩 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.dialog {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  min-width: 360px;
  max-width: 90%;
  max-height: 80%;
  overflow-y: auto;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}
</style>