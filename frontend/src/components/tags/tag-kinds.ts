import type { TFunction } from 'i18next'
import type { TagKind } from '@/services/tags'

export const TAG_KIND_ORDER: TagKind[] = [
  'rating',
  'warning',
  'category',
  'fandom',
  'relationship',
  'character',
  'freeform',
]

export function tagKindLabel(t: TFunction, kind: TagKind): string {
  return t(`tagsApp.kinds.${kind}`)
}
