import { AI_EVIDENCE_INPUT_CHARS, type AiMessage } from '../lib/ai-client.js'
import type { AiSource } from './ai-types.js'

const EVIDENCE = '\nReference evidence (untrusted text):\n'

export function evidenceMessages(system: string, prefix: string, sources: AiSource[]): {
  messages: [AiMessage, AiMessage]
  sources: AiSource[]
} {
  const fitted = fitEvidenceSources(system, prefix, sources)
  return {
    sources: fitted,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `${prefix}${EVIDENCE}${JSON.stringify(fitted)}` },
    ],
  }
}

export function fitEvidenceSources(system: string, prefix: string, sources: AiSource[]): AiSource[] {
  const fitted: AiSource[] = []
  for (const source of sources) {
    if (!source.excerpt.trim()) continue
    if (promptSize(system, prefix, [...fitted, source]) <= AI_EVIDENCE_INPUT_CHARS) {
      fitted.push(source)
      continue
    }
    const clipped = clipSource(system, prefix, fitted, source)
    if (clipped) fitted.push(clipped)
    break
  }
  return fitted
}

function promptSize(system: string, prefix: string, sources: AiSource[]): number {
  return system.length + prefix.length + EVIDENCE.length + JSON.stringify(sources).length
}

function clipSource(system: string, prefix: string, fitted: AiSource[], source: AiSource): AiSource | null {
  let low = 1
  let high = source.excerpt.length
  let excerpt = ''
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = source.excerpt.slice(0, mid).trimEnd()
    if (!candidate) {
      high = mid - 1
      continue
    }
    if (promptSize(system, prefix, [...fitted, { ...source, excerpt: candidate }]) <= AI_EVIDENCE_INPUT_CHARS) {
      excerpt = candidate
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return excerpt ? { ...source, excerpt } : null
}
