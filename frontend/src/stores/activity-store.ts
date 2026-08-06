import { create } from 'zustand'
import { activityApi, toActivityItem, type ActivityItem, type ActivityPayload } from '@/services/activity'

const MAX_ACTIVITIES = 20

interface ActivityState {
  activities: ActivityItem[]
  isLoading: boolean
  addActivity: (activity: ActivityPayload) => Promise<void>
  loadActivities: () => Promise<void>
  removeByDocument: (documentId: string) => Promise<void>
  removeByFolder: (folderId: string) => Promise<void>
}

export const useActivityStore = create<ActivityState>()((set) => ({
  activities: [],
  isLoading: false,

  loadActivities: async () => {
    set({ isLoading: true })
    try {
      const rows = await activityApi.list()
      set({ activities: rows.map(toActivityItem) })
    } catch {
      set({ activities: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  addActivity: async (activity) => {
    try {
      const created = await activityApi.create(activity)
      set((state) => ({
        activities: [toActivityItem(created), ...state.activities].slice(0, MAX_ACTIVITIES),
      }))
    } catch {
      // Actividad no crítica: no romper el flujo si el registro falla
    }
  },

  removeByDocument: async (documentId) => {
    try {
      await activityApi.removeByDocument(documentId)
      set((state) => ({
        activities: state.activities.filter((a) => a.documentId !== documentId),
      }))
    } catch {
      // Sin cambios locales si el borrado remoto falla
    }
  },

  removeByFolder: async (folderId) => {
    try {
      await activityApi.removeByFolder(folderId)
      set((state) => ({
        activities: state.activities.filter((a) => a.folderId !== folderId),
      }))
    } catch {
      // Sin cambios locales si el borrado remoto falla
    }
  },
}))
