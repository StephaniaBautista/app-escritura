import type { Editor } from '@tiptap/react'
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface AlignGroupProps {
  editor: Editor
}

const ALIGNMENTS = [
  { value: 'left', icon: AlignLeft, tooltip: 'editorApp.alignLeft' },
  { value: 'center', icon: AlignCenter, tooltip: 'editorApp.alignCenter' },
  { value: 'right', icon: AlignRight, tooltip: 'editorApp.alignRight' },
  { value: 'justify', icon: AlignJustify, tooltip: 'editorApp.alignJustify' },
] as const

export function AlignGroup({ editor }: AlignGroupProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-0.5">
      {ALIGNMENTS.map(({ value, icon: Icon, tooltip }) => {
        const active = editor.isActive({ textAlign: value })
        return (
          <button
            key={value}
            type="button"
            onClick={() => editor.chain().focus().setTextAlign(value).run()}
            title={t(tooltip)}
            aria-label={t(tooltip)}
            aria-pressed={active}
            className={cn(
              'p-1.5 rounded transition-colors hover:opacity-80'
            )}
            style={{
              color: active ? 'var(--color-accent)' : 'var(--color-ink-light)',
              background: active ? 'var(--color-accent-light)' : 'transparent',
            }}
          >
            <Icon className="w-4 h-4" />
          </button>
        )
      })}
    </div>
  )
}
