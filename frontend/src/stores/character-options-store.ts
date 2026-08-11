import { create } from 'zustand'
import { characterOptionsApi } from '@/services/character-options'
import type { CharacterOptionGroup, CharacterOptionRow, CharacterOptionType } from '@/types/character'

interface CharacterOptionsState {
  groups: CharacterOptionGroup[]
  loaded: boolean
  loading: boolean

  load: () => Promise<void>
  getOptions: (type: CharacterOptionType) => CharacterOptionRow[]
}

export const useCharacterOptionsStore = create<CharacterOptionsState>()((set, get) => ({
  groups: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading || get().loaded) return
    set({ loading: true })
    try {
      const groups = await characterOptionsApi.listGrouped()
      set({ groups, loaded: true })
    } catch {
      set({ loaded: true })
    } finally {
      set({ loading: false })
    }
  },

  getOptions: (type: CharacterOptionType) => {
    return get().groups.find((g) => g.type === type)?.options ?? []
  },
}))
