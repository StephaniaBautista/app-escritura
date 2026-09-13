import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CharacterAiProposals } from '../CharacterAiProposals'
import type { AiCharacterFill } from '@/types/ai'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

const fills: AiCharacterFill[] = [
  { name: 'Ada', orientation: 'Homosexual' },
  { name: 'Nico', orientation: 'Bisexual' },
]

describe('CharacterAiProposals', () => {
  it('adds every proposed character from the list action', async () => {
    const onAddAll = vi.fn().mockResolvedValue(undefined)
    render(<CharacterAiProposals characters={fills} onClose={vi.fn()} onPick={vi.fn()} onAddAll={onAddAll} />)
    fireEvent.click(screen.getByRole('button', { name: 'characterApp.aiAddAll' }))
    await waitFor(() => expect(onAddAll).toHaveBeenCalledWith(fills))
  })

  it('keeps individual pick available and disables it while adding all', async () => {
    let resolveAdd: () => void = () => undefined
    const onAddAll = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveAdd = resolve }))
    const onPick = vi.fn()
    render(<CharacterAiProposals characters={fills} onClose={vi.fn()} onPick={onPick} onAddAll={onAddAll} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'characterApp.aiUseCharacter' })[0]!)
    expect(onPick).toHaveBeenCalledWith(fills[0])
    fireEvent.click(screen.getByRole('button', { name: 'characterApp.aiAddAll' }))
    expect(screen.getByRole('button', { name: 'characterApp.aiAddingAll' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'characterApp.aiUseCharacter' })[0]).toBeDisabled()
    resolveAdd()
    await waitFor(() => expect(screen.getByRole('button', { name: 'characterApp.aiAddAll' })).toBeEnabled())
  })
})
