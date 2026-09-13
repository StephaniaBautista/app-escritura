import type { AiLocale } from './ai-types.js'

export const TAG_STYLE_MARKER = 'AO3-style folksonomy'

const EXAMPLES_EN = [
  'Angst', 'Fluff', 'Hurt/Comfort', 'Slow Burn', 'Enemies to Lovers', 'Friends to Lovers',
  'Found Family', 'Mutual Pining', 'Fake Dating', 'Only One Bed',
  'Dead Dove: Do Not Eat', 'Major Character Death', 'No beta we die like men',
  'Alternate Universe - Canon Divergence', 'Canon-Typical Violence', 'Emotional Hurt/Comfort',
  'Idiots in Love', 'Touch-Starved', 'Whump', 'Fix-It', 'Unreliable Narrator',
  'Morally Grey', 'Pining', 'Established Relationship',
]

const EXAMPLES_ES = [
  'Angst', 'Fluff', 'Hurt/Comfort', 'Slow Burn', 'Enemigos a amantes', 'Amigos a amantes',
  'Familia encontrada', 'Pining mutuo', 'Falsa pareja', 'Only One Bed',
  'Dead Dove: Do Not Eat', 'Muerte de personaje principal', 'Sin beta morimos como X',
  'Universo alterno', 'Violencia típica del canon', 'Idiotas enamorados',
  'Whump', 'Fix-It', 'Narrador poco fiable', 'Relación establecida',
]

const PATTERNS = `Generative additional-tag patterns (fill X from evidence, never from guesses about canon outside the excerpts):
- Misuse of X / Uso indebido de X
- Alternate Universe - X / Universo alterno - X
- No beta we die like X / Sin beta morimos como X
- X Typical Violence
- Everybody Lives / Nadie muere
- Character Study`

export function tagStyleGuidance(locale: AiLocale): string {
  const examples = locale === 'en' ? EXAMPLES_EN : EXAMPLES_ES
  const language = locale === 'en' ? 'English' : 'Spanish'
  return `${TAG_STYLE_MARKER}. Tags are interpretive labels, not quoted manuscript phrases.
Infer tropes, tone, pacing, relationship dynamics and content warnings from the evidence even if the exact tag string never appears.
Never invent fandoms, ships or character names as tags. Do not replace Angst with sadness/tristeza or Hurt/Comfort with "they help each other".
Prefer the well-known English fanfic register for canonical tropes; write additional/warning-style tags in ${language} when that matches the manuscript.
Examples: ${examples.join('; ')}.
${PATTERNS}
Return at most 8 tags, each at most 80 characters. Skip tags already listed. ${TAG_STYLE_MARKER}.`
}

export function mergeUniqueTags(existing: string[], incoming: string[]): string[] {
  const merged: string[] = []
  const seen = new Set<string>()
  for (const raw of [...existing, ...incoming]) {
    if (typeof raw !== 'string') continue
    const tag = raw.trim()
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(tag)
  }
  return merged
}
