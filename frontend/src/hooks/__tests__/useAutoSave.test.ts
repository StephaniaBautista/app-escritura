import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoSave } from '../useAutoSave'
import { documentsApi } from '@/services/documents'

vi.mock('@/services/documents', () => ({ documentsApi: { update: vi.fn().mockResolvedValue({}) } }))
vi.mock('@/services/stats', () => ({ browserTimeZone: () => 'America/Mexico_City' }))
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks() })
afterEach(() => { vi.useRealTimers() })

describe('writing statistics autosave metadata', () => {
  it('sends the actual draft and timezone after editing, without trusting a client word count', async () => {
    const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Una historia' }] }] }
    const { result } = renderHook(() => useAutoSave({ documentId: 'document-1', getContent: () => content, debounceMs: 800 }))
    expect(documentsApi.update).not.toHaveBeenCalled()
    act(() => result.current.triggerSave())
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    expect(documentsApi.update).toHaveBeenCalledExactlyOnceWith('document-1', { content, timeZone: 'America/Mexico_City' })
  })
})
