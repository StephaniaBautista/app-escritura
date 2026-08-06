import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ArrowDown, ArrowUp, Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface ParagraphFormatMenuProps {
  editor: Editor
}

const LINE_HEIGHTS = ['1', '1.15', '1.5', '2', '2.5', '3']

export function ParagraphFormatMenu({ editor }: ParagraphFormatMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const lineHeight = editor.getAttributes('textStyle').lineHeight as string | undefined
  const spacing = editor.getAttributes('paragraph') as {
    spacingBefore?: string | null
    spacingAfter?: string | null
  }
  const beforeActive = spacing.spacingBefore === 'md'
  const afterActive = spacing.spacingAfter === 'md'

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const setLineHeight = (value: string) => {
    if (!value) {
      editor.chain().focus().unsetLineHeight().run()
    } else {
      editor.chain().focus().setLineHeight(value).run()
    }
    setOpen(false)
  }

  const toggleSpacing = (before: boolean) => {
    const active = before ? beforeActive : afterActive
    editor
      .chain()
      .focus()
      .setParagraphSpacing({ [before ? 'before' : 'after']: active ? 'none' : 'md' })
      .run()
  }

  const lineHeightOptions = [
    { value: '', label: t('editorApp.lineHeightDefault') },
    ...LINE_HEIGHTS.map((lh) => ({ value: lh, label: lh })),
  ]

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('editorApp.paragraphFormat')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-7 px-1.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-0.5"
        style={{
          background: 'var(--color-background)',
          color: open ? 'var(--color-accent)' : 'var(--color-ink)',
          border: '1px solid var(--color-paper-lines)',
        }}
      >
        <span className="max-w-[64px] truncate">
          {lineHeight ? `${lineHeight}` : t('editorApp.lineHeightDefault')}
        </span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-50 py-1 rounded-lg shadow-xl min-w-[190px]"
          style={{
            background: 'var(--color-paper)',
            border: '1px solid var(--color-paper-lines)',
          }}
        >
          <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
            {t('editorApp.lineHeight')}
          </p>
          {lineHeightOptions.map((option) => {
            const selected = option.value === (lineHeight ?? '')
            return (
              <button
                key={option.value || 'default'}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => setLineHeight(option.value)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:opacity-80'
                )}
                style={{ color: selected ? 'var(--color-accent)' : 'var(--color-ink)' }}
              >
                <span>{option.label}</span>
                {selected && <Check className="w-3.5 h-3.5" />}
              </button>
            )
          })}

          <div className="my-1 h-px" style={{ background: 'var(--color-paper-lines)' }} />

          <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
            {t('editorApp.paragraphSpacing')}
          </p>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={beforeActive}
            onClick={() => toggleSpacing(true)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:opacity-80'
            )}
            style={{ color: beforeActive ? 'var(--color-accent)' : 'var(--color-ink)' }}
          >
            <ArrowUp className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">{t('editorApp.spacingBefore')}</span>
            {beforeActive && <Check className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={afterActive}
            onClick={() => toggleSpacing(false)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:opacity-80'
            )}
            style={{ color: afterActive ? 'var(--color-accent)' : 'var(--color-ink)' }}
          >
            <ArrowDown className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">{t('editorApp.spacingAfter')}</span>
            {afterActive && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}
