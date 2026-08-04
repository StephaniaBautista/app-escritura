import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers, Pencil } from 'lucide-react'
import { StructureDialog } from './StructureDialog'
import type { StoryMeta } from '@/types/story'

interface StoryStructureTabProps {
  projectId: string
  storyMeta: StoryMeta
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-base font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3 py-1.5 border-b last:border-b-0" style={{ borderColor: 'var(--color-paper-lines)' }}>
      <dt className="text-xs font-medium uppercase tracking-wide flex-shrink-0 sm:w-44" style={{ color: 'var(--color-ink-faint)' }}>{label}</dt>
      <dd className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink)' }}>{value}</dd>
    </div>
  )
}

export function StoryStructureTab({ projectId, storyMeta }: StoryStructureTabProps) {
  const { t } = useTranslation()
  const [showDialog, setShowDialog] = useState(false)
  const structure = storyMeta.structure
  const duration = storyMeta.duration
  const hasStructure = structure?.inicio || structure?.desarrollo || structure?.climax || structure?.final
  const hasDetails = storyMeta.ending || duration?.chapters || duration?.words || storyMeta.protagonistEvolution || storyMeta.initialState || storyMeta.initialPhysicalState || (storyMeta.problems?.length ?? 0) > 0
  const hasContent = Boolean(hasStructure || hasDetails)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
          <Layers className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
          {t('storySetup.structureTabTitle')}
        </h2>
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Pencil className="w-3.5 h-3.5" />
          {hasContent ? t('storySetup.edit') : t('storySetup.complete')}
        </button>
      </div>

      {!hasContent ? (
        <div className="notebook-paper p-6 text-center">
          <Layers className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-ink-faint)' }} />
          <p className="font-display text-lg font-semibold mb-1" style={{ color: 'var(--color-ink-light)' }}>
            {t('storySetup.structureEmpty')}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
            {t('storySetup.structureEmptyDesc')}
          </p>
        </div>
      ) : (
        <>
          {(storyMeta.ending || duration?.chapters || duration?.words) && (
            <Section title={t('storySetup.structureOverview')}>
              <dl>
                {storyMeta.ending && <Row label={t('storySetup.ending')} value={storyMeta.ending} />}
                {duration?.chapters && <Row label={t('storySetup.chapters')} value={String(duration.chapters)} />}
                {duration?.words && <Row label={t('storySetup.words')} value={String(duration.words)} />}
              </dl>
            </Section>
          )}

          {hasStructure && (
            <Section title={t('storySetup.structureParts')}>
              <div className="space-y-4">
                {structure?.inicio && (
                  <div className="notebook-paper p-4">
                    <h4 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
                      {t('storySetup.structureInicio')}
                    </h4>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                      {structure.inicio}
                    </p>
                  </div>
                )}
                {structure?.desarrollo && (
                  <div className="notebook-paper p-4">
                    <h4 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent-teal)' }}>
                      {t('storySetup.structureDesarrollo')}
                    </h4>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                      {structure.desarrollo}
                    </p>
                  </div>
                )}
                {structure?.climax && (
                  <div className="notebook-paper p-4">
                    <h4 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent-violet)' }}>
                      {t('storySetup.structureClimax')}
                    </h4>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                      {structure.climax}
                    </p>
                  </div>
                )}
                {structure?.final && (
                  <div className="notebook-paper p-4">
                    <h4 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--color-ink)' }}>
                      {t('storySetup.structureFinal')}
                    </h4>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                      {structure.final}
                    </p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {(storyMeta.protagonistEvolution || storyMeta.initialState || storyMeta.initialPhysicalState || storyMeta.protagonistLife || (storyMeta.problems?.length ?? 0) > 0) && (
            <Section title={t('storySetup.structureCharacter')}>
              <dl>
                {storyMeta.protagonistLife && <Row label={t('storySetup.guidedProtagonistLife')} value={storyMeta.protagonistLife} />}
                {storyMeta.protagonistEvolution && <Row label={t('storySetup.guidedEvolution')} value={storyMeta.protagonistEvolution} />}
                {storyMeta.initialState && <Row label={t('storySetup.guidedMentalState')} value={storyMeta.initialState} />}
                {storyMeta.initialPhysicalState && <Row label={t('storySetup.guidedPhysicalState')} value={storyMeta.initialPhysicalState} />}
                {storyMeta.problems?.length && <Row label={t('storySetup.guidedProblems')} value={storyMeta.problems.join(', ')} />}
              </dl>
            </Section>
          )}
        </>
      )}

      <StructureDialog
        projectId={projectId}
        isOpen={showDialog}
        initialMeta={storyMeta}
        onClose={() => setShowDialog(false)}
      />
    </div>
  )
}
