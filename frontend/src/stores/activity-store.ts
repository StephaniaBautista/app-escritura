import { create } from 'zustand'

export interface ActivityItem {
  id: string
  type: 'folder_created' | 'document_created' | 'document_edited'
  title: string
  folderId?: string
  documentId?: string
  timestamp: number
}

interface ActivityState {
  activities: ActivityItem[]
  addActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void
  loadActivities: () => void
  removeByDocument: (documentId: string) => void
  removeByFolder: (folderId: string) => void
}

const STORAGE_KEY = 'archivum-activity'
const LEGACY_STORAGE_KEY = 'escritura-activity'
const MAX_ACTIVITIES = 20

export const useActivityStore = create<ActivityState>()((set) => ({
  activities: [],

  addActivity: (activity) => {
    const newActivity: ActivityItem = {
      ...activity,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    }

    set((state) => {
      const updated = [newActivity, ...state.activities].slice(0, MAX_ACTIVITIES)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return { activities: updated }
    })
  },

  loadActivities: () => {
    try {
      let stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        stored = localStorage.getItem(LEGACY_STORAGE_KEY)
        if (stored) {
          localStorage.setItem(STORAGE_KEY, stored)
          localStorage.removeItem(LEGACY_STORAGE_KEY)
        }
      }
      if (stored) {
        set({ activities: JSON.parse(stored) })
      }
    } catch {
      // Ignore parse errors
    }
  },

  removeByDocument: (documentId) => {
    set((state) => {
      const updated = state.activities.filter((a) => a.documentId !== documentId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return { activities: updated }
    })
  },

  removeByFolder: (folderId) => {
    set((state) => {
      const updated = state.activities.filter((a) => a.folderId !== folderId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return { activities: updated }
    })
  },
}))
