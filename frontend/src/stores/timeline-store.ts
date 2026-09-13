import { create } from 'zustand'
import type { TimelineConfig, TimelineEra, TimelineEraInput, TimelineEvent, TimelineEventInput } from '@/types/timeline'
import { DEFAULT_TIMELINE_CONFIG } from '@/types/timeline'
import { normalizeTimelineConfig } from '@/lib/timeline-date'
import { timelineApi } from '@/services/timeline'
import { projectsApi } from '@/services/documents'
import { useToastStore } from './toast-store'
import i18n from '@/i18n'

interface TimelineState {
  events: TimelineEvent[]
  eras: TimelineEra[]
  timelineConfig: TimelineConfig
  isLoading: boolean
  isSavingTimelineConfig: boolean
  error: string | null

  load: (projectId: string) => Promise<void>
  loadConfig: (projectId: string) => Promise<void>
  updateTimelineConfig: (projectId: string, config: TimelineConfig) => Promise<void>
  loadEras: (projectId: string) => Promise<void>
  createEra: (projectId: string, data: TimelineEraInput) => Promise<TimelineEra | null>
  updateEra: (id: string, data: TimelineEraInput) => Promise<TimelineEra | null>
  removeEra: (id: string) => Promise<void>
  create: (projectId: string, data: TimelineEventInput) => Promise<TimelineEvent | null>
  update: (id: string, data: TimelineEventInput) => Promise<TimelineEvent | null>
  uploadImage: (id: string, dataUrl: string) => Promise<TimelineEvent | null>
  move: (id: string, direction: 'up' | 'down') => Promise<void>
  remove: (id: string) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

export const useTimelineStore = create<TimelineState>()((set, get) => ({
  events: [],
  eras: [],
  timelineConfig: DEFAULT_TIMELINE_CONFIG,
  isLoading: false,
  isSavingTimelineConfig: false,
  error: null,

  async loadConfig(projectId: string) {
    try {
      const project = await projectsApi.getById(projectId)
      set({ timelineConfig: normalizeTimelineConfig(project.timelineConfig) })
    } catch {
      set({ timelineConfig: DEFAULT_TIMELINE_CONFIG })
    }
  },

  async updateTimelineConfig(projectId: string, config: TimelineConfig) {
    set({ isSavingTimelineConfig: true })
    try {
      const project = await projectsApi.updateTimelineConfig(projectId, config)
      set({ timelineConfig: normalizeTimelineConfig(project.timelineConfig), isSavingTimelineConfig: false })
    } catch (err: unknown) {
      set({ isSavingTimelineConfig: false })
      useToastStore.getState().error(getErrorMessage(err))
    }
  },

  async load(projectId: string) {
    set({ isLoading: true, error: null })
    try {
      const events = await timelineApi.list(projectId)
      set({ events, isLoading: false })
    } catch (err: unknown) {
      set({ error: getErrorMessage(err), isLoading: false })
    }
  },

  async loadEras(projectId: string) {
    try {
      const eras = await timelineApi.listEras(projectId)
      set({ eras })
    } catch {
      set({ eras: [] })
    }
  },

  async createEra(projectId: string, data: TimelineEraInput) {
    try {
      const era = await timelineApi.createEra(projectId, data)
      set({ eras: [...get().eras, era] })
      return era
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async updateEra(id: string, data: TimelineEraInput) {
    try {
      const era = await timelineApi.updateEra(id, data)
      set({ eras: get().eras.map((e) => (e.id === id ? era : e)) })
      return era
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async removeEra(id: string) {
    const previous = get().eras
    set({
      eras: previous.filter((e) => e.id !== id),
      events: get().events.map((e) => (e.eraId === id ? { ...e, eraId: null } : e)),
    })
    try {
      await timelineApi.deleteEra(id)
    } catch (err: unknown) {
      set({ eras: previous })
      useToastStore.getState().error(getErrorMessage(err))
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

  async uploadImage(id: string, dataUrl: string) {
    try {
      const updated = await timelineApi.uploadImage(id, dataUrl)
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
