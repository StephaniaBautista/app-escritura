export const MAP_COLOR_TOKENS = [
  '--color-ink',
  '--color-accent',
  '--color-accent-teal',
  '--color-accent-violet',
  '--color-paper-margin',
  '--color-ink-light',
  '--color-paper',
] as const

export const MAP_STROKE_WIDTHS = [2, 4, 8, 14] as const

export function readCssColor(token: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return value || fallback
}
