import { describe, expect, it } from 'vitest'
import { resolveAiToolPreset } from '../ai-tool-prefs'

const modes = [
  { id: 'saver', available: true, comingSoon: false },
  { id: 'balanced', available: true, comingSoon: false },
  { id: 'private', available: true, comingSoon: false },
  { id: 'sealed', available: true, comingSoon: false },
]

describe('resolveAiToolPreset', () => {
  it('keeps a usable preferred mode', () => {
    expect(resolveAiToolPreset('sealed', modes)).toBe('sealed')
  })

  it('keeps private when the catalog marks it as usable', () => {
    expect(resolveAiToolPreset('private', modes)).toBe('private')
  })

  it('returns the preferred mode when no catalog is loaded yet', () => {
    expect(resolveAiToolPreset('quality', [])).toBe('quality')
  })
})
