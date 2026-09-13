import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { aiApi, aiErrorKey } from '@/services/ai'
import { useAiStore } from '@/stores/ai-store'
import type { AiAnalysis, AiAnalysisInput, AiAnalysisKind } from '@/types/ai'

const analysisPermissions = {
  suggestions: 'suggestions',
  'character-suggestions': 'characters',
  'subplot-suggestions': 'chat',
  'structure-suggestions': 'chat',
} as const

export function useAiAnalysis(projectId: string, kind: AiAnalysisKind, input: AiAnalysisInput) {
  const context = JSON.stringify([projectId, kind, input])
  const [state, setState] = useState<{ context: string; result: AiAnalysis | null; loading: boolean; error: string | null }>({ context, result: null, loading: false, error: null })
  const controller = useRef<AbortController | null>(null)
  const generation = useRef(0)
  const latestContext = useRef(context)

  const cancel = useCallback(() => {
    generation.current += 1
    controller.current?.abort()
    setState((current) => ({ ...current, loading: false }))
  }, [])

  useLayoutEffect(() => {
    latestContext.current = context
    generation.current += 1
    controller.current?.abort()
    return () => { generation.current += 1; controller.current?.abort() }
  }, [context])

  const run = useCallback(async () => {
    const [requestProject, requestKind, requestInput] = JSON.parse(context) as [string, AiAnalysisKind, AiAnalysisInput]
    const store = useAiStore.getState()
    const permission = analysisPermissions[requestKind]
    if (store.projectId !== requestProject || !store.capabilities?.permissions[permission]) return
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    const id = ++generation.current
    setState({ context, result: null, loading: true, error: null })
    try {
      const result = await aiApi.analyze(requestProject, requestKind, requestInput, abort.signal)
      if (generation.current === id && latestContext.current === context && !abort.signal.aborted) setState({ context, result, loading: false, error: null })
    } catch (error) {
      if (generation.current === id && latestContext.current === context && !abort.signal.aborted) setState({ context, result: null, loading: false, error: aiErrorKey(error) })
    }
  }, [context])

  return { result: state.context === context ? state.result : null, loading: state.context === context && state.loading, error: state.context === context ? state.error : null, run, cancel }
}
