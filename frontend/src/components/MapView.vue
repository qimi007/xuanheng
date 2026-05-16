<template>
  <div ref="mapContainer" class="map-container" v-if="settingsStore.getActiveKey()" @contextmenu.prevent="handleContextMenu">
    <div class="map-placeholder">正在加载地图...</div>

    <!-- 信息窗体 -->
    <div
      v-for="info in infoWindowsRef"
      :key="info.pointId"
      class="info-window"
      :class="'anchor-' + (info.anchor || 'top')"
      :style="{ left: info.x + 'px', top: (info.y - 30) + 'px' }"
    >
      <div class="info-window-content" @mousedown="startDrag($event, info)">
        <button class="info-close-btn" @click.stop="closeInfoWindow(info.pointId)">✕</button>
        <div class="info-title">{{ info.tagName }}</div>
        <div class="info-body">
          <div>时间: {{ info.time }}</div>
          <div>经度: {{ info.lng }}</div>
          <div>纬度: {{ info.lat }}</div>
          <div>海拔: {{ info.alt }} m</div>
          <div>航向角: {{ info.head }}°</div>
          <div>速度: {{ info.speed }} m/s</div>
          <div v-if="info.extra" v-html="info.extra" class="info-extra"></div>
        </div>
      </div>
      <div class="info-connector"></div>
    </div>

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
const infoWindowsRef = ref([])
const draggingInfo = ref(null)
const dragOffset = ref({ x: 0, y: 0 })
const infoWindowsMap = new Map()

let map = null
let markers = []
let trackPolylines = []
let mapLoaded = false
let trafficLayer = null
let satelliteLayer = null
let roadNetLayer = null
let defaultLayer = null
let markerRightClickHandled = false

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

    locationStore.setAmapInstance(window.AMap)

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

    map.on('moveend', () => {
      updateInfoWindowPositions()
    })

    map.on('zoomend', () => {
      updateInfoWindowPositions()
    })
  } catch (e) {
    console.error('加载地图失败:', e)
  }
}

const handleContextMenu = (event) => {
  if (markerRightClickHandled) {
    return
  }
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

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const closeInfoWindow = (pointId) => {
  const idx = infoWindowsRef.value.findIndex(w => w.pointId === pointId)
  if (idx !== -1) {
    infoWindowsRef.value.splice(idx, 1)
    infoWindowsMap.delete(pointId)
  }
}

const startDrag = (event, info) => {
  draggingInfo.value = info
  info.isDragging = true
  dragOffset.value = {
    x: event.clientX - info.x,
    y: event.clientY - (info.y - 30)
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (event) => {
  if (!draggingInfo.value) return
  const info = infoWindowsRef.value.find(w => w.pointId === draggingInfo.value.pointId)
  if (info) {
    info.x = event.clientX - dragOffset.value.x
    info.y = event.clientY - dragOffset.value.y + 30
    updateInfoWindowAnchor(info)
  }
}

const stopDrag = () => {
  if (draggingInfo.value) {
    draggingInfo.value.isDragging = false
  }
  draggingInfo.value = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const updateInfoWindowAnchor = (info) => {
  if (!map || !mapLoaded) return
  const point = getPointById(info.pointId)
  if (!point) return
  const currentPixel = map.lngLatToContainer([point.lng, point.lat])
  const dx = info.x - currentPixel.x
  const dy = (info.y - 30) - currentPixel.y
  if (dy < -50) {
    info.anchor = 'bottom'
  } else if (dy > 50) {
    info.anchor = 'top'
  } else {
    info.anchor = 'center'
  }
}

const getPointById = (pointId) => {
  for (const group of locationStore.locationGroups) {
    const point = group.points.find(p => p.id === pointId)
    if (point) return point
  }
  return null
}

const animateScale = (markerInstance) => {
  const extData = markerInstance.getExtData()
  if (!extData || !extData.createIcon || !extData.baseSize) return
  
  const { createIcon, baseSize } = extData
  const duration = 300
  const maxSize = baseSize * 2
  const startTime = Date.now()
  
  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    let scale
    if (progress < 0.5) {
      scale = 1 + progress * (maxSize / baseSize - 1) * 2
    } else {
      scale = maxSize / baseSize - (progress - 0.5) * (maxSize / baseSize - 1) * 2
    }
    
    const newSize = Math.round(baseSize * scale)
    markerInstance.setIcon(createIcon(newSize))
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      markerInstance.setIcon(createIcon(baseSize))
    }
  }
  animate()
}

const handleMarkerClick = (pointId, markerInstance) => {
  locationStore.setHighlightPoint(pointId)
  animateScale(markerInstance)
}

const createInfoWindow = (point) => {
  if (infoWindowsMap.has(point.id)) {
    return
  }

  const extraInfo = point.extra ? Object.entries(point.extra)
    .map(([key, value]) => `<div>${key}: ${value}</div>`)
    : ''

  const pixel = map.lngLatToContainer([point.lng, point.lat])

  infoWindowsRef.value.push({
    pointId: point.id,
    tagName: point.tagName,
    time: formatTime(point.time),
    lng: point.lng.toFixed(6),
    lat: point.lat.toFixed(6),
    alt: point.alt || 0,
    head: point.head || 0,
    speed: point.speed || 0,
    extra: extraInfo,
    x: pixel.x,
    y: pixel.y,
    anchor: 'top'
  })
  infoWindowsMap.set(point.id, true)
}

const updateInfoWindowPositions = () => {
  if (!map || !mapLoaded) return
  locationStore.locationGroups.forEach(group => {
    group.points.forEach(point => {
      const info = infoWindowsRef.value.find(w => w.pointId === point.id)
      if (info && !info.isDragging) {
        const mapCoord = locationStore.getMapCoord(point)
        const pixel = map.lngLatToContainer([mapCoord.lng, mapCoord.lat])
        info.x = pixel.x
        info.y = pixel.y
      }
    })
  })
  infoWindowsRef.value.forEach(info => {
    const point = getPointById(info.pointId)
    if (point) {
      const mapCoord = locationStore.getMapCoord(point)
      const mapCenter = map.getCenter()
      const dy = mapCenter.getLat() - mapCoord.lat
      if (dy > 0.01) {
        info.anchor = 'bottom'
      } else if (dy < -0.01) {
        info.anchor = 'top'
      } else {
        info.anchor = 'top'
      }
    }
  })
}

const focusPoint = (point) => {
  if (!map || !mapLoaded) return

  const mapCoord = locationStore.getMapCoord(point)

  map.setCenter([mapCoord.lng, mapCoord.lat])

  const targetMarker = markers.find(m => {
    const ext = m.getExtData()
    return ext === point.id || (ext && ext.pointId === point.id)
  })

  if (targetMarker) {
    animateScale(targetMarker)
  }
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
        const mapCoord = locationStore.getMapCoord(point)
        const createArrowIcon = (newSize) => {
          const arrowSvg = `<svg width="${newSize}" height="${newSize}" viewBox="0 0 ${newSize} ${newSize}" xmlns="http://www.w3.org/2000/svg">
            <polygon points="${newSize/2},1 ${newSize/2-4},9 ${newSize/2+4},9" fill="${fillColor}"/>
            <line x1="${newSize/2}" y1="9" x2="${newSize/2}" y2="${newSize-2}" stroke="${fillColor}" stroke-width="2" stroke-linecap="round"/>
          </svg>`
          return new window.AMap.Icon({
            size: new window.AMap.Size(newSize, newSize),
            image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(arrowSvg),
            imageSize: new window.AMap.Size(newSize, newSize)
          })
        }
        const marker = new window.AMap.Marker({
          position: [mapCoord.lng, mapCoord.lat],
          icon: createArrowIcon(size),
          anchor: 'center',
          angle: head,
          zIndex: 10,
          zIndexOffset: 100,
          clickable: true,
          cursor: 'pointer',
          extData: { pointId: point.id, createIcon: createArrowIcon, baseSize: size }
        })
        marker.on('click', () => {
          handleMarkerClick(point.id, marker)
        })
        marker.on('mousedown', () => {
          markerRightClickHandled = true
        })
        marker.on('rightclick', () => {
          createInfoWindow(point)
          setTimeout(() => { markerRightClickHandled = false }, 500)
        })
        marker.setMap(map)
        markers.push(marker)
      } else {
        const size = 12
        const mapCoord = locationStore.getMapCoord(point)
        const createCircleIcon = (newSize) => {
          const circleSvg = `<svg width="${newSize}" height="${newSize}" viewBox="0 0 ${newSize} ${newSize}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${newSize/2}" cy="${newSize/2}" r="${newSize/2 - 1}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1"/>
          </svg>`
          return new window.AMap.Icon({
            size: new window.AMap.Size(newSize, newSize),
            image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(circleSvg),
            imageSize: new window.AMap.Size(newSize, newSize)
          })
        }
        const marker = new window.AMap.Marker({
          position: [mapCoord.lng, mapCoord.lat],
          icon: createCircleIcon(size),
          anchor: 'center',
          zIndex: 10,
          zIndexOffset: 100,
          clickable: true,
          cursor: 'pointer',
          extData: { pointId: point.id, createIcon: createCircleIcon, baseSize: size }
        })
        marker.on('click', () => {
          handleMarkerClick(point.id, marker)
        })
        marker.on('mousedown', () => {
          markerRightClickHandled = true
        })
        marker.on('rightclick', () => {
          createInfoWindow(point)
          setTimeout(() => { markerRightClickHandled = false }, 500)
        })
        marker.setMap(map)
        markers.push(marker)
      }
})

    if (locationStore.isGroupShowTrack(group.id)) {
      const selectedPoints = locationStore.getSelectedPointsInGroup(group.id)
      if (selectedPoints.length >= 2) {
        const path = selectedPoints.map(p => {
          const mapCoord = locationStore.getMapCoord(p)
          return new window.AMap.LngLat(mapCoord.lng, mapCoord.lat)
        })
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

watch(() => locationStore.focusedPointId, (pointId) => {
  if (!pointId) return
  let targetPoint = null
  for (const group of locationStore.locationGroups) {
    const point = group.points.find(p => p.id === pointId)
    if (point) {
      targetPoint = point
      break
    }
  }
  if (targetPoint) {
    map.setCenter([targetPoint.lng, targetPoint.lat])
    const targetMarker = markers.find(m => {
      const ext = m.getExtData()
      return ext === targetPoint.id || (ext && ext.pointId === targetPoint.id)
    })
    if (targetMarker) {
      animateScale(targetMarker)
    }
  }
  setTimeout(() => {
    locationStore.clearFocusedPoint()
  }, 500)
})

defineExpose({ updateMarkers, focusPoint })
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

.info-window {
  position: absolute;
  z-index: 100;
  pointer-events: none;
  cursor: move;
}

.info-window-content {
  pointer-events: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  padding: 10px;
  min-width: 160px;
  position: relative;
}

.info-close-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #999;
  padding: 0;
  line-height: 1;
}

.info-close-btn:hover {
  color: #333;
}

.info-title {
  font-weight: bold;
  margin-bottom: 6px;
  color: #5c6bc0;
  padding-right: 20px;
}

.info-body {
  font-size: 11px;
  line-height: 1.6;
  color: #333;
}

.info-extra {
  margin-top: 4px;
  border-top: 1px solid #eee;
  padding-top: 4px;
}

.info-connector {
  width: 2px;
  height: 30px;
  background: #5c6bc0;
  margin: 0 auto;
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

.amap-info-window {
  padding: 0;
}

.amap-info-title {
  font-weight: bold;
  font-size: 14px;
  color: #5c6bc0;
  padding: 8px 12px;
  border-bottom: 1px solid #e8eaf6;
  background: linear-gradient(135deg, #f8f8fc 0%, #f0f0f8 100%);
}

.amap-info-content {
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.8;
  color: #333;
}

.info-window {
  position: absolute;
  z-index: 100;
  cursor: move;
}

.info-window-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  padding: 10px;
  min-width: 160px;
  position: relative;
}

.info-close-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #999;
  padding: 0;
  line-height: 1;
}

.info-close-btn:hover {
  color: #333;
}

.info-title {
  font-weight: bold;
  font-size: 14px;
  color: #5c6bc0;
  padding-right: 20px;
  margin-bottom: 8px;
}

.info-body {
  font-size: 12px;
  line-height: 1.6;
  color: #333;
}

.info-extra {
  margin-top: 4px;
  border-top: 1px solid #eee;
  padding-top: 4px;
}

.info-connector {
  width: 2px;
  height: 30px;
  background: #5c6bc0;
  margin: 0 auto;
}

.info-window.anchor-top .info-connector {
  margin-top: 0;
}

.info-window.anchor-bottom {
  transform: translateY(-60px);
}

.info-window.anchor-bottom .info-connector {
  margin-bottom: 0;
}

.info-window.anchor-center .info-connector {
  height: 60px;
}

.info-window .info-connector {
  position: relative;
}

.info-window .info-connector::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  background: #5c6bc0;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
</style>