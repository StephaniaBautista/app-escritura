import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GitBranch, ChevronDown, Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { useBranchStore } from '@/stores/branch-store'
import type { Branch } from '@/types/branch'
import { cn } from '@/lib/utils'

interface BranchSelectorProps {
  documentId: string
  onCreateBranch?: () => void
  onMergeBranch?: () => void
}

export function BranchSelector({ onCreateBranch, onMergeBranch }: BranchSelectorProps) {
  const { t } = useTranslation()
  const { branches, activeBranch, switchBranch, renameBranch, deleteBranch } = useBranchStore()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleSwitch = (branch: Branch) => {
    switchBranch(branch.id)
    setOpen(false)
  }

  const handleStartRename = (branch: Branch) => {
    setEditingId(branch.id)
    setEditName(branch.name)
  }

  const handleConfirmRename = async () => {
    if (editingId && editName.trim()) {
      await renameBranch(editingId, editName.trim())
      setEditingId(null)
    }
  }

  const handleCancelRename = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleDelete = async (branchId: string) => {
    await deleteBranch(branchId)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
        style={{
          color: 'var(--color-ink)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-paper)',
        }}
      >
        <GitBranch className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
        <span>{activeBranch?.name ?? t('branches.main')}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-1 z-40 w-56 rounded-lg shadow-lg border overflow-hidden"
            style={{ background: 'var(--color-paper)', borderColor: 'var(--color-border)' }}
          >
            <div className="p-1 max-h-60 overflow-y-auto">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer transition-colors',
                    activeBranch?.id === branch.id && 'font-semibold'
                  )}
                  style={{
                    color: activeBranch?.id === branch.id ? 'var(--color-accent)' : 'var(--color-ink)',
                    background: activeBranch?.id === branch.id ? 'var(--color-accent-light)' : 'transparent',
                  }}
                >
                  {editingId === branch.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename()
                          if (e.key === 'Escape') handleCancelRename()
                        }}
                        className="flex-1 px-1 py-0.5 text-sm rounded border"
                        style={{
                          background: 'var(--color-background)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-ink)',
                        }}
                        autoFocus
                      />
                      <button onClick={handleConfirmRename} className="p-0.5 hover:opacity-80">
                        <Check className="w-3 h-3" style={{ color: 'var(--color-accent)' }} />
                      </button>
                      <button onClick={handleCancelRename} className="p-0.5 hover:opacity-80">
                        <X className="w-3 h-3" style={{ color: 'var(--color-muted)' }} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSwitch(branch)}
                        className="flex-1 text-left truncate"
                      >
                        {branch.name}
                        {branch.isMain && (
                          <span className="ml-1 text-xs opacity-60">(main)</span>
                        )}
                      </button>
                      {!branch.isMain && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartRename(branch) }}
                            className="p-0.5 hover:opacity-80"
                            title={t('branches.rename')}
                          >
                            <Edit2 className="w-3 h-3" style={{ color: 'var(--color-muted)' }} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(branch.id) }}
                            className="p-0.5 hover:opacity-80"
                            title={t('branches.delete')}
                          >
                            <Trash2 className="w-3 h-3" style={{ color: 'var(--color-muted)' }} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t p-1" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => { setOpen(false); onCreateBranch?.() }}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:opacity-80 transition-colors"
                style={{ color: 'var(--color-accent)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                {t('branches.newBranch')}
              </button>
              {branches.length > 1 && (
                <button
                  onClick={() => { setOpen(false); onMergeBranch?.() }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:opacity-80 transition-colors"
                  style={{ color: 'var(--color-accent)' }}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  {t('branches.mergeBranch')}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
