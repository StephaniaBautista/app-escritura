import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoSave } from '@/hooks/useAutoSave'
import type { SaveStatus } from '@/hooks/useAutoSave'
import { Toolbar } from './Toolbar'
import { ParagraphSpacing } from './extensions/ParagraphSpacing'
import { Check, Loader2, AlertCircle } from 'lucide-react'

interface DocumentEditorProps {
  documentId: string
  initialContent?: Record<string, unknown>
  onKeystroke?: () => void
}

function getWordCount(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function StatusIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null

  const config = {
    saving: { icon: Loader2, text: 'Guardando...', color: 'var(--color-ink-faint)', spin: true },
    saved: { icon: Check, text: 'Guardado', color: 'var(--color-accent-teal)', spin: false },
    error: { icon: AlertCircle, text: 'Error al guardar', color: 'var(--color-accent)', spin: false },
  } as const

  const { icon: Icon, text, color, spin } = config[status]

  return (
    <span className="flex items-center gap-1.5" style={{ color }}>
      <Icon className={`w-3 h-3 ${spin ? 'animate-spin' : ''}`} />
      {text}
    </span>
  )
}

export function DocumentEditor({ documentId, initialContent, onKeystroke }: DocumentEditorProps) {
  const contentRef = useRef<Record<string, unknown> | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const skipNextUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        paragraph: false,
      }),
      ParagraphSpacing,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyleKit.configure({
        color: false,
        backgroundColor: false,
        fontSize: false,
      }),
      Placeholder.configure({
        placeholder: 'Empieza a escribir tu historia...',
      }),
      CharacterCount,
    ],
    content: initialContent || { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => {
      if (skipNextUpdate.current) {
        skipNextUpdate.current = false
        return
      }
      const json = editor.getJSON()
      contentRef.current = json
      const text = editor.state.doc.textContent
      setWordCount(getWordCount(text))
      triggerSaveRef.current?.()
      onKeystroke?.()
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
  })

  const getContent = useCallback(() => contentRef.current, [])

  const { triggerSave, status } = useAutoSave({
    documentId,
    getContent,
    debounceMs: 800,
  })

  const triggerSaveRef = useRef<(() => void) | null>(null)
  triggerSaveRef.current = triggerSave

  useEffect(() => {
    if (editor && initialContent && JSON.stringify(editor.getJSON()) !== JSON.stringify(initialContent)) {
      skipNextUpdate.current = true
      editor.commands.setContent(initialContent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, initialContent])

  const charCount = editor?.storage.characterCount?.characters?.() ?? 0

  return (
    <div className="flex flex-col h-full">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      {editor && (
        <div
          className="px-8 py-2 text-xs border-t flex items-center justify-between"
          style={{ color: 'var(--color-ink-faint)', borderColor: 'var(--color-paper-lines)' }}
        >
          <span>
            {charCount} caracteres · {wordCount} palabras
          </span>
          <StatusIndicator status={status} />
        </div>
      )}
    </div>
  )
}
