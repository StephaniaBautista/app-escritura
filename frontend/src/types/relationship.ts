export const RELATIONSHIP_TYPES = ['romance', 'friendship', 'enemity', 'family', 'custom'] as const
export type RelationshipType = typeof RELATIONSHIP_TYPES[number]

export interface RelationshipCharacterRef {
  id: string
  name: string
  imageUrl: string | null
  heightCm: number | null
}

export interface CharacterRelationship {
  id: string
  projectId: string
  characterAId: string
  characterBId: string
  type: RelationshipType
  label: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  characterA: RelationshipCharacterRef
  characterB: RelationshipCharacterRef
}

export interface RelationshipInput {
  characterAId?: string
  characterBId?: string
  type?: RelationshipType
  label?: string | null
  description?: string | null
}

export function isSelfRelation(relation: CharacterRelationship, characterId: string): boolean {
  return relation.characterAId === characterId || relation.characterBId === characterId
}

export function otherParty(relation: CharacterRelationship, characterId: string): RelationshipCharacterRef {
  return relation.characterAId === characterId ? relation.characterB : relation.characterA
}

export function relationshipLabel(
  type: RelationshipType,
  label: string | null,
  t: (key: string) => string,
): string {
  if ((type === 'family' || type === 'custom') && label && label.trim()) return label
  return t(`characterApp.relType_${type}`)
}
