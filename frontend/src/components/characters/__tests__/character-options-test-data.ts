import type { CharacterOptionGroup, CharacterOptionType } from '@/types/character'

export const TEST_CHARACTER_OPTIONS: CharacterOptionGroup[] = [
  { type: 'gender', options: [
    { id: 'co-g1', type: 'gender', value: 'Femenino', label: 'Femenino', labelEn: 'Female', sortOrder: 1, isDefault: true },
    { id: 'co-g2', type: 'gender', value: 'Masculino', label: 'Masculino', labelEn: 'Male', sortOrder: 2, isDefault: true },
  ] },
  { type: 'orientation', options: [
    { id: 'co-o1', type: 'orientation', value: 'Heterosexual', label: 'Heterosexual', labelEn: 'Heterosexual', sortOrder: 1, isDefault: true },
  ] },
  { type: 'maritalStatus', options: [
    { id: 'co-m1', type: 'maritalStatus', value: 'Soltero/a', label: 'Soltero/a', labelEn: 'Single', sortOrder: 1, isDefault: true },
  ] },
  { type: 'role', options: [
    { id: 'co-r1', type: 'role', value: 'Principal', label: 'Principal', labelEn: 'Main', sortOrder: 1, isDefault: true },
    { id: 'co-r2', type: 'role', value: 'Secundario', label: 'Secundario', labelEn: 'Secondary', sortOrder: 2, isDefault: true },
  ] },
]

export function getTestOptions(type: CharacterOptionType): { value: string; label: string; labelEn: string | null }[] {
  return TEST_CHARACTER_OPTIONS.find((g) => g.type === type)?.options ?? []
}
