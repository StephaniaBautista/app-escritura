import { describe, expect, it, vi } from 'vitest'
import { createWritingActivity } from '../writing-activity'
import { StatsRequestError } from '@/services/stats'

function setup() {
  let now = 0
  let available = true
  let sameUser = true
  const report = vi.fn().mockResolvedValue(undefined)
  const sessionId = vi.fn().mockReturnValueOnce('00000000-0000-4000-8000-000000000001').mockReturnValueOnce('00000000-0000-4000-8000-000000000002')
  const tracker = createWritingActivity('document-1', 'America/Mexico_City', { now: () => now, available: () => available, sameUser: () => sameUser, report, sessionId })
  return { tracker, report, sessionId, time: (value: number) => { now = value }, visible: (value: boolean) => { available = value }, owner: (value: boolean) => { sameUser = value } }
}
async function settle() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

describe('writing activity sessions', () => {
  it('never starts or reports a session just by opening, focusing, hiding or closing an editor', () => {
    const state = setup()
    state.tracker.tick()
    state.tracker.availabilityChanged()
    state.tracker.pause()
    state.tracker.dispose()
    expect(state.report).not.toHaveBeenCalled()
    expect(state.sessionId).not.toHaveBeenCalled()
  })
  it('starts at zero and reports cumulative active time under one session identity', async () => {
    const state = setup()
    state.tracker.recordInput()
    await settle()
    expect(state.report.mock.calls[0][0]).toMatchObject({ documentId: 'document-1', activeMilliseconds: 0, timeZone: 'America/Mexico_City' })
    state.time(15_000); state.tracker.tick(); await settle()
    state.time(30_000); state.tracker.tick(); await settle()
    expect(state.report.mock.calls.map((call) => call[0].activeMilliseconds)).toEqual([0, 15_000, 30_000])
    expect(new Set(state.report.mock.calls.map((call) => call[0].sessionId)).size).toBe(1)
  })
  it('stops accumulating after sixty seconds without input and resumes only fresh elapsed time', async () => {
    const state = setup()
    state.tracker.recordInput(); await settle()
    state.time(90_000); state.tracker.tick(); await settle()
    state.time(120_000); state.tracker.recordInput(); await settle()
    state.time(135_000); state.tracker.tick(); await settle()
    expect(state.report.mock.calls.map((call) => call[0].activeMilliseconds)).toEqual([0, 60_000, 75_000])
  })
  it('excludes hidden or unfocused time and flushes when paused', async () => {
    const state = setup()
    state.tracker.recordInput(); await settle()
    state.time(10_000); state.visible(false); state.tracker.pause(); await settle()
    state.time(40_000); state.tracker.tick(); await settle()
    expect(state.report.mock.calls.map((call) => call[0].activeMilliseconds)).toEqual([0, 10_000])
    expect(state.report.mock.calls[1][1].keepalive).toBe(true)
    state.time(45_000); state.visible(true); state.tracker.availabilityChanged()
    state.time(60_000); state.tracker.tick(); await settle()
    expect(state.report.mock.calls[2][0].activeMilliseconds).toBe(25_000)
  })
  it('retries a failed initializer at zero before submitting elapsed time', async () => {
    const state = setup()
    state.report.mockRejectedValueOnce(new Error('offline'))
    state.tracker.recordInput(); await settle()
    state.time(15_000); state.tracker.tick(); await settle()
    state.time(30_000); state.tracker.tick(); await settle()
    expect(state.report.mock.calls.map((call) => call[0].activeMilliseconds)).toEqual([0, 0, 30_000])
    expect(state.report.mock.calls[0][0].sessionId).toBe(state.report.mock.calls[1][0].sessionId)
  })
  it('does not send concurrent requests and flushes the final accumulated value after acknowledgement', async () => {
    const state = setup()
    let resolve!: () => void
    state.report.mockReturnValueOnce(new Promise<void>((done) => { resolve = done }))
    state.tracker.recordInput()
    state.time(15_000); state.tracker.tick()
    state.time(18_000); state.tracker.dispose()
    expect(state.report).toHaveBeenCalledTimes(1)
    resolve(); await settle()
    expect(state.report.mock.calls[1][0].activeMilliseconds).toBe(18_000)
    expect(state.report.mock.calls[1][1].keepalive).toBe(true)
  })
  it('discards and aborts pending reports when the authenticated account changes', async () => {
    const state = setup()
    let resolve!: () => void
    state.report.mockReturnValueOnce(new Promise<void>((done) => { resolve = done }))
    state.tracker.recordInput()
    state.time(15_000); state.owner(false); state.tracker.dispose({ discard: true })
    expect(state.report.mock.calls[0][1].signal.aborted).toBe(true)
    resolve(); await settle()
    state.tracker.recordInput(); state.tracker.tick()
    expect(state.report).toHaveBeenCalledTimes(1)
  })
  it('starts a fresh UUID after expiration without carrying old accumulated time', async () => {
    const state = setup()
    state.tracker.recordInput(); await settle()
    state.report.mockRejectedValueOnce(new StatsRequestError(410))
    state.time(15_000); state.tracker.tick(); await settle()
    state.time(20_000); state.tracker.recordInput(); await settle()
    expect(state.report.mock.calls[2][0].activeMilliseconds).toBe(0)
    expect(state.report.mock.calls[2][0].sessionId).not.toBe(state.report.mock.calls[0][0].sessionId)
  })
})
