import { create } from 'zustand'
import { statsApi, StatsRequestError } from '@/services/stats'
import { useAuthStore } from './auth-store'
import type { StatsQuery, WritingStats } from '@/types/stats'

interface StatsState {
  report: WritingStats | null
  loading: boolean
  error: string | null
  requestId: number
  load: (query: StatsQuery) => Promise<void>
  reset: () => void
}

export const useStatsStore = create<StatsState>()((set, get) => {
  let controller: AbortController | null = null
  return {
    report: null, loading: false, error: null, requestId: 0,
    reset() {
      controller?.abort()
      set({ report: null, loading: false, error: null, requestId: get().requestId + 1 })
    },
    async load(query) {
      const userId = useAuthStore.getState().user?.id
      if (!userId) return
      controller?.abort()
      controller = new AbortController()
      const requestId = get().requestId + 1
      const signal = controller.signal
      set({ loading: true, error: null, requestId })
      try {
        const report = await statsApi.get(query, signal)
        if (get().requestId === requestId && useAuthStore.getState().user?.id === userId && !signal.aborted) set({ report, loading: false })
      } catch (error) {
        if (get().requestId !== requestId || signal.aborted) return
        set({ loading: false, error: error instanceof StatsRequestError && error.status === 401 ? 'statsApp.sessionError' : 'statsApp.loadError' })
      }
    },
  }
})

const unsubscribeStatsAuth = useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) useStatsStore.getState().reset()
})
if (import.meta.hot) import.meta.hot.dispose(unsubscribeStatsAuth)
