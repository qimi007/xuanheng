<template>
  <div class="app-container">
    <!-- 左侧功能栏 -->
    <aside class="sidebar">
      <div class="sidebar-top">
        <button class="icon-btn" :class="{ active: activeFeature === 'add' }" @click="toggleFeature('add')" title="添加位置">
          <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </button>
        <button class="icon-btn" :class="{ active: activeFeature === 'list' }" @click="toggleFeature('list')" title="位置列表">
          <svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        </button>
      </div>
      <div class="sidebar-bottom">
        <button class="icon-btn" :class="{ active: activeFeature === 'settings' }" @click="toggleFeature('settings')" title="设置">
          <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
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
  background: linear-gradient(180deg, #e8eaf6 0%, #c5cae9 100%);
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
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: scale(1.05);
}

.icon-btn.active {
  background: #fff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
}

.icon-btn svg {
  width: 22px;
  height: 22px;
  fill: #5c6bc0;
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
  border-radius: 16px;
  padding: 24px;
  min-width: 380px;
  max-width: 90%;
  max-height: 80%;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}
</style>