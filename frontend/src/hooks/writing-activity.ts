import { StatsRequestError } from '@/services/stats'
import type { WritingActivity } from '@/types/stats'

interface ActivityEnvironment {
  now: () => number
  available: () => boolean
  sameUser: () => boolean
  report: (activity: WritingActivity, options: { keepalive: boolean; signal: AbortSignal }) => Promise<void>
  sessionId: () => string
}

export function createWritingActivity(documentId: string, timeZone: string, environment: ActivityEnvironment) {
  let sessionId: string | null = null
  let total = 0
  let acknowledged = -1
  let lastInput = -Infinity
  let sampledAt = environment.now()
  let counting = false
  let sending = false
  let disposed = false
  let discard = false
  let queuedFlush = false
  let requestController: AbortController | null = null

  function sample() {
    const now = environment.now()
    if (counting) total = Math.min(28_800_000, total + Math.max(0, Math.min(now, lastInput + 60_000) - sampledAt))
    sampledAt = now
  }

  async function flush(keepalive = false) {
    if (discard || !sessionId || !environment.sameUser()) return
    sample()
    if (sending) { queuedFlush ||= keepalive; return }
    const cumulative = acknowledged < 0 ? 0 : Math.floor(total)
    if (cumulative <= acknowledged) return
    sending = true
    const controller = new AbortController()
    requestController = controller
    try {
      await environment.report({ documentId, sessionId, activeMilliseconds: cumulative, timeZone }, { keepalive, signal: controller.signal })
      if (!discard && environment.sameUser()) acknowledged = Math.max(acknowledged, cumulative)
    } catch (error) {
      if (error instanceof StatsRequestError && error.status === 410) {
        sessionId = null
        total = 0
        acknowledged = -1
        counting = false
        lastInput = -Infinity
      } else if (error instanceof StatsRequestError && error.status === 409) {
        acknowledged = -1
      }
    } finally {
      sending = false
      requestController = null
      if (queuedFlush && !discard && environment.sameUser()) {
        queuedFlush = false
        void flush(true)
      }
    }
  }

  return {
    recordInput() {
      if (disposed || !environment.sameUser() || !environment.available()) return
      sample()
      const first = sessionId === null
      sessionId ??= environment.sessionId()
      lastInput = environment.now()
      sampledAt = lastInput
      counting = true
      if (first) void flush()
    },
    tick() {
      if (disposed) return
      sample()
      counting = environment.available() && environment.sameUser()
      void flush()
    },
    pause() {
      if (disposed) return
      sample()
      counting = false
      void flush(true)
    },
    availabilityChanged() {
      if (disposed) return
      sample()
      counting = environment.available() && environment.sameUser()
      if (!counting) void flush(true)
    },
    dispose(options: { discard?: boolean } = {}) {
      if (disposed) return
      sample()
      counting = false
      disposed = true
      discard = options.discard === true || !environment.sameUser()
      if (discard) { queuedFlush = false; requestController?.abort() } else void flush(true)
    },
  }
}
