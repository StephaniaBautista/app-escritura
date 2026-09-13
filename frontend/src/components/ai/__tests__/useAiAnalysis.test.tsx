import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAiAnalysis } from '../useAiAnalysis'
import { aiApi } from '@/services/ai'
import { useAiStore } from '@/stores/ai-store'
import { analysis, capabilities } from './fixtures'
import type { AiAnalysis } from '@/types/ai'

vi.mock('@/services/ai', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/ai')>()
  return { ...original, aiApi: { analyze: vi.fn() } }
})

beforeEach(() => { vi.clearAllMocks(); useAiStore.getState().reset(); useAiStore.setState({ projectId: 'project-1', capabilities }) })

describe('analysis requests', () => {
  it('does not call the provider until explicitly requested', () => {
    renderHook(() => useAiAnalysis('project-1', 'suggestions', { locale: 'es', documentId: 'chapter-1' }))
    expect(aiApi.analyze).not.toHaveBeenCalled()
  })

  it('discards a response when the draft changes even if the server ignores cancellation', async () => {
    let finish!: (value: AiAnalysis) => void
    vi.mocked(aiApi.analyze).mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const { result, rerender } = renderHook(({ draft }) => useAiAnalysis('project-1', 'suggestions', { locale: 'es', documentId: 'chapter-1', draftContent: draft }), { initialProps: { draft: 'Borrador anterior' } })
    act(() => { void result.current.run() })
    rerender({ draft: 'Nuevo borrador' })
    await act(async () => { finish(analysis) })
    expect(result.current.result).toBeNull()
    expect(vi.mocked(aiApi.analyze).mock.calls[0][3]?.aborted).toBe(true)
  })

  it('revocation prevents new analysis requests', async () => {
    useAiStore.setState({ capabilities: { ...capabilities, permissions: { chat: false, characters: false, suggestions: false } } })
    const { result } = renderHook(() => useAiAnalysis('project-1', 'suggestions', { locale: 'es' }))
    await act(async () => { await result.current.run() })
    expect(aiApi.analyze).not.toHaveBeenCalled()
  })

  it.each([
    { kind: 'subplot-suggestions', chat: true, suggestions: false, allowed: true },
    { kind: 'subplot-suggestions', chat: false, suggestions: true, allowed: false },
    { kind: 'suggestions', chat: true, suggestions: false, allowed: false },
    { kind: 'suggestions', chat: false, suggestions: true, allowed: true },
  ] as const)('authorizes $kind with chat=$chat suggestions=$suggestions: $allowed', async ({ kind, chat, suggestions, allowed }) => {
    useAiStore.setState({ capabilities: { ...capabilities, permissions: { chat, characters: false, suggestions } } })
    vi.mocked(aiApi.analyze).mockResolvedValue(analysis)
    const { result } = renderHook(() => useAiAnalysis('project-1', kind, { locale: 'es' }))
    await act(async () => { await result.current.run() })
    expect(aiApi.analyze).toHaveBeenCalledTimes(allowed ? 1 : 0)
    if (allowed) expect(result.current.result).toEqual(analysis)
  })

  it('manual cancellation prevents late results from becoming visible', async () => {
    let finish!: (value: AiAnalysis) => void
    vi.mocked(aiApi.analyze).mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const { result } = renderHook(() => useAiAnalysis('project-1', 'suggestions', { locale: 'es' }))
    act(() => { void result.current.run() })
    await waitFor(() => expect(result.current.loading).toBe(true))
    act(() => { result.current.cancel() })
    await act(async () => { finish(analysis) })
    expect(result.current.loading).toBe(false)
    expect(result.current.result).toBeNull()
  })
})
