import { useMemo } from 'react'
import { useAiStore } from '@/stores/ai-store'
import { useSettingsStore } from '@/stores/settings-store'
import { resolveAiToolPreset, type AiToolId } from '@/lib/ai-tool-prefs'

export function useAiToolProvider(tool: AiToolId) {
  const prefs = useSettingsStore((state) => state.settings?.uiPrefs)
  const aiModes = useSettingsStore((state) => state.settings?.aiModes)
  const providers = useAiStore((state) => state.capabilities?.providers)
  return useMemo(
    () => resolveAiToolPreset(prefs?.aiToolPresets?.[tool], aiModes ?? providers ?? []),
    [aiModes, prefs?.aiToolPresets, providers, tool],
  )
}
