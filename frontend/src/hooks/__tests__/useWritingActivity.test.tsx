import { StrictMode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWritingActivity } from '../useWritingActivity'
import { useAuthStore } from '@/stores/auth-store'
import { statsApi } from '@/services/stats'

vi.mock('@/services/stats', async (importOriginal) => ({ ...await importOriginal<typeof import('@/services/stats')>(), statsApi: { activity: vi.fn().mockResolvedValue(undefined) } }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })
  vi.clearAllMocks()
  vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  useAuthStore.setState({ user: { id: 'user-1', email: 'writer@example.test' } })
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('editor activity lifecycle', () => {
  it('StrictMode mounts do not generate activity, while a first edit starts exactly one session', async () => {
    const { result, unmount } = renderHook(() => useWritingActivity('document-1'), { wrapper: StrictMode })
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(statsApi.activity).not.toHaveBeenCalled()
    await act(async () => { result.current() })
    expect(statsApi.activity).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(vi.mocked(statsApi.activity).mock.calls[1][0].activeMilliseconds).toBe(15_000)
    unmount()
  })

  it('flushes the old document and requires a new edit before starting another document', async () => {
    const { result, rerender } = renderHook(({ id }) => useWritingActivity(id), { initialProps: { id: 'document-1' } })
    await act(async () => { result.current() })
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
    rerender({ id: 'document-2' })
    await act(async () => { await Promise.resolve() })
    expect(vi.mocked(statsApi.activity).mock.calls[1][0]).toMatchObject({ documentId: 'document-1', activeMilliseconds: 5_000 })
    await act(async () => { result.current() })
    expect(vi.mocked(statsApi.activity).mock.calls[2][0]).toMatchObject({ documentId: 'document-2', activeMilliseconds: 0 })
    expect(vi.mocked(statsApi.activity).mock.calls[2][0].sessionId).not.toBe(vi.mocked(statsApi.activity).mock.calls[0][0].sessionId)
  })

  it('stops pending tracking immediately on an account change', async () => {
    const { result } = renderHook(() => useWritingActivity('document-1'))
    await act(async () => { result.current() })
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); useAuthStore.setState({ user: { id: 'user-2', email: 'other@example.test' } }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(statsApi.activity).toHaveBeenCalledTimes(1)
  })
})
