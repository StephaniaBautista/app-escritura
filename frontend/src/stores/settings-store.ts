import { create } from 'zustand'
import { settingsApi } from '@/services/settings'
import type { UserSettings, UpdateSettingsInput, AutoVersionConfig } from '@/types/settings'

const DEFAULT_AUTO_VERSION: AutoVersionConfig = {
  inactivity: { enabled: true, intervalMs: 5 * 60 * 1000 },
  exit: { enabled: true },
  hourly: { enabled: true, intervalMs: 60 * 60 * 1000 },
  daily: { enabled: true, intervalMs: 24 * 60 * 60 * 1000 },
  weekly: { enabled: true, intervalMs: 7 * 24 * 60 * 60 * 1000 },
  monthly: { enabled: true, intervalMs: 30 * 24 * 60 * 60 * 1000 },
}

interface SettingsState {
  settings: UserSettings | null
  loading: boolean
  error: string | null
  loadSettings: () => Promise<void>
  updateSettings: (data: UpdateSettingsInput) => Promise<void>
  getAutoVersionConfig: () => AutoVersionConfig
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
}))
