import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, History, RotateCcw, Trash2 } from 'lucide-react'
import type { DocumentVersion } from '@/types/document'
import { cn } from '@/lib/utils'
import { extractTextFromTiptap } from '@/lib/tiptap-text'

interface VersionCardProps {
  version: DocumentVersion
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  getContent: (id: string) => Promise<DocumentVersion | null>
}

export function VersionCard({ version, onRestore, onDelete, getContent }: VersionCardProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState<DocumentVersion | null>(null)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    const next = !open
    setOpen(next)
    if (next && !content) {
      setLoading(true)
      const full = await getContent(version.id)
      if (full) setContent(full)
      setLoading(false)
    }
  }

  const text = content ? extractTextFromTiptap(content.content).trim() : ''

  return (
    <div className="notebook-paper p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={open}
          className="flex items-center gap-2 flex-1 min-w-0 text-left rounded transition-opacity hover:opacity-80"
        >
          <ChevronDown
            className={cn(
              'w-4 h-4 flex-shrink-0 transition-transform duration-200',
              !open && '-rotate-90'
            )}
            style={{ color: 'var(--color-ink-faint)' }}
          />
          <History className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate" style={{ color: 'var(--color-ink)' }}>
              {t('versions.versionNum', { version: version.version })}
            </h3>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-ink-faint)' }}>
              {version.title} · {new Date(version.createdAt).toLocaleString()}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onRestore(version.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 flex-shrink-0"
          style={{ color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
          title={t('versions.restore')}
          aria-label={t('versions.restore')}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('versions.restore')}
        </button>
        <button
          type="button"
          onClick={() => onDelete(version.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 flex-shrink-0"
          style={{ color: 'var(--color-ink-light)', border: '1px solid var(--color-paper-lines)' }}
          title={t('versions.delete')}
          aria-label={t('versions.delete')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="mt-3 pl-6">
          {loading ? (
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>{t('common.loading')}</p>
          ) : (
            <div
              className="px-3 py-2 text-sm rounded-lg whitespace-pre-wrap"
              style={{ background: 'var(--color-background)', color: 'var(--color-ink-light)' }}
            >
              {text || t('versions.noContent')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
