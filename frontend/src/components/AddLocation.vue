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

      <div v-else class="form-section">
        <label class="form-label">文件路径</label>
        <input
          type="text"
          v-model="filePath"
          class="form-input"
          :placeholder="inputMethod === 'pos' ? '输入POS文件路径' : '输入日志文件路径'"
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

const handleAdd = () => {
  const name = groupName.value || `分组 ${new Date().toLocaleTimeString()}`
  let coords = []

  if (inputMethod.value === 'manual') {
    coords = parseCoordinates(coordinates.value)
  } else {
    alert('文件加载功能待实现')
    return
  }

  if (coords.length === 0) {
    alert('请输入有效的坐标')
    return
  }

  locationStore.addGroup(name, coords, coordType.value)
  
  coordinates.value = ''
  groupName.value = ''
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
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
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
  background: #1a1a1a;
  color: #fff;
  border-color: #1a1a1a;
}

.btn-submit {
  padding: 10px;
  background: #1a1a1a;
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
</style>