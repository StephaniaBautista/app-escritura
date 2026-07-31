import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { Toolbar } from './Toolbar'
import { ParagraphSpacing } from './extensions/ParagraphSpacing'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const editors: Editor[] = []

function createEditor(content?: string): Editor {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({ paragraph: false, heading: { levels: [1, 2, 3] } }),
      ParagraphSpacing,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyleKit.configure({ color: false, backgroundColor: false, fontSize: false }),
    ],
    content: content ?? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto' }] }] },
  })
  editors.push(editor)
  return editor
}

afterEach(() => {
  vi.clearAllMocks()
  editors.splice(0).forEach((editor) => editor.destroy())
})

describe('Toolbar', () => {
  it('renderiza los controles de formato existentes', () => {
    const editor = createEditor()
    render(<Toolbar editor={editor} />)

    expect(screen.getByLabelText('editorApp.bold')).toBeInTheDocument()
    expect(screen.getByLabelText('editorApp.heading1')).toBeInTheDocument()
    expect(screen.getByLabelText('editorApp.undo')).toBeInTheDocument()
  })

  it('aplica fuente con FontSelect y la quita con la opción predeterminada', () => {
    const editor = createEditor()
    render(<Toolbar editor={editor} />)

    const select = screen.getByLabelText('editorApp.fontFamily')
    fireEvent.change(select, { target: { value: 'var(--font-display)' } })

    expect(editor.getAttributes('textStyle').fontFamily).toBe('var(--font-display)')

    fireEvent.change(select, { target: { value: '' } })
    expect(editor.getAttributes('textStyle').fontFamily).toBeNull()
  })

  it('aplica interlineado con LineHeightSelect', () => {
    const editor = createEditor()
    render(<Toolbar editor={editor} />)

    fireEvent.change(screen.getByLabelText('editorApp.lineHeight'), { target: { value: '1.5' } })

    expect(editor.getAttributes('textStyle').lineHeight).toBe('1.5')
  })

  it('centra el texto con AlignGroup', () => {
    const editor = createEditor()
    render(<Toolbar editor={editor} />)

    fireEvent.click(screen.getByLabelText('editorApp.alignCenter'))

    expect(editor.isActive({ textAlign: 'center' })).toBe(true)
  })

  it('inserta guión largo con EmDashButton', () => {
    const editor = createEditor()
    render(<Toolbar editor={editor} />)

    fireEvent.click(screen.getByLabelText('editorApp.emDash'))

    expect(editor.getText()).toContain('—')
  })

  it('aplica espacio antes/después con ParagraphSpacingControls', () => {
    const editor = createEditor()
    render(<Toolbar editor={editor} />)

    fireEvent.click(screen.getByLabelText('editorApp.spacingBefore'))
    expect(editor.getAttributes('paragraph').spacingBefore).toBe('md')

    fireEvent.click(screen.getByLabelText('editorApp.spacingAfter'))
    expect(editor.getAttributes('paragraph').spacingAfter).toBe('md')
  })

  it('desactiva undo/redo cuando no hay historial', () => {
    const editor = createEditor()
    render(<Toolbar editor={editor} />)

    expect(screen.getByLabelText('editorApp.undo')).toBeDisabled()
    expect(screen.getByLabelText('editorApp.redo')).toBeDisabled()
  })

  it('marca como activo el botón de negrita cuando la selección es bold', () => {
    const editor = createEditor()
    editor.chain().focus().selectAll().toggleBold().run()
    render(<Toolbar editor={editor} />)

    expect(screen.getByLabelText('editorApp.bold')).toHaveAttribute('aria-pressed', 'true')
  })
})
