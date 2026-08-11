import type { CharacterOptionGroup, CharacterOptionRow, CharacterOptionType } from '@/types/character'

const API = '/api'

export const characterOptionsApi = {
  listGrouped: async (): Promise<CharacterOptionGroup[]> => {
    const res = await fetch(`${API}/character-options`, { credentials: 'include' })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    return res.json()
  },

  listByType: async (type: CharacterOptionType): Promise<CharacterOptionRow[]> => {
    const res = await fetch(`${API}/character-options?type=${type}`, { credentials: 'include' })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    return res.json()
  },
}
