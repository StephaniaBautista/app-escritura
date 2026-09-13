export const NEW_GROUP_OPTION = '__new__'

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
