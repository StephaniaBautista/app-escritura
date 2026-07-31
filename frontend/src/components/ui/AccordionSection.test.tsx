import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AccordionSection } from './AccordionSection'

describe('AccordionSection', () => {
  it('renderiza el título y el contenido abierto por defecto', () => {
    render(
      <AccordionSection title="Mis proyectos">
        <p>Contenido visible</p>
      </AccordionSection>
    )

    expect(screen.getByText('Mis proyectos')).toBeInTheDocument()
    expect(screen.getByText('Contenido visible')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mis proyectos/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it('colapsa el contenido al hacer click y actualiza aria-expanded', () => {
    render(
      <AccordionSection title="Contenido">
        <p>Capítulos</p>
      </AccordionSection>
    )

    const button = screen.getByRole('button', { name: /contenido/i })
    fireEvent.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Capítulos')).not.toBeVisible()
  })

  it('empieza cerrado cuando defaultOpen=false', () => {
    render(
      <AccordionSection title="Cerrado" defaultOpen={false}>
        <p>Oculto</p>
      </AccordionSection>
    )

    expect(screen.getByRole('button', { name: /cerrado/i })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Oculto')).not.toBeVisible()
  })

  it('renderiza las acciones junto al título', () => {
    render(
      <AccordionSection title="Proyectos" actions={<button type="button">+</button>}>
        <p>Lista</p>
      </AccordionSection>
    )

    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument()
  })
})
