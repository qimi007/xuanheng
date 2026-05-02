import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLocationStore = defineStore('locations', () => {
  const locationGroups = ref([])
  const visiblePoints = ref(new Set())

  const addGroup = (name, coords, coordType, extras = []) => {
    const id = Date.now().toString()
    const cooSys = coordType === 'wgs84' ? 'W' : 'G'
    
    const points = coords.map((coord, index) => ({
      id: `${id}-${index}`,
      tagName: extras[index]?.tagName || `点 ${index + 1}`,
      cooSys: cooSys,
      lng: coord.lng,
      lat: coord.lat,
      alt: extras[index]?.alt !== undefined ? extras[index].alt : 0,
      time: extras[index]?.time || Date.now(),
      extra: extras[index]?.extra || {}
    }))
    
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
    addGroup, 
    toggleGroup, 
    togglePoint, 
    isPointVisible, 
    clearAll,
    updateGroupName,
    updatePointName
  }
})