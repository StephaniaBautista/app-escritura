export function mergeUniqueTags(existing: string[], incoming: string[]): string[] {
  const merged: string[] = []
  const seen = new Set<string>()
  for (const raw of [...existing, ...incoming]) {
    const tag = raw.trim()
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(tag)
  }
  return merged
}
