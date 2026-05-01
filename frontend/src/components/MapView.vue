<template>
  <div ref="mapContainer" class="map-container" v-if="settingsStore.mapKey" @contextmenu.prevent="handleContextMenu">
    <div class="map-placeholder">正在加载地图...</div>
    
    <!-- 自定义右键菜单 -->
    <div 
      v-if="showContextMenu" 
      class="context-menu"
      :style="{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }"
    >
      <div class="menu-section">
        <div class="menu-title">地图类型</div>
        <div class="menu-item" @click="setMapType('normal')">标准地图</div>
        <div class="menu-item" @click="setMapType('satellite')">卫星地图</div>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-section">
        <div class="menu-title">路网</div>
        <div class="menu-item" @click="toggleRoadNet(true)">显示路网</div>
        <div class="menu-item" @click="toggleRoadNet(false)">隐藏路网</div>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-section">
        <div class="menu-title">路况</div>
        <div class="menu-item" @click="toggleTraffic(true)">显示路况</div>
        <div class="menu-item" @click="toggleTraffic(false)">隐藏路况</div>
      </div>
    </div>
  </div>
  <div v-else class="map-placeholder">请先在设置中配置地图Key</div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useLocationStore } from '../stores/locations'

const mapContainer = ref(null)
const settingsStore = useSettingsStore()
const locationStore = useLocationStore()

const showContextMenu = ref(false)
const menuPosition = ref({ x: 0, y: 0 })

let map = null
let markers = []
let mapLoaded = false
let roadNetLayer = null
let trafficLayer = null

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

    await new Promise((resolve) => {
      window.AMap.plugin([
        'AMap.Scale',
        'AMap.HawkEye',
        'AMap.ControlBar',
        'AMap.Geocoder',
        'AMap.PlaceSearch',
        'AMap.AutoComplete',
        'AMap.Driving',
        'AMap.Transfer',
        'AMap.Walking',
        'AMap.Riding'
      ], () => {
        resolve()
      })
    })

    const placeholder = mapContainer.value.querySelector('.map-placeholder')
    if (placeholder) placeholder.remove()

    map = new window.AMap.Map(mapContainer.value, {
      zoom: 10,
      center: [116.397428, 39.90923],
      viewMode: '2D',
      showIndoorMap: false
    })

    map.addControl(new window.AMap.Scale())

    map.addControl(new window.AMap.HawkEye({
      isOpen: true,
      position: 'RB'
    }))

    map.addControl(new window.AMap.ControlBar({
      visible: true,
      position: 'RT',
      offset: new window.AMap.Pixel(-20, 30),
      showZoomBar: true,
      showControlButton: true,
      showCompass: true
    }))

    mapLoaded = true
    updateMarkers()
  } catch (e) {
    console.error('加载地图失败:', e)
  }
}

const handleContextMenu = (event) => {
  const rect = mapContainer.value.getBoundingClientRect()
  menuPosition.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
  showContextMenu.value = true
}

const closeContextMenu = () => {
  showContextMenu.value = false
}

const setMapType = (type) => {
  map.setMapType(type)
  closeContextMenu()
}

const toggleRoadNet = (show) => {
  if (show) {
    if (!roadNetLayer) {
      roadNetLayer = new window.AMap.RoadNet()
    }
    map.add(roadNetLayer)
  } else {
    if (roadNetLayer) {
      map.remove(roadNetLayer)
    }
  }
  closeContextMenu()
}

const toggleTraffic = (show) => {
  if (show) {
    if (!trafficLayer) {
      trafficLayer = new window.AMap.TrafficLayer({ zIndex: 100 })
    }
    map.add(trafficLayer)
  } else {
    if (trafficLayer) {
      map.remove(trafficLayer)
      trafficLayer = null
    }
  }
  closeContextMenu()
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

const handleClickOutside = (event) => {
  if (showContextMenu.value && mapContainer.value && !mapContainer.value.contains(event.target)) {
    closeContextMenu()
  }
}

onMounted(() => {
  if (settingsStore.mapKey) {
    initMap()
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
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
  position: relative;
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

.context-menu {
  position: absolute;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  min-width: 140px;
  z-index: 1000;
}

.menu-section {
  padding: 4px 0;
}

.menu-title {
  font-size: 11px;
  color: #999;
  padding: 4px 14px 8px;
  font-weight: 500;
}

.menu-item {
  font-size: 13px;
  color: #333;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.menu-item:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.menu-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}
</style>