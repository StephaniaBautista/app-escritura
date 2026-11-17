import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AiSettingsSection } from '../AiSettingsSection'
import { useSettingsStore } from '@/stores/settings-store'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const { settingsApiMock } = vi.hoisted(() => ({
  settingsApiMock: { get: vi.fn(), update: vi.fn() },
}))
vi.mock('@/services/settings', () => ({ settingsApi: settingsApiMock }))

const settings = {
  id: 's1', userId: 'u1', theme: 'system', language: 'es',
  autoVersion: {
    inactivity: { enabled: true, intervalMs: 300000 },
    exit: { enabled: true },
    hourly: { enabled: true, intervalMs: 3600000 },
    daily: { enabled: true, intervalMs: 86400000 },
    weekly: { enabled: true, intervalMs: 604800000 },
    monthly: { enabled: true, intervalMs: 2592000000 },
  },
  uiPrefs: { reviewEnabledByDefault: false, aiToolPresets: { review: 'sealed' } },
  aiModes: [
    { id: 'saver', available: true, trainsData: true, comingSoon: false },
    { id: 'balanced', available: true, trainsData: true, comingSoon: false },
    { id: 'private', available: true, trainsData: false, comingSoon: false },
    { id: 'sealed', available: true, trainsData: false, comingSoon: false },
  ],
}

describe('AiSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSettingsStore.setState({ settings, loading: false, error: null })
    settingsApiMock.update.mockImplementation(async (data: { uiPrefs?: Record<string, unknown> }) => ({
      ...settings,
      uiPrefs: { ...settings.uiPrefs, ...data.uiPrefs, aiToolPresets: { ...settings.uiPrefs.aiToolPresets, ...(data.uiPrefs?.aiToolPresets as object) } },
    }))
  })

  it('starts with review off and persists the switch', async () => {
    render(<AiSettingsSection />)
    const reviewSwitch = screen.getByRole('switch', { name: 'settings.ai.reviewDefault' })
    expect(reviewSwitch).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(reviewSwitch)
    await waitFor(() => expect(settingsApiMock.update).toHaveBeenCalledWith({ uiPrefs: { reviewEnabledByDefault: true } }))
  })

  it('saves a non-training mode for a tool without a warning', async () => {
    render(<AiSettingsSection />)
    fireEvent.change(screen.getByLabelText('settings.ai.tools.timeline: settings.ai.mode'), { target: { value: 'sealed' } })
    await waitFor(() => expect(settingsApiMock.update).toHaveBeenCalledWith({
      uiPrefs: { aiToolPresets: { review: 'sealed', timeline: 'sealed' } },
    }))
  })

  it('saves the private mode for a tool', async () => {
    render(<AiSettingsSection />)
    fireEvent.change(screen.getByLabelText('settings.ai.tools.characters: settings.ai.mode'), { target: { value: 'private' } })
    await waitFor(() => expect(settingsApiMock.update).toHaveBeenCalledWith({
      uiPrefs: { aiToolPresets: { review: 'sealed', characters: 'private' } },
    }))
  })
})
