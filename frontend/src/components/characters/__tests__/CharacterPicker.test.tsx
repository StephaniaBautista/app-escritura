import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { CharacterPicker } from '../CharacterPicker'
import { character } from '@/components/ai/__tests__/fixtures'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const renderPicker = (props: Partial<React.ComponentProps<typeof CharacterPicker>> = {}) => {
  const onTalk = vi.fn()
  render(
    <MemoryRouter>
      <CharacterPicker projectId="project-1" characters={[character]} loading={false} onTalk={onTalk} {...props} />
    </MemoryRouter>,
  )
  return { onTalk }
}

describe('CharacterPicker', () => {
  it('turns every character into a single action to start talking', () => {
    const { onTalk } = renderPicker()

    const card = screen.getByRole('button', { name: /Ana/ })

    expect(card).toHaveTextContent('characterApp.talk')
    fireEvent.click(card)
    expect(onTalk).toHaveBeenCalledWith('character-1')
  })

  it('sends the writer to the project cast when there is nobody to talk to', () => {
    renderPicker({ characters: [] })

    expect(screen.getByText('characterApp.empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'characterApp.aiManageInProject' }))
      .toHaveAttribute('href', '/app/documents/project-1?tab=characters')
  })
})
