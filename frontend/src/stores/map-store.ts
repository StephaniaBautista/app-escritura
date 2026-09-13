import { create } from 'zustand'
import type { MapBoard, MapCanvas } from '@/types/maps'
import { mapsApi } from '@/services/maps'
import { useToastStore } from './toast-store'

interface MapState {
  maps: MapBoard[]
  activeId: string | null
  isLoading: boolean
  isSaving: boolean
  load: (projectId: string) => Promise<void>
  create: (projectId: string, name: string) => Promise<MapBoard | null>
  rename: (id: string, name: string) => Promise<MapBoard | null>
  saveCanvas: (id: string, canvas: MapCanvas) => Promise<MapBoard | null>
  remove: (id: string) => Promise<void>
  uploadBackground: (id: string, dataUrl: string) => Promise<MapBoard | null>
  removeBackground: (id: string) => Promise<MapBoard | null>
  setActive: (id: string | null) => void
  patchLocal: (id: string, patch: Partial<MapBoard>) => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

function replace(maps: MapBoard[], next: MapBoard): MapBoard[] {
  return maps.map((item) => (item.id === next.id ? next : item))
}

export const useMapStore = create<MapState>()((set, get) => ({
  maps: [],
  activeId: null,
  isLoading: true,
  isSaving: false,

  async load(projectId) {
    set({ isLoading: true })
    try {
      const maps = await mapsApi.list(projectId)
      const activeId = get().activeId
      const stillThere = maps.some((item) => item.id === activeId)
      set({ maps, activeId: stillThere ? activeId : maps[0]?.id ?? null, isLoading: false })
    } catch (err: unknown) {
      set({ isLoading: false })
      useToastStore.getState().error(getErrorMessage(err))
    }
  },

  async create(projectId, name) {
    try {
      const map = await mapsApi.create(projectId, name)
      set({ maps: [...get().maps, map], activeId: map.id })
      return map
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async rename(id, name) {
    try {
      const map = await mapsApi.update(id, { name })
      set({ maps: replace(get().maps, map) })
      return map
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async saveCanvas(id, canvas) {
    set({ isSaving: true })
    try {
      const map = await mapsApi.saveCanvas(id, canvas)
      set({ maps: replace(get().maps, map), isSaving: false })
      return map
    } catch (err: unknown) {
      set({ isSaving: false })
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async remove(id) {
    try {
      await mapsApi.delete(id)
      const maps = get().maps.filter((item) => item.id !== id)
      const activeId = get().activeId === id ? maps[0]?.id ?? null : get().activeId
      set({ maps, activeId })
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },

  async uploadBackground(id, dataUrl) {
    try {
      const map = await mapsApi.uploadBackground(id, dataUrl)
      set({ maps: replace(get().maps, map) })
      return map
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async removeBackground(id) {
    try {
      const map = await mapsApi.deleteBackground(id)
      set({ maps: replace(get().maps, map) })
      return map
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  setActive(id) {
    set({ activeId: id })
  },

  patchLocal(id, patch) {
    set({
      maps: get().maps.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  },
}))
