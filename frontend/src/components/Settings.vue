<template>
  <div class="settings">
    <h3>设置</h3>

    <div class="form-group">
      <label>地图服务商</label>
      <select v-model="provider" @change="handleProviderChange">
        <option value="amap">高德地图</option>
        <option value="bmap">百度地图</option>
        <option value="google">Google Maps</option>
      </select>
    </div>

    <div class="form-group">
      <label>地图Key</label>
      <div class="input-wrapper">
        <input
          :type="showKey ? 'text' : 'password'"
          v-model="key"
          placeholder="输入地图API Key"
        />
        <button class="toggle-visibility" @click="showKey = !showKey">
          {{ showKey ? '隐藏' : '显示' }}
        </button>
      </div>
    </div>

    <button class="btn-save" @click="handleSave">保存</button>

    <div class="tips">
      <p>提示：Key将保存在浏览器本地存储中</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()

const provider = ref('amap')
const key = ref('')
const showKey = ref(false)

onMounted(() => {
  provider.value = settingsStore.mapProvider
  key.value = settingsStore.mapKey
})

const handleProviderChange = () => {
  key.value = ''
}

const handleSave = () => {
  settingsStore.saveSettings(provider.value, key.value)
  alert('设置已保存')
}
</script>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings h3 {
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
.form-group input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.input-wrapper {
  display: flex;
  gap: 8px;
}

.input-wrapper input {
  flex: 1;
}

.toggle-visibility {
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.toggle-visibility:hover {
  background: #f0f0f0;
}

.btn-save {
  padding: 10px;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-save:hover {
  background: #555;
}

.tips {
  font-size: 12px;
  color: #999;
}

.tips p {
  margin: 0;
}
</style>