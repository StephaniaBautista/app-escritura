export interface EvolutionCharacterRef {
  id: string
  evolvesFromId: string | null
}

export interface EvolutionEventRef {
  id: string
  date: string | null
  characterIds: string[]
}

export function evolutionRootId(
  characterId: string,
  byId: Map<string, EvolutionCharacterRef>,
): string {
  let current = characterId
  const seen = new Set<string>()
  while (true) {
    if (seen.has(current)) return current
    seen.add(current)
    const row = byId.get(current)
    if (!row?.evolvesFromId) return current
    current = row.evolvesFromId
  }
}

export function principalAppearedBefore(
  principalId: string,
  events: EvolutionEventRef[],
  currentEventId: string | null,
  currentMinutes: number | null,
  parseDate: (date: string | null) => number | null,
): boolean {
  if (currentMinutes === null) return false
  for (const event of events) {
    if (currentEventId && event.id === currentEventId) continue
    const minutes = parseDate(event.date)
    if (minutes === null || minutes >= currentMinutes) continue
    if (event.characterIds.includes(principalId)) return true
  }
  return false
}

export function isTimelineEvolutionLocked(
  character: EvolutionCharacterRef,
  characters: EvolutionCharacterRef[],
  events: EvolutionEventRef[],
  currentEventId: string | null,
  currentMinutes: number | null,
  parseDate: (date: string | null) => number | null,
): boolean {
  if (!character.evolvesFromId) return false
  const byId = new Map(characters.map((item) => [item.id, item]))
  const rootId = evolutionRootId(character.id, byId)
  if (rootId === character.id) return false
  return !principalAppearedBefore(rootId, events, currentEventId, currentMinutes, parseDate)
}

export function allowTimelineCharacterIds(
  selectedIds: string[],
  characters: EvolutionCharacterRef[],
  events: EvolutionEventRef[],
  currentEventId: string | null,
  currentMinutes: number | null,
  parseDate: (date: string | null) => number | null,
): string[] {
  const byId = new Map(characters.map((item) => [item.id, item]))
  return selectedIds.filter((id) => {
    const character = byId.get(id)
    if (!character) return false
    return !isTimelineEvolutionLocked(character, characters, events, currentEventId, currentMinutes, parseDate)
  })
}
