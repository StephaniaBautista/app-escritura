import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GitBranch, X } from 'lucide-react'
import { useBranchStore } from '@/stores/branch-store'

interface CreateBranchDialogProps {
  documentId: string
  isOpen: boolean
  onClose: () => void
  sourceVersionId?: string
}

export function CreateBranchDialog({ documentId, isOpen, onClose, sourceVersionId }: CreateBranchDialogProps) {
  const { t } = useTranslation()
  const { createBranch } = useBranchStore()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      await createBranch(documentId, { name: name.trim(), sourceVersionId })
      setName('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('branches.createError'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-lg shadow-xl border p-6"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <GitBranch className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            {t('branches.newBranch')}
          </h2>
          <button onClick={onClose} className="p-1 hover:opacity-80">
            <X className="w-5 h-5" style={{ color: 'var(--color-muted)' }} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-ink-light)' }}>
            {t('branches.branchName')}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            placeholder={t('branches.branchPlaceholder')}
            className="w-full rounded border px-3 py-2 text-sm"
            style={{
              background: 'var(--color-background)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink)',
            }}
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm mt-2" style={{ color: 'var(--color-accent)' }}>{error}</p>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border hover:opacity-80 transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink)' }}
          >
            {t('branches.cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="px-4 py-2 text-sm rounded-lg text-white hover:opacity-90 transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
          >
            {creating ? t('branches.creating') : t('branches.create')}
          </button>
        </div>
      </div>
    </div>
  )
}
