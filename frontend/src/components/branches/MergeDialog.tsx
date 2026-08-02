import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GitMerge, X } from 'lucide-react'
import { useBranchStore } from '@/stores/branch-store'
import { ConflictResolver } from './ConflictResolver'
import type { MergeResult } from '@/types/branch'

interface MergeDialogProps {
  documentId: string
  isOpen: boolean
  onClose: () => void
  onMerge: (sourceBranchId: string, targetBranchId: string) => Promise<MergeResult>
  onMergeResolved: (sourceBranchId: string, targetBranchId: string, content: unknown) => Promise<MergeResult>
}

export function MergeDialog({ isOpen, onClose, onMerge, onMergeResolved }: MergeDialogProps) {
  const { t } = useTranslation()
  const { branches, activeBranch } = useBranchStore()
  const [sourceBranchId, setSourceBranchId] = useState('')
  const [targetBranchId, setTargetBranchId] = useState(activeBranch?.id ?? '')
  const [merging, setMerging] = useState(false)
  const [result, setResult] = useState<MergeResult | null>(null)

  if (!isOpen) return null

  const availableSources = branches.filter((b) => b.id !== targetBranchId)
  const availableTargets = branches.filter((b) => b.id !== sourceBranchId)

  const handleMerge = async () => {
    if (!sourceBranchId || !targetBranchId) return
    setMerging(true)
    try {
      const mergeResult = await onMerge(sourceBranchId, targetBranchId)
      if (mergeResult.merged) {
        onClose()
        setResult(null)
      } else {
        setResult(mergeResult)
      }
    } catch (err) {
      console.error('Merge failed:', err)
    } finally {
      setMerging(false)
    }
  }

  const handleResolve = async (content: unknown) => {
    if (!sourceBranchId || !targetBranchId) return
    setMerging(true)
    try {
      const mergeResult = await onMergeResolved(sourceBranchId, targetBranchId, content)
      if (mergeResult.merged) {
        setResult(null)
        onClose()
      }
    } catch (err) {
      console.error('Merge resolve failed:', err)
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-lg shadow-xl border p-6"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <GitMerge className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            {t('branches.merge')}
          </h2>
          <button onClick={onClose} className="p-1 hover:opacity-80">
            <X className="w-5 h-5" style={{ color: 'var(--color-muted)' }} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-ink-light)' }}>
              {t('branches.mergeSource')}
            </label>
            <select
              value={sourceBranchId}
              onChange={(e) => setSourceBranchId(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              style={{
                background: 'var(--color-background)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-ink)',
              }}
            >
              <option value="">{t('branches.selectSource')}</option>
              {availableSources.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-ink-light)' }}>
              {t('branches.mergeTarget')}
            </label>
            <select
              value={targetBranchId}
              onChange={(e) => setTargetBranchId(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              style={{
                background: 'var(--color-background)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-ink)',
              }}
            >
              <option value="">{t('branches.selectTarget')}</option>
              {availableTargets.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {result && !result.merged && result.conflicts && result.mergedContent && (
          <ConflictResolver
            conflicts={result.conflicts}
            mergedContent={result.mergedContent}
            resolving={merging}
            onResolve={handleResolve}
            onCancel={() => setResult(null)}
          />
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border hover:opacity-80 transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink)' }}
          >
            {t('branches.cancel')}
          </button>
          <button
            onClick={handleMerge}
            disabled={!sourceBranchId || !targetBranchId || merging}
            className="px-4 py-2 text-sm rounded-lg text-white hover:opacity-90 transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
          >
            {merging ? t('branches.merging') : t('branches.mergeBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
