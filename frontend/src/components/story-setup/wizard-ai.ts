import type { Document, DocumentNode } from '@/types/document'
import type { StoryMeta } from '@/types/story'
import { countWritingWords } from '@/components/editor/word-count'
import { allWizardStructurePromptsFilled } from '@/lib/structure-prompts'

function blank(value: unknown): boolean {
  return typeof value !== 'string' || !value.trim()
}

function isRomanceOrFanfic(meta: StoryMeta): boolean {
  if (meta.isFanfic) return true
  return (meta.type ?? []).some((type) => type.toLowerCase() === 'romance')
}

function structureFilled(meta: StoryMeta): boolean {
  return allWizardStructurePromptsFilled(meta.structure?.sections)
}

export function wizardGaps(description: string | null | undefined, meta: StoryMeta): string[] {
  const gaps: string[] = []
  if (blank(description)) gaps.push('description')
  if (!meta.rating) gaps.push('rating')
  if (!meta.type?.length) gaps.push('type')
  if (typeof meta.isFanfic !== 'boolean') gaps.push('isFanfic')
  if (meta.isFanfic === true && !meta.fandoms?.length) gaps.push('fandoms')
  if (meta.isFanfic === true && !meta.categories?.length) gaps.push('categories')
  if (isRomanceOrFanfic(meta) && !meta.ships?.length) gaps.push('ships')
  if (!(meta.characters ?? []).some((character) => character.name.trim())) gaps.push('characters')
  if (!meta.tags?.length) gaps.push('tags')
  if (blank(meta.narrator)) gaps.push('narrator')
  if (blank(meta.ending)) gaps.push('ending')
  if (blank(meta.worldContext)) gaps.push('worldContext')
  if (blank(meta.initialSituation)) gaps.push('initialSituation')
  if (blank(meta.centralTheme)) gaps.push('centralTheme')
  if (blank(meta.problems)) gaps.push('problems')
  if (blank(meta.protagonistLife)) gaps.push('protagonistLife')
  if (blank(meta.protagonistEvolution)) gaps.push('protagonistEvolution')
  if (!structureFilled(meta)) gaps.push('structure')
  return gaps
}

export function isWizardIncomplete(description: string | null | undefined, meta: StoryMeta): boolean {
  return wizardGaps(description, meta).length > 0
}

function tiptapWordCount(content: unknown): number {
  const texts: string[] = []
  const pending: unknown[] = [content]
  const visited = new WeakSet<object>()
  while (pending.length) {
    const value = pending.pop()
    if (!value || typeof value !== 'object' || visited.has(value)) continue
    visited.add(value)
    const node = value as Record<string, unknown>
    if (typeof node.text === 'string') texts.push(node.text)
    if (Array.isArray(node.content)) {
      for (const child of node.content) pending.push(child)
    }
  }
  return countWritingWords(texts.join(' '))
}

export function hasLocalWrittenDocuments(
  projectId: string,
  tree: DocumentNode[],
  current: Document | null,
): boolean {
  if (tree.length > 0) return true
  if (!current || current.projectId !== projectId) return false
  return tiptapWordCount(current.content) > 0
}
