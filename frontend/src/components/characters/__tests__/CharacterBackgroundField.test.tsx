import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CharacterBackgroundField } from '../CharacterBackgroundField'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, vars?: Record<string, unknown>) => (vars ? key : key) }),
}))

const toastError = vi.hoisted(() => vi.fn())

vi.mock('@/stores/toast-store', () => ({
  useToastStore: () => ({ error: toastError }),
}))

function makeFile(name: string, type = 'image/png'): File {
  return new File(['x'], name, { type })
}

describe('CharacterBackgroundField', () => {
  it('permite seleccionar el modo collage con un control accesible', () => {
    const onModeChange = vi.fn()

    render(
      <CharacterBackgroundField
        mode="default"
        existingImages={[]}
        newImages={[]}
        onModeChange={onModeChange}
        onExistingImagesChange={vi.fn()}
        onNewImagesChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('characterApp.sheetBackgroundCollage'))

    expect(onModeChange).toHaveBeenCalledWith('collage')
  })

  it('limita el selector a una imagen cuando el modo es single', () => {
    render(
      <CharacterBackgroundField
        mode="single"
        existingImages={[]}
        newImages={[]}
        onModeChange={vi.fn()}
        onExistingImagesChange={vi.fn()}
        onNewImagesChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('characterApp.sheetBackgroundUpload')).not.toHaveAttribute('multiple')
  })

  it('muestra el contador de imágenes en modo collage', () => {
    render(
      <CharacterBackgroundField
        mode="collage"
        existingImages={['https://cdn.example.com/one.jpg']}
        newImages={['data:image/png;base64,AAA']}
        onModeChange={vi.fn()}
        onExistingImagesChange={vi.fn()}
        onNewImagesChange={vi.fn()}
      />,
    )

    expect(screen.getByText('characterApp.sheetImageCounter')).toBeInTheDocument()
    expect(screen.getByText('characterApp.sheetImageRemaining')).toBeInTheDocument()
  })

  it('deshabilita la subida y marca el límite cuando se alcanza el máximo', () => {
    const images = Array.from({ length: 6 }, (_, i) => `https://cdn.example.com/${i}.jpg`)

    render(
      <CharacterBackgroundField
        mode="collage"
        existingImages={images}
        newImages={[]}
        onModeChange={vi.fn()}
        onExistingImagesChange={vi.fn()}
        onNewImagesChange={vi.fn()}
      />,
    )

    expect(screen.getByText('characterApp.sheetImageFull')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'characterApp.sheetBackgroundUpload' })).toBeDisabled()
  })

  it('bloquea la subida cuando se exceden las imágenes disponibles', async () => {
    const onNewImagesChange = vi.fn()
    toastError.mockClear()

    render(
      <CharacterBackgroundField
        mode="collage"
        existingImages={['https://cdn.example.com/one.jpg']}
        newImages={['https://cdn.example.com/two.jpg', 'https://cdn.example.com/three.jpg', 'https://cdn.example.com/four.jpg', 'https://cdn.example.com/five.jpg']}
        onModeChange={vi.fn()}
        onExistingImagesChange={vi.fn()}
        onNewImagesChange={onNewImagesChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('characterApp.sheetBackgroundUpload'), {
      target: { files: [makeFile('a.png'), makeFile('b.png')] },
    })

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('characterApp.sheetBackgroundTooMany')
    })
    expect(onNewImagesChange).not.toHaveBeenCalled()
  })
})
