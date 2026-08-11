import { create } from 'zustand'
import type { Diagram, DiagramInput, DiagramType } from '@/types/diagram'
import { diagramsApi } from '@/services/diagrams'
import { useToastStore } from './toast-store'
import i18n from '@/i18n'

interface DiagramsState {
  diagrams: Diagram[]
  isLoading: boolean
  error: string | null

  load: (projectId: string) => Promise<void>
  create: (projectId: string, data: DiagramInput) => Promise<Diagram | null>
  generate: (projectId: string, type: Extract<DiagramType, 'familyTree' | 'relationships'>) => Promise<Diagram | null>
  saveLayout: (id: string, layout: Diagram['layout']) => Promise<Diagram | null>
  rename: (id: string, name: string) => Promise<Diagram | null>
  remove: (id: string) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

export const useDiagramsStore = create<DiagramsState>()((set, get) => ({
  diagrams: [],
  isLoading: false,
  error: null,

  async load(projectId: string) {
    set({ isLoading: true, error: null })
    try {
      const diagrams = await diagramsApi.list(projectId)
      set({ diagrams, isLoading: false })
    } catch (err: unknown) {
      set({ error: getErrorMessage(err), isLoading: false })
    }
  },

  async create(projectId: string, data: DiagramInput) {
    try {
      const diagram = await diagramsApi.create(projectId, data)
      set({ diagrams: [...get().diagrams, diagram] })
      return diagram
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async generate(projectId: string, type: Extract<DiagramType, 'familyTree' | 'relationships'>) {
    try {
      const diagram = await diagramsApi.generate(projectId, type)
      set({ diagrams: [...get().diagrams, diagram] })
      return diagram
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async saveLayout(id: string, layout: Diagram['layout']) {
    try {
      const updated = await diagramsApi.update(id, { layout })
      set({ diagrams: get().diagrams.map((d) => (d.id === id ? updated : d)) })
      return updated
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async rename(id: string, name: string) {
    try {
      const updated = await diagramsApi.update(id, { name })
      set({ diagrams: get().diagrams.map((d) => (d.id === id ? updated : d)) })
      return updated
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async remove(id: string) {
    try {
      await diagramsApi.delete(id)
      set({ diagrams: get().diagrams.filter((d) => d.id !== id) })
      useToastStore.getState().success(i18n.t('diagramApp.deleted'))
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },
}))
