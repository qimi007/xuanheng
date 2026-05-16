<template>
  <div class="add-location">
    <div class="dialog-header">
      <h3>添加位置</h3>
    </div>

    <div class="dialog-content">
      <div class="form-section">
        <label class="form-label">坐标系</label>
        <select v-model="coordType" class="form-select">
          <option value="wgs84">WGS84 (GPS坐标)</option>
          <option value="gcj02">GCJ-02 (国测局坐标)</option>
        </select>
      </div>

      <div class="form-section">
        <label class="form-label">输入方式</label>
        <div class="btn-group">
          <button :class="{ active: inputMethod === 'manual' }" @click="inputMethod = 'manual'">手动</button>
          <button :class="{ active: inputMethod === 'pos' }" @click="inputMethod = 'pos'">POS文件</button>
          <button :class="{ active: inputMethod === 'log' }" @click="inputMethod = 'log'">日志</button>
        </div>
      </div>

      <div v-if="inputMethod === 'manual'" class="form-section">
        <label class="form-label">坐标输入</label>
        <textarea
          v-model="coordinates"
          class="form-textarea"
          placeholder="示例: 116.397428,39.90923; 116.397428,39.91923"
        ></textarea>
        <p class="form-hint">多个点用分号(;)分隔，不区分经纬度顺序</p>
      </div>

      <div v-else-if="inputMethod === 'pos'" class="form-section">
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

      <div v-else class="form-section">
        <label class="form-label">文件路径</label>
        <input
          type="text"
          v-model="filePath"
          class="form-input"
          placeholder="输入日志文件路径"
        />
      </div>

      <div class="form-section">
        <label class="form-label">分组名称</label>
        <input type="text" v-model="groupName" class="form-input" placeholder="可选名称" />
      </div>

      <button class="btn-submit" @click="handleAdd">添加位置</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLocationStore } from '../stores/locations'

const emit = defineEmits(['added'])

const locationStore = useLocationStore()

const coordType = ref('wgs84')
const inputMethod = ref('manual')
const coordinates = ref('')
const filePath = ref('')
const groupName = ref('')
const posFileInput = ref(null)
const posFileName = ref('')
const posFileData = ref(null)

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

const handleAdd = () => {
  const name = groupName.value || `分组 ${new Date().toLocaleTimeString()}`
  let coords = []
  let extras = []

  if (inputMethod.value === 'manual') {
    coords = parseCoordinates(coordinates.value)
    if (coords.length === 0) {
      alert('请输入有效的坐标')
      return
    }
  } else if (inputMethod.value === 'pos') {
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
    coordType.value = parsed[0].cooSys === 'G' ? 'gcj02' : 'wgs84'
  } else {
    alert('文件加载功能待实现')
    return
  }

  locationStore.addGroup(name, coords, coordType.value, extras)
  
  coordinates.value = ''
  groupName.value = ''
  posFileName.value = ''
  posFileData.value = null
  if (posFileInput.value) posFileInput.value.value = ''
  emit('added')
}
</script>

<style scoped>
.add-location {
  display: flex;
  flex-direction: column;
}

.dialog-header {
  margin-bottom: 16px;
}

.dialog-header h3 {
  font-size: 16px;
  font-weight: 500;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}

.form-select,
.form-input,
.form-textarea {
  padding: 10px 12px;
  border: 1px solid #e0e0e8;
  border-radius: 8px;
  font-size: 13px;
  background: #f8f8fc;
  transition: all 0.2s;
}

.form-select:focus,
.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #7986cb;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(121, 134, 203, 0.2);
}

.form-textarea {
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
}

.form-hint {
  font-size: 11px;
  color: #888;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn-group button {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  transition: all 0.2s;
}

.btn-group button.active {
  background: linear-gradient(135deg, #7986cb 0%, #5c6bc0 100%);
  color: #fff;
  border-color: transparent;
}

.btn-submit {
  padding: 12px;
  background: linear-gradient(135deg, #7986cb 0%, #5c6bc0 100%);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  margin-top: 8px;
}

.btn-submit:hover {
  background: #333;
}

.file-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 2px dashed #e0e0e8;
  border-radius: 8px;
  background: #f8f8fc;
  cursor: pointer;
  transition: all 0.2s;
}

.file-picker:hover {
  border-color: #7986cb;
  background: #f0f0ff;
}

.file-icon {
  width: 24px;
  height: 24px;
  color: #5c6bc0;
  flex-shrink: 0;
}

.file-name {
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>