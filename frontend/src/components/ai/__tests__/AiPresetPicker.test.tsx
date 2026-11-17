import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AiProviderSelect } from '../AiPresetPicker'
import { useAiStore } from '@/stores/ai-store'
import { useSettingsStore } from '@/stores/settings-store'
import { capabilities } from './fixtures'

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
  uiPrefs: { dismissedAiTrainingModes: [] as string[] },
}

describe('AI preset picker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAiStore.getState().reset()
    useAiStore.setState({ capabilities, provider: 'sealed' })
    useSettingsStore.setState({ settings, loading: false, error: null })
    settingsApiMock.get.mockResolvedValue(settings)
    settingsApiMock.update.mockResolvedValue({ ...settings, uiPrefs: { dismissedAiTrainingModes: ['saver'] } })
  })

  it('warns before switching to a training mode and can remember the choice', async () => {
    render(<AiProviderSelect />)
    fireEvent.click(screen.getByLabelText('aiApp.presets.saver.name'))
    expect(useAiStore.getState().provider).toBe('sealed')
    expect(screen.getByText('aiApp.training.title')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'aiApp.training.dontShow' }))
    fireEvent.click(screen.getByText('aiApp.training.continue'))
    await waitFor(() => expect(settingsApiMock.update).toHaveBeenCalledWith({ uiPrefs: { dismissedAiTrainingModes: ['saver'] } }))
    expect(useAiStore.getState().provider).toBe('saver')
  })

  it('does not warn for a mode that does not train', () => {
    useAiStore.setState({ provider: 'saver' })
    render(<AiProviderSelect />)
    fireEvent.click(screen.getByLabelText('aiApp.presets.sealed.name'))
    expect(useAiStore.getState().provider).toBe('sealed')
    expect(screen.queryByText('aiApp.training.title')).not.toBeInTheDocument()
  })

  it('switches to private without a training warning', () => {
    render(<AiProviderSelect />)
    fireEvent.click(screen.getByLabelText('aiApp.presets.private.name'))
    expect(useAiStore.getState().provider).toBe('private')
    expect(screen.queryByText('aiApp.training.title')).not.toBeInTheDocument()
    expect(screen.queryByText('aiApp.comingSoon')).not.toBeInTheDocument()
  })
})
