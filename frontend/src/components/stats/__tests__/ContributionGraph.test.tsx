import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContributionGraph } from '../ContributionGraph'
import { completeStatsDays } from '../stats-calendar'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => `${key}${values ? ` ${JSON.stringify(values)}` : ''}`, i18n: { language: 'es' } }) }))

describe('contribution calendar navigation', () => {
  it('uses one tabbable day and arrow keys to move through dates without 365 tab stops', () => {
    const days = completeStatsDays('2024-02-26', '2024-03-10', [])
    const { container } = render(<ContributionGraph days={days} from="2024-02-26" to="2024-03-10" />)
    const last = container.querySelector<HTMLButtonElement>('[data-date="2024-03-10"]')!
    expect(container.querySelectorAll('.stats-day[tabindex="0"]')).toHaveLength(1)
    last.focus()
    fireEvent.keyDown(last, { key: 'ArrowLeft' })
    expect(container.querySelector('[data-date="2024-03-03"]')).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' })
    expect(container.querySelector('[data-date="2024-03-02"]')).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'Home' })
    expect(container.querySelector('[data-date="2024-02-26"]')).toHaveFocus()
    expect(container.querySelectorAll('.stats-day[tabindex="0"]')).toHaveLength(1)
  })
  it('shows exact selected daily totals and whole seconds, including a leap day', () => {
    const days = [{ date: '2024-02-29', wordsAdded: 21, activeSeconds: 65.34999 }]
    render(<ContributionGraph days={days} from="2024-02-29" to="2024-02-29" />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/statsApp.dayDetail/)).toHaveTextContent('"seconds":5')
    expect(screen.getByText(/statsApp.dayDetail/)).toHaveTextContent('"count":21')
  })
})
