import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers, X, ChevronLeft, ChevronRight, Check, Pencil } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { StoryDuration } from './StoryDuration'
import { StoryGuidedQuestions } from './StoryGuidedQuestions'
import { StoryStructure } from './StoryStructure'
import type { StoryMeta } from '@/types/story'

type Phase = 'duration' | 'guided' | 'structure' | 'complete'

interface StructureDialogProps {
  projectId: string
  isOpen: boolean
  initialMeta?: StoryMeta
  onClose: () => void
  onStartWriting?: () => void
}

const PHASE_TITLES: Record<Phase, string> = {
  duration: 'storySetup.phaseDuration',
  guided: 'storySetup.phaseGuided',
  structure: 'storySetup.phaseStructure',
  complete: 'storySetup.phaseComplete',
}

export function StructureDialog({ projectId, isOpen, initialMeta, onClose, onStartWriting }: StructureDialogProps) {
  const { t } = useTranslation()
  const { updateStoryMeta } = useDocumentStore()
  const [phase, setPhase] = useState<Phase>('duration')
  const [meta, setMeta] = useState<StoryMeta>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setPhase('duration')
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

  const update = (patch: Partial<StoryMeta>) => setMeta((m) => ({ ...m, ...patch }))

  const phases: Phase[] = meta.guidedMode
    ? ['duration', 'guided', 'structure', 'complete']
    : ['duration', 'structure', 'complete']

  const currentIndex = phases.indexOf(phase)
  const isFirst = currentIndex === 0

  const goNext = () => {
    if (currentIndex < phases.length - 1) {
      setPhase(phases[currentIndex + 1])
    }
  }

  const goBack = () => {
    if (currentIndex > 0) {
      setPhase(phases[currentIndex - 1])
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateStoryMeta(projectId, meta as Record<string, unknown>)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('storySetup.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleStartWriting = async () => {
    await handleSave()
    onStartWriting?.()
    onClose()
  }

  const handleContinueDeveloping = async () => {
    await handleSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(PHASE_TITLES[phase])}
        className="relative w-full max-w-lg notebook-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <h2 className="font-display text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <Layers className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            {t(PHASE_TITLES[phase])}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="p-1.5 rounded-lg hover:opacity-80">
            <X className="w-5 h-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </div>

        <div className="flex items-center gap-1 px-5 py-3 border-b overflow-x-auto" style={{ borderColor: 'var(--color-paper-lines)' }}>
          {phases.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                if (i < currentIndex) setPhase(p)
              }}
              disabled={i > currentIndex}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                color: i === currentIndex ? 'var(--color-accent)' : i < currentIndex ? 'var(--color-ink-light)' : 'var(--color-ink-faint)',
                background: i === currentIndex ? 'var(--color-accent-light)' : 'transparent',
                opacity: i > currentIndex ? 0.5 : 1,
                cursor: i <= currentIndex ? 'pointer' : 'default',
              }}
              aria-current={i === currentIndex ? 'step' : undefined}
            >
              <span
                className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] flex-shrink-0"
                style={{
                  background: i <= currentIndex ? 'var(--color-accent)' : 'transparent',
                  border: i > currentIndex ? '1px solid var(--color-paper-lines)' : 'none',
                  color: i <= currentIndex ? '#fff' : 'inherit',
                }}
              >
                {i < currentIndex ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              {t(`storySetup.phase${p.charAt(0).toUpperCase() + p.slice(1)}`)}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {phase === 'duration' && <StoryDuration meta={meta} update={update} />}
          {phase === 'guided' && <StoryGuidedQuestions meta={meta} update={update} />}
          {phase === 'structure' && <StoryStructure meta={meta} update={update} />}
          {phase === 'complete' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-accent-light)' }}>
                <Check className="w-7 h-7" style={{ color: 'var(--color-accent)' }} />
              </div>
              <p className="font-display text-lg font-bold mb-1" style={{ color: 'var(--color-ink)' }}>
                {t('storySetup.completeTitle')}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
                {t('storySetup.completeDesc')}
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="px-5 pb-2 text-sm" style={{ color: 'var(--color-accent)' }}>{error}</p>
        )}

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--color-paper-lines)' }}>
          {phase === 'complete' ? (
            <>
              <button
                type="button"
                onClick={handleContinueDeveloping}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border hover:opacity-80 transition-colors disabled:opacity-50"
                style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
              >
                <Pencil className="w-4 h-4" />
                {saving ? t('common.saving') : t('storySetup.continueDeveloping')}
              </button>
              <button
                type="button"
                onClick={handleStartWriting}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50"
                style={{ background: 'var(--color-accent)' }}
              >
                <Pencil className="w-4 h-4" />
                {saving ? t('common.saving') : t('storySetup.startWriting')}
              </button>
            </>
          ) : (
            <>
              <div>
                {!isFirst && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border hover:opacity-80 transition-colors"
                    style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('storySetup.back')}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors"
                style={{ background: 'var(--color-accent)' }}
              >
                {t('storySetup.next')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
