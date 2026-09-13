import { act, renderHook, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
const { update } = vi.hoisted(() => ({ update: vi.fn() }))
vi.mock('../src/services/documents', () => ({ documentsApi: { update } }))
import { useAutoSave } from '../src/hooks/useAutoSave'

afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetAllMocks() })

it('F08: navegar durante el debounce descarta la última edición', async () => {
  vi.useFakeTimers()
  update.mockResolvedValue({})
  const hook = renderHook(() => useAutoSave({ documentId: 'doc', getContent: () => ({ text: 'última edición' }), debounceMs: 800 }))
  act(() => hook.result.current.triggerSave())
  act(() => { vi.advanceTimersByTime(400) })
  hook.unmount()
  await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
  expect(update).not.toHaveBeenCalled()
})

it('F09: la cola libera el bloqueo y permite que una escritura antigua termine después', async () => {
  vi.useFakeTimers()
  const pending: (() => void)[] = []
  let persisted = ''
  let text = 'v1'
  update.mockImplementation((_id: string, input: { content: { text: string } }) => new Promise<void>(resolve => pending.push(() => { persisted = input.content.text; resolve() })))
  const hook = renderHook(() => useAutoSave({ documentId: 'doc', getContent: () => ({ text }), debounceMs: 800 }))
  const type = async (value: string) => { text = value; act(() => hook.result.current.triggerSave()); await act(async () => { await vi.advanceTimersByTimeAsync(800) }) }
  await type('v1')
  await type('v2')
  await act(async () => { pending[0]() })
  await type('v3')
  expect(update).toHaveBeenCalledTimes(3)
  await act(async () => { pending[2]() })
  await act(async () => { pending[1]() })
  expect(persisted).toBe('v2')
  expect(hook.result.current.status).toBe('saved')
})
