import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TimelineAiProposals } from '../TimelineAiProposals'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

const eras = [{ name: 'Era imperial' }]
const events = [{ title: 'Coronación', eraName: 'Era imperial' }]

describe('TimelineAiProposals', () => {
  it('adds every proposed era and event from the list action', async () => {
    const onAddAll = vi.fn().mockResolvedValue(undefined)
    render(
      <TimelineAiProposals
        eras={eras}
        events={events}
        onClose={vi.fn()}
        onPickEra={vi.fn()}
        onPickEvent={vi.fn()}
        onAddAll={onAddAll}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'timelineApp.aiAddAll' }))
    await waitFor(() => expect(onAddAll).toHaveBeenCalled())
  })

  it('keeps individual pick available and disables it while adding all', async () => {
    let resolveAdd: () => void = () => undefined
    const onAddAll = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveAdd = resolve }))
    const onPickEra = vi.fn()
    render(
      <TimelineAiProposals
        eras={eras}
        events={events}
        onClose={vi.fn()}
        onPickEra={onPickEra}
        onPickEvent={vi.fn()}
        onAddAll={onAddAll}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'timelineApp.aiUseEra' }))
    expect(onPickEra).toHaveBeenCalledWith(eras[0])
    fireEvent.click(screen.getByRole('button', { name: 'timelineApp.aiAddAll' }))
    expect(screen.getByRole('button', { name: 'timelineApp.aiAddingAll' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'timelineApp.aiUseEra' })).toBeDisabled()
    resolveAdd()
    await waitFor(() => expect(screen.getByRole('button', { name: 'timelineApp.aiAddAll' })).toBeEnabled())
  })
})
