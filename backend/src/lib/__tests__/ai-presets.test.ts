import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listPresetStatus, presetAvailable, presetOrDefault } from '../ai-presets.js'

describe('ai presets', () => {
  beforeEach(() => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-deepseek-key')
    vi.stubEnv('MUSE_API_KEY', 'test-muse-key')
    vi.stubEnv('GLM_API_KEY', 'test-glm-key')
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key')
    vi.stubEnv('DEEPSEEK_MODEL', '')
    vi.stubEnv('MUSE_CONTRIBUTOR_MODEL', '')
    vi.stubEnv('MUSE_STANDARD_MODEL', '')
    vi.stubEnv('GLM_MODEL', '')
    vi.stubEnv('OPENAI_MODEL', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('makes private available when OpenAI is configured', () => {
    expect(presetAvailable('private')).toBe(true)
    expect(listPresetStatus().find((item) => item.id === 'private')).toEqual({
      id: 'private', available: true, trainsData: false, comingSoon: false,
    })
  })

  it('does not silently replace an explicit private request with a training mode', () => {
    expect(presetOrDefault('private')).toBe('private')
    expect(presetOrDefault()).toBe('saver')
  })
})
