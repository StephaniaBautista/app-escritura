import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProtectedAiText } from '../AiShared'

describe('assistant copy affordances', () => {
  it('prevents copy, cut and drag for protected assistant output', () => {
    render(<ProtectedAiText canCopy={false}><p>Consejo del asesor</p></ProtectedAiText>)
    const output = screen.getByText('Consejo del asesor')
    expect(fireEvent.copy(output)).toBe(false)
    expect(fireEvent.cut(output)).toBe(false)
    expect(fireEvent.dragStart(output)).toBe(false)
    expect(output.parentElement).toHaveClass('ai-panel__protected')
  })
  it('leaves copying enabled for the explicit server capability', () => {
    render(<ProtectedAiText canCopy><p>Consejo del administrador</p></ProtectedAiText>)
    const output = screen.getByText('Consejo del administrador')
    expect(fireEvent.copy(output)).toBe(true)
    expect(output.parentElement).not.toHaveClass('ai-panel__protected')
  })
})
