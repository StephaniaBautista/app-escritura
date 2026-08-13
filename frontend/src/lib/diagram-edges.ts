import type { LineStyle, RelationshipType } from '@/types/relationship'

export const EDGE_COLORS: Record<RelationshipType, string> = {
  romance: '#ec4899',
  friendship: '#22c55e',
  enemity: '#ef4444',
  family: '#8b5cf6',
  custom: '#f59e0b',
}

export const LINE_STYLE_DASH: Record<LineStyle, string | undefined> = {
  solid: undefined,
  dashed: '8 6',
  dotted: '2 5',
}

export function edgeStroke(type: RelationshipType, lineColor: string | null | undefined): string {
  return lineColor ?? EDGE_COLORS[type]
}
