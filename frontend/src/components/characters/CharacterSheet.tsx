import { useTranslation } from 'react-i18next'
import type { Character, CharacterAttributes, SheetBackgroundMode } from '@/types/character'
import { SHEET_BACKGROUND_MODES } from '@/types/character'
import type { CharacterRelationship } from '@/types/relationship'
import { CharacterRelations } from './CharacterRelations'

type AttributeKey = keyof CharacterAttributes

const ATTRIBUTE_SECTIONS: { title: string; keys: AttributeKey[] }[] = [
  {
    title: 'sheetPhysical',
    keys: ['jobStudies', 'clothing', 'skills', 'health'],
  },
  {
    title: 'sheetEmotional',
    keys: ['personality', 'virtues', 'flaws', 'weaknesses', 'motivations', 'internalConflict'],
  },
  {
    title: 'sheetLifestyle',
    keys: ['hobbies', 'extraData'],
  },
]

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

function getMode(mode: string | undefined): SheetBackgroundMode {
  return SHEET_BACKGROUND_MODES.includes(mode as SheetBackgroundMode)
    ? mode as SheetBackgroundMode
    : 'default'
}

interface CharacterSheetProps {
  character: Character
  characters?: Character[]
  relations?: CharacterRelationship[]
  onSelectCharacter?: (id: string) => void
  onAddRelation?: () => void
  onRemoveRelation?: (relation: CharacterRelationship) => void
}

export function CharacterSheet({
  character, characters = [], relations = [],
  onSelectCharacter, onAddRelation, onRemoveRelation,
}: CharacterSheetProps) {
  const { t } = useTranslation()
  const mode = getMode(character.sheetBackgroundMode)
  const backgroundImages = character.sheetBackgroundImages?.slice(0, 6) ?? []
  const portraitAlt = t('characterApp.sheetPortraitAlt', { name: character.name })
  const facts = [
    { label: t('characterApp.fieldAge'), value: character.age },
    { label: t('characterApp.fieldGender'), value: character.gender },
    { label: t('characterApp.heightLabel'), value: character.heightCm ? `${character.heightCm} ${t('characterApp.heightUnit')}` : null },
    { label: t('characterApp.fieldOrientation'), value: character.orientation },
    { label: t('characterApp.fieldMaritalStatus'), value: character.maritalStatus },
    { label: t('characterApp.speciesLabel'), value: character.species },
    { label: t('characterApp.fieldBirthPlace'), value: character.birthPlace },
    { label: t('characterApp.fieldBirthDate'), value: character.birthDate },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value))

  return (
    <article
      className="character-sheet overflow-hidden rounded-[var(--radius)] border"
      data-testid="character-sheet"
      data-background-mode={mode}
      style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)' }}
    >
      <div
        className={`character-sheet__hero character-sheet__hero--${mode}`}
        data-testid="character-sheet-hero"
      >
        {mode === 'single' && backgroundImages[0] && (
          <img src={backgroundImages[0]} alt="" className="character-sheet__hero-image" />
        )}
        {mode === 'collage' && backgroundImages.length > 0 && (
          <div className="character-sheet__collage" aria-hidden="true">
            {backgroundImages.map((url) => (
              <img key={url} src={url} alt="" className="character-sheet__collage-image" />
            ))}
          </div>
        )}
        <div className="character-sheet__hero-wash" aria-hidden="true" />
        <p className="character-sheet__eyebrow">{t('characterApp.sheetLabel')}</p>
      </div>

      <div className="character-sheet__body px-4 pb-5 sm:px-7 sm:pb-7">
        <div className="character-sheet__identity -mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end">
          {character.imageUrl ? (
            <img src={character.imageUrl} alt={portraitAlt} className="character-sheet__portrait" />
          ) : (
            <div className="character-sheet__portrait character-sheet__portrait--fallback" aria-label={portraitAlt}>
              {getInitials(character.name)}
            </div>
          )}
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="character-sheet__kicker">{t('characterApp.sheetBasicHeading')}</p>
              {character.isOC && <span className="character-sheet__badge">{t('characterApp.ocBadge')}</span>}
            </div>
            <h2 className="character-sheet__name">{character.name}</h2>
            <p className="character-sheet__role">
              {[character.role, character.roleSpec].filter(Boolean).join(' · ') || t('characterApp.sheetRoleEmpty')}
            </p>
            {character.nicknames.length > 0 && (
              <p className="character-sheet__nicknames">{character.nicknames.join(' · ')}</p>
            )}
          </div>
        </div>

        {character.description && (
          <p className="character-sheet__description mt-5 max-w-3xl">{character.description}</p>
        )}

        <section className="character-sheet__facts mt-6" aria-labelledby="character-sheet-facts-heading">
          <div className="character-sheet__section-heading">
            <span className="character-sheet__section-mark" aria-hidden="true" />
            <h3 id="character-sheet-facts-heading">{t('characterApp.sheetFactsHeading')}</h3>
          </div>
          {facts.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.label} className="character-sheet__fact">
                  <p>{fact.label}</p>
                  <strong>{fact.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="character-sheet__empty mt-3">{t('characterApp.sheetFactsEmpty')}</p>
          )}
        </section>

        <CharacterRelations
          character={character}
          characters={characters}
          relations={relations}
          onSelectCharacter={onSelectCharacter}
          onAddRelation={onAddRelation}
          onRemoveRelation={onRemoveRelation}
        />

        <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)]">
          <div className="space-y-7">
            {ATTRIBUTE_SECTIONS.map((section) => {
              const attributes = section.keys
                .map((key) => ({ key, value: character.attributes?.[key] }))
                .filter((attribute): attribute is { key: AttributeKey; value: string } => Boolean(attribute.value))

              if (attributes.length === 0) return null

              return (
                <section key={section.title} aria-labelledby={`character-sheet-${section.title}`}>
                  <div className="character-sheet__section-heading">
                    <span className="character-sheet__section-mark" aria-hidden="true" />
                    <h3 id={`character-sheet-${section.title}`}>{t(`characterApp.${section.title}`)}</h3>
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {attributes.map(({ key, value }) => (
                      <div key={key} className="character-sheet__attribute">
                        <h4>{t(`characterApp.attr_${key}`)}</h4>
                        <p>{value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>

          <aside className="character-sheet__summary self-start">
            <p className="character-sheet__summary-label">{t('characterApp.sheetSummaryLabel')}</p>
            <p>{character.description || t('characterApp.sheetSummaryEmpty')}</p>
            {character.role && (
              <div className="character-sheet__summary-row">
                <span>{t('characterApp.roleLabel')}</span>
                <strong>{character.role}</strong>
              </div>
            )}
            {character.species && (
              <div className="character-sheet__summary-row">
                <span>{t('characterApp.speciesLabel')}</span>
                <strong>{character.species}</strong>
              </div>
            )}
          </aside>
        </div>
      </div>
    </article>
  )
}
