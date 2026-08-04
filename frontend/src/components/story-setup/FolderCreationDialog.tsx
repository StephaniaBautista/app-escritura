import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpen, Sparkles, X } from 'lucide-react'

interface FolderCreationDialogProps {
  projectName: string
  isOpen: boolean
  onSkip: () => void
  onComplete: () => void
  onClose: () => void
}

export function FolderCreationDialog({ projectName, isOpen, onSkip, onComplete, onClose }: FolderCreationDialogProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('storySetup.chooseTitle')}
        className="relative w-full max-w-md notebook-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-accent-light)' }}>
              <FolderOpen className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold" style={{ color: 'var(--color-ink)' }}>
                {t('storySetup.chooseTitle')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{projectName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="p-1.5 rounded-lg hover:opacity-80">
            <X className="w-5 h-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
            {t('storySetup.chooseDesc')}
          </p>

          <button
            type="button"
            onClick={onSkip}
            className="w-full flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:opacity-90"
            style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}
          >
            <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent-violet)' }} />
            <span>
              <span className="block font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>
                {t('storySetup.skipWizard')}
              </span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                {t('storySetup.skipWizardDesc')}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onComplete}
            className="w-full flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:opacity-90"
            style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-light)' }}
          >
            <FolderOpen className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
            <span>
              <span className="block font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>
                {t('storySetup.completeWizard')}
              </span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                {t('storySetup.completeWizardDesc')}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
