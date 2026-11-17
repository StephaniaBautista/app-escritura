import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EventGroupLane, type PositionedEvent } from '../EventGroupLane'
import type { TimelineEvent } from '@/types/timeline'
import type { Subplot } from '@/types/structure'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key } }))

function event(id: string, subplotId: string | null): TimelineEvent {
  return {
    id, projectId: 'p1', title: `Evento ${id}`, date: '1', description: null, order: 0, eraId: null,
    characterIds: [], icon: null, color: null, groupName: null, precision: 'year', endDate: null,
    label: null, labelColor: null, imageUrl: null, relatedEventIds: [], relatedDocumentIds: [], subplotId,
    createdAt: '', updatedAt: '',
  }
}

const romance: Subplot = { id: 'sub-1', projectId: 'p1', title: 'Romance', description: null, status: 'active', color: '#aa3366', order: 0, createdAt: '', updatedAt: '' }

describe('EventGroupLane subplot lanes', () => {
  it('tints a subplot lane header and events with the subplot color', () => {
    const items: PositionedEvent[] = [
      { event: event('b', 'sub-1'), x: 40, xEnd: null, subplot: romance },
    ]
    render(<EventGroupLane name="Romance" items={items} kind="subplot" accentColor="#aa3366" selectedId={null} onSelect={vi.fn()} />)

    const lane = screen.getByTestId('timeline-subplot-lane-Romance')
    expect(lane).toHaveAttribute('data-subplot-lane', 'true')
    expect(lane.className).toContain('subplot-layer-lane')
    expect(lane.style.getPropertyValue('--subplot-color')).toBe('#aa3366')
    expect(screen.getByRole('button', { name: 'structureApp.subplotLane' })).toHaveClass('subplot-layer-lane__head')

    const layer = screen.getByTestId('timeline-event-b')
    expect(layer).toHaveAttribute('data-subplot-layer', 'true')
    expect(layer.className).toContain('subplot-layer-event')
  })

  it('leaves main-plot group lanes un-tinted', () => {
    const items: PositionedEvent[] = [{ event: event('a', null), x: 10, xEnd: null }]
    render(<EventGroupLane name="General" items={items} selectedId={null} onSelect={vi.fn()} />)
    expect(screen.getByTestId('timeline-group-lane-General')).not.toHaveAttribute('data-subplot-lane')
    expect(screen.getByTestId('timeline-event-a')).not.toHaveAttribute('data-subplot-layer')
  })

  it('uses the violet token when the subplot accent is missing', () => {
    const items: PositionedEvent[] = [{ event: event('b', 'sub-gone'), x: 40, xEnd: null, subplot: null }]
    render(<EventGroupLane name="Subtrama" items={items} kind="subplot" accentColor={null} selectedId={null} onSelect={vi.fn()} />)
    expect(screen.getByTestId('timeline-subplot-lane-Subtrama').style.getPropertyValue('--subplot-color')).toBe('var(--color-accent-violet)')
  })
})
