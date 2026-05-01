<template>
  <div class="add-location">
    <h3>添加位置</h3>
    
    <div class="form-group">
      <label>坐标系</label>
      <select v-model="coordType">
        <option value="wgs84">WGS84 (GPS坐标)</option>
        <option value="gcj02">GCJ-02 (国测局坐标)</option>
      </select>
    </div>

    <div class="form-group">
      <label>输入方式</label>
      <div class="input-method">
        <button :class="{ active: inputMethod === 'manual' }" @click="inputMethod = 'manual'">手动输入</button>
        <button :class="{ active: inputMethod === 'pos' }" @click="inputMethod = 'pos'">加载POS文件</button>
        <button :class="{ active: inputMethod === 'log' }" @click="inputMethod = 'log'">扫描日志</button>
      </div>
    </div>

    <div v-if="inputMethod === 'manual'" class="form-group">
      <label>输入经纬度</label>
      <textarea
        v-model="coordinates"
        placeholder="不区分经纬度顺序，多个点以'j'分割&#10;例如: 116.397428,39.90923 j 116.397428,39.91923"
        rows="6"
      ></textarea>
      <small class="hint">格式: 经度,纬度 j 经度,纬度</small>
    </div>

    <div v-else class="form-group">
      <label>{{ inputMethod === 'pos' ? '选择POS文件' : '选择日志文件' }}</label>
      <input
        type="text"
        v-model="filePath"
        :placeholder="inputMethod === 'pos' ? '输入POS文件路径或目录' : '输入日志文件路径或目录'"
      />
    </div>

    <div class="form-group">
      <label>分组名称</label>
      <input type="text" v-model="groupName" placeholder="输入分组名称" />
    </div>

    <button class="btn-primary" @click="handleAdd">添加</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLocationStore } from '../stores/locations'

const locationStore = useLocationStore()

const coordType = ref('wgs84')
const inputMethod = ref('manual')
const coordinates = ref('')
const filePath = ref('')
const groupName = ref('')

const parseCoordinates = (text) => {
  const points = text.split('j').map(s => s.trim()).filter(s => s)
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
  const name = groupName.value || `分组 ${Date.now()}`
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
  alert(`已添加 ${coords.length} 个点`)
}
</script>

<style scoped>
.add-location {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-location h3 {
  font-size: 16px;
  margin-bottom: 8px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-group select,
.form-group input,
.form-group textarea {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  font-family: monospace;
}

.hint {
  font-size: 12px;
  color: #666;
}

.input-method {
  display: flex;
  gap: 8px;
}

.input-method button {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.input-method button.active {
  background: #333;
  color: #fff;
  border-color: #333;
}

.btn-primary {
  padding: 10px;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:hover {
  background: #555;
}
</style>