import type { StructureBoard, StructureCard, StructureColumn } from '@/types/structure'

export type ColumnPhase = 'beginning' | 'development' | 'climax' | 'ending'

const PHASE_PATTERNS: Record<ColumnPhase, RegExp[]> = {
  beginning: [/inicio/i, /beginning/i, /acto\s*i\b/i, /setup/i, /expos/i],
  development: [/desarrollo/i, /development/i, /acto\s*ii\b/i, /rising/i, /confront/i],
  climax: [/cl[ií]max/i, /climax/i, /acto\s*iii\b/i, /crisis/i],
  ending: [/conclus/i, /ending/i, /final/i, /acto\s*iv\b/i, /resoluc/i, /denouement/i],
}

export function resolveColumnForPhase(columns: StructureColumn[], phase: ColumnPhase): StructureColumn | null {
  if (!columns.length) return null
  const patterns = PHASE_PATTERNS[phase]
  const byName = columns.find((column) => patterns.some((pattern) => pattern.test(column.name)))
  if (byName) return byName
  const indexMap: Record<ColumnPhase, number> = {
    beginning: 0,
    development: 1,
    climax: 2,
    ending: 3,
  }
  const index = indexMap[phase]
  return columns[index] ?? columns[columns.length - 1] ?? null
}

export function findCardByChapterId(board: StructureBoard, chapterId: string): StructureCard | null {
  for (const column of board.columns ?? []) {
    const card = (column.cards ?? []).find((item) => item.referenceId === chapterId)
    if (card) return card
  }
  return null
}

export function linkedChapterIds(board: StructureBoard): Set<string> {
  const ids = new Set<string>()
  for (const column of board.columns ?? []) {
    for (const card of column.cards ?? []) {
      if (card.referenceId) ids.add(card.referenceId)
    }
  }
  return ids
}

export function countUnlinkedChapters(board: StructureBoard, chapterIds: string[]): number {
  const linked = linkedChapterIds(board)
  return chapterIds.filter((id) => !linked.has(id)).length
}
