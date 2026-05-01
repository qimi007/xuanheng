<template>
  <div ref="mapContainer" class="map-container" v-if="settingsStore.mapKey">
    <div class="map-placeholder">正在加载地图...</div>
  </div>
  <div v-else class="map-placeholder">请先在设置中配置地图Key</div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useLocationStore } from '../stores/locations'

const mapContainer = ref(null)
const settingsStore = useSettingsStore()
const locationStore = useLocationStore()

let map = null
let markers = []
let mapLoaded = false

const loadMapScript = (key) => {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

const initMap = async () => {
  if (!settingsStore.mapKey || mapLoaded) return

  try {
    await loadMapScript(settingsStore.mapKey)
    const placeholder = mapContainer.value.querySelector('.map-placeholder')
    if (placeholder) placeholder.remove()
    map = new window.AMap.Map(mapContainer.value, {
      zoom: 10,
      center: [116.397428, 39.90923]
    })
    mapLoaded = true
    updateMarkers()
  } catch (e) {
    console.error('加载地图失败:', e)
  }
}

const updateMarkers = () => {
  if (!map || !mapLoaded) return

  markers.forEach(m => m.setMap(null))
  markers = []

  locationStore.locationGroups.forEach(group => {
    if (!group.visible) return

    group.points.forEach(point => {
      if (!locationStore.isPointVisible(point.id)) return

      const marker = new window.AMap.Marker({
        position: [point.lng, point.lat],
        title: point.name
      })
      marker.setMap(map)
      markers.push(marker)
    })
  })

  if (markers.length > 0) {
    map.setFitView()
  }
}

onMounted(() => {
  if (settingsStore.mapKey) {
    initMap()
  }
})

watch(() => settingsStore.mapKey, (newKey) => {
  if (newKey && !mapLoaded) {
    initMap()
  }
})

watch(() => [locationStore.locationGroups, locationStore.visiblePoints], () => {
  updateMarkers()
}, { deep: true })

defineExpose({ updateMarkers })
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
.map-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #999;
}
</style>