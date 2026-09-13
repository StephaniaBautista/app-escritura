import type { TimelineEra, TimelineEraInput, TimelineEvent, TimelineEventInput } from '@/types/timeline'
import type { AiTimelineEraFill, AiTimelineEventFill } from '@/types/ai'

function blank(value: string | null | undefined): boolean {
  return !value || !value.trim()
}

export function sameTimelineKey(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase()
}

export function uniqueNewEras(fills: AiTimelineEraFill[], existingNames: string[]): AiTimelineEraFill[] {
  const held = new Set(existingNames.map((name) => name.trim().toLocaleLowerCase()).filter(Boolean))
  const seen = new Set<string>()
  return fills.filter((fill) => {
    const key = fill.name.trim().toLocaleLowerCase()
    if (!key || held.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function uniqueNewEvents(fills: AiTimelineEventFill[], existingTitles: string[]): AiTimelineEventFill[] {
  const held = new Set(existingTitles.map((title) => title.trim().toLocaleLowerCase()).filter(Boolean))
  const seen = new Set<string>()
  return fills.filter((fill) => {
    const key = fill.title.trim().toLocaleLowerCase()
    if (!key || held.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function eraFillToInput(fill: AiTimelineEraFill): TimelineEraInput {
  return {
    name: fill.name.trim(),
    ...(fill.startDate ? { startDate: fill.startDate } : {}),
    ...(fill.endDate ? { endDate: fill.endDate } : {}),
    ...(fill.precision ? { precision: fill.precision } : {}),
    ...(fill.rollover ? { rollover: fill.rollover } : {}),
  }
}

export function eraPatchFromFill(era: TimelineEra, fill: AiTimelineEraFill): TimelineEraInput | null {
  const data: TimelineEraInput = {}
  if (blank(era.startDate) && fill.startDate?.trim()) data.startDate = fill.startDate.trim()
  if (blank(era.endDate) && fill.endDate?.trim()) data.endDate = fill.endDate.trim()
  return Object.keys(data).length ? data : null
}

export function matchCharacterIds(names: string[] | undefined, characters: { id: string; name: string }[]): string[] {
  if (!names?.length) return []
  const ids: string[] = []
  const seen = new Set<string>()
  for (const name of names) {
    const match = characters.find((character) => sameTimelineKey(character.name, name))
    if (!match || seen.has(match.id)) continue
    seen.add(match.id)
    ids.push(match.id)
  }
  return ids
}

export function eventFillToInput(
  fill: AiTimelineEventFill,
  eraId: string | null,
  characterIds: string[],
): TimelineEventInput {
  return {
    title: fill.title.trim(),
    ...(fill.description ? { description: fill.description } : {}),
    ...(fill.date ? { date: fill.date } : {}),
    ...(fill.endDate ? { endDate: fill.endDate } : {}),
    ...(fill.precision ? { precision: fill.precision as TimelineEventInput['precision'] } : {}),
    ...(fill.order !== undefined ? { order: fill.order } : {}),
    eraId,
    ...(characterIds.length ? { characterIds } : {}),
  }
}

export function eventPatchFromFill(
  event: TimelineEvent,
  fill: AiTimelineEventFill,
  eraId: string | null | undefined,
  characterIds: string[],
): TimelineEventInput | null {
  const data: TimelineEventInput = {}
  if (blank(event.description) && fill.description?.trim()) data.description = fill.description.trim()
  if (blank(event.date) && fill.date?.trim()) data.date = fill.date.trim()
  if (blank(event.endDate) && fill.endDate?.trim()) data.endDate = fill.endDate.trim()
  if (!event.eraId && eraId) data.eraId = eraId
  if ((!event.characterIds || event.characterIds.length === 0) && characterIds.length) data.characterIds = characterIds
  return Object.keys(data).length ? data : null
}

export interface TimelinePersistWriter {
  createEra: (projectId: string, data: TimelineEraInput) => Promise<TimelineEra>
  updateEra: (id: string, data: TimelineEraInput) => Promise<TimelineEra>
  create: (projectId: string, data: TimelineEventInput) => Promise<TimelineEvent>
  update: (id: string, data: TimelineEventInput) => Promise<TimelineEvent>
}

export interface TimelinePersistResult {
  createdEras: number
  createdEvents: number
  updated: number
  failed: number
  skipped: number
}

export async function persistTimelineFills(
  projectId: string,
  fills: { eras: AiTimelineEraFill[]; events: AiTimelineEventFill[] },
  existing: { eras: TimelineEra[]; events: TimelineEvent[] },
  characters: { id: string; name: string }[],
  writer: TimelinePersistWriter,
): Promise<TimelinePersistResult> {
  const result: TimelinePersistResult = { createdEras: 0, createdEvents: 0, updated: 0, failed: 0, skipped: 0 }
  const eraIds = new Map(existing.eras.map((era) => [era.name.trim().toLocaleLowerCase(), era.id]))

  for (const fill of uniqueNewEras(fills.eras, existing.eras.map((era) => era.name))) {
    try {
      const saved = await writer.createEra(projectId, eraFillToInput(fill))
      eraIds.set(saved.name.trim().toLocaleLowerCase(), saved.id)
      result.createdEras += 1
    } catch {
      result.failed += 1
    }
  }
  for (const fill of fills.eras) {
    const era = existing.eras.find((row) => sameTimelineKey(row.name, fill.name))
    if (!era) continue
    const patch = eraPatchFromFill(era, fill)
    if (!patch) {
      result.skipped += 1
      continue
    }
    try {
      await writer.updateEra(era.id, patch)
      result.updated += 1
    } catch {
      result.failed += 1
    }
  }

  const resolveEraId = (eraName?: string) => eraName ? eraIds.get(eraName.trim().toLocaleLowerCase()) ?? null : null

  for (const fill of uniqueNewEvents(fills.events, existing.events.map((event) => event.title))) {
    try {
      await writer.create(projectId, eventFillToInput(fill, resolveEraId(fill.eraName), matchCharacterIds(fill.characterNames, characters)))
      result.createdEvents += 1
    } catch {
      result.failed += 1
    }
  }
  for (const fill of fills.events) {
    const event = existing.events.find((row) => sameTimelineKey(row.title, fill.title))
    if (!event) continue
    const patch = eventPatchFromFill(event, fill, resolveEraId(fill.eraName), matchCharacterIds(fill.characterNames, characters))
    if (!patch) {
      result.skipped += 1
      continue
    }
    try {
      await writer.update(event.id, patch)
      result.updated += 1
    } catch {
      result.failed += 1
    }
  }
  return result
}
