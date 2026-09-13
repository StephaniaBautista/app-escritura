import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Editor } from '@tiptap/core'
import { DocumentEditor } from '../DocumentEditor'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: { words?: number }) => key === 'editorApp.textCounts' ? `${values?.words} words` : key }) }))

const { triggerSave } = vi.hoisted(() => ({ triggerSave: vi.fn() }))
vi.mock('@/hooks/useAutoSave', () => ({ useAutoSave: () => ({ triggerSave, status: 'idle' }) }))
vi.mock('../Toolbar', () => ({ Toolbar: ({ editor }: { editor: Editor | null }) => <button type="button" disabled={!editor} onClick={() => editor?.commands.insertContentAt(editor.state.doc.content.size - 1, 'x')}>Primera pulsación</button> }))

beforeEach(() => { vi.clearAllMocks() })

const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ana tenía veinte años.' }] }] }

describe('DocumentEditor content notifications', () => {
  it('counts loaded Unicode words across paragraphs and hard breaks without counting emoji or standalone punctuation', async () => {
    const loaded = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Árbol 42 🙂 —' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'bue' }, { type: 'text', marks: [{ type: 'bold' }], text: 'nos' }, { type: 'hardBreak' }, { type: 'text', text: 'días' }] },
    ] }
    render(<DocumentEditor documentId="chapter-1" initialContent={loaded} />)
    expect(await screen.findByText('4 words')).toBeVisible()
    expect(triggerSave).not.toHaveBeenCalled()
  })

  it('notifies draft observers and autosave on the very first edit after loading normalized content', async () => {
    const onContentChange = vi.fn()
    const onKeystroke = vi.fn()
    render(<DocumentEditor documentId="chapter-1" initialContent={content} onContentChange={onContentChange} onKeystroke={onKeystroke} />)
    await waitFor(() => expect(onContentChange).toHaveBeenCalledWith('Ana tenía veinte años.'))
    expect(triggerSave).not.toHaveBeenCalled()
    onContentChange.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Primera pulsación' }))
    expect(onContentChange).toHaveBeenCalledExactlyOnceWith('Ana tenía veinte años.x')
    expect(onKeystroke).toHaveBeenCalledTimes(1)
    expect(triggerSave).toHaveBeenCalledTimes(1)
  })

  it('notifies draft observers on a restored version without scheduling autosave, then preserves its first edit', async () => {
    const onContentChange = vi.fn()
    const { rerender } = render(<DocumentEditor documentId="chapter-1" initialContent={content} onContentChange={onContentChange} />)
    await waitFor(() => expect(onContentChange).toHaveBeenCalledWith('Ana tenía veinte años.'))
    const restored = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ana volvió a casa.' }] }] }
    rerender(<DocumentEditor documentId="chapter-1" initialContent={restored} onContentChange={onContentChange} />)
    expect(onContentChange).toHaveBeenLastCalledWith('Ana volvió a casa.')
    expect(triggerSave).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Primera pulsación' }))
    expect(onContentChange).toHaveBeenLastCalledWith('Ana volvió a casa.x')
    expect(triggerSave).toHaveBeenCalledTimes(1)
  })
})
