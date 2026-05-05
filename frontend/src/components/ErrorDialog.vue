<template>
  <div class="dialog-overlay" @click="closeDialog">
    <div class="error-dialog" @click.stop>
      <div class="dialog-header">
        <h3>⚠️ 坐标转换失败</h3>
        <button class="close-btn" @click="closeDialog">✕</button>
      </div>
      <div class="dialog-content">
        <p class="error-summary">
          共有 <span class="error-count">{{ errors.length }}</span> 个坐标点转换失败
        </p>
        <p class="error-hint">失败原因：高德地图坐标转换服务调用超时或返回异常</p>

        <div class="error-list">
          <div class="error-item" v-for="error in errors" :key="error.id">
            <span class="error-name">{{ error.tagName }}</span>
            <span class="error-coords">{{ error.lng }}, {{ error.lat }}</span>
            <button class="btn-retry-item" @click="handleRetryOne(error.pointId)">重试</button>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn-close" @click="closeDialog">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useLocationStore } from '../stores/locations'

const locationStore = useLocationStore()
const errors = computed(() => locationStore.coordErrors)

const closeDialog = () => {
  locationStore.clearCoordErrors()
}

const handleRetryOne = (pointId) => {
  locationStore.retryTransform(pointId)
  locationStore.removeCoordError(pointId)
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.error-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  min-width: 400px;
  max-width: 500px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-radius: 12px 12px 0 0;
}

.dialog-header h3 {
  color: #e65100;
  margin: 0;
}

.close-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 18px;
  color: #999;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.dialog-content {
  padding: 16px 20px;
}

.error-summary {
  font-size: 14px;
  margin: 0 0 8px;
}

.error-count {
  color: #e65100;
  font-weight: bold;
}

.error-hint {
  font-size: 12px;
  color: #999;
  margin: 0 0 16px;
}

.error-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.error-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 12px;
}

.error-item:last-child {
  border-bottom: none;
}

.error-name {
  flex: 1;
  color: #333;
}

.error-coords {
  flex: 1;
  color: #666;
  font-family: monospace;
}

.btn-retry-item {
  padding: 4px 8px;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.btn-retry-item:hover {
  background: #f57c00;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

.btn-close {
  padding: 8px 16px;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
}

.btn-close:hover {
  background: #eee;
}
</style>