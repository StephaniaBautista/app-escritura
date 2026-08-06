import type { Editor } from '@tiptap/react'
import { useTranslation } from 'react-i18next'

interface EmDashButtonProps {
  editor: Editor
}

export function EmDashButton({ editor }: EmDashButtonProps) {
  const { t } = useTranslation()

  const insertEmDash = () => {
    editor.chain().focus().insertContent(' — ').run()
  }

  return (
    <button
      type="button"
      onClick={insertEmDash}
      title={t('editorApp.emDash')}
      aria-label={t('editorApp.emDash')}
      className="h-7 px-1.5 rounded transition-colors hover:opacity-80 text-sm leading-none flex items-center"
      style={{
        color: 'var(--color-ink-light)',
        background: 'var(--color-background)',
        border: '1px dashed var(--color-paper-lines)',
        letterSpacing: '0.05em',
      }}
    >
      —
    </button>
  )
}
