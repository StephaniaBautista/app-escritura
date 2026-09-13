import { create } from 'zustand'
import type { Character, CharacterInput } from '@/types/character'
import { charactersApi } from '@/services/characters'
import { useToastStore } from './toast-store'
import i18n from '@/i18n'

export interface CharacterCreateBatch {
  created: Character[]
  skipped: string[]
  failed: string[]
}

interface CharactersState {
  characters: Character[]
  isLoading: boolean
  error: string | null

  load: (projectId: string) => Promise<void>
  create: (projectId: string, data: CharacterInput) => Promise<Character | null>
  createMany: (projectId: string, inputs: CharacterInput[]) => Promise<CharacterCreateBatch>
  update: (id: string, data: CharacterInput) => Promise<Character | null>
  remove: (id: string) => Promise<void>
  evolve: (id: string, reason: string, changes: CharacterInput) => Promise<Character>
  setEvolutionReason: (id: string, reason: string) => Promise<void>
  uploadImage: (id: string, dataUrl: string) => Promise<void>
  deleteImage: (id: string) => Promise<void>
  uploadHeightMapImage: (id: string, dataUrl: string) => Promise<void>
  deleteHeightMapImage: (id: string) => Promise<void>
  syncBackgroundImages: (id: string, keepUrls: string[], dataUrls: string[]) => Promise<Character | null>
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

  async createMany(projectId: string, inputs: CharacterInput[]) {
    const held = new Set(get().characters.map((character) => character.name.trim().toLocaleLowerCase()))
    const created: Character[] = []
    const skipped: string[] = []
    const failed: string[] = []
    for (const input of inputs) {
      const name = input.name?.trim() ?? ''
      const key = name.toLocaleLowerCase()
      if (!key || held.has(key)) {
        skipped.push(name || key)
        continue
      }
      try {
        const character = await charactersApi.create(projectId, input)
        created.push(character)
        held.add(key)
      } catch {
        failed.push(name)
      }
    }
    if (created.length) {
      set({ characters: [...get().characters, ...created].sort((a, b) => a.name.localeCompare(b.name)) })
    }
    return { created, skipped, failed }
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
    const evolved = await charactersApi.evolve(id, reason, changes)
    set({ characters: [...get().characters, evolved].sort((a, b) => a.name.localeCompare(b.name)) })
    return evolved
  },

  async setEvolutionReason(id: string, reason: string) {
    const updated = await charactersApi.setEvolutionReason(id, reason)
    set({ characters: get().characters.map((c) => (c.id === id ? updated : c)) })
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

  async uploadHeightMapImage(id: string, dataUrl: string) {
    try {
      const updated = await charactersApi.uploadHeightMapImage(id, dataUrl)
      set({ characters: get().characters.map((c) => (c.id === id ? updated : c)) })
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },

  async deleteHeightMapImage(id: string) {
    try {
      const updated = await charactersApi.deleteHeightMapImage(id)
      set({ characters: get().characters.map((c) => (c.id === id ? updated : c)) })
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },

  async syncBackgroundImages(id: string, keepUrls: string[], dataUrls: string[]) {
    try {
      const updated = await charactersApi.syncBackgroundImages(id, keepUrls, dataUrls)
      set({ characters: get().characters.map((c) => (c.id === id ? updated : c)) })
      return updated
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },
}))
