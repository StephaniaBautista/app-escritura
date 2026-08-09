import type { Character } from '@/types/character'

export interface CharacterFiltersState {
  query: string
  role: string
  gender: string
  orientation: string
  maritalStatus: string
  species: string
  height: string
}

export const EMPTY_FILTERS: CharacterFiltersState = {
  query: '', role: '', gender: '', orientation: '', maritalStatus: '', species: '', height: '',
}

export const HEIGHT_RANGES = [
  { id: 'short', min: 0, max: 150 },
  { id: 'medium', min: 150, max: 170 },
  { id: 'tall', min: 170, max: 185 },
  { id: 'veryTall', min: 185, max: 9999 },
]

export function filterCharacters(characters: Character[], f: CharacterFiltersState): Character[] {
  const q = f.query.trim().toLowerCase()
  return characters.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false
    if (f.role && c.role !== f.role) return false
    if (f.gender && c.gender !== f.gender) return false
    if (f.orientation && c.orientation !== f.orientation) return false
    if (f.maritalStatus && c.maritalStatus !== f.maritalStatus) return false
    if (f.species && c.species !== f.species) return false
    if (f.height) {
      const range = HEIGHT_RANGES.find((r) => r.id === f.height)
      if (range) {
        const h = c.heightCm ?? 0
        if (h < range.min || h >= range.max) return false
      }
    }
    return true
  })
}
