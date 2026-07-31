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
      className="px-2 h-7 rounded transition-colors hover:opacity-80 font-medium text-sm leading-none"
      style={{ color: 'var(--color-ink-light)', background: 'transparent' }}
    >
      —
    </button>
  )
}
