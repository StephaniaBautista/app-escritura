import { create } from 'zustand'
import type { Character, CharacterInput } from '@/types/character'
import { charactersApi } from '@/services/characters'
import { useToastStore } from './toast-store'
import i18n from '@/i18n'

interface CharactersState {
  characters: Character[]
  isLoading: boolean
  error: string | null

  load: (projectId: string) => Promise<void>
  create: (projectId: string, data: CharacterInput) => Promise<Character | null>
  update: (id: string, data: CharacterInput) => Promise<Character | null>
  remove: (id: string) => Promise<void>
  evolve: (id: string, reason: string, changes: CharacterInput) => Promise<Character | null>
  uploadImage: (id: string, dataUrl: string) => Promise<void>
  deleteImage: (id: string) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

export const useCharactersStore = create<CharactersState>()((set, get) => ({
  characters: [],
  isLoading: false,
  error: null,

  async load(projectId: string) {
    set({ isLoading: true, error: null })
    try {
      const characters = await charactersApi.list(projectId)
      set({ characters, isLoading: false })
    } catch (err: unknown) {
      set({ error: getErrorMessage(err), isLoading: false })
    }
  },

  async create(projectId: string, data: CharacterInput) {
    try {
      const character = await charactersApi.create(projectId, data)
      set({ characters: [...get().characters, character].sort((a, b) => a.name.localeCompare(b.name)) })
      return character
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async update(id: string, data: CharacterInput) {
    try {
      const updated = await charactersApi.update(id, data)
      set({ characters: get().characters.map((c) => (c.id === id ? updated : c)) })
      return updated
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async remove(id: string) {
    try {
      await charactersApi.delete(id)
      set({ characters: get().characters.filter((c) => c.id !== id) })
      useToastStore.getState().success(i18n.t('characterApp.deleted'))
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },

  async evolve(id: string, reason: string, changes: CharacterInput) {
    try {
      const evolved = await charactersApi.evolve(id, reason, changes)
      set({ characters: [...get().characters, evolved].sort((a, b) => a.name.localeCompare(b.name)) })
      return evolved
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },

  async uploadImage(id: string, dataUrl: string) {
    try {
      const updated = await charactersApi.uploadImage(id, dataUrl)
      set({ characters: get().characters.map((c) => (c.id === id ? updated : c)) })
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },

  async deleteImage(id: string) {
    try {
      const updated = await charactersApi.deleteImage(id)
      set({ characters: get().characters.map((c) => (c.id === id ? updated : c)) })
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },
}))
