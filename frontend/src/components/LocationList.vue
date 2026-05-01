<template>
  <div class="location-list">
    <div class="list-header">
      <h3>位置清单</h3>
      <button v-if="locationStore.locationGroups.length > 0" class="btn-clear" @click="handleClear">清空</button>
    </div>

    <div v-if="locationStore.locationGroups.length === 0" class="empty">
      暂无位置数据
    </div>

    <div v-else class="tree-view">
      <div v-for="group in locationStore.locationGroups" :key="group.id" class="group-item">
        <div class="group-header" @click="locationStore.toggleGroup(group.id)">
          <span class="expand-icon">{{ group.visible ? '▼' : '▶' }}</span>
          <span class="group-name">{{ group.name }}</span>
          <span class="group-info">({{ group.points.length }}个点, {{ group.coordType }})</span>
        </div>
        <div v-if="group.visible" class="points-list">
          <div v-for="point in group.points" :key="point.id" class="point-item">
            <input
              type="checkbox"
              :checked="locationStore.isPointVisible(point.id)"
              @change="locationStore.togglePoint(point.id)"
            />
            <span class="point-name">{{ point.name }}</span>
            <span class="point-coord">{{ point.lng.toFixed(6) }}, {{ point.lat.toFixed(6) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useLocationStore } from '../stores/locations'

const locationStore = useLocationStore()

const handleClear = () => {
  if (confirm('确定清空所有位置数据？')) {
    locationStore.clearAll()
  }
}
</script>

<style scoped>
.location-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-header h3 {
  font-size: 16px;
}

.btn-clear {
  padding: 4px 12px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-clear:hover {
  background: #f0f0f0;
}

.empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.tree-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  cursor: pointer;
  background: #f9f9f9;
}

.group-header:hover {
  background: #f0f0f0;
}

.expand-icon {
  font-size: 10px;
  color: #666;
}

.group-name {
  font-weight: 500;
}

.group-info {
  font-size: 12px;
  color: #999;
}

.points-list {
  border-top: 1px solid #eee;
}

.point-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid #f5f5f5;
}

.point-item:last-child {
  border-bottom: none;
}

.point-item input[type="checkbox"] {
  cursor: pointer;
}

.point-name {
  font-size: 13px;
}

.point-coord {
  font-size: 11px;
  color: #999;
  font-family: monospace;
  margin-left: auto;
}
</style>