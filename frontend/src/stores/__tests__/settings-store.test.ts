import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSettingsStore } from '../settings-store'

const { settingsApiMock } = vi.hoisted(() => ({
  settingsApiMock: {
    get: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/services/settings', () => ({
  settingsApi: settingsApiMock,
}))

const defaultSettings = {
  id: 'settings-1',
  userId: 'user-1',
  theme: 'system',
  language: 'es',
  autoVersion: {
    inactivity: { enabled: true, intervalMs: 300000 },
    exit: { enabled: true },
    hourly: { enabled: true, intervalMs: 3600000 },
    daily: { enabled: true, intervalMs: 86400000 },
    weekly: { enabled: true, intervalMs: 604800000 },
    monthly: { enabled: true, intervalMs: 2592000000 },
  },
}

describe('useSettingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSettingsStore.setState({ settings: null, loading: false, error: null })
  })

  it('loadSettings: carga settings del API', async () => {
    settingsApiMock.get.mockResolvedValue(defaultSettings)

    await useSettingsStore.getState().loadSettings()

    const state = useSettingsStore.getState()
    expect(state.settings?.theme).toBe('system')
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('loadSettings: maneja errores', async () => {
    settingsApiMock.get.mockRejectedValue(new Error('Network error'))

    await useSettingsStore.getState().loadSettings()

    const state = useSettingsStore.getState()
    expect(state.error).toBe('Network error')
    expect(state.loading).toBe(false)
  })

  it('updateSettings: actualiza settings via API', async () => {
    const updated = { ...defaultSettings, theme: 'dark' }
    settingsApiMock.update.mockResolvedValue(updated)

    await useSettingsStore.getState().updateSettings({ theme: 'dark' })

    const state = useSettingsStore.getState()
    expect(state.settings?.theme).toBe('dark')
  })

  it('updateSettings: maneja errores', async () => {
    settingsApiMock.update.mockRejectedValue(new Error('Save failed'))

    await expect(
      useSettingsStore.getState().updateSettings({ theme: 'dark' })
    ).rejects.toThrow('Save failed')

    const state = useSettingsStore.getState()
    expect(state.error).toBe('Save failed')
  })

  it('getAutoVersionConfig: retorna defaults si no hay settings', () => {
    useSettingsStore.setState({ settings: null })

    const config = useSettingsStore.getState().getAutoVersionConfig()

    expect(config.inactivity.enabled).toBe(true)
    expect(config.hourly.enabled).toBe(true)
    expect(config.exit.enabled).toBe(true)
  })

  it('getAutoVersionConfig: retorna config del settings', () => {
    useSettingsStore.setState({
      settings: {
        ...defaultSettings,
        autoVersion: { ...defaultSettings.autoVersion, inactivity: { enabled: false, intervalMs: 600000 } },
      },
    })

    const config = useSettingsStore.getState().getAutoVersionConfig()

    expect(config.inactivity.enabled).toBe(false)
    expect(config.inactivity.intervalMs).toBe(600000)
  })
})
