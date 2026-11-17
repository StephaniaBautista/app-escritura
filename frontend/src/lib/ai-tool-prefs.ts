import { isAiPreset, type AiPresetId } from '@/lib/ai-presets'

export const AI_TOOL_IDS = ['review', 'wizard', 'timeline', 'characters'] as const
export type AiToolId = typeof AI_TOOL_IDS[number]

export interface AiToolMode {
  id: string
  available?: boolean
  comingSoon?: boolean
}

export function resolveAiToolPreset(preferred: string | undefined, modes: AiToolMode[]): string | undefined {
  const usable = (id: string) => {
    if (!isAiPreset(id)) return false
    const mode = modes.find((item) => item.id === id)
    if (!mode) return modes.length === 0
    return mode.available !== false && mode.comingSoon !== true
  }
  if (preferred && usable(preferred)) return preferred
  return modes.find((item) => item.available && !item.comingSoon)?.id
}

export function isSelectableAiPreset(id: string, modes: AiToolMode[]): id is AiPresetId {
  return resolveAiToolPreset(id, modes) === id
}
