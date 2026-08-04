import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, X, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { DirectMode } from './DirectMode'
import type { StoryMeta } from '@/types/story'

interface StoryWizardProps {
  projectId: string
  isOpen: boolean
  initialDescription?: string
  initialMeta?: StoryMeta
  onClose: () => void
  onSaved: () => void
}

interface WizardStep {
  id: string
  titleKey: string
}

const STEPS: WizardStep[] = [
  { id: 'description', titleKey: 'storySetup.stepDescription' },
]

export function StoryWizard({ projectId, isOpen, initialDescription, initialMeta, onClose, onSaved }: StoryWizardProps) {
  const { t } = useTranslation()
  const { updateProject, updateStoryMeta } = useDocumentStore()
  const [current, setCurrent] = useState(0)
  const [description, setDescription] = useState('')
  const [meta, setMeta] = useState<StoryMeta>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCurrent(0)
      setDescription(initialDescription ?? '')
      setMeta(initialMeta ?? {})
      setError(null)
    }
  }, [isOpen, initialDescription, initialMeta])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const step = STEPS[current]
  const isLast = current === STEPS.length - 1

  const handleFinish = async () => {
    setSaving(true)
    setError(null)
    try {
      if (description.trim()) {
        await updateProject(projectId, { description: description.trim() })
      }
      await updateStoryMeta(projectId, meta as Record<string, unknown>)
      onSaved()
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
        aria-label={t('storySetup.title')}
        className="relative w-full max-w-lg notebook-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <h2 className="font-display text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <BookOpen className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            {t('storySetup.title')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="p-1.5 rounded-lg hover:opacity-80">
            <X className="w-5 h-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-b overflow-x-auto" style={{ borderColor: 'var(--color-paper-lines)' }}>
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
              style={{
                color: i === current ? 'var(--color-accent)' : i < current ? 'var(--color-ink-light)' : 'var(--color-ink-faint)',
              }}
            >
              <span
                className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] flex-shrink-0"
                style={{
                  background: i <= current ? 'var(--color-accent)' : 'transparent',
                  border: i > current ? '1px solid var(--color-paper-lines)' : 'none',
                  color: i <= current ? '#fff' : 'inherit',
                }}
              >
                {i < current ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              {t(s.titleKey)}
            </span>
          ))}
        </div>

        <div className="p-5">
          {step.id === 'description' && <DirectMode value={description} onChange={setDescription} />}
        </div>

        {error && (
          <p className="px-5 pb-2 text-sm" style={{ color: 'var(--color-accent)' }}>{error}</p>
        )}

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border hover:opacity-80 transition-colors"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
          >
            {t('storySetup.skip')}
          </button>

          <div className="flex items-center gap-2">
            {current > 0 && (
              <button
                type="button"
                onClick={() => setCurrent((c) => c - 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium border hover:opacity-80 transition-colors"
                style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
              >
                <ChevronLeft className="w-4 h-4" />
                {t('storySetup.back')}
              </button>
            )}
            {!isLast ? (
              <button
                type="button"
                onClick={() => setCurrent((c) => c + 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors"
                style={{ background: 'var(--color-accent)' }}
              >
                {t('storySetup.next')}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50"
                style={{ background: 'var(--color-accent)' }}
              >
                <Check className="w-4 h-4" />
                {saving ? t('common.saving') : t('storySetup.finish')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
