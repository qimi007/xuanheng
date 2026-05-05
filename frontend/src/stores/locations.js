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

const colorPalette = [
  '#5c6bc0', '#ef5350', '#66bb6a', '#ffa726', '#ab47bc', 
  '#26a69a', '#ec407a', '#7e57c2', '#42a5f5', '#ff7043',
  '#8d6e63', '#78909c', '#26c6da', '#9ccc65', '#d4e157'
]
let colorIndex = 0

export const useLocationStore = defineStore('locations', () => {
  const locationGroups = ref([])
  const visiblePoints = ref(new Set())
  const selectedPoints = ref(new Set())
  const groupShowTrack = ref(new Set())
  const focusedPointId = ref(null)
  const highlightedPointId = ref(null)

  const addGroup = (name, coords, coordType, extras = []) => {
    const cooSys = coordType === 'wgs84' ? 'W' : 'G'
    
    // 检查是否存在同名分组
    const existingGroup = locationGroups.value.find(g => g.name === name)
    
    if (existingGroup) {
      // 添加到已有分组
      const startIndex = existingGroup.points.length
      const newPoints = coords.map((coord, index) => {
        const timestamp = extras[index]?.time || Date.now()
        return {
          id: `${existingGroup.id}-${startIndex + index}`,
          tagName: extras[index]?.tagName || `点 ${startIndex + index + 1}`,
          cooSys: cooSys,
          lng: coord.lng,
          lat: coord.lat,
          alt: extras[index]?.alt !== undefined ? extras[index].alt : 0,
          time: timestamp,
          datetime: formatDateTime(timestamp),
          extra: extras[index]?.extra || {},
          showDetail: true,
          head: extras[index]?.head || 0,
          speed: extras[index]?.speed || 0
        }
      })
      existingGroup.points.push(...newPoints)
      newPoints.forEach(p => {
        visiblePoints.value.add(p.id)
        selectedPoints.value.add(p.id)
      })
    } else {
      // 创建新分组
      const id = Date.now().toString()
      const points = coords.map((coord, index) => {
        const timestamp = extras[index]?.time || Date.now()
        return {
          id: `${id}-${index}`,
          tagName: extras[index]?.tagName || `点 ${index + 1}`,
          cooSys: cooSys,
          lng: coord.lng,
          lat: coord.lat,
          alt: extras[index]?.alt !== undefined ? extras[index].alt : 0,
          time: timestamp,
          datetime: formatDateTime(timestamp),
          extra: extras[index]?.extra || {},
          showDetail: true,
          head: extras[index]?.head || 0,
          speed: extras[index]?.speed || 0
        }
      })
      
      locationGroups.value.push({
        id,
        name,
        points,
        cooSys,
        visible: true,
        color: colorPalette[colorIndex++ % colorPalette.length],
        shape: 'circle'
      })
      points.forEach(p => {
        visiblePoints.value.add(p.id)
        selectedPoints.value.add(p.id)
      })
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
    } else {
      selectedPoints.value.add(pointId)
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
      group.points.forEach(p => selectedPoints.value.add(p.id))
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
    
    const newPoints = coords.map((coord, index) => {
      const timestamp = extras[index]?.time || Date.now()
      return {
        id: `${groupId}-${startIndex + index}`,
        tagName: extras[index]?.tagName || `点 ${startIndex + index + 1}`,
        cooSys: cooSys,
        lng: coord.lng,
        lat: coord.lat,
        alt: extras[index]?.alt !== undefined ? extras[index].alt : 0,
        time: timestamp,
        datetime: formatDateTime(timestamp),
        extra: extras[index]?.extra || {}
      }
    })
    
    group.points.push(...newPoints)
    newPoints.forEach(p => visiblePoints.value.add(p.id))
    saveLocations()
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

  return { 
    locationGroups, 
    visiblePoints,
    selectedPoints,
    groupShowTrack,
    focusedPointId,
    highlightedPointId,
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
    deleteGroup
  }
})