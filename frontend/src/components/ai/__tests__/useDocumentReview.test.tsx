import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentReview } from '../useDocumentReview'
import { useSettingsStore } from '@/stores/settings-store'
import { useAiStore } from '@/stores/ai-store'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }) }))

const { analyze } = vi.hoisted(() => ({ analyze: vi.fn() }))
vi.mock('@/services/ai', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/ai')>()
  return { ...mod, aiApi: { ...mod.aiApi, analyze } }
})

vi.mock('../useAiCapabilities', () => ({
  useAiCapabilities: () => ({
    capabilities: {
      providers: [
        { id: 'saver', available: true, trainsData: true, comingSoon: false },
        { id: 'sealed', available: true, trainsData: false, comingSoon: false },
      ],
      fallbackEnabled: false,
      permissions: { chat: true, characters: true, suggestions: true },
      canCopy: false, chapters: [], pages: [], characters: [],
    },
    loading: false, error: null, retry: vi.fn(),
  }),
}))

const settings = {
  id: 's1', userId: 'u1', theme: 'system', language: 'es',
  autoVersion: {
    inactivity: { enabled: true, intervalMs: 300000 },
    exit: { enabled: true },
    hourly: { enabled: true, intervalMs: 3600000 },
    daily: { enabled: true, intervalMs: 86400000 },
    weekly: { enabled: true, intervalMs: 604800000 },
    monthly: { enabled: true, intervalMs: 2592000000 },
  },
  uiPrefs: { reviewEnabledByDefault: false, aiToolPresets: { review: 'sealed' } },
  aiModes: [
    { id: 'saver', available: true, trainsData: true, comingSoon: false },
    { id: 'sealed', available: true, trainsData: false, comingSoon: false },
  ],
}

describe('useDocumentReview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    analyze.mockResolvedValue({ suggestions: [], sources: [], provider: 'sealed', model: 'test' })
    useSettingsStore.setState({ settings, loading: false, error: null })
    useAiStore.setState({
      projectId: 'p1',
      capabilities: {
        providers: settings.aiModes,
        fallbackEnabled: false,
        permissions: { chat: true, characters: true, suggestions: true },
        canCopy: false, chapters: [], pages: [], characters: [],
      },
      capabilityLoading: false, capabilityError: null, conversations: [], activeId: null,
      messages: [], loading: false, sending: false, error: null, pending: {}, provider: 'saver',
    })
  })

  it('starts inactive by default and does not analyze', async () => {
    const { result } = renderHook(() => useDocumentReview('p1', 'd1', 'Ada camina.', vi.fn()))
    expect(result.current.active).toBe(false)
    await waitFor(() => expect(analyze).not.toHaveBeenCalled())
  })

  it('uses the review mode from settings when enabled', async () => {
    useSettingsStore.setState({
      settings: { ...settings, uiPrefs: { ...settings.uiPrefs, reviewEnabledByDefault: true } },
      loading: false, error: null,
    })
    const { result } = renderHook(() => useDocumentReview('p1', 'd1', 'Ada camina.', vi.fn()))
    expect(result.current.active).toBe(true)
    await waitFor(() => expect(analyze).toHaveBeenCalledWith(
      'p1',
      'suggestions',
      expect.objectContaining({ documentId: 'd1', provider: 'sealed', locale: 'es' }),
      expect.any(AbortSignal),
    ))
  })
})
