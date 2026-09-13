import { useEditor, useEditorState, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useWritingActivity } from '@/hooks/useWritingActivity'
import { useAutoSave } from '@/hooks/useAutoSave'
import type { SaveStatus } from '@/hooks/useAutoSave'
import { countWritingWords } from './word-count'
import { Toolbar } from './Toolbar'
import type { AiSuggestion } from '@/types/ai'
import { AiHighlights, aiHighlightsKey, findQuoteRanges } from '@/components/ai/AiHighlights'
import '@/components/ai/ai.css'
import { ParagraphSpacing } from './extensions/ParagraphSpacing'
import { Check, Loader2, AlertCircle } from 'lucide-react'

interface DocumentEditorProps {
  documentId: string
  initialContent?: Record<string, unknown>
  onKeystroke?: () => void
  onContentChange?: (text: string) => void
  suggestions?: AiSuggestion[]
  revealSuggestion?: { suggestion: AiSuggestion; sequence: number } | null
}

function StatusIndicator({ status }: { status: SaveStatus }) {
  const { t } = useTranslation()
  if (status === 'idle') return null

  const config = {
    saving: { icon: Loader2, text: t('editorApp.saveSaving'), color: 'var(--color-ink-faint)', spin: true },
    saved: { icon: Check, text: t('editorApp.saveSaved'), color: 'var(--color-accent-teal)', spin: false },
    error: { icon: AlertCircle, text: t('editorApp.saveError'), color: 'var(--color-accent)', spin: false },
  } as const

  const { icon: Icon, text, color, spin } = config[status]

  return (
    <span className="flex items-center gap-1.5" style={{ color }}>
      <Icon className={`w-3 h-3 ${spin ? 'animate-spin' : ''}`} />
      {text}
    </span>
  )
}

export function DocumentEditor({ documentId, initialContent, onKeystroke, onContentChange, suggestions, revealSuggestion }: DocumentEditorProps) {
  const { t } = useTranslation()
  const recordWritingInput = useWritingActivity(documentId)
  const contentRef = useRef<Record<string, unknown> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        paragraph: false,
      }),
      ParagraphSpacing,
      AiHighlights,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyleKit.configure({
        color: false,
        backgroundColor: false,
        fontSize: false,
      }),
      Placeholder.configure({
        placeholder: t('editorApp.writingPlaceholder'),
      }),
      CharacterCount,
    ],
    content: initialContent || { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      contentRef.current = json
      triggerSaveRef.current?.()
      onKeystroke?.()
      recordWritingInput()
      onContentChange?.(editor.getText({ blockSeparator: '\n' }))
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
  })

  const counts = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      words: current ? countWritingWords(current.getText({ blockSeparator: '\n' })) : 0,
      characters: current?.storage.characterCount?.characters?.() ?? 0,
    }),
  })

  const getContent = useCallback(() => contentRef.current, [])

  const { triggerSave, status } = useAutoSave({
    documentId,
    getContent,
    debounceMs: 800,
  })

  const triggerSaveRef = useRef<(() => void) | null>(null)
  useLayoutEffect(() => { triggerSaveRef.current = triggerSave }, [triggerSave])

  useEffect(() => {
    if (editor && initialContent && JSON.stringify(editor.getJSON()) !== JSON.stringify(initialContent)) {
      editor.commands.setContent(initialContent, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, initialContent])

  useEffect(() => {
    if (!editor) return
    const text = editor.getText({ blockSeparator: '\n' })
    onContentChange?.(text)
  }, [editor, documentId, initialContent, onContentChange])

  useEffect(() => {
    if (editor) editor.view.dispatch(editor.state.tr.setMeta(aiHighlightsKey, (suggestions ?? []).filter((suggestion) => suggestion.documentId === documentId)))
  }, [editor, documentId, suggestions])

  useEffect(() => {
    if (!editor || !revealSuggestion || revealSuggestion.suggestion.documentId !== documentId) return
    const range = findQuoteRanges(editor.state.doc, revealSuggestion.suggestion.quote ?? '')[0]
    if (range) editor.chain().focus().setTextSelection(range).scrollIntoView().run()
  }, [editor, documentId, revealSuggestion])

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
            {t('editorApp.textCounts', { characters: counts?.characters ?? 0, words: counts?.words ?? 0 })}
          </span>
          <StatusIndicator status={status} />
        </div>
      )}
    </div>
  )
}
