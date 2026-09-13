import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  CircleCheck,
  Crown,
  Flag,
  Heart,
  Home,
  MapPin,
  Skull,
  Sparkles,
  Star,
  Swords,
  Zap,
} from 'lucide-react'
import type { TimelinePrecision } from '@/types/timeline'

export const PALETTE = [
  '#ab152b',
  '#2d6b6b',
  '#6b2d6b',
  '#b45309',
  '#2d5f8a',
  '#4d7c0f',
  '#84cc16',
  '#0891b2',
  '#7c3aed',
  '#db2777',
  '#78716c',
  '#1f2937',
] as const

export const DEFAULT_ERA_COLOR = PALETTE[1]
export const DEFAULT_LABEL_COLOR = PALETTE[6]

export const EVENT_ICONS: Record<string, LucideIcon> = {
  pin: MapPin,
  check: CircleCheck,
  star: Star,
  flag: Flag,
  heart: Heart,
  skull: Skull,
  swords: Swords,
  crown: Crown,
  book: BookOpen,
  sparkles: Sparkles,
  home: Home,
  zap: Zap,
}

export const DEFAULT_EVENT_ICON = 'pin'

export const EVENT_PRECISIONS: { value: TimelinePrecision; labelKey: string }[] = [
  { value: 'year', labelKey: 'precisionYear' },
  { value: 'month', labelKey: 'precisionMonth' },
  { value: 'day', labelKey: 'precisionAll' },
  { value: 'minute', labelKey: 'precisionMinute' },
]

export const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const

export const ROLLOVER_OPTIONS = [
  { value: 'newYear', titleKey: 'rolloverNewYear', descKey: 'rolloverNewYearDesc' },
  { value: 'afterYear', titleKey: 'rolloverAfterYear', descKey: 'rolloverAfterYearDesc' },
] as const

export function isPrecision(value: string | null | undefined): value is TimelinePrecision {
  return value === 'year' || value === 'month' || value === 'day' || value === 'minute'
}
