import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Eye, EyeOff, RotateCcw } from 'lucide-react'
import type { Note } from '@/types/document'
import { cn } from '@/lib/utils'
import { KebabMenu } from '@/components/ui/KebabMenu'

export type PostItVariant = 'yellow' | 'blue' | 'pink'

interface PostItProps {
  note: Note
  variant?: PostItVariant
  tilt?: number
  onUpdate: (id: string, data: { title?: string; content?: string; isHidden?: boolean }) => Promise<void>
  onDelete: (id: string) => void
  compact?: boolean
}

const VARIANT_STYLES: Record<PostItVariant, { bg: string; border: string; shadow: string }> = {
  yellow: {
    bg: 'var(--color-postit-yellow)',
    border: 'var(--color-postit-yellow-border)',
    shadow: 'var(--color-postit-yellow-shadow)',
  },
  blue: {
    bg: 'var(--color-postit-blue)',
    border: 'var(--color-postit-blue-border)',
    shadow: 'var(--color-postit-blue-shadow)',
  },
  pink: {
    bg: 'var(--color-postit-pink)',
    border: 'var(--color-postit-pink-border)',
    shadow: 'var(--color-postit-pink-shadow)',
  },
}

const AUTOSAVE_DELAY = 600

export function PostIt({ note, variant = 'yellow', tilt = 0, onUpdate, onDelete, compact = false }: PostItProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState(note.content)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const styles = VARIANT_STYLES[variant]

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (content !== note.content) {
        onUpdate(note.id, { content })
      }
    }, AUTOSAVE_DELAY)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  return (
    <div
      className="p-3 text-xs rounded-sm"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        boxShadow: `2px 2px 0 ${styles.shadow}`,
        transform: `rotate(${tilt}deg)`,
        color: 'var(--color-ink)',
      }}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="flex items-start gap-1 flex-1 min-w-0 text-left rounded transition-opacity hover:opacity-80"
        >
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 mt-0.5 flex-shrink-0 transition-transform duration-200',
              !open && '-rotate-90'
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-snug break-words">{note.title}</p>
            {!compact && (
              <p className="mt-0.5 leading-snug line-clamp-3 break-words opacity-80">
                {note.content || t('notes.emptyContent')}
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {compact ? (
            <button
              type="button"
              onClick={() => onUpdate(note.id, { isHidden: false })}
              className="p-1 rounded transition-opacity hover:opacity-80"
              title={t('postit.restore')}
              aria-label={t('postit.restore')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onUpdate(note.id, { isHidden: !note.isHidden })}
              className="p-1 rounded transition-opacity hover:opacity-80"
              title={t(note.isHidden ? 'postit.show' : 'postit.hide')}
              aria-label={t(note.isHidden ? 'postit.show' : 'postit.hide')}
            >
              {note.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          <div className="-mr-1.5">
            <KebabMenu onDelete={() => onDelete(note.id)} />
          </div>
        </div>
      </div>

      {open && !compact && (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('notes.contentPlaceholder')}
          rows={4}
          className="w-full mt-2 px-2 py-1.5 text-xs rounded-sm border resize-y"
          style={{
            background: 'var(--color-background)',
            borderColor: 'var(--color-paper-lines)',
            color: 'var(--color-ink)',
          }}
        />
      )}
    </div>
  )
}
