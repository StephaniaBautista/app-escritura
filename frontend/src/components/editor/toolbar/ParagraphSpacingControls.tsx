import type { Editor } from '@tiptap/react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ParagraphSpacingControlsProps {
  editor: Editor
}

export function ParagraphSpacingControls({ editor }: ParagraphSpacingControlsProps) {
  const { t } = useTranslation()

  const attrs = editor.getAttributes('paragraph') as {
    spacingBefore?: string | null
    spacingAfter?: string | null
  }

  const beforeActive = attrs.spacingBefore === 'md'
  const afterActive = attrs.spacingAfter === 'md'

  const buttonStyle = (active: boolean): React.CSSProperties => ({
    color: active ? 'var(--color-accent)' : 'var(--color-ink-light)',
    background: active ? 'var(--color-accent-light)' : 'transparent',
  })

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() =>
          editor
            .chain()
            .focus()
            .setParagraphSpacing({ before: beforeActive ? 'none' : 'md' })
            .run()
        }
        title={t('editorApp.spacingBefore')}
        aria-label={t('editorApp.spacingBefore')}
        aria-pressed={beforeActive}
        className="p-1.5 rounded transition-colors hover:opacity-80"
        style={buttonStyle(beforeActive)}
      >
        <ArrowUp className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() =>
          editor
            .chain()
            .focus()
            .setParagraphSpacing({ after: afterActive ? 'none' : 'md' })
            .run()
        }
        title={t('editorApp.spacingAfter')}
        aria-label={t('editorApp.spacingAfter')}
        aria-pressed={afterActive}
        className="p-1.5 rounded transition-colors hover:opacity-80"
        style={buttonStyle(afterActive)}
      >
        <ArrowDown className="w-4 h-4" />
      </button>
    </div>
  )
}
