import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useCallback, useEffect, useRef } from 'react'
import { useAutoSave } from '@/hooks/useAutoSave'
import { Toolbar } from './Toolbar'

interface DocumentEditorProps {
  documentId: string
  initialContent?: Record<string, unknown>
  onUpdate?: (content: Record<string, unknown>) => void
}

export function DocumentEditor({ documentId, initialContent, onUpdate }: DocumentEditorProps) {
  const contentRef = useRef<Record<string, unknown> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Empieza a escribir tu historia...',
      }),
      CharacterCount,
    ],
    content: initialContent || { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      contentRef.current = json
      onUpdate?.(json)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
  })

  const getContent = useCallback(() => contentRef.current, [])

  const { triggerSave } = useAutoSave({
    documentId,
    getContent,
    debounceMs: 500,
  })

  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      triggerSave()
    }

    editor.on('update', handleUpdate)
    return () => { editor.off('update', handleUpdate) }
  }, [editor, triggerSave])

  useEffect(() => {
    if (editor && initialContent && JSON.stringify(editor.getJSON()) !== JSON.stringify(initialContent)) {
      editor.commands.setContent(initialContent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  return (
    <div className="flex flex-col h-full">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      {editor && (
        <div className="px-8 py-2 text-xs border-t" style={{ color: 'var(--color-ink-faint)', borderColor: 'var(--color-paper-lines)' }}>
          {editor.storage.characterCount?.characters?.() ?? 0} caracteres
        </div>
      )}
    </div>
  )
}
