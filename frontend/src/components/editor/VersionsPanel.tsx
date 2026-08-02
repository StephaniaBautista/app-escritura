import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, History, GitBranch } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { useBranchStore } from '@/stores/branch-store'
import { useToastStore } from '@/stores/toast-store'
import { VersionsList } from '@/components/versions/VersionsList'
import { BranchSelector } from '@/components/branches/BranchSelector'
import { BranchGraph } from '@/components/branches/BranchGraph'
import { CreateBranchDialog } from '@/components/branches/CreateBranchDialog'
import { MergeDialog } from '@/components/branches/MergeDialog'
import type { MergeResult } from '@/types/branch'

interface VersionsPanelProps {
  documentId: string
  onClose: () => void
}

type PanelTab = 'versions' | 'graph'

export function VersionsPanel({ documentId, onClose }: VersionsPanelProps) {
  const { t } = useTranslation()
  const { loadVersions } = useDocumentStore()
  const { loadBranches, activeBranch, mergeBranch, loadGraph } = useBranchStore()
  const { success, error: toastError } = useToastStore()
  const [tab, setTab] = useState<PanelTab>('versions')
  const [showCreateBranch, setShowCreateBranch] = useState(false)
  const [showMerge, setShowMerge] = useState(false)

  useEffect(() => {
    loadBranches(documentId)
    loadVersions(documentId)
  }, [documentId, loadBranches, loadVersions])

  useEffect(() => {
    if (activeBranch) {
      loadVersions(documentId)
    }
  }, [activeBranch, documentId, loadVersions])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const reloadAfterMerge = async () => {
    await Promise.all([loadVersions(documentId), loadBranches(documentId), loadGraph(documentId)])
  }

  const handleMerge = async (sourceBranchId: string, targetBranchId: string): Promise<MergeResult> => {
    try {
      const result = await mergeBranch(sourceBranchId, targetBranchId)
      if (result.merged) {
        success(t('branches.mergedMsg'))
        await reloadAfterMerge()
      }
      return result
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('branches.mergeError'))
      throw err
    }
  }

  const handleMergeResolved = async (
    sourceBranchId: string,
    targetBranchId: string,
    content: unknown,
  ): Promise<MergeResult> => {
    try {
      const result = await mergeBranch(sourceBranchId, targetBranchId, { content })
      if (result.merged) {
        success(t('branches.mergedMsg'))
        await reloadAfterMerge()
      } else {
        toastError(t('branches.mergeError'))
      }
      return result
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('branches.mergeError'))
      throw err
    }
  }

  return (
    <>
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

          <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--color-paper-lines)' }}>
            <BranchSelector
              documentId={documentId}
              onCreateBranch={() => setShowCreateBranch(true)}
              onMergeBranch={() => setShowMerge(true)}
            />
          </div>

          <div className="flex border-b" style={{ borderColor: 'var(--color-paper-lines)' }}>
            <button
              onClick={() => setTab('versions')}
              className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: tab === 'versions' ? 'var(--color-accent)' : 'var(--color-muted)',
                borderBottom: tab === 'versions' ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
            >
              {t('branches.tabVersions')}
            </button>
            <button
              onClick={() => setTab('graph')}
              className="flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
              style={{
                color: tab === 'graph' ? 'var(--color-accent)' : 'var(--color-muted)',
                borderBottom: tab === 'graph' ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
            >
              <GitBranch className="w-3.5 h-3.5" />
              {t('branches.tabGraph')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'versions' ? (
              <VersionsList documentId={documentId} />
            ) : (
              <BranchGraph documentId={documentId} />
            )}
          </div>
        </div>
      </div>

      <CreateBranchDialog
        documentId={documentId}
        isOpen={showCreateBranch}
        onClose={() => setShowCreateBranch(false)}
      />

      <MergeDialog
        documentId={documentId}
        isOpen={showMerge}
        onClose={() => setShowMerge(false)}
        onMerge={handleMerge}
        onMergeResolved={handleMergeResolved}
      />
    </>
  )
}
