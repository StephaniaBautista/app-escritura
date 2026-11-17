import { describe, expect, it } from 'vitest'
import { AI_EVIDENCE_INPUT_CHARS, AI_MAX_INPUT_CHARS, AI_REPAIR_INSTRUCTION } from '../../lib/ai-client.js'
import { evidenceMessages, fitEvidenceSources } from '../ai-evidence.js'

const source = (excerpt: string, id = 'document:d1') => ({
  id, type: 'document', title: 'Capítulo', excerpt,
})

describe('fitEvidenceSources', () => {
  it('keeps short evidence unchanged', () => {
    const sources = [source('Ada vive en Madrid.')]
    expect(fitEvidenceSources('sys', 'prefix', sources)).toEqual(sources)
  })

  it('clips evidence so system plus user stay within the model input budget', () => {
    const system = 's'.repeat(1_000)
    const prefix = 'p'.repeat(2_000)
    const sources = [source('Ada '.repeat(20_000)), source('Bea '.repeat(20_000), 'document:d2')]
    const packed = evidenceMessages(system, prefix, sources)
    const total = packed.messages.reduce((sum, message) => sum + message.content.length, 0)
    expect(total).toBeLessThanOrEqual(AI_EVIDENCE_INPUT_CHARS)
    expect(total).toBeLessThan(AI_MAX_INPUT_CHARS)
    expect(packed.sources.length).toBeGreaterThan(0)
    expect(packed.sources[0]?.excerpt.startsWith('Ada')).toBe(true)
    expect(packed.sources[0]?.excerpt.length).toBeLessThan(sources[0]!.excerpt.length)
  })

  it('leaves headroom so a repair retry cannot exceed the hard input limit', () => {
    const system = 's'.repeat(2_000)
    const prefix = 'p'.repeat(3_000)
    const sources = [source('Ada '.repeat(40_000))]
    const packed = evidenceMessages(system, prefix, sources)
    const total = packed.messages.reduce((sum, message) => sum + message.content.length, 0)
    expect(total + AI_REPAIR_INSTRUCTION.length + 1).toBeLessThanOrEqual(AI_MAX_INPUT_CHARS)
  })
})
