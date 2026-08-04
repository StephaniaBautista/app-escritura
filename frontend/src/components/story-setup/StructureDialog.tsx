import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers, X, Check } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { StoryStructure } from './StoryStructure'
import type { StoryMeta } from '@/types/story'

interface StructureDialogProps {
  projectId: string
  isOpen: boolean
  initialMeta?: StoryMeta
  onClose: () => void
}

export function StructureDialog({ projectId, isOpen, initialMeta, onClose }: StructureDialogProps) {
  const { t } = useTranslation()
  const { updateStoryMeta } = useDocumentStore()
  const [meta, setMeta] = useState<StoryMeta>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setMeta(initialMeta ?? {})
      setError(null)
    }
  }, [isOpen, initialMeta])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateStoryMeta(projectId, meta as Record<string, unknown>)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('storySetup.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('storySetup.structureTabTitle')}
        className="relative w-full max-w-lg notebook-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <h2 className="font-display text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <Layers className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            {t('storySetup.structureTabTitle')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="p-1.5 rounded-lg hover:opacity-80">
            <X className="w-5 h-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          <StoryStructure
            meta={meta}
            update={(patch) => setMeta((m) => ({ ...m, ...patch }))}
          />
        </div>

        {error && (
          <p className="px-5 pb-2 text-sm" style={{ color: 'var(--color-accent)' }}>{error}</p>
        )}

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border hover:opacity-80 transition-colors"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
          >
            <Check className="w-4 h-4" />
            {saving ? t('common.saving') : t('storySetup.saveStructure')}
          </button>
        </div>
      </div>
    </div>
  )
}
