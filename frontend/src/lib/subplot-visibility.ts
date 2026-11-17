import type { Subplot } from '@/types/structure'

export const SUBPLOT_LAYER_COLOR = 'var(--color-accent-violet)'

export interface SubplotLinked {
  subplotId: string | null
}

export function isSubplotVisible(subplotId: string | null | undefined, hiddenIds: readonly string[]): boolean {
  if (!subplotId) return true
  return !hiddenIds.includes(subplotId)
}

export function filterVisibleSubplotItems<T extends SubplotLinked>(items: readonly T[], hiddenIds: readonly string[]): T[] {
  return items.filter((item) => isSubplotVisible(item.subplotId, hiddenIds))
}

export function toggleHiddenSubplot(hiddenIds: readonly string[], subplotId: string): string[] {
  return hiddenIds.includes(subplotId)
    ? hiddenIds.filter((id) => id !== subplotId)
    : [...hiddenIds, subplotId]
}

export function subplotLayerColor(subplot: Pick<Subplot, 'color'> | null | undefined): string {
  return subplot?.color ?? SUBPLOT_LAYER_COLOR
}

export function countVisibleSubplots(subplots: readonly Pick<Subplot, 'id'>[], hiddenIds: readonly string[]): number {
  return subplots.filter((subplot) => !hiddenIds.includes(subplot.id)).length
}
