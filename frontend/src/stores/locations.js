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

export const useLocationStore = defineStore('locations', () => {
  const locationGroups = ref([])
  const visiblePoints = ref(new Set())
  const selectedPoints = ref(new Set())

  const addGroup = (name, coords, coordType, extras = []) => {
    const id = Date.now().toString()
    const cooSys = coordType === 'wgs84' ? 'W' : 'G'
    
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
        extra: extras[index]?.extra || {}
      }
    })
    
    locationGroups.value.push({
      id,
      name,
      points,
      cooSys,
      visible: true
    })
    points.forEach(p => visiblePoints.value.add(p.id))
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
    locationGroups.value.forEach(group => {
      group.points = group.points.filter(p => !selectedIds.has(p.id))
    })
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
    addGroup, 
    toggleGroup, 
    togglePoint, 
    isPointVisible,
    toggleSelectedPoint,
    isPointSelected,
    toggleGroupSelectAll,
    isGroupAllSelected,
    addPointsToGroup,
    deleteSelectedPoints,
    getSelectedPointsInGroup,
    clearAll,
    updateGroupName,
    updatePointName
  }
})