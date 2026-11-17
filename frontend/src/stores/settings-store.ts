import { create } from 'zustand'
import { settingsApi } from '@/services/settings'
import type { UserSettings, UpdateSettingsInput, AutoVersionConfig, UiPrefs } from '@/types/settings'

const DEFAULT_AUTO_VERSION: AutoVersionConfig = {
  inactivity: { enabled: true, intervalMs: 5 * 60 * 1000 },
  exit: { enabled: true },
  hourly: { enabled: true, intervalMs: 60 * 60 * 1000 },
  daily: { enabled: true, intervalMs: 24 * 60 * 60 * 1000 },
  weekly: { enabled: true, intervalMs: 7 * 24 * 60 * 60 * 1000 },
  monthly: { enabled: true, intervalMs: 30 * 24 * 60 * 60 * 1000 },
}

const DEFAULT_UI_PREFS: UiPrefs = {
  reviewEnabledByDefault: false,
  aiToolPresets: {},
}

interface SettingsState {
  settings: UserSettings | null
  loading: boolean
  error: string | null
  loadSettings: () => Promise<void>
  updateSettings: (data: UpdateSettingsInput) => Promise<void>
  getAutoVersionConfig: () => AutoVersionConfig
  getUiPrefs: () => UiPrefs
  dismissAiStructureWarning: () => Promise<void>
  dismissAiTrainingMode: (preset: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null })
    try {
      const settings = await settingsApi.get()
      set({ settings, loading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cargar configuración'
      set({ error: message, loading: false })
    }
  },

  updateSettings: async (data: UpdateSettingsInput) => {
    set({ loading: true, error: null })
    try {
      const settings = await settingsApi.update(data)
      set({ settings, loading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar configuración'
      set({ error: message, loading: false })
      throw error
    }
  },

  getAutoVersionConfig: () => {
    const { settings } = get()
    if (!settings?.autoVersion) return DEFAULT_AUTO_VERSION
    return { ...DEFAULT_AUTO_VERSION, ...settings.autoVersion }
  },

  getUiPrefs: () => {
    const { settings } = get()
    if (!settings?.uiPrefs) return DEFAULT_UI_PREFS
    return { ...DEFAULT_UI_PREFS, ...settings.uiPrefs }
  },

  dismissAiStructureWarning: async () => {
    await get().updateSettings({ uiPrefs: { dismissAiStructureWarning: true } })
  },

  dismissAiTrainingMode: async (preset: string) => {
    const current = get().getUiPrefs().dismissedAiTrainingModes ?? []
    if (current.includes(preset)) return
    await get().updateSettings({ uiPrefs: { dismissedAiTrainingModes: [...current, preset] } })
  },
}))
