import { create } from 'zustand'
import type { CharacterRelationship, RelationshipInput } from '@/types/relationship'
import { relationshipsApi } from '@/services/relationships'
import { useToastStore } from './toast-store'
import i18n from '@/i18n'

interface RelationshipsState {
  relations: CharacterRelationship[]
  isLoading: boolean
  error: string | null

  load: (projectId: string) => Promise<void>
  create: (projectId: string, data: RelationshipInput) => Promise<CharacterRelationship | null>
  update: (id: string, data: RelationshipInput) => Promise<CharacterRelationship | null>
  remove: (id: string) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

export const useRelationshipsStore = create<RelationshipsState>()((set, get) => ({
  relations: [],
  isLoading: false,
  error: null,

  async load(projectId: string) {
    set({ isLoading: true, error: null })
    try {
      const relations = await relationshipsApi.list(projectId)
      set({ relations, isLoading: false })
    } catch (err: unknown) {
      set({ error: getErrorMessage(err), isLoading: false })
    }
  },

  async create(projectId: string, data: RelationshipInput) {
    try {
      const relation = await relationshipsApi.create(projectId, data)
      set({ relations: [...get().relations, relation] })
      return relation
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async update(id: string, data: RelationshipInput) {
    try {
      const updated = await relationshipsApi.update(id, data)
      set({ relations: get().relations.map((r) => (r.id === id ? updated : r)) })
      return updated
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async remove(id: string) {
    try {
      await relationshipsApi.delete(id)
      set({ relations: get().relations.filter((r) => r.id !== id) })
      useToastStore.getState().success(i18n.t('characterApp.relRemoved'))
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },
}))
