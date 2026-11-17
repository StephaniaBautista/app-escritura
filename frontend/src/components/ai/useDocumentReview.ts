import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores/settings-store'
import { useAiToolProvider } from '@/hooks/useAiToolProvider'
import { useAiCapabilities } from './useAiCapabilities'
import { useAiAnalysis } from './useAiAnalysis'
import type { AiLocale, AiSuggestion } from '@/types/ai'

export function useDocumentReview(
  projectId: string,
  documentId: string | undefined,
  draftContent: string | undefined,
  onSuggestionsChange: (suggestions: AiSuggestion[]) => void,
) {
  const { i18n } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const [active, setActive] = useState(() => useSettingsStore.getState().getUiPrefs().reviewEnabledByDefault === true)
  const [visible, setVisible] = useState(true)
  const userTouched = useRef(false)
  const { capabilities } = useAiCapabilities(projectId)
  const provider = useAiToolProvider('review')
  const locale: AiLocale = i18n.language.startsWith('en') ? 'en' : 'es'
  const analyzedRef = useRef<string | null>(null)

  useEffect(() => {
    if (userTouched.current || !settings) return
    setActive(useSettingsStore.getState().getUiPrefs().reviewEnabledByDefault === true)
  }, [settings])

  const analysisInput = useMemo(() => ({
    documentId: documentId ?? '',
    ...(provider ? { provider } : {}),
    locale,
  }), [documentId, provider, locale])

  const analysis = useAiAnalysis(projectId, 'suggestions', analysisInput)
  const available = capabilities?.providers.some((item) => item.available) ?? false
  const allowed = !!projectId && !!documentId && !!capabilities?.permissions.suggestions && available
  const suggestions = useMemo(
    () => (active ? (analysis.result?.suggestions ?? []) : []),
    [active, analysis.result],
  )

  const run = analysis.run
  const cancel = analysis.cancel
  useEffect(() => {
    if (!active || !allowed || !documentId) {
      cancel()
      return
    }
    const key = `${projectId}:${documentId}:${provider}:${locale}`
    if (analyzedRef.current === key) return
    const timeout = window.setTimeout(() => {
      if (analyzedRef.current === key) return
      analyzedRef.current = key
      void run()
    }, 400)
    return () => window.clearTimeout(timeout)
  }, [active, allowed, documentId, projectId, provider, locale, run, cancel])

  const emit = onSuggestionsChange
  useEffect(() => { emit(suggestions) }, [suggestions, emit])

  const toggleVisibility = useCallback(() => setVisible((value) => !value), [])
  const enable = useCallback(() => {
    userTouched.current = true
    setActive(true)
    analyzedRef.current = null
  }, [])
  const disable = useCallback(() => {
    userTouched.current = true
    setActive(false)
    cancel()
  }, [cancel])
  const retry = useCallback(() => {
    analyzedRef.current = null
    void run()
  }, [run])

  const tooLong = (draftContent?.length ?? 0) > 56000

  return {
    active,
    visible,
    toggleVisibility,
    enable,
    disable,
    loading: analysis.loading,
    error: analysis.error,
    result: analysis.result,
    suggestions,
    tooLong,
    available,
    canCopy: capabilities?.canCopy,
    retry,
  }
}
