import { useCallback, useEffect, useRef } from 'react'
import { statsApi, browserTimeZone } from '@/services/stats'
import { useAuthStore } from '@/stores/auth-store'
import { createWritingActivity } from './writing-activity'

export function useWritingActivity(documentId: string | null) {
  const userId = useAuthStore((state) => state.user?.id)
  const tracker = useRef<ReturnType<typeof createWritingActivity> | null>(null)

  useEffect(() => {
    if (!documentId || !userId) return
    const activity = createWritingActivity(documentId, browserTimeZone(), {
      now: () => performance.now(),
      available: () => document.visibilityState === 'visible' && document.hasFocus(),
      sameUser: () => useAuthStore.getState().user?.id === userId,
      report: statsApi.activity,
      sessionId: () => crypto.randomUUID(),
    })
    tracker.current = activity
    const interval = window.setInterval(() => activity.tick(), 15_000)
    const update = () => activity.availabilityChanged()
    const pause = () => activity.pause()
    document.addEventListener('visibilitychange', update)
    window.addEventListener('focus', update)
    window.addEventListener('blur', pause)
    window.addEventListener('pagehide', pause)
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.user?.id !== userId) activity.dispose({ discard: true })
    })
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('focus', update)
      window.removeEventListener('blur', pause)
      window.removeEventListener('pagehide', pause)
      unsubscribe()
      activity.dispose()
      if (tracker.current === activity) tracker.current = null
    }
  }, [documentId, userId])

  return useCallback(() => { tracker.current?.recordInput() }, [])
}
