export const AI_PRESETS = ['saver', 'balanced', 'quality', 'private', 'sealed'] as const
export type AiPresetId = typeof AI_PRESETS[number]
export const TRAINING_PRESETS: AiPresetId[] = ['saver', 'balanced', 'quality']

export function isAiPreset(value: string): value is AiPresetId {
  return (AI_PRESETS as readonly string[]).includes(value)
}

export function isTrainingPreset(value: string): boolean {
  return isAiPreset(value) && TRAINING_PRESETS.includes(value)
}
