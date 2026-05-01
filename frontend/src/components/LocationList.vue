<template>
  <div class="location-list">
    <div class="card-header">
      <h3>位置列表</h3>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="list-content">
      <div class="list-header" v-if="locationStore.locationGroups.length > 0">
        <span class="count">{{ locationStore.locationGroups.length }} 个分组</span>
        <button class="btn-clear" @click="handleClear">清空</button>
      </div>

      <div v-if="locationStore.locationGroups.length === 0" class="empty">
        <p>暂无位置数据</p>
        <p class="empty-hint">请先添加位置</p>
      </div>

      <div v-else class="groups">
        <div v-for="group in locationStore.locationGroups" :key="group.id" class="group">
          <div class="group-row" @click="locationStore.toggleGroup(group.id)">
            <span class="expand-icon">{{ group.visible ? '▼' : '▶' }}</span>
            <span class="group-name">{{ group.name }}</span>
            <span class="group-count">{{ group.points.length }}点</span>
          </div>

          <div v-if="group.visible" class="points">
            <div v-for="point in group.points" :key="point.id" class="point-row">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="locationStore.isPointVisible(point.id)"
                  @change="locationStore.togglePoint(point.id)"
                />
                <span class="point-name">{{ point.name }}</span>
              </label>
              <span class="point-coord">{{ point.lng.toFixed(4) }}, {{ point.lat.toFixed(4) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useLocationStore } from '../stores/locations'

defineEmits(['close'])

const locationStore = useLocationStore()

const handleClear = () => {
  if (confirm('确定清空所有位置？')) {
    locationStore.clearAll()
  }
}
</script>

<style scoped>
.location-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e5e5;
}

.card-header h3 {
  font-size: 14px;
  font-weight: 500;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.count {
  font-size: 12px;
  color: #666;
}

.btn-clear {
  padding: 4px 10px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  color: #666;
}

.empty {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty p {
  margin: 0;
}

.empty-hint {
  font-size: 12px;
  margin-top: 8px !important;
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  overflow: hidden;
}

.group-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fafafa;
  cursor: pointer;
}

.group-row:hover {
  background: #f0f0f0;
}

.expand-icon {
  font-size: 10px;
  color: #888;
}

.group-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.group-count {
  font-size: 11px;
  color: #888;
}

.points {
  border-top: 1px solid #f0f0f0;
}

.point-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #f8f8f8;
}

.point-row:last-child {
  border-bottom: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  cursor: pointer;
}

.point-name {
  font-size: 12px;
}

.point-coord {
  font-size: 10px;
  color: #999;
  font-family: monospace;
}
</style>