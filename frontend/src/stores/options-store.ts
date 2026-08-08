import { create } from 'zustand'
import { storyOptionsApi, type StoryOption } from '@/services/options'
import type { OptionType } from '@/types/story'

export function optionCacheKey(type: OptionType, fandoms?: string[]): string {
  if (fandoms === undefined) return type
  return `${type}::${fandoms.length > 0 ? fandoms.join('|') : 'general'}`
}

interface OptionsState {
  options: Record<string, StoryOption[]>
  loading: Record<string, boolean>

  loadOptions: (type: OptionType, fandoms?: string[]) => Promise<void>
  addOption: (type: OptionType, value: string, label: string, fandoms?: string[]) => Promise<StoryOption>
  removeOption: (type: OptionType, id: string) => Promise<void>
  getOptions: (type: OptionType) => StoryOption[]
}

export const useOptionsStore = create<OptionsState>()((set, get) => ({
  options: {},
  loading: {},

  loadOptions: async (type: OptionType, fandoms?: string[]) => {
    const key = optionCacheKey(type, fandoms)
    if (get().loading[key] || get().options[key]) return
    set((s) => ({ loading: { ...s.loading, [key]: true } }))
    try {
      const options = await storyOptionsApi.list(type, fandoms)
      set((s) => ({
        options: { ...s.options, [key]: options },
        loading: { ...s.loading, [key]: false },
      }))
    } catch {
      set((s) => ({ loading: { ...s.loading, [key]: false } }))
    }
  },

  addOption: async (type: OptionType, value: string, label: string, fandoms?: string[]) => {
    const option = await storyOptionsApi.create(type, value, label, fandoms)
    set((s) => {
      const key = optionCacheKey(type, fandoms)
      const current = s.options[key] ?? []
      if (current.some((o) => o.value === option.value)) return {}
      return {
        options: {
          ...s.options,
          [key]: [...current, option],
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
