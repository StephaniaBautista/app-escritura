export const NEW_GROUP_OPTION = '__new__'

export type TimelineLaneKind = 'group' | 'subplot'

export interface TimelineLaneEvent {
  subplotId: string | null
  groupName: string | null
}

export interface TimelineLaneSubplot {
  id: string
  title: string
  color: string | null
  order: number
}

export interface TimelineLane<T> {
  key: string
  name: string
  kind: TimelineLaneKind
  color: string | null
  items: T[]
}

export function collectEventGroupNames(events: ReadonlyArray<{ groupName: string | null }>): string[] {
  const names = new Set<string>()
  for (const event of events) {
    const trimmed = event.groupName?.trim()
    if (trimmed) names.add(trimmed)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

export function normalizeGroupName(name: string | null | undefined): string | null {
  const trimmed = name?.trim()
  return trimmed ? trimmed.slice(0, 100) : null
}

export function groupEventsByLane<T>(
  items: readonly T[],
  eventOf: (item: T) => TimelineLaneEvent,
  subplots: readonly TimelineLaneSubplot[],
  labels: { general: string; unknownSubplot: string },
  fallbackColor: string,
): TimelineLane<T>[] {
  const subplotById = new Map(subplots.map((subplot) => [subplot.id, subplot]))
  const lanes = new Map<string, TimelineLane<T>>()

  for (const item of items) {
    const event = eventOf(item)
    const lane = laneForEvent(event, subplotById, labels, fallbackColor)
    const existing = lanes.get(lane.key)
    if (existing) existing.items.push(item)
    else lanes.set(lane.key, { ...lane, items: [item] })
  }

  return [...lanes.values()].sort((a, b) => compareLanes(a, b, subplotById))
}

function laneForEvent(
  event: TimelineLaneEvent,
  subplotById: Map<string, TimelineLaneSubplot>,
  labels: { general: string; unknownSubplot: string },
  fallbackColor: string,
): Omit<TimelineLane<never>, 'items'> {
  if (event.subplotId) {
    const subplot = subplotById.get(event.subplotId)
    return {
      key: `subplot:${event.subplotId}`,
      name: subplot?.title ?? labels.unknownSubplot,
      kind: 'subplot',
      color: subplot?.color ?? fallbackColor,
    }
  }
  const trimmed = event.groupName?.trim() ?? ''
  return {
    key: `group:${trimmed}`,
    name: trimmed || labels.general,
    kind: 'group',
    color: null,
  }
}

function compareLanes(
  a: Omit<TimelineLane<unknown>, 'items'>,
  b: Omit<TimelineLane<unknown>, 'items'>,
  subplotById: Map<string, TimelineLaneSubplot>,
): number {
  if (a.kind !== b.kind) return a.kind === 'group' ? -1 : 1
  if (a.kind === 'group') {
    const aGeneral = a.key === 'group:'
    const bGeneral = b.key === 'group:'
    if (aGeneral !== bGeneral) return aGeneral ? 1 : -1
    return a.name.localeCompare(b.name)
  }
  const aId = a.key.slice('subplot:'.length)
  const bId = b.key.slice('subplot:'.length)
  const aOrder = subplotById.get(aId)?.order ?? Number.MAX_SAFE_INTEGER
  const bOrder = subplotById.get(bId)?.order ?? Number.MAX_SAFE_INTEGER
  if (aOrder !== bOrder) return aOrder - bOrder
  return a.name.localeCompare(b.name)
}
