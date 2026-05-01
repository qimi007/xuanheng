import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const mapProvider = ref('amap')
  const mapKey = ref('')

  const loadSettings = () => {
    const saved = localStorage.getItem('map-settings')
    if (saved) {
      const data = JSON.parse(saved)
      mapProvider.value = data.mapProvider || 'amap'
      mapKey.value = data.mapKey || ''
    }
  }

  const saveSettings = (provider, key) => {
    mapProvider.value = provider
    mapKey.value = key
    localStorage.setItem('map-settings', JSON.stringify({
      mapProvider: provider,
      mapKey: key
    }))
  }

  loadSettings()

  return { mapProvider, mapKey, saveSettings }
})