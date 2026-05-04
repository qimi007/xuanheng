<template>
  <div ref="mapContainer" class="map-container" v-if="settingsStore.getActiveKey()" @contextmenu.prevent="handleContextMenu">
    <div class="map-placeholder">正在加载地图...</div>
    
    <!-- 自定义右键菜单 -->
    <div 
      v-if="showContextMenu" 
      ref="contextMenuRef"
      class="context-menu"
      :style="{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }"
      @click.stop
    >
      <div class="menu-section">
        <div class="menu-title">地图类型</div>
        <div class="menu-item" @click="setMapType('normal')">
          <span class="check-icon">{{ mapType === 'normal' ? '✓' : '' }}</span>
          标准地图
        </div>
        <div class="menu-item" @click="setMapType('satellite')">
          <span class="check-icon">{{ mapType === 'satellite' ? '✓' : '' }}</span>
          卫星地图
        </div>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-section">
        <div class="menu-title">路网</div>
        <div class="menu-item" @click="toggleRoadNet()">
          <span class="check-icon">{{ '' }}</span>
          {{ showRoadNet ? '隐藏路网' : '显示路网' }}
        </div>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-section">
        <div class="menu-title">路况</div>
        <div class="menu-item" @click="toggleTraffic()">
          <span class="check-icon">{{ '' }}</span>
          {{ showTraffic ? '隐藏路况' : '显示路况' }}
        </div>
      </div>
    </div>
  </div>
  <div v-else class="map-placeholder">请先在设置中配置地图Key</div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useLocationStore } from '../stores/locations'

const mapContainer = ref(null)
const contextMenuRef = ref(null)
const settingsStore = useSettingsStore()
const locationStore = useLocationStore()

const showContextMenu = ref(false)
const menuPosition = ref({ x: 0, y: 0 })
const mapType = ref('normal')
const showRoadNet = ref(false)
const showTraffic = ref(false)

let map = null
let markers = []
let trackPolylines = []
let mapLoaded = false
let trafficLayer = null
let satelliteLayer = null
let roadNetLayer = null
let defaultLayer = null

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
  if (!settingsStore.getActiveKey() || mapLoaded) return

  try {
    await loadMapScript(settingsStore.getActiveKey())

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

    defaultLayer = new window.AMap.createDefaultLayer()
    satelliteLayer = new window.AMap.TileLayer.Satellite()
    roadNetLayer = new window.AMap.TileLayer.RoadNet()
    
    map = new window.AMap.Map(mapContainer.value, {
      zoom: 10,
      center: [116.397428, 39.90923],
      viewMode: '2D',
      showIndoorMap: false,
      mapStyle: 'amap://styles/normal'
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

    map.on('complete', () => {
      console.log('地图加载完成')
      mapLoaded = true
      updateMarkers()
      console.log('地图初始化完成, mapLoaded:', mapLoaded)
    })
  } catch (e) {
    console.error('加载地图失败:', e)
  }
}

const handleContextMenu = (event) => {
  const rect = mapContainer.value.getBoundingClientRect()
  let x = event.clientX - rect.left
  let y = event.clientY - rect.top
  
  nextTick(() => {
    if (contextMenuRef.value) {
      const menuWidth = 160
      const menuHeight = 240
      const containerWidth = mapContainer.value.offsetWidth
      const containerHeight = mapContainer.value.offsetHeight
      
      if (x + menuWidth > containerWidth) {
        x = containerWidth - menuWidth - 10
      }
      if (y + menuHeight > containerHeight) {
        y = containerHeight - menuHeight - 10
      }
      if (x < 0) x = 10
      if (y < 0) y = 10
    }
    
    menuPosition.value = { x, y }
    showContextMenu.value = true
  })
}

const closeContextMenu = () => {
  showContextMenu.value = false
}

const setMapType = (type) => {
  console.log('setMapType called, map:', map, 'mapLoaded:', mapLoaded)
  
  mapType.value = type
  closeContextMenu()
  
  if (!map || !mapLoaded) {
    console.warn('地图未初始化')
    return
  }
  
  try {
    updateLayers()
    console.log('切换到' + (type === 'satellite' ? '卫星' : '标准') + '地图成功')
  } catch (e) {
    console.error('切换地图类型失败:', e)
  }
}

const toggleRoadNet = () => {
  showRoadNet.value = !showRoadNet.value
  closeContextMenu()
  if (!roadNetLayer) {
    roadNetLayer = new window.AMap.TileLayer.RoadNet({ zIndex: 10 })
  }
  // 添加路网
  if (showRoadNet.value) {
    map.addLayer(roadNetLayer)
  } else {
    map.removeLayer(roadNetLayer)
  }
}

const toggleTraffic = () => {
  showTraffic.value = !showTraffic.value
  closeContextMenu()
  if (!trafficLayer) {
    trafficLayer = new window.AMap.TileLayer.Traffic({ zIndex: 11 })
  }
  // 添加路况
  if (showTraffic.value) {
    
    map.addLayer(trafficLayer)
  } else {
    map.removeLayer(trafficLayer)
  }
}

const updateLayers = () => {
  if (!map || !mapLoaded) return
  try {
    if (!satelliteLayer) {
      satelliteLayer = new window.AMap.TileLayer.Satellite()
    }
    if (mapType.value === 'satellite') {
        map.addLayer(satelliteLayer)
    } else {
        map.removeLayer(satelliteLayer)
    }
  } catch (e) {
    console.error('更新图层失败:', e)
  }
}

const adjustColorBrightness = (hex, percent) => {
  const num = parseInt(hex.slice(1), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, Math.min(255, (num >> 16) + amt))
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt))
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt))
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

const updateMarkers = () => {
  if (!map || !mapLoaded) return

  markers.forEach(m => m.setMap(null))
  markers = []
  trackPolylines.forEach(p => p.setMap(null))
  trackPolylines = []

  locationStore.locationGroups.forEach(group => {
    const shape = group.shape || 'circle'
    const fillColor = group.color || '#5c6bc0'
    const strokeColor = adjustColorBrightness(fillColor, -30)

    group.points.forEach(point => {
      if (!locationStore.isPointSelected(point.id)) return

      if (shape === 'arrow') {
        const head = point.head || 0
        const size = 16
        const arrowSvg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <polygon points="${size/2},1 ${size/2-4},9 ${size/2+4},9" fill="${fillColor}"/>
          <line x1="${size/2}" y1="9" x2="${size/2}" y2="${size-2}" stroke="${fillColor}" stroke-width="2" stroke-linecap="round"/>
        </svg>`
        const marker = new window.AMap.Marker({
          position: [point.lng, point.lat],
          icon: new window.AMap.Icon({
            size: new window.AMap.Size(size, size),
            image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(arrowSvg),
            imageSize: new window.AMap.Size(size, size),
            imageOffset: new window.AMap.Pixel(0, 0)
          }),
          angle: head,
          zIndex: 10
        })
        marker.setMap(map)
        markers.push(marker)
      } else {
        const marker = new window.AMap.CircleMarker({
          center: [point.lng, point.lat],
          radius: 6,
          fillColor: fillColor,
          fillOpacity: 0.8,
          strokeColor: strokeColor,
          strokeWidth: 1,
          zIndex: 10
        })
        marker.setMap(map)
        markers.push(marker)
      }
})

    if (locationStore.isGroupShowTrack(group.id)) {
      const selectedPoints = locationStore.getSelectedPointsInGroup(group.id)
      if (selectedPoints.length >= 2) {
        const path = selectedPoints.map(p => new window.AMap.LngLat(p.lng, p.lat))
        const polyline = new window.AMap.Polyline({
          path: path,
          strokeColor: fillColor,
          strokeWeight: 6,
          strokeOpacity: 0.8,
          zIndex: 5,
          isOutline: false,
          borderWeight: 1,
          lineCap: 'round',
          lineJoin: 'round',
          showDir: true
        })
        polyline.setMap(map)
        trackPolylines.push(polyline)
      }
    }
  })

  if (markers.length > 0 || trackPolylines.length > 0) {
    map.setFitView()
  }
}

const handleDocumentClick = (event) => {
  if (showContextMenu.value && contextMenuRef.value) {
    if (!contextMenuRef.value.contains(event.target)) {
      closeContextMenu()
    }
  }
}

onMounted(() => {
  if (settingsStore.getActiveKey()) {
    initMap()
  }
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

watch(() => settingsStore.mapKey, (newKey) => {
  if (newKey && !mapLoaded) {
    initMap()
  }
})

watch(() => [locationStore.locationGroups, locationStore.visiblePoints, locationStore.selectedPoints, locationStore.groupShowTrack], () => {
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
  min-width: 160px;
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
  display: flex;
  align-items: center;
}

.menu-item:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.check-icon {
  width: 18px;
  display: inline-block;
  font-weight: bold;
}

.menu-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}
</style>