import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FolderCreationDialog } from '../FolderCreationDialog'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('FolderCreationDialog', () => {
  it('muestra las dos opciones: saltar el wizard o completar todo', () => {
    render(
      <FolderCreationDialog
        projectName="Mi novela"
        isOpen
        onSkip={vi.fn()}
        onComplete={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('storySetup.chooseTitle')).toBeInTheDocument()
    expect(screen.getByText('Mi novela')).toBeInTheDocument()
    expect(screen.getByText('storySetup.skipWizard')).toBeInTheDocument()
    expect(screen.getByText('storySetup.completeWizard')).toBeInTheDocument()
  })

  it('llama onSkip al elegir saltar el wizard', () => {
    const onSkip = vi.fn()
    render(
      <FolderCreationDialog
        projectName="Mi novela"
        isOpen
        onSkip={onSkip}
        onComplete={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('storySetup.skipWizard'))

    expect(onSkip).toHaveBeenCalled()
  })

  it('llama onComplete al elegir completar todo', () => {
    const onComplete = vi.fn()
    render(
      <FolderCreationDialog
        projectName="Mi novela"
        isOpen
        onSkip={vi.fn()}
        onComplete={onComplete}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('storySetup.completeWizard'))

    expect(onComplete).toHaveBeenCalled()
  })

  it('no renderiza nada si no está abierto', () => {
    render(
      <FolderCreationDialog
        projectName="Mi novela"
        isOpen={false}
        onSkip={vi.fn()}
        onComplete={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByText('storySetup.chooseTitle')).not.toBeInTheDocument()
  })
})
