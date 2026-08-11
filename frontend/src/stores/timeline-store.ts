import { create } from 'zustand'
import type { TimelineEvent, TimelineEventInput } from '@/types/timeline'
import { timelineApi } from '@/services/timeline'
import { useToastStore } from './toast-store'
import i18n from '@/i18n'

interface TimelineState {
  events: TimelineEvent[]
  isLoading: boolean
  error: string | null

  load: (projectId: string) => Promise<void>
  create: (projectId: string, data: TimelineEventInput) => Promise<TimelineEvent | null>
  update: (id: string, data: TimelineEventInput) => Promise<TimelineEvent | null>
  move: (id: string, direction: 'up' | 'down') => Promise<void>
  remove: (id: string) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

export const useTimelineStore = create<TimelineState>()((set, get) => ({
  events: [],
  isLoading: false,
  error: null,

  async load(projectId: string) {
    set({ isLoading: true, error: null })
    try {
      const events = await timelineApi.list(projectId)
      set({ events, isLoading: false })
    } catch (err: unknown) {
      set({ error: getErrorMessage(err), isLoading: false })
    }
  },

  async create(projectId: string, data: TimelineEventInput) {
    try {
      const event = await timelineApi.create(projectId, data)
      set({ events: [...get().events, event] })
      return event
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async update(id: string, data: TimelineEventInput) {
    try {
      const updated = await timelineApi.update(id, data)
      set({ events: get().events.map((e) => (e.id === id ? updated : e)) })
      return updated
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async move(id: string, direction: 'up' | 'down') {
    const events = [...get().events]
    const index = events.findIndex((e) => e.id === id)
    const swap = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swap < 0 || swap >= events.length) return
    const a = events[index]
    const b = events[swap]
    set({ events: events.map((e, i) => (i === index ? b : i === swap ? a : e)) })
    await Promise.all([
      timelineApi.update(a.id, { order: swap }).catch(() => undefined),
      timelineApi.update(b.id, { order: index }).catch(() => undefined),
    ])
  },

  async remove(id: string) {
    try {
      await timelineApi.delete(id)
      set({ events: get().events.filter((e) => e.id !== id) })
      useToastStore.getState().success(i18n.t('timelineApp.deleted'))
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },
}))
