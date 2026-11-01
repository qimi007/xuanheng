import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSettings, saveSettings as saveSettingsApi } from '../api/client'

const PRESET_KEY = '16b30977f48271dd262787f499bd7fe6'
const EXPIRY_DAYS = 31

export const useSettingsStore = defineStore('settings', () => {
  const mapProvider = ref('amap')
  const mapKey = ref('')
  const firstUsedTime = ref(null)
  const isLoaded = ref(false)

  const loadSettings = async () => {
    try {
      const data = await getSettings()
      mapProvider.value = data.mapProvider || 'amap'
      mapKey.value = data.mapKey || ''
      firstUsedTime.value = data.firstUsedTime || null

      if (!firstUsedTime.value) {
        firstUsedTime.value = Date.now()
        await saveSettings()
        localStorage.setItem('hasUsedBefore', 'true')
      }
      isLoaded.value = true
    } catch (e) {
      console.error('加载设置失败:', e)
      isLoaded.value = true
    }
  }

  const saveSettings = async () => {
    try {
      await saveSettingsApi({
        mapProvider: mapProvider.value,
        mapKey: mapKey.value,
        firstUsedTime: firstUsedTime.value
      })
    } catch (e) {
      console.error('保存设置失败:', e)
    }
  }

  const getActiveKey = () => {
    return mapKey.value || PRESET_KEY
  }

  const isExpired = () => {
    if (!firstUsedTime.value) return false
    const days = (Date.now() - firstUsedTime.value) / (1000 * 60 * 60 * 24)
    return days > EXPIRY_DAYS
  }

  const getRemainingDays = () => {
    if (!firstUsedTime.value) return EXPIRY_DAYS
    const days = EXPIRY_DAYS - (Date.now() - firstUsedTime.value) / (1000 * 60 * 60 * 24)
    return Math.max(0, Math.floor(days))
  }

  const hasUsedBefore = () => {
    return localStorage.getItem('hasUsedBefore') === 'true'
  }

  const needsKey = () => {
    return isExpired() && !mapKey.value
  }

  loadSettings()

  return {
    mapProvider,
    mapKey,
    firstUsedTime,
    isLoaded,
    loadSettings,
    saveSettings,
    getActiveKey,
    isExpired,
    getRemainingDays,
    hasUsedBefore,
    needsKey
  }
})