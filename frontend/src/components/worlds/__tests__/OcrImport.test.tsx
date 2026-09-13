import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { OcrImport } from '../OcrImport'

const extractMock = vi.fn()
const toast = { success: vi.fn(), error: vi.fn() }

vi.mock('@/services/ocr', async () => {
  const actual = await vi.importActual<typeof import('@/services/ocr')>('@/services/ocr')
  return { ...actual, extractOcrText: (...args: unknown[]) => extractMock(...args) }
})

vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => toast,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('OcrImport', () => {
  beforeEach(() => {
    extractMock.mockReset()
    toast.success.mockReset()
    toast.error.mockReset()
  })

  it('muestra el texto extraído y lo pasa a lore/glosario', async () => {
    extractMock.mockResolvedValue('Facción del norte')
    const onUseInLore = vi.fn()
    const onUseInGlossary = vi.fn()
    render(<OcrImport onUseInLore={onUseInLore} onUseInGlossary={onUseInGlossary} />)

    const input = document.getElementById('ocr-file') as HTMLInputElement
    const file = new File([new Uint8Array(8)], 'notas.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByDisplayValue('Facción del norte')).toBeInTheDocument()
    fireEvent.click(screen.getByText('worldApp.ocrUseLore'))
    expect(onUseInLore).toHaveBeenCalledWith('Facción del norte')
    fireEvent.click(screen.getByText('worldApp.ocrUseGlossary'))
    expect(onUseInGlossary).toHaveBeenCalledWith('Facción del norte')
  })

  it('avisa si el OCR no devuelve texto', async () => {
    extractMock.mockResolvedValue('')
    render(<OcrImport onUseInLore={vi.fn()} onUseInGlossary={vi.fn()} />)

    const input = document.getElementById('ocr-file') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(8)], 'vacio.png', { type: 'image/png' })] } })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('worldApp.ocrEmpty')
    })
    expect(screen.queryByLabelText('worldApp.ocrResult')).not.toBeInTheDocument()
  })
})
