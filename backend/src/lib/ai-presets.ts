export const AI_PRESETS = ['saver', 'balanced', 'quality', 'private', 'sealed'] as const
export type AiPreset = typeof AI_PRESETS[number]
export type AiProvider = AiPreset
export const AI_PROVIDERS = AI_PRESETS

export const AI_VENDORS = ['muse', 'deepseek', 'glm', 'openai'] as const
export type AiVendor = typeof AI_VENDORS[number]

export const TRAINING_PRESETS: AiPreset[] = ['saver', 'balanced', 'quality']

interface VendorDefinition {
  vendor: AiVendor
  url: string
  key: string
  tokenField: 'max_tokens' | 'max_completion_tokens'
}

const VENDORS: Record<AiVendor, VendorDefinition> = {
  muse: { vendor: 'muse', url: 'https://api.meta.ai/v1/chat/completions', key: 'MUSE_API_KEY', tokenField: 'max_completion_tokens' },
  deepseek: { vendor: 'deepseek', url: 'https://api.deepseek.com/chat/completions', key: 'DEEPSEEK_API_KEY', tokenField: 'max_tokens' },
  glm: { vendor: 'glm', url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', key: 'GLM_API_KEY', tokenField: 'max_tokens' },
  openai: { vendor: 'openai', url: 'https://api.openai.com/v1/chat/completions', key: 'OPENAI_API_KEY', tokenField: 'max_completion_tokens' },
}

interface PresetDefinition {
  id: AiPreset
  vendor: AiVendor
  modelEnv?: string
  defaultModel: string
  trainsData: boolean
  comingSoon?: boolean
}

const PRESETS: Record<AiPreset, PresetDefinition> = {
  saver: { id: 'saver', vendor: 'muse', modelEnv: 'MUSE_CONTRIBUTOR_MODEL', defaultModel: 'muse-spark-1.3-contributor', trainsData: true },
  balanced: { id: 'balanced', vendor: 'deepseek', modelEnv: 'DEEPSEEK_MODEL', defaultModel: 'deepseek-flash', trainsData: true },
  quality: { id: 'quality', vendor: 'glm', modelEnv: 'GLM_MODEL', defaultModel: 'glm-5.3-flash', trainsData: true },
  private: { id: 'private', vendor: 'openai', modelEnv: 'OPENAI_MODEL', defaultModel: 'gpt-5.6-luna', trainsData: false },
  sealed: { id: 'sealed', vendor: 'muse', modelEnv: 'MUSE_STANDARD_MODEL', defaultModel: 'muse-spark-1.3', trainsData: false },
}

function envModel(name: string | undefined, fallback: string): string {
  const value = name ? process.env[name]?.trim() : ''
  return value || fallback
}

export function isAiPreset(value: string | undefined): value is AiPreset {
  return value !== undefined && (AI_PRESETS as readonly string[]).includes(value)
}

export function isTrainingPreset(preset: AiPreset): boolean {
  return TRAINING_PRESETS.includes(preset)
}

export function sanitizeDismissedTrainingModes(value: unknown): AiPreset[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<AiPreset>()
  for (const item of value) {
    if (typeof item === 'string' && isAiPreset(item) && isTrainingPreset(item)) seen.add(item)
  }
  return [...seen]
}

export function resolvePreset(preset: AiPreset) {
  const definition = PRESETS[preset]
  const vendor = VENDORS[definition.vendor]
  const apiKey = process.env[vendor.key]?.trim() ?? ''
  const model = envModel(definition.modelEnv, definition.defaultModel)
  return { ...definition, ...vendor, apiKey, model }
}

export function isComingSoonPreset(preset: AiPreset): boolean {
  return PRESETS[preset].comingSoon === true
}

export function sanitizeSelectablePreset(value: unknown): AiPreset | undefined {
  if (typeof value !== 'string' || !isAiPreset(value) || isComingSoonPreset(value)) return undefined
  return value
}

export function presetAvailable(preset: AiPreset): boolean {
  if (isComingSoonPreset(preset)) return false
  const resolved = resolvePreset(preset)
  return Boolean(resolved.apiKey) && /^[a-zA-Z0-9._:/-]{1,100}$/.test(resolved.model)
}

export function listPresetStatus() {
  return AI_PRESETS.map((id) => ({
    id,
    available: presetAvailable(id),
    trainsData: PRESETS[id].trainsData,
    comingSoon: isComingSoonPreset(id),
  }))
}

export function presetOrDefault(provider?: AiPreset): AiPreset {
  if (provider && isComingSoonPreset(provider)) return provider
  if (provider && presetAvailable(provider)) return provider
  if (provider && !PRESETS[provider].trainsData) return provider
  return listPresetStatus().find((candidate) => candidate.available)?.id ?? 'saver'
}
