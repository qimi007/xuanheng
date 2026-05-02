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
            <input
              v-if="editingGroupId === group.id"
              v-model="editingGroupName"
              class="group-name-input"
              @blur="saveGroupName(group.id)"
              @keyup.enter="saveGroupName(group.id)"
              @click.stop
              ref="groupNameInput"
            />
            <span 
              v-else 
              class="group-name"
              @dblclick.stop="startEditGroup(group)"
            >{{ group.name }}</span>
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
              </label>
              <input
                v-if="editingPointId === point.id"
                v-model="editingPointName"
                class="point-name-input"
                @blur="savePointName(point.id)"
                @keyup.enter="savePointName(point.id)"
                @click.stop
                ref="pointNameInput"
              />
              <span 
                v-else 
                class="point-name"
                @dblclick.stop="startEditPoint(point)"
              >{{ point.tagName }}</span>
              <span class="point-coordsys">[{{ point.cooSys }}]</span>
              <span class="point-coord">{{ point.lng.toFixed(6) }}, {{ point.lat.toFixed(6) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useLocationStore } from '../stores/locations'

defineEmits(['close'])

const locationStore = useLocationStore()

const editingGroupId = ref(null)
const editingGroupName = ref('')
const groupNameInput = ref(null)

const editingPointId = ref(null)
const editingPointName = ref('')
const pointNameInput = ref(null)

const startEditGroup = (group) => {
  editingGroupId.value = group.id
  editingGroupName.value = group.name
  nextTick(() => {
    if (groupNameInput.value && groupNameInput.value[0]) {
      groupNameInput.value[0].focus()
    }
  })
}

const saveGroupName = (groupId) => {
  if (editingGroupName.value.trim()) {
    locationStore.updateGroupName(groupId, editingGroupName.value.trim())
  }
  editingGroupId.value = null
  editingGroupName.value = ''
}

const startEditPoint = (point) => {
  editingPointId.value = point.id
  editingPointName.value = point.tagName
  nextTick(() => {
    if (pointNameInput.value && pointNameInput.value[0]) {
      pointNameInput.value[0].focus()
    }
  })
}

const savePointName = (pointId) => {
  if (editingPointName.value.trim()) {
    locationStore.updatePointName(pointId, editingPointName.value.trim())
  }
  editingPointId.value = null
  editingPointName.value = ''
}

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
  border-bottom: 1px solid #e8eaf6;
  background: linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%);
}

.card-header h3 {
  font-size: 14px;
  font-weight: 500;
  color: #5c6bc0;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(92, 107, 192, 0.1);
  cursor: pointer;
  font-size: 14px;
  color: #5c6bc0;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(92, 107, 192, 0.2);
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
  background: rgba(92, 107, 192, 0.1);
  border: 1px solid rgba(92, 107, 192, 0.3);
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  color: #5c6bc0;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: rgba(92, 107, 192, 0.2);
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
  border: 1px solid #f0f0f5;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.group-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #f8f8fc 0%, #f0f0f8 100%);
  cursor: pointer;
  transition: all 0.2s;
}

.group-row:hover {
  background: linear-gradient(135deg, #f0f0f8 0%, #e8e8f5 100%);
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

.group-name-input {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  padding: 4px 8px;
  border: 1px solid #7986cb;
  border-radius: 4px;
  outline: none;
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
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #f8f8f8;
}

.point-row:last-child {
  border-bottom: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input {
  cursor: pointer;
}

.point-name {
  font-size: 12px;
  min-width: 60px;
}

.point-name-input {
  font-size: 12px;
  min-width: 60px;
  padding: 2px 6px;
  border: 1px solid #7986cb;
  border-radius: 4px;
  outline: none;
}

.point-coordsys {
  font-size: 11px;
  color: #5c6bc0;
  font-weight: 500;
}

.point-coord {
  font-size: 10px;
  color: #999;
  font-family: monospace;
}
</style>