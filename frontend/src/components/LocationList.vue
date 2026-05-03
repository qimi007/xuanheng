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

    <div v-if="showAddDialog" class="add-dialog-overlay" @click="closeAddDialog">
      <div class="add-dialog" @click.stop>
        <div class="dialog-header">
          <h3>添加位置点</h3>
          <button class="close-btn" @click="closeAddDialog">✕</button>
        </div>
        <div class="dialog-content">
          <div class="form-item">
            <label class="form-label">坐标系</label>
            <select v-model="addCoordType" class="form-select">
              <option value="wgs84">WGS84 (GPS坐标)</option>
              <option value="gcj02">GCJ-02 (国测局坐标)</option>
            </select>
          </div>
          <div class="form-item">
            <label class="form-label">输入方式</label>
            <div class="btn-group">
              <button :class="{ active: addInputMethod === 'manual' }" @click="addInputMethod = 'manual'">手动</button>
              <button :class="{ active: addInputMethod === 'pos' }" @click="addInputMethod = 'pos'">POS文件</button>
              <button :class="{ active: addInputMethod === 'log' }" @click="addInputMethod = 'log'">日志</button>
            </div>
          </div>
          <div v-if="addInputMethod === 'manual'" class="form-item">
            <label class="form-label">坐标输入</label>
            <textarea
              v-model="addCoordinates"
              class="form-textarea"
              placeholder="示例: 116.397428,39.90923; 116.397428,39.91923"
            ></textarea>
            <p class="form-hint">多个点用分号(;)分隔，不区分经纬度顺序</p>
          </div>
          <div v-else class="form-item">
            <label class="form-label">文件路径</label>
            <input
              type="text"
              v-model="addFilePath"
              class="form-input"
              :placeholder="addInputMethod === 'pos' ? '输入POS文件路径' : '输入日志文件路径'"
            />
          </div>
          <button class="btn-submit" @click="handleAddPoints">添加</button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteDialog" class="add-dialog-overlay" @click="closeDeleteDialog">
      <div class="delete-dialog" @click.stop>
        <div class="dialog-header">
          <h3>{{ deleteGroup?.name }}删除位置点提醒</h3>
          <button class="close-btn" @click="closeDeleteDialog">✕</button>
        </div>
        <div class="dialog-content">
          <p class="delete-message">确定要删除{{ deletePointNames }}共{{ deletePointCount }}点吗?</p>
          <div class="delete-actions">
            <button class="btn-cancel" @click="closeDeleteDialog">取消</button>
            <button class="btn-confirm" @click="confirmDelete">确定</button>
          </div>
        </div>
      </div>
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
          <div class="group-row">
            <span class="expand-icon" @click.stop="locationStore.toggleGroup(group.id)">{{ group.visible ? '▼' : '▶' }}</span>
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
            <div class="group-actions">
              <button class="action-btn" @click.stop="toggleGroupSelectAll(group.id)" title="全选">
                <svg viewBox="0 0 24 24" class="action-icon" :class="{ active: locationStore.isGroupAllSelected(group.id) }">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </button>
              <button 
                class="action-btn" 
                @click.stop="toggleShowTrack(group.id)" 
                title="显示轨迹"
                :disabled="locationStore.getSelectedPointsInGroup(group.id).length === 0"
              >
                <svg viewBox="0 0 24 24" class="action-icon" :class="{ active: locationStore.isGroupShowTrack(group.id), disabled: locationStore.getSelectedPointsInGroup(group.id).length === 0 }">
                  <path d="M3.5 18.5l6-6 4 4 8-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button class="action-btn" @click.stop="openAddDialog(group.id)" title="添加">
                <svg viewBox="0 0 24 24" class="action-icon">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </button>
              <button class="action-btn" @click.stop="deleteSelectedInGroup(group.id)" title="删除选中">
                <svg viewBox="0 0 24 24" class="action-icon">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
              <button class="action-btn" @click.stop="exportGroup(group.id)" title="导出">
                <svg viewBox="0 0 24 24" class="action-icon">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
              </button>
            </div>
          </div>

          <div v-if="group.visible" class="points">
            <div v-for="point in group.filteredPoints" :key="point.id" class="point-item">
              <div class="point-checkbox">
                <input
                  type="checkbox"
                  :checked="locationStore.isPointSelected(point.id)"
                  @change="locationStore.toggleSelectedPoint(point.id)"
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

const showAddDialog = ref(false)
const addToGroupId = ref(null)
const addCoordType = ref('wgs84')
const addInputMethod = ref('manual')
const addCoordinates = ref('')
const addFilePath = ref('')

const showDeleteDialog = ref(false)
const deleteGroup = ref(null)
const deletePointNames = ref('')
const deletePointCount = ref(0)

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

const toggleGroupSelectAll = (groupId) => {
  locationStore.toggleGroupSelectAll(groupId)
}

const toggleShowTrack = (groupId) => {
  locationStore.toggleGroupShowTrack(groupId)
}

const openAddDialog = (groupId) => {
  addToGroupId.value = groupId
  addCoordType.value = 'wgs84'
  addInputMethod.value = 'manual'
  addCoordinates.value = ''
  addFilePath.value = ''
  showAddDialog.value = true
}

const closeAddDialog = () => {
  showAddDialog.value = false
  addToGroupId.value = null
}

const parseCoordinates = (text) => {
  const points = text.split(';').map(s => s.trim()).filter(s => s)
  const result = []
  for (const point of points) {
    const parts = point.split(',').map(s => s.trim())
    if (parts.length >= 2) {
      const num1 = parseFloat(parts[0])
      const num2 = parseFloat(parts[1])
      if (!isNaN(num1) && !isNaN(num2)) {
        if (Math.abs(num1) > Math.abs(num2)) {
          result.push({ lng: num1, lat: num2 })
        } else {
          result.push({ lng: num2, lat: num1 })
        }
      }
    }
  }
  return result
}

const handleAddPoints = () => {
  let coords = []
  
  if (addInputMethod.value === 'manual') {
    coords = parseCoordinates(addCoordinates.value)
    if (coords.length === 0) {
      alert('请输入有效的坐标')
      return
    }
  } else {
    alert('文件加载功能待实现')
    return
  }
  
  locationStore.addPointsToGroup(addToGroupId.value, coords, addCoordType.value)
  closeAddDialog()
}

const deleteSelectedInGroup = (groupId) => {
  const group = locationStore.locationGroups.find(g => g.id === groupId)
  if (!group) return
  
  const selectedPoints = locationStore.getSelectedPointsInGroup(groupId)
  if (selectedPoints.length === 0) {
    alert('请先选择要删除的点')
    return
  }
  
  deleteGroup.value = group
  deletePointNames.value = selectedPoints.map(p => p.tagName).join(', ')
  deletePointCount.value = selectedPoints.length
  showDeleteDialog.value = true
}

const confirmDelete = () => {
  locationStore.deleteSelectedPoints()
  closeDeleteDialog()
}

const closeDeleteDialog = () => {
  showDeleteDialog.value = false
  deleteGroup.value = null
  deletePointNames.value = ''
  deletePointCount.value = 0
}

const exportGroup = (groupId) => {
  const group = locationStore.locationGroups.find(g => g.id === groupId)
  if (!group) return
  
  const selectedPoints = locationStore.getSelectedPointsInGroup(groupId)
  if (selectedPoints.length === 0) {
    alert('请先选择要导出的点')
    return
  }
  
  const now = new Date()
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  const filename = `${group.name}-${timestamp}.pos`
  
  let content = ''
  selectedPoints.forEach(p => {
    content += `${p.lng.toFixed(6)},${p.lat.toFixed(6)},${p.alt},${p.tagName},${p.cooSys},${p.datetime}\n`
  })
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
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

.group-actions {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.action-btn {
  width: 20px;
  height: 20px;
  padding: 2px;
  border: none;
  background: rgba(92, 107, 192, 0.1);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(92, 107, 192, 0.25);
}

.action-icon {
  width: 14px;
  height: 14px;
  fill: #5c6bc0;
}

.action-icon.active {
  fill: #3949ab;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn:disabled .action-icon.disabled {
  fill: #999;
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

.add-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.add-dialog {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  min-width: 320px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.add-dialog .dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.add-dialog .dialog-header h3 {
  font-size: 14px;
  font-weight: 500;
}

.add-dialog .dialog-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.add-dialog .form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.add-dialog .form-label {
  font-size: 11px;
  font-weight: 500;
  color: #333;
}

.add-dialog .form-select,
.add-dialog .form-textarea {
  padding: 8px 10px;
  border: 1px solid #e0e0e8;
  border-radius: 6px;
  font-size: 12px;
  background: #f8f8fc;
}

.add-dialog .form-select:focus,
.add-dialog .form-textarea:focus {
  outline: none;
  border-color: #7986cb;
}

.add-dialog .form-textarea {
  min-height: 80px;
  resize: vertical;
}

.add-dialog .form-hint {
  font-size: 10px;
  color: #888;
}

.add-dialog .btn-group {
  display: flex;
  gap: 8px;
}

.add-dialog .btn-group button {
  flex: 1;
  padding: 6px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  color: #666;
  transition: all 0.2s;
}

.add-dialog .btn-group button.active {
  background: linear-gradient(135deg, #7986cb 0%, #5c6bc0 100%);
  color: #fff;
  border-color: transparent;
}

.add-dialog .form-input {
  padding: 8px 10px;
  border: 1px solid #e0e0e8;
  border-radius: 6px;
  font-size: 12px;
  background: #f8f8fc;
}

.add-dialog .form-input:focus {
  outline: none;
  border-color: #7986cb;
}

.add-dialog .btn-submit {
  padding: 8px;
  background: linear-gradient(135deg, #7986cb 0%, #5c6bc0 100%);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.add-dialog .btn-submit:hover {
  background: #5c6bc0;
}

.delete-dialog {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  min-width: 320px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.delete-dialog .dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.delete-dialog .dialog-header h3 {
  font-size: 14px;
  font-weight: 500;
}

.delete-dialog .dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.delete-message {
  font-size: 13px;
  color: #333;
  line-height: 1.5;
}

.delete-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
}

.btn-cancel:hover {
  background: #eee;
}

.btn-confirm {
  padding: 8px 16px;
  background: #f44336;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #fff;
}

.btn-confirm:hover {
  background: #d32f2f;
}
</style>