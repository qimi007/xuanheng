<template>
  <div class="location-list">
    <div class="card-header">
      <h3>位置列表</h3>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="search-box" v-if="totalPoints > 0">
      <select v-model="searchType" class="search-type">
        <option value="name">名称</option>
        <option value="coords">经纬度</option>
        <option value="time">时间</option>
      </select>
      <input 
        v-model="searchKeyword" 
        class="search-input" 
        placeholder="搜索..."
        @input="handleSearch"
      />
    </div>

    <div class="list-content">
      <div class="list-header" v-if="locationStore.locationGroups.length > 0 && !searchKeyword">
        <span class="count">{{ locationStore.locationGroups.length }} 个分组</span>
        <button class="btn-clear" @click="handleClear">清空</button>
      </div>

      <div v-if="totalPoints === 0" class="empty">
        <p>暂无位置数据</p>
        <p class="empty-hint">请先添加位置</p>
      </div>

      <div v-else class="groups">
        <div v-for="group in filteredGroups" :key="group.id" class="group">
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
            <span class="group-count">{{ group.filteredPoints.length }}点</span>
          </div>

          <div v-if="group.visible" class="points">
            <div v-for="point in group.filteredPoints" :key="point.id" class="point-item">
              <div class="point-checkbox">
                <input
                  type="checkbox"
                  :checked="locationStore.isPointVisible(point.id)"
                  @change="locationStore.togglePoint(point.id)"
                />
              </div>
              <div class="point-info">
                <div class="point-name-row">
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
                </div>
                <div class="point-coord-row">
                  <span class="point-coordsys">[{{ point.cooSys }}]</span>
                  <span class="point-coord" @click="copyCoords(point)">{{ point.lng.toFixed(6) }},{{ point.lat.toFixed(6) }}</span>
                  <span class="point-time">{{ formatTime(point.time) }}</span>
                  <span class="copy-hint" v-if="copiedPointId === point.id">已复制</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed } from 'vue'
import { useLocationStore } from '../stores/locations'

defineEmits(['close'])

const locationStore = useLocationStore()

const editingGroupId = ref(null)
const editingGroupName = ref('')
const groupNameInput = ref(null)

const editingPointId = ref(null)
const editingPointName = ref('')
const pointNameInput = ref(null)
const copiedPointId = ref(null)

const searchType = ref('name')
const searchKeyword = ref('')

const totalPoints = computed(() => {
  return locationStore.locationGroups.reduce((sum, g) => sum + g.points.length, 0)
})

const handleSearch = () => {
  // 搜索逻辑由 computed 属性处理
}

const isPointMatched = (point) => {
  if (!searchKeyword.value) return true
  const keyword = searchKeyword.value.toLowerCase()
  
  if (searchType.value === 'name') {
    return point.tagName.toLowerCase().includes(keyword)
  } else if (searchType.value === 'coords') {
    const coords = `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`
    return coords.includes(keyword)
  } else if (searchType.value === 'time') {
    const timeStr = point.datetime || formatTime(point.time)
    return timeStr.toLowerCase().includes(keyword)
  }
  return true
}

const filteredGroups = computed(() => {
  if (!searchKeyword.value) {
    return locationStore.locationGroups.map(g => ({
      ...g,
      filteredPoints: g.points
    }))
  }
  return locationStore.locationGroups
    .map(g => ({
      ...g,
      filteredPoints: g.points.filter(isPointMatched)
    }))
    .filter(g => g.filteredPoints.length > 0)
})

const copyCoords = (point) => {
  const text = `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`
  navigator.clipboard.writeText(text).then(() => {
    copiedPointId.value = point.id
    setTimeout(() => {
      copiedPointId.value = null
    }, 1500)
  })
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

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

.search-box {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e8eaf6;
}

.search-type {
  padding: 4px 8px;
  border: 1px solid #e0e0e8;
  border-radius: 6px;
  font-size: 11px;
  background: #f8f8fc;
  color: #5c6bc0;
  cursor: pointer;
}

.search-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #e0e0e8;
  border-radius: 6px;
  font-size: 11px;
  background: #f8f8fc;
}

.search-input:focus {
  outline: none;
  border-color: #7986cb;
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

.point-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid #f8f8f8;
}

.point-item:last-child {
  border-bottom: none;
}

.point-checkbox {
  display: flex;
  align-items: center;
}

.point-checkbox input {
  cursor: pointer;
}

.point-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  line-height: 1.2;
}

.point-name-row {
  display: flex;
  align-items: center;
}

.point-name {
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.point-name:hover {
  color: #5c6bc0;
}

.point-name-input {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 4px;
  border: 1px solid #7986cb;
  border-radius: 3px;
  outline: none;
  width: 80px;
}

.point-coordsys {
  font-size: 10px;
  color: #5c6bc0;
  font-weight: 500;
}

.point-coord {
  font-size: 10px;
  color: #333;
  font-family: monospace;
  font-weight: 600;
  cursor: pointer;
}

.point-coord:hover {
  color: #5c6bc0;
}

.point-time {
  font-size: 10px;
  color: #333;
  font-weight: 600;
  margin-left: auto;
}

.point-name:hover {
  color: #5c6bc0;
}

.point-name-input {
  font-size: 12px;
  font-weight: 500;
  padding: 1px 4px;
  border: 1px solid #7986cb;
  border-radius: 3px;
  outline: none;
  width: 80px;
}

.point-coord-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 1px 3px;
  border-radius: 3px;
}

.point-coordsys {
  font-size: 8px;
  color: #5c6bc0;
  font-weight: 500;
}

.point-coord {
  font-size: 8px;
  color: #333;
  font-family: monospace;
  font-weight: 600;
  cursor: pointer;
}

.point-coord:hover {
  color: #5c6bc0;
}

.point-time {
  font-size: 8px;
  color: #333;
  font-weight: 600;
  margin-left: auto;
}

.copy-hint {
  font-size: 7px;
  color: #5c6bc0;
  font-weight: 500;
}
</style>