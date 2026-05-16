<template>
  <div class="location-list">
    <div class="card-header">
      <h3>位置列表{{ locationStore.locationGroups.length > 0 ? `(${locationStore.locationGroups.length}个分组)` : '' }}</h3>
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
          <div v-else-if="addInputMethod === 'pos'" class="form-item">
            <label class="form-label">选择POS文件</label>
            <div class="file-picker" @click="selectPosFile">
              <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <span class="file-name">{{ posFileName || '点击选择POS文件' }}</span>
            </div>
            <input ref="posFileInput" type="file" accept=".pos.json,.json" style="display:none" @change="handlePosFileSelect" />
            <p class="form-hint">支持JSON格式POS文件</p>
          </div>
          <div v-else class="form-item">
            <label class="form-label">文件路径</label>
            <input
              type="text"
              v-model="addFilePath"
              class="form-input"
              placeholder="输入日志文件路径"
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

    <div v-if="showDeleteGroupDialog" class="add-dialog-overlay" @click="closeDeleteGroupDialog">
      <div class="delete-dialog" @click.stop>
        <div class="dialog-header">
          <h3>删除分组提醒</h3>
          <button class="close-btn" @click="closeDeleteGroupDialog">✕</button>
        </div>
        <div class="dialog-content">
          <p class="delete-message">确定要删除分组"{{ deleteGroupName }}"吗?</p>
          <div class="delete-actions">
            <button class="btn-cancel" @click="closeDeleteGroupDialog">取消</button>
            <button class="btn-confirm" @click="confirmDeleteGroup">确定</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showContextMenuFlag" class="context-menu-overlay" @click="closeContextMenu">
      <div class="context-menu" :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }" @click.stop>
        <div class="context-menu-item" @click="handleContextMenuAction('selectAll')">
          <span class="menu-icon">✓</span>
          <span>全选/取消</span>
        </div>
        <div class="context-menu-item color-menu-item" @click.stop="toggleColorPickerFromMenu">
          <span class="menu-icon" :style="{ backgroundColor: contextMenuGroup?.color }"></span>
          <span>选择颜色</span>
          <span class="menu-arrow">▶</span>
          <div v-if="activeColorPicker === contextMenuGroup?.id" class="menu-color-picker" @click.stop>
            <div 
              v-for="color in colorPalette" 
              :key="color"
              class="color-option"
              :style="{ backgroundColor: color }"
              @click="selectColorFromMenu(color)"
            ></div>
          </div>
        </div>
        <div class="context-menu-item" @click.stop="toggleShapeMenu">
          <span class="menu-icon">●</span>
          <span>标记形状</span>
          <span class="menu-arrow">▶</span>
          <div v-if="activeShapeMenu === contextMenuGroup?.id" class="menu-shape-picker" @click.stop>
            <div class="shape-option" :class="{ active: contextMenuGroup?.shape === 'circle' }" @click="selectShape('circle')">
              <span class="shape-circle"></span>
              <span>圆形</span>
            </div>
            <div class="shape-option" :class="{ active: contextMenuGroup?.shape === 'arrow' }" @click="selectShape('arrow')">
              <span class="shape-arrow">➤</span>
              <span>箭头</span>
            </div>
          </div>
        </div>
        <div class="context-menu-item" @click="handleContextMenuAction('track')" :class="{ disabled: !canShowTrack && !isTrackShown }">
          <span class="menu-icon">〰</span>
          <span>{{ isTrackShown ? '隐藏轨迹' : '显示轨迹' }}</span>
        </div>
        <div class="context-menu-item" @click="handleContextMenuAction('add')">
          <span class="menu-icon">+</span>
          <span>添加点</span>
        </div>
        <div class="context-menu-item" @click="handleContextMenuAction('delete')" :class="{ disabled: !canDelete }">
          <span class="menu-icon">🗑</span>
          <span>删除选中</span>
        </div>
        <div class="context-menu-item" @click="handleContextMenuAction('export')" :class="{ disabled: !canExport }">
          <span class="menu-icon">↓</span>
          <span>导出</span>
        </div>
        <div class="context-menu-item" @click="handleContextMenuAction('editName')">
          <span class="menu-icon">✎</span>
          <span>重命名</span>
        </div>
        <div class="context-menu-item" @click="handleContextMenuAction('deleteGroup')">
          <span class="menu-icon">✕</span>
          <span>删除分组</span>
        </div>
      </div>
    </div>

    <div v-if="showExportDialog" class="export-dialog-overlay" @click="closeExportDialog">
      <div class="export-dialog" @click.stop>
        <div class="dialog-header">
          <h3>选择导出格式</h3>
          <button class="close-btn" @click="closeExportDialog">✕</button>
        </div>
        <div class="dialog-content">
          <div class="export-options">
            <label class="export-option" :class="{ active: exportFormat === 'json' }">
              <input type="radio" v-model="exportFormat" value="json" />
              <span class="option-label">
                <span class="option-title">JSON 格式</span>
                <span class="option-desc">默认格式，支持完整字段和别名</span>
              </span>
            </label>
            <label class="export-option" :class="{ active: exportFormat === 'csv' }">
              <input type="radio" v-model="exportFormat" value="csv" />
              <span class="option-label">
                <span class="option-title">CSV 格式</span>
                <span class="option-desc">表格格式，兼容Excel等工具</span>
              </span>
            </label>
          </div>
          <button class="btn-export" @click="confirmExport">
            <svg class="export-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>导出文件</span>
          </button>
        </div>
      </div>
    </div>

    <div class="list-content">
      <div v-if="totalPoints === 0" class="empty">
        <p>暂无位置数据</p>
        <p class="empty-hint">请先添加位置</p>
      </div>

      <div v-else class="groups">
        <div v-for="group in filteredGroups" :key="group.id" class="group">
          <div class="group-row" @contextmenu.prevent="showContextMenu($event, group)">
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
            <span class="group-count">{{ group.filteredPoints.length }}</span>
            <div class="group-indicator">
              <svg v-if="group.shape === 'arrow'" class="indicator-icon" width="16" height="16" viewBox="0 0 16 16">
                <polygon points="8,1 12,9 10,9 10,14 6,14 6,9 4,9" :fill="group.color"/>
              </svg>
              <span v-else class="indicator-circle-filled" :style="{ backgroundColor: group.color }"></span>
            </div>
          </div>

          <div v-if="group.visible" class="points">
            <div 
              v-for="point in group.filteredPoints" 
              :key="point.id" 
              class="point-item"
              :id="'point-' + point.id"
              :class="{ 'point-focused': locationStore.focusedPointId === point.id, 'point-highlight': locationStore.highlightedPointId === point.id }"
              @dblclick="locationStore.setFocusedPoint(point.id)"
            >
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
                  <input
                    type="radio"
                    class="point-detail-radio"
                    :name="'detail-' + point.id"
                    :checked="point.showDetail"
                    :disabled="!locationStore.isPointSelected(point.id)"
                    @change="locationStore.togglePointDetail(point.id)"
                  />
                </div>
                <div class="point-coord-row" @dblclick.stop="locationStore.setFocusedPoint(point.id)">
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
import { ref, nextTick, computed, watch } from 'vue'
import { useLocationStore } from '../stores/locations'

defineEmits(['close'])

const locationStore = useLocationStore()

watch(() => locationStore.focusedPointId, (newPointId) => {
  if (newPointId) {
    nextTick(() => {
      const el = document.getElementById('point-' + newPointId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }
})

watch(() => locationStore.highlightedPointId, (newPointId) => {
  if (newPointId) {
    nextTick(() => {
      const el = document.getElementById('point-' + newPointId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
    setTimeout(() => {
      locationStore.clearHighlightPoint()
    }, 1500)
  }
})

const colorPalette = [
  '#5c6bc0', '#ef5350', '#66bb6a', '#ffa726', '#ab47bc', 
  '#26a69a', '#ec407a', '#7e57c2', '#42a5f5', '#ff7043',
  '#8d6e63', '#78909c', '#26c6da', '#9ccc65', '#d4e157'
]

const activeColorPicker = ref(null)
const activeShapeMenu = ref(null)

const toggleColorPicker = (groupId) => {
  activeColorPicker.value = activeColorPicker.value === groupId ? null : groupId
}

const selectColor = (groupId, color) => {
  locationStore.updateGroupColor(groupId, color)
  activeColorPicker.value = null
}

const showContextMenuFlag = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuGroup = ref(null)

const showContextMenu = (event, group) => {
  contextMenuGroup.value = group
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  showContextMenuFlag.value = true
}

const closeContextMenu = () => {
  showContextMenuFlag.value = false
  contextMenuGroup.value = null
  activeColorPicker.value = null
  activeShapeMenu.value = null
}

const canShowTrack = computed(() => {
  if (!contextMenuGroup.value) return false
  return locationStore.getSelectedPointsInGroup(contextMenuGroup.value.id).length >= 2
})

const isTrackShown = computed(() => {
  if (!contextMenuGroup.value) return false
  return locationStore.isGroupShowTrack(contextMenuGroup.value.id)
})

const canDelete = computed(() => {
  if (!contextMenuGroup.value) return false
  return locationStore.getSelectedPointsInGroup(contextMenuGroup.value.id).length > 0
})

const canExport = computed(() => {
  if (!contextMenuGroup.value) return false
  return locationStore.getSelectedPointsInGroup(contextMenuGroup.value.id).length > 0
})

const handleContextMenuAction = (action) => {
  if (!contextMenuGroup.value) return
  const groupId = contextMenuGroup.value.id
  
  switch (action) {
    case 'selectAll':
      locationStore.toggleGroupSelectAll(groupId)
      break
    case 'track':
      if (canShowTrack.value) {
        locationStore.toggleGroupShowTrack(groupId)
      }
      break
    case 'add':
      openAddDialog(groupId)
      break
    case 'delete':
      if (canDelete.value) {
        deleteSelectedInGroup(groupId)
      }
      break
    case 'export':
      if (canExport.value) {
        openExportDialog(groupId)
      }
      break
    case 'editName':
      startEditGroup(contextMenuGroup.value)
      break
    case 'deleteGroup':
      openDeleteGroupDialog(contextMenuGroup.value.name)
      break
  }
closeContextMenu()
}

const toggleColorPickerFromMenu = () => {
  if (contextMenuGroup.value) {
    activeColorPicker.value = activeColorPicker.value === contextMenuGroup.value.id ? null : contextMenuGroup.value.id
  }
}

const selectColorFromMenu = (color) => {
  if (contextMenuGroup.value) {
    locationStore.updateGroupColor(contextMenuGroup.value.id, color)
    activeColorPicker.value = null
  }
}

const toggleShapeMenu = () => {
  if (contextMenuGroup.value) {
    activeShapeMenu.value = activeShapeMenu.value === contextMenuGroup.value.id ? null : contextMenuGroup.value.id
  }
}

const selectShape = (shape) => {
  if (contextMenuGroup.value) {
    locationStore.updateGroupShape(contextMenuGroup.value.id, shape)
    activeShapeMenu.value = null
  }
}

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
const posFileInput = ref(null)
const posFileName = ref('')
const posFileData = ref(null)

const showDeleteDialog = ref(false)
const deleteGroup = ref(null)
const deletePointNames = ref('')
const deletePointCount = ref(0)

const showDeleteGroupDialog = ref(false)
const deleteGroupName = ref('')

const showExportDialog = ref(false)
const exportFormat = ref('json')
const exportGroupId = ref(null)

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
  posFileName.value = ''
  posFileData.value = null
  if (posFileInput.value) posFileInput.value.value = ''
  showAddDialog.value = true
}

const closeAddDialog = () => {
  showAddDialog.value = false
  addToGroupId.value = null
}

const selectPosFile = () => {
  posFileInput.value?.click()
}

const handlePosFileSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  posFileName.value = file.name
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      posFileData.value = Array.isArray(data) ? data : []
    } catch (err) {
      alert('POS文件格式错误：' + err.message)
      posFileData.value = null
    }
  }
  reader.readAsText(file)
}

const parsePosData = (data) => {
  const cooSysMap = {
    'W': 'W', 'WGS84': 'W', 'wgs84': 'W', '1': 'W',
    'G': 'G', 'GCJ02': 'G', 'gcj02': 'G', 'GCJ-02': 'G', '2': 'G'
  }
  
  return data.map(item => {
    const lng = item.lng ?? item.longitude ?? item.lon ?? item.经度
    const lat = item.lat ?? item.latitude ?? item.纬度
    
    if (lng === undefined || lat === undefined) return null
    
    const cooSys = cooSysMap[item.cooSys ?? item.coordinateSystem ?? item.coordSys ?? item.坐标系] || 'W'
    const time = item.time ?? item.timestamp ?? item.datetime ?? item.date ?? item.时间
    const timestamp = typeof time === 'number' ? (time < 1e12 ? time * 1000 : time) : (time ? new Date(time).getTime() : Date.now())
    
    const extra = {}
    const knownFields = ['lng', 'lat', 'alt', 'head', 'speed', 'cooSys', 'time', 'tagName', 'longitude', 'lon', 'latitude', 'coordinateSystem', 'coordSys', 'timestamp', 'datetime', 'date', 'heading', 'yaw', 'velocity', 'name', 'tag', 'label', 'altitude', 'elevation', '经度', '纬度', '海拔', '航向', '航向角', '速度', '坐标系', '时间', '名称', '点名']
    Object.keys(item).forEach(key => {
      if (!knownFields.includes(key)) {
        extra[key] = item[key]
      }
    })
    
    return {
      lng: parseFloat(lng),
      lat: parseFloat(lat),
      alt: parseFloat(item.alt ?? item.altitude ?? item.elevation ?? item.海拔 ?? 0),
      head: parseFloat(item.head ?? item.heading ?? item.yaw ?? item.航向 ?? item.航向角 ?? 0),
      speed: parseFloat(item.speed ?? item.velocity ?? item.速度 ?? 0),
      cooSys,
      time: isNaN(timestamp) ? Date.now() : timestamp,
      tagName: (item.tagName ?? item.name ?? item.tag ?? item.label ?? item.名称 ?? item.点名) || 'auto',
      extra: Object.keys(extra).length > 0 ? extra : undefined
    }
  }).filter(p => p !== null)
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
  let extras = []
  
  if (addInputMethod.value === 'manual') {
    coords = parseCoordinates(addCoordinates.value)
    if (coords.length === 0) {
      alert('请输入有效的坐标')
      return
    }
  } else if (addInputMethod.value === 'pos') {
    if (!posFileData.value || posFileData.value.length === 0) {
      alert('请先选择有效的POS文件')
      return
    }
    const parsed = parsePosData(posFileData.value)
    if (parsed.length === 0) {
      alert('POS文件中无有效坐标数据')
      return
    }
    coords = parsed.map(p => ({ lng: p.lng, lat: p.lat }))
    extras = parsed
    addCoordType.value = parsed[0].cooSys === 'G' ? 'gcj02' : 'wgs84'
  } else {
    alert('文件加载功能待实现')
    return
  }
  
  locationStore.addPointsToGroup(addToGroupId.value, coords, addCoordType.value, extras)
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
  const firstName = selectedPoints[0]?.tagName || ''
  deletePointNames.value = selectedPoints.length > 1 ? `${firstName}...` : firstName
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

const openDeleteGroupDialog = (groupName) => {
  deleteGroupName.value = groupName
  showDeleteGroupDialog.value = true
}

const confirmDeleteGroup = () => {
  if (contextMenuGroup.value) {
    locationStore.deleteGroup(contextMenuGroup.value.id)
  }
  closeDeleteGroupDialog()
}

const closeDeleteGroupDialog = () => {
  showDeleteGroupDialog.value = false
  deleteGroupName.value = ''
}

const openExportDialog = (groupId) => {
  exportGroupId.value = groupId
  exportFormat.value = 'json'
  showExportDialog.value = true
}

const closeExportDialog = () => {
  showExportDialog.value = false
  exportGroupId.value = null
  exportFormat.value = 'json'
}

const confirmExport = () => {
  if (!exportGroupId.value) return
  exportGroup(exportGroupId.value, exportFormat.value)
  closeExportDialog()
}

const exportGroup = (groupId, format = 'json') => {
  const group = locationStore.locationGroups.find(g => g.id === groupId)
  if (!group) return
  
  const selectedPoints = locationStore.getSelectedPointsInGroup(groupId)
  if (selectedPoints.length === 0) {
    alert('请先选择要导出的点')
    return
  }
  
  const now = new Date()
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  const safeName = group.name.replace(/[\\/:*?"<>|]/g, '_')
  
  if (format === 'json') {
    const filename = `${safeName}-${timestamp}.pos.json`
    const data = selectedPoints.map(p => ({
      lng: p.lng,
      lat: p.lat,
      alt: p.alt,
      head: p.head,
      speed: p.speed,
      cooSys: p.cooSys,
      time: p.datetime,
      tagName: p.tagName,
      ...(p.extra && Object.keys(p.extra).length > 0 ? { extra: p.extra } : {})
    }))
    const content = JSON.stringify(data, null, 2)
    downloadFile(content, filename, 'application/json')
  } else {
    const filename = `${safeName}-${timestamp}.pos.csv`
    let content = 'lng,lat,alt,head,speed,cooSys,time,tagName\n'
    selectedPoints.forEach(p => {
      content += `${p.lng.toFixed(6)},${p.lat.toFixed(6)},${p.alt},${p.head},${p.speed},${p.cooSys},${p.datetime},${p.tagName}\n`
    })
    downloadFile(content, filename, 'text/csv')
  }
}

const downloadFile = async (content, filename, mimeType) => {
  const isJson = mimeType.includes('json')
  const fileTypes = isJson ? ['POS JSON (*.pos.json)'] : ['POS CSV (*.pos.csv)']
  
  try {
    const result = await window.pywebview.api.save_file(content, filename, fileTypes)
    if (result.status === 'cancelled') {
      // 用户取消
    } else if (result.status !== 'ok') {
      alert('导出失败')
    }
  } catch (e) {
    alert('导出失败：' + e.message)
  }
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
  gap: 6px;
  padding: 9px 10px;
  background: linear-gradient(135deg, #f8f8fc 0%, #f0f0f8 100%);
  cursor: pointer;
  transition: all 0.2s;
}

.group-row:hover {
  background: linear-gradient(135deg, #f0f0f8 0%, #e8e8f5 100%);
}

.group-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  padding-right: 4px;
}

.indicator-icon {
  display: block;
}

.indicator-circle-filled {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.group-actions {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.action-btn {
  width: 15px;
  height: 15px;
  padding: 2px;
  border: none;
  background: rgba(92, 107, 192, 0.1);
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn:hover {
  background: rgba(92, 107, 192, 0.25);
}

.action-icon {
  width: 11px;
  height: 11px;
  fill: #5c6bc0;
}

.action-icon.active {
  fill: #3949ab;
}

.color-picker-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.color-picker-btn {
  width: 15px;
  height: 15px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-picker-dropdown {
  position: absolute;
  top: 20px;
  left: -60px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.color-option {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.color-option:hover {
  transform: scale(1.1);
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
  font-size: 10px;
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
  padding: 4px 9px;
  border-bottom: 1px solid #f8f8f8;
}

.point-item:last-child {
  border-bottom: none;
}

.point-focused {
  background: linear-gradient(90deg, rgba(92, 107, 192, 0.2) 0%, rgba(92, 107, 192, 0.05) 100%);
  border-left: 3px solid #5c6bc0;
}

.point-highlight {
  background: linear-gradient(90deg, rgba(92, 107, 192, 0.15) 0%, rgba(92, 107, 192, 0.05) 100%);
  border-left: 3px solid #7986cb;
}

.point-checkbox {
  display: flex;
  align-items: center;
}

.point-checkbox input {
  cursor: pointer;
}

.point-detail-radio {
  margin-left: auto;
  cursor: pointer;
}

.point-detail-radio:disabled {
  cursor: not-allowed;
  opacity: 0.5;
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

.add-dialog .file-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 2px dashed #e0e0e8;
  border-radius: 6px;
  background: #f8f8fc;
  cursor: pointer;
  transition: all 0.2s;
}

.add-dialog .file-picker:hover {
  border-color: #7986cb;
  background: #f0f0ff;
}

.add-dialog .file-icon {
  width: 20px;
  height: 20px;
  color: #5c6bc0;
  flex-shrink: 0;
}

.add-dialog .file-name {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.export-dialog {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  min-width: 320px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.export-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.export-dialog .dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.export-dialog .dialog-header h3 {
  font-size: 14px;
  font-weight: 500;
}

.export-dialog .dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.export-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 2px solid #e0e0e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.export-option:hover {
  border-color: #7986cb;
  background: #f8f8fc;
}

.export-option.active {
  border-color: #5c6bc0;
  background: #e8eaf6;
}

.export-option input[type="radio"] {
  margin: 0;
  cursor: pointer;
}

.option-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.option-desc {
  font-size: 11px;
  color: #888;
}

.btn-export {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #7986cb 0%, #5c6bc0 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(92, 107, 192, 0.3);
}

.btn-export:hover {
  background: linear-gradient(135deg, #5c6bc0 0%, #3f51b5 100%);
  box-shadow: 0 6px 16px rgba(92, 107, 192, 0.4);
  transform: translateY(-2px);
}

.btn-export:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(92, 107, 192, 0.3);
}

.export-icon {
  width: 18px;
  height: 18px;
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  padding: 4px 0;
  min-width: 140px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
}

.context-menu-item:hover {
  background: #f0f4ff;
}

.context-menu-item.disabled {
  color: #999;
  cursor: not-allowed;
}

.context-menu-item.disabled:hover {
  background: transparent;
}

.menu-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-size: 14px;
}

.menu-icon[style*="background"] {
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.color-menu-item {
  position: relative;
}

.menu-arrow {
  margin-left: auto;
  font-size: 10px;
  color: #999;
}

.menu-color-picker {
  position: absolute;
  left: 100%;
  top: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 3px;
  margin-left: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1001;
}

.menu-color-picker .color-option {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.menu-color-picker .color-option:hover {
  transform: scale(1.1);
}

.menu-shape-picker {
  position: absolute;
  left: 100%;
  top: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px 12px;
  margin-left: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  min-width: 90px;
}

.shape-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
}

.shape-option:hover {
  background: #f0f4ff;
}

.shape-option.active {
  background: #e8eaf6;
}

.shape-circle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #5c6bc0;
}

.shape-arrow {
  color: #5c6bc0;
  font-size: 12px;
}
</style>