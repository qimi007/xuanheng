<template>
  <div class="settings">
    <div class="dialog-header">
      <h3>设置</h3>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="dialog-content">
      <div v-if="settingsStore.isExpired() && !settingsStore.mapKey" class="expired-warning">
        {{ settingsStore.hasUsedBefore() ? '配置文件已被删除且已过期，请填写 API Key' : '已超过31天使用期限，请填写 API Key' }}
      </div>
      <div v-else-if="remainingDays <= 10 && remainingDays > 0" class="expire-notice">
        还可使用 {{ remainingDays }} 天，建议填写自己的 API Key
      </div>

      <div class="form-item">
        <label class="form-label">地图服务商</label>
        <select v-model="provider" class="form-select" @change="key = ''">
          <option value="amap">高德地图</option>
          <option value="bmap" disabled>百度地图（暂不支持）</option>
          <option value="google" disabled>Google Maps（暂不支持）</option>
        </select>
      </div>

      <div class="form-item">
        <label class="form-label">API Key</label>
        <div class="input-wrap">
          <input
            :type="showKey ? 'text' : 'password'"
            v-model="key"
            class="form-input"
            placeholder="请输入地图API Key"
          />
          <button class="toggle-btn" @click="showKey = !showKey">
            {{ showKey ? '隐藏' : '显示' }}
          </button>
        </div>
      </div>

      <button 
        class="btn-save" 
        @click="handleSave"
        :disabled="settingsStore.isExpired() && !key"
      >
        {{ settingsStore.isExpired() && !key ? '请填写 API Key' : '保存设置' }}
      </button>

      <p class="tips">API Key 将存储到本地文件 D:/Magic/settings.json</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'

defineEmits(['close'])

const settingsStore = useSettingsStore()

const provider = ref('amap')
const key = ref('')
const showKey = ref(false)

const remainingDays = computed(() => settingsStore.getRemainingDays())

onMounted(() => {
  provider.value = settingsStore.mapProvider
  key.value = settingsStore.mapKey
})

const handleSave = () => {
  settingsStore.saveSettings(provider.value, key.value)
  alert('设置已保存')
}
</script>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dialog-header h3 {
  font-size: 16px;
  font-weight: 500;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: #f0f0f5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e0e0e8;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}

.form-select,
.form-input {
  padding: 10px 12px;
  border: 1px solid #e0e0e8;
  border-radius: 8px;
  font-size: 13px;
  background: #f8f8fc;
  transition: all 0.2s;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: #7986cb;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(121, 134, 203, 0.2);
}

.input-wrap {
  display: flex;
  gap: 8px;
}

.input-wrap input {
  flex: 1;
}

.toggle-btn {
  padding: 0 12px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
}

.toggle-btn:hover {
  background: #eee;
}

.btn-save {
  padding: 12px;
  background: linear-gradient(135deg, #7986cb 0%, #5c6bc0 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(92, 107, 192, 0.4);
}

.tips {
  font-size: 11px;
  color: #999;
  text-align: center;
}

.expired-warning {
  padding: 12px;
  background: #fee;
  border: 1px solid #f88;
  border-radius: 8px;
  color: #c00;
  font-size: 13px;
  text-align: center;
}

.expire-notice {
  padding: 12px;
  background: #fff8e0;
  border: 1px solid #fc0;
  border-radius: 8px;
  color: #960;
  font-size: 13px;
  text-align: center;
}

.btn-save:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>