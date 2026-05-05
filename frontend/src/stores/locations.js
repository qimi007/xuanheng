import { defineStore } from 'pinia'
import { ref } from 'vue'

const formatDateTime = (timestamp) => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// WGS84 -> GCJ-02 坐标转换算法（火星坐标系）
const PI = Math.PI
const A = 6378245.0
const EE = 0.00669342162296594323

const isOutOfChina = (lng, lat) => {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

const transformLat = (x, y) => {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320.0 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0
  return ret
}

const transformLng = (x, y) => {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0
  return ret
}

const wgs84ToGcj02 = (lng, lat) => {
  if (isOutOfChina(lng, lat)) {
    return { lng, lat }
  }
  let dlat = transformLat(lng - 105.0, lat - 35.0)
  let dlng = transformLng(lng - 105.0, lat - 35.0)
  const radlat = lat / 180.0 * PI
  let magic = Math.sin(radlat)
  magic = 1 - EE * magic * magic
  const sqrtmagic = Math.sqrt(magic)
  dlat = (dlat * 180.0) / ((A * (1 - EE)) / (magic * sqrtmagic) * PI)
  dlng = (dlng * 180.0) / (A / sqrtmagic * Math.cos(radlat) * PI)
  return {
    lng: lng + dlng,
    lat: lat + dlat
  }
}

const colorPalette = [
  '#5c6bc0', '#ef5350', '#66bb6a', '#ffa726', '#ab47bc',
  '#26a69a', '#ec407a', '#7e57c2', '#42a5f5', '#ff7043',
  '#8d6e63', '#78909c', '#26c6da', '#9ccc65', '#d4e157'
]
let colorIndex = 0

const coordErrors = ref([])

export const setAmapInstance = () => {}

const addCoordError = (pointId, tagName, lng, lat) => {
  coordErrors.value.push({
    id: Date.now(),
    pointId,
    tagName,
    lng: lng.toFixed(6),
    lat: lat.toFixed(6),
    time: new Date().toLocaleString()
  })
}

const convertCoordOnce = (item) => {
  if (item.cooSys === 'G') {
    item.callback(item.lng, item.lat, 'success')
    return
  }

  try {
    const result = wgs84ToGcj02(item.lng, item.lat)
    item.callback(result.lng, result.lat, 'success')
  } catch (e) {
    addCoordError(item.pointId, item.tagName, item.lng, item.lat)
    item.callback(null, null, 'failed')
  }
}

const transformCoord = (lng, lat, cooSys, pointId, tagName, callback) => {
  convertCoordOnce({ lng, lat, cooSys, pointId, tagName, callback })
}

export const useLocationStore = defineStore('locations', () => {
  const locationGroups = ref([])
  const visiblePoints = ref(new Set())
  const selectedPoints = ref(new Set())
  const groupShowTrack = ref(new Set())
  const focusedPointId = ref(null)
  const highlightedPointId = ref(null)

  const findPointById = (pointId) => {
    for (const group of locationGroups.value) {
      const point = group.points.find(p => p.id === pointId)
      if (point) return point
    }
    return null
  }

  const addGroup = (name, coords, coordType, extras = []) => {
    const cooSys = coordType === 'wgs84' ? 'W' : 'G'
    
    // 检查是否存在同名分组
    const existingGroup = locationGroups.value.find(g => g.name === name)
    
    if (existingGroup) {
      const startIndex = existingGroup.points.length
      coords.forEach((coord, index) => {
        const timestamp = extras[index]?.time || Date.now()
        const pointId = `${existingGroup.id}-${startIndex + index}`
        const newPoint = {
          id: pointId,
          tagName: extras[index]?.tagName || `点 ${startIndex + index + 1}`,
          cooSys: cooSys,
          lng: coord.lng,
          lat: coord.lat,
          gcjLng: undefined,
          gcjLat: undefined,
          alt: extras[index]?.alt !== undefined ? extras[index].alt : 0,
          time: timestamp,
          datetime: formatDateTime(timestamp),
          extra: extras[index]?.extra || {},
          showDetail: true,
          head: extras[index]?.head || 0,
          speed: extras[index]?.speed || 0
        }
        existingGroup.points.push(newPoint)

        if (cooSys === 'W') {
          visiblePoints.value.add(pointId)
          transformCoord(coord.lng, coord.lat, cooSys, pointId, newPoint.tagName, (gcjLng, gcjLat, status) => {
            const point = findPointById(pointId)
            if (!point) return
            if (status === 'success' && gcjLng !== null && gcjLat !== null) {
              point.gcjLng = gcjLng
              point.gcjLat = gcjLat
              selectedPoints.value.add(pointId)
            } else {
              visiblePoints.value.delete(pointId)
            }
            saveLocations()
          })
        } else {
          visiblePoints.value.add(pointId)
          selectedPoints.value.add(pointId)
        }
      })
} else {
      const id = Date.now().toString()
      const newGroupPoints = []

      coords.forEach((coord, index) => {
        const timestamp = extras[index]?.time || Date.now()
        const pointId = `${id}-${index}`
        const newPoint = {
          id: pointId,
          tagName: extras[index]?.tagName || `点 ${index + 1}`,
          cooSys: cooSys,
          lng: coord.lng,
          lat: coord.lat,
          gcjLng: undefined,
          gcjLat: undefined,
          alt: extras[index]?.alt !== undefined ? extras[index].alt : 0,
          time: timestamp,
          datetime: formatDateTime(timestamp),
          extra: extras[index]?.extra || {},
          showDetail: true,
          head: extras[index]?.head || 0,
          speed: extras[index]?.speed || 0
        }
        newGroupPoints.push(newPoint)
      })

      locationGroups.value.push({
        id,
        name,
        points: newGroupPoints,
        cooSys,
        visible: true,
        color: colorPalette[colorIndex++ % colorPalette.length],
        shape: 'circle'
      })

      newGroupPoints.forEach(point => {
        if (cooSys === 'W') {
          visiblePoints.value.add(point.id)
          transformCoord(point.lng, point.lat, cooSys, point.id, point.tagName, (gcjLng, gcjLat, status) => {
            const found = findPointById(point.id)
            if (!found) return
            if (status === 'success' && gcjLng !== null && gcjLat !== null) {
              found.gcjLng = gcjLng
              found.gcjLat = gcjLat
              selectedPoints.value.add(point.id)
            } else {
              visiblePoints.value.delete(point.id)
            }
            saveLocations()
          })
        } else {
          visiblePoints.value.add(point.id)
          selectedPoints.value.add(point.id)
        }
      })
      saveLocations()
    }
    saveLocations()
  }

  const toggleGroup = (groupId) => {
    const group = locationGroups.value.find(g => g.id === groupId)
    if (group) {
      group.visible = !group.visible
      saveLocations()
    }
  }

  const togglePoint = (pointId) => {
    if (visiblePoints.value.has(pointId)) {
      visiblePoints.value.delete(pointId)
    } else {
      visiblePoints.value.add(pointId)
    }
    saveLocations()
  }

  const isPointVisible = (pointId) => visiblePoints.value.has(pointId)

  const toggleSelectedPoint = (pointId) => {
    if (selectedPoints.value.has(pointId)) {
      selectedPoints.value.delete(pointId)
      saveLocations()
    } else {
      const point = findPointById(pointId)
      if (point && point.cooSys === 'W' && !point.gcjLng) {
        transformCoord(point.lng, point.lat, point.cooSys, point.id, point.tagName, (gcjLng, gcjLat, status) => {
          if (status === 'success' && gcjLng !== null && gcjLat !== null) {
            point.gcjLng = gcjLng
            point.gcjLat = gcjLat
            visiblePoints.value.add(pointId)
            selectedPoints.value.add(pointId)
          }
          saveLocations()
        })
      } else {
        selectedPoints.value.add(pointId)
        saveLocations()
      }
    }
  }

  const isPointSelected = (pointId) => selectedPoints.value.has(pointId)

  const setFocusedPoint = (pointId) => {
    focusedPointId.value = pointId
  }

  const clearFocusedPoint = () => {
    focusedPointId.value = null
  }

  const setHighlightPoint = (pointId) => {
    highlightedPointId.value = pointId
  }

  const clearHighlightPoint = () => {
    highlightedPointId.value = null
  }

  const togglePointDetail = (pointId) => {
    for (const group of locationGroups.value) {
      const point = group.points.find(p => p.id === pointId)
      if (point) {
        point.showDetail = !point.showDetail
        saveLocations()
        break
      }
    }
  }

  const toggleGroupSelectAll = (groupId) => {
    const group = locationGroups.value.find(g => g.id === groupId)
    if (!group) return

    const allSelected = group.points.every(p => selectedPoints.value.has(p.id))
    if (allSelected) {
      group.points.forEach(p => selectedPoints.value.delete(p.id))
    } else {
      group.points.forEach(p => {
        if (p.cooSys === 'W' && !p.gcjLng) {
          transformCoord(p.lng, p.lat, p.cooSys, p.id, p.tagName, (gcjLng, gcjLat, status) => {
            if (status === 'success' && gcjLng !== null && gcjLat !== null) {
              p.gcjLng = gcjLng
              p.gcjLat = gcjLat
              visiblePoints.value.add(p.id)
              selectedPoints.value.add(p.id)
            }
            saveLocations()
          })
        } else {
          selectedPoints.value.add(p.id)
        }
      })
    }
  }

  const isGroupAllSelected = (groupId) => {
    const group = locationGroups.value.find(g => g.id === groupId)
    if (!group || group.points.length === 0) return false
    return group.points.every(p => selectedPoints.value.has(p.id))
  }

  const toggleGroupShowTrack = (groupId) => {
    if (groupShowTrack.value.has(groupId)) {
      groupShowTrack.value.delete(groupId)
    } else {
      groupShowTrack.value.add(groupId)
    }
  }

  const isGroupShowTrack = (groupId) => groupShowTrack.value.has(groupId)

  const getGroupSelectedPoints = (groupId) => {
    const group = locationGroups.value.find(g => g.id === groupId)
    if (!group) return []
    return group.points.filter(p => selectedPoints.value.has(p.id))
  }

  const addPointsToGroup = (groupId, coords, coordType, extras = []) => {
    const group = locationGroups.value.find(g => g.id === groupId)
    if (!group) return

    const cooSys = coordType === 'wgs84' ? 'W' : 'G'
    const startIndex = group.points.length

    coords.forEach((coord, index) => {
      const timestamp = extras[index]?.time || Date.now()
      const pointId = `${groupId}-${startIndex + index}`

      const newPoint = {
        id: pointId,
        tagName: extras[index]?.tagName || `点 ${startIndex + index + 1}`,
        cooSys: cooSys,
        lng: coord.lng,
        lat: coord.lat,
        gcjLng: undefined,
        gcjLat: undefined,
        alt: extras[index]?.alt !== undefined ? extras[index].alt : 0,
        time: timestamp,
        datetime: formatDateTime(timestamp),
        extra: extras[index]?.extra || {}
      }

      group.points.push(newPoint)
      visiblePoints.value.add(pointId)

      if (cooSys === 'W') {
        transformCoord(coord.lng, coord.lat, cooSys, pointId, newPoint.tagName, (gcjLng, gcjLat, status) => {
          const point = findPointById(pointId)
          if (!point) return

          if (status === 'success' && gcjLng !== null && gcjLat !== null) {
            point.gcjLng = gcjLng
            point.gcjLat = gcjLat
            selectedPoints.value.add(pointId)
            saveLocations()
          } else {
            visiblePoints.value.delete(pointId)
            saveLocations()
          }
        })
      }
    })
  }

  const deleteSelectedPoints = () => {
    const selectedIds = new Set(selectedPoints.value)
    locationGroups.value = locationGroups.value
      .map(group => ({
        ...group,
        points: group.points.filter(p => !selectedIds.has(p.id))
      }))
      .filter(group => group.points.length > 0)
    selectedPoints.value.clear()
    saveLocations()
  }

  const getSelectedPointsInGroup = (groupId) => {
    const group = locationGroups.value.find(g => g.id === groupId)
    if (!group) return []
    return group.points.filter(p => selectedPoints.value.has(p.id))
  }

  const updateGroupName = (groupId, newName) => {
    const group = locationGroups.value.find(g => g.id === groupId)
    if (group) {
      group.name = newName
      saveLocations()
    }
  }

  const updatePointName = (pointId, newName) => {
    for (const group of locationGroups.value) {
      const point = group.points.find(p => p.id === pointId)
      if (point) {
        point.tagName = newName
        saveLocations()
        return
      }
    }
  }

  const updateGroupColor = (groupId, newColor) => {
    const group = locationGroups.value.find(g => g.id === groupId)
    if (group) {
      group.color = newColor
      saveLocations()
    }
  }

  const updateGroupShape = (groupId, newShape) => {
    const group = locationGroups.value.find(g => g.id === groupId)
    if (group) {
      group.shape = newShape
      saveLocations()
    }
  }

  const deleteGroup = (groupId) => {
    const index = locationGroups.value.findIndex(g => g.id === groupId)
    if (index !== -1) {
      const group = locationGroups.value[index]
      group.points.forEach(p => {
        selectedPoints.value.delete(p.id)
        visiblePoints.value.delete(p.id)
      })
      groupShowTrack.value.delete(groupId)
      locationGroups.value.splice(index, 1)
      saveLocations()
    }
  }

  const saveLocations = () => {
    localStorage.setItem('map-locations', JSON.stringify({
      groups: locationGroups.value,
      visible: Array.from(visiblePoints.value)
    }))
  }

  const loadLocations = () => {
    const saved = localStorage.getItem('map-locations')
    if (saved) {
      const data = JSON.parse(saved)
      locationGroups.value = data.groups || []
      visiblePoints.value = new Set(data.visible || [])
    }
  }

  const clearAll = () => {
    locationGroups.value = []
    visiblePoints.value.clear()
    saveLocations()
  }

  loadLocations()

  const getMapCoord = (point) => {
    return {
      lng: point.gcjLng ?? point.lng,
      lat: point.gcjLat ?? point.lat
    }
  }

  const retryTransform = (pointId) => {
    const point = findPointById(pointId)
    if (!point) return
    transformCoord(point.lng, point.lat, point.cooSys, point.id, point.tagName, (gcjLng, gcjLat, status) => {
      if (status === 'success' && gcjLng !== null && gcjLat !== null) {
        point.gcjLng = gcjLng
        point.gcjLat = gcjLat
        visiblePoints.value.add(pointId)
        selectedPoints.value.add(pointId)
      }
      saveLocations()
    })
  }

  const clearCoordErrors = () => {
    coordErrors.value = []
  }

  const removeCoordError = (pointId) => {
    const idx = coordErrors.value.findIndex(e => e.pointId === pointId)
    if (idx !== -1) {
      coordErrors.value.splice(idx, 1)
    }
  }

  loadLocations()

  return {
    locationGroups,
    visiblePoints,
    selectedPoints,
    groupShowTrack,
    focusedPointId,
    highlightedPointId,
    coordErrors,
    addGroup,
    toggleGroup,
    togglePoint,
    isPointVisible,
    toggleSelectedPoint,
    isPointSelected,
    setFocusedPoint,
    clearFocusedPoint,
    setHighlightPoint,
    clearHighlightPoint,
    togglePointDetail,
    toggleGroupSelectAll,
    isGroupAllSelected,
    toggleGroupShowTrack,
    isGroupShowTrack,
    getGroupSelectedPoints,
    addPointsToGroup,
    deleteSelectedPoints,
    getSelectedPointsInGroup,
    clearAll,
    updateGroupName,
    updatePointName,
    updateGroupColor,
    updateGroupShape,
    deleteGroup,
    getMapCoord,
    retryTransform,
    clearCoordErrors,
    removeCoordError,
    setAmapInstance
  }
})