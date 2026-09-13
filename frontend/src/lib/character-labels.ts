export interface CharacterLabelRef {
  id: string
  name: string
  evolvesFromId: string | null
}

type LabelTranslate = (key: string, options?: { name: string }) => string

export function characterOptionLabel(
  candidate: CharacterLabelRef,
  all: CharacterLabelRef[],
  t: LabelTranslate,
): string {
  if (candidate.evolvesFromId) {
    const source = all.find((item) => item.id === candidate.evolvesFromId)
    const suffix = source
      ? t('characterApp.relEvolutionOf', { name: source.name })
      : t('characterApp.evolutions')
    return `${candidate.name} (${suffix})`
  }
  const sameName = all.filter((item) => item.name === candidate.name).length
  if (sameName > 1) {
    return `${candidate.name} (${t('characterApp.relVersionOriginal')})`
  }
  return candidate.name
}
