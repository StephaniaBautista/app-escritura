import { create } from 'zustand'
import { storyOptionsApi, type StoryOption } from '@/services/options'
import type { OptionType } from '@/types/story'

interface OptionsState {
  options: Record<string, StoryOption[]>
  loading: Record<string, boolean>

  loadOptions: (type: OptionType) => Promise<void>
  addOption: (type: OptionType, value: string, label: string) => Promise<StoryOption>
  removeOption: (type: OptionType, id: string) => Promise<void>
  getOptions: (type: OptionType) => StoryOption[]
}

export const useOptionsStore = create<OptionsState>()((set, get) => ({
  options: {},
  loading: {},

  loadOptions: async (type: OptionType) => {
    if (get().loading[type]) return
    set((s) => ({ loading: { ...s.loading, [type]: true } }))
    try {
      const options = await storyOptionsApi.list(type)
      set((s) => ({
        options: { ...s.options, [type]: options },
        loading: { ...s.loading, [type]: false },
      }))
    } catch {
      set((s) => ({ loading: { ...s.loading, [type]: false } }))
    }
  },

  addOption: async (type: OptionType, value: string, label: string) => {
    const option = await storyOptionsApi.create(type, value, label)
    set((s) => {
      const current = s.options[type] ?? []
      if (current.some((o) => o.value === option.value)) return {}
      return {
        options: {
          ...s.options,
          [type]: [...current, option],
        },
      }
    })
    return option
  },

  removeOption: async (type: OptionType, id: string) => {
    await storyOptionsApi.delete(id)
    set((s) => ({
      options: {
        ...s.options,
        [type]: (s.options[type] ?? []).filter((o) => o.id !== id),
      },
    }))
  },

  getOptions: (type: OptionType) => {
    return get().options[type] ?? []
  },
}))
