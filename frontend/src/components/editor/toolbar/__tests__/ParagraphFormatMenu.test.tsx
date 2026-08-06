import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { ParagraphFormatMenu } from '../ParagraphFormatMenu'
import { ParagraphSpacing } from '../../extensions/ParagraphSpacing'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const editors: Editor[] = []

function createEditor(): Editor {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({ paragraph: false }),
      ParagraphSpacing,
      TextStyleKit.configure({ color: false, backgroundColor: false, fontSize: false }),
    ],
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto' }] }] },
  })
  editors.push(editor)
  return editor
}

afterEach(() => {
  vi.clearAllMocks()
  editors.splice(0).forEach((editor) => editor.destroy())
})

describe('ParagraphFormatMenu', () => {
  it('abre el popover con interlineado y espaciado de párrafo', () => {
    const editor = createEditor()
    render(<ParagraphFormatMenu editor={editor} />)

    fireEvent.click(screen.getByLabelText('editorApp.paragraphFormat'))

    expect(screen.getByRole('menuitemradio', { name: 'editorApp.lineHeightDefault' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: '1.5' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: /editorApp.spacingBefore/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: /editorApp.spacingAfter/ })).toBeInTheDocument()
  })

  it('cierra con Escape', () => {
    const editor = createEditor()
    render(<ParagraphFormatMenu editor={editor} />)

    fireEvent.click(screen.getByLabelText('editorApp.paragraphFormat'))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('cierra al hacer click fuera', () => {
    const editor = createEditor()
    render(<ParagraphFormatMenu editor={editor} />)

    fireEvent.click(screen.getByLabelText('editorApp.paragraphFormat'))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('marca como seleccionado el interlineado activo', () => {
    const editor = createEditor()
    editor.chain().setLineHeight('2').run()
    render(<ParagraphFormatMenu editor={editor} />)

    fireEvent.click(screen.getByLabelText('editorApp.paragraphFormat'))

    expect(screen.getByRole('menuitemradio', { name: '2' })).toHaveAttribute('aria-checked', 'true')
  })
})
