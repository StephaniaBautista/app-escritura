import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { History, Camera } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import type { DocumentVersion } from '@/types/document'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingState } from '@/components/ui/LoadingState'
import { VersionCard } from './VersionCard'

interface VersionsListProps {
  documentId: string
}

export function VersionsList({ documentId }: VersionsListProps) {
  const { t } = useTranslation()
  const { versions, versionsLoading, createVersion, getVersion, restoreVersion, deleteVersion } = useDocumentStore()
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>
          {t('versions.title')}
        </h2>
        <button
          onClick={() => createVersion(documentId)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Camera className="w-4 h-4" />
          {t('versions.newVersion')}
        </button>
      </div>

      {versionsLoading ? (
        <LoadingState label={t('common.loading')} className="notebook-paper" />
      ) : versions.length > 0 ? (
        <div className="space-y-2">
          {versions.map((version: DocumentVersion) => (
            <VersionCard
              key={version.id}
              version={version}
              onRestore={(id) => setRestoreTarget(id)}
              onDelete={(id) => setDeleteTarget(id)}
              getContent={getVersion}
            />
          ))}
        </div>
      ) : (
        <div className="notebook-paper p-8 text-center">
          <History className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-ink-faint)' }} />
          <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>
            {t('versions.empty')}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-ink-faint)' }}>
            {t('versions.emptyDesc')}
          </p>
        </div>
      )}

      <ConfirmDialog
        isOpen={restoreTarget !== null}
        title={t('versions.restoreTitle')}
        message={t('versions.confirmRestore')}
        confirmLabel={t('versions.restore')}
        onConfirm={() => {
          if (restoreTarget) restoreVersion(restoreTarget)
          setRestoreTarget(null)
        }}
        onCancel={() => setRestoreTarget(null)}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('versions.deleteTitle')}
        message={t('versions.confirmDelete')}
        confirmLabel={t('versions.delete')}
        onConfirm={() => {
          if (deleteTarget) deleteVersion(deleteTarget)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
