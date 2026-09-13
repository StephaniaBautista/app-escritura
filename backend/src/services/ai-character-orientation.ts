export const DEFAULT_ORIENTATIONS = ['Heterosexual', 'Homosexual', 'Bisexual', 'Pansexual', 'Asexual'] as const

const ALIASES: Record<string, (typeof DEFAULT_ORIENTATIONS)[number]> = {
  heterosexual: 'Heterosexual',
  hetero: 'Heterosexual',
  straight: 'Heterosexual',
  heterosexualidad: 'Heterosexual',
  homosexual: 'Homosexual',
  gay: 'Homosexual',
  lesbiana: 'Homosexual',
  lesbian: 'Homosexual',
  lesbiano: 'Homosexual',
  bisexual: 'Bisexual',
  bi: 'Bisexual',
  bisexualidad: 'Bisexual',
  pansexual: 'Pansexual',
  pan: 'Pansexual',
  asexual: 'Asexual',
  ace: 'Asexual',
  asexualidad: 'Asexual',
}

function fold(value: string): string {
  return value.trim().toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

export function orientationCatalog(values: string[]): string[] {
  const catalog = values.map((value) => value.trim()).filter(Boolean)
  return catalog.length ? [...new Set(catalog)] : [...DEFAULT_ORIENTATIONS]
}

export function normalizeOrientation(value: string, catalog: string[] = [...DEFAULT_ORIENTATIONS]): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 100) return null
  const options = orientationCatalog(catalog)
  const folded = fold(trimmed)
  const exact = options.find((option) => fold(option) === folded)
  if (exact) return exact
  const alias = ALIASES[folded]
  if (!alias) return null
  return options.find((option) => fold(option) === fold(alias) || fold(option) === folded) ?? alias
}
