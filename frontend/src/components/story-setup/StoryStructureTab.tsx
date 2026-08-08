import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers, Pencil } from 'lucide-react'
import { StructureDialog } from './StructureDialog'
import { storyBankApi, type StoryQuestion } from '@/services/story-bank'
import { isStandardSection, migrateStructure, sectionLabelKey } from '@/lib/story-structure'
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
  const { t, i18n } = useTranslation()
  const [showDialog, setShowDialog] = useState(false)
  const [questions, setQuestions] = useState<StoryQuestion[]>([])

  useEffect(() => {
    let alive = true
    storyBankApi
      .listQuestions()
      .then((qs) => {
        if (alive) setQuestions(qs)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const structure = migrateStructure(storyMeta.structure)
  const sections = structure.sections
  const duration = storyMeta.duration
  const hasStructure = sections.length > 0
  const hasCharacterDetails =
    Boolean(
      storyMeta.protagonistEvolution ||
        storyMeta.protagonistLife ||
        storyMeta.worldContext ||
        storyMeta.initialSituation ||
        storyMeta.centralTheme ||
        storyMeta.problems,
    ) ||
    Object.keys(storyMeta.bankAnswers ?? {}).length > 0 ||
    (storyMeta.characters ?? []).some((c) => c.initialState || c.initialPhysicalState)
  const hasDetails = storyMeta.ending || duration?.chapters || duration?.words
  const hasContent = Boolean(hasStructure || hasDetails || hasCharacterDetails)

  const lang = i18n.language
  const questionById = new Map(questions.map((q) => [q.id, q]))
  const qText = (q: StoryQuestion | undefined, id: string): string =>
    q ? (lang === 'en' && q.textEn ? q.textEn : q.text) : id

  const sectionTitle = (id: string, customTitle?: string): string => {
    if (isStandardSection(id)) return t(sectionLabelKey(id))
    return customTitle ?? id
  }

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
          {hasDetails && (
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
                {sections.map((section, index) => (
                  <div key={`${section.id}-${index}`} className="notebook-paper p-4">
                    <h4 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
                      {sectionTitle(section.id, section.title)}
                    </h4>
                    {section.content && (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed mb-2" style={{ color: 'var(--color-ink-light)' }}>
                        {section.content}
                      </p>
                    )}
                    {section.answers && (
                      <div className="space-y-1.5 mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-paper-lines)' }}>
                        {Object.entries(section.answers)
                          .filter(([, value]) => value.trim())
                          .map(([questionId, answer]) => (
                            <div key={questionId}>
                              <p className="text-[11px] font-medium mb-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                                {qText(questionById.get(questionId), questionId)}
                              </p>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                                {answer}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {hasCharacterDetails && (
            <Section title={t('storySetup.structureCharacter')}>
              <dl>
                {storyMeta.protagonistLife && <Row label={t('storySetup.guidedProtagonistLife')} value={storyMeta.protagonistLife} />}
                {storyMeta.protagonistEvolution && <Row label={t('storySetup.guidedEvolution')} value={storyMeta.protagonistEvolution} />}
                {storyMeta.worldContext && <Row label={t('storySetup.guidedWorldContext')} value={storyMeta.worldContext} />}
                {storyMeta.initialSituation && <Row label={t('storySetup.guidedInitialSituation')} value={storyMeta.initialSituation} />}
                {storyMeta.centralTheme && <Row label={t('storySetup.guidedCentralTheme')} value={storyMeta.centralTheme} />}
                {storyMeta.problems && <Row label={t('storySetup.guidedProblems')} value={storyMeta.problems} />}
                {(storyMeta.characters ?? [])
                  .filter((c) => c.initialState || c.initialPhysicalState)
                  .map((c) => (
                    <div key={c.name} className="border-b last:border-b-0 py-1.5">
                      <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
                        {c.name}
                      </dt>
                      {c.initialState && (
                        <dd className="text-sm whitespace-pre-wrap mt-0.5" style={{ color: 'var(--color-ink)' }}>
                          <span className="text-xs font-medium" style={{ color: 'var(--color-ink-faint)' }}>{t('storySetup.guidedMentalState')}: </span>
                          {c.initialState}
                        </dd>
                      )}
                      {c.initialPhysicalState && (
                        <dd className="text-sm whitespace-pre-wrap mt-0.5" style={{ color: 'var(--color-ink)' }}>
                          <span className="text-xs font-medium" style={{ color: 'var(--color-ink-faint)' }}>{t('storySetup.guidedPhysicalState')}: </span>
                          {c.initialPhysicalState}
                        </dd>
                      )}
                    </div>
                  ))}
                {Object.entries(storyMeta.bankAnswers ?? {})
                  .filter(([, value]) => value.trim())
                  .map(([questionId, answer]) => (
                    <Row key={questionId} label={qText(questionById.get(questionId), questionId)} value={answer} />
                  ))}
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
