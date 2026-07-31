import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, History } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { VersionsList } from '@/components/versions/VersionsList'

interface VersionsPanelProps {
  documentId: string
  onClose: () => void
}

export function VersionsPanel({ documentId, onClose }: VersionsPanelProps) {
  const { t } = useTranslation()
  const { loadVersions } = useDocumentStore()

  useEffect(() => {
    loadVersions(documentId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('versions.title')}
        className="absolute right-0 top-0 bottom-0 w-full max-w-sm flex flex-col shadow-xl"
        style={{ background: 'var(--color-paper)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-paper-lines)' }}
        >
          <h2 className="font-display font-semibold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <History className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
            {t('versions.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-ink-light)' }}
            title={t('editorApp.panelClose')}
            aria-label={t('editorApp.panelClose')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <VersionsList documentId={documentId} />
        </div>
      </div>
    </div>
  )
}
