export const FAMILY_TREE_UNKNOWN_PARENT_PREFIX = '__unknown-partner-'

export interface FamilyCharacterRef {
  id: string
  parentIds: string[]
}

export interface FamilyRelationRef {
  characterAId: string
  characterBId: string
  type: string
  label?: string | null
}
