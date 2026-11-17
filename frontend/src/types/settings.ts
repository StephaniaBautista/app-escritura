export interface AutoVersionConfig {
  inactivity: { enabled: boolean; intervalMs: number }
  exit: { enabled: boolean }
  hourly: { enabled: boolean; intervalMs: number }
  daily: { enabled: boolean; intervalMs: number }
  weekly: { enabled: boolean; intervalMs: number }
  monthly: { enabled: boolean; intervalMs: number }
}

export interface AiToolPresets {
  review?: string
  wizard?: string
  timeline?: string
  characters?: string
}

export interface AiModeStatus {
  id: string
  available: boolean
  trainsData: boolean
  comingSoon: boolean
}

export interface UiPrefs {
  dismissAiStructureWarning?: boolean
  dismissedAiTrainingModes?: string[]
  reviewEnabledByDefault?: boolean
  aiToolPresets?: AiToolPresets
}

export interface UserSettings {
  id: string
  userId: string
  theme: string
  language: string
  autoVersion: AutoVersionConfig
  uiPrefs: UiPrefs
  aiModes?: AiModeStatus[]
}

export interface UpdateSettingsInput {
  theme?: string
  language?: string
  autoVersion?: Partial<AutoVersionConfig>
  uiPrefs?: Partial<UiPrefs>
}

export interface AutoVersionState {
  lastInactivityAt?: string
  lastExitAt?: string
  lastHourlyAt?: string
  lastDailyAt?: string
  lastWeeklyAt?: string
  lastMonthlyAt?: string
  lastActivityAt?: string
}

export type AutoVersionTrigger = 'inactivity' | 'exit' | 'hourly' | 'daily' | 'weekly' | 'monthly'

export interface AutoVersionCheckResult {
  created: boolean
  version?: unknown
}
