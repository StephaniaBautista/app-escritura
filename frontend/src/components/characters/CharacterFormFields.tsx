import { useTranslation } from 'react-i18next'
import { STORY_POINTS, type Character, type CharacterOptionRow, type SheetBackgroundMode, type StoryPoint } from '@/types/character'
import { AccordionSection } from '@/components/ui/AccordionSection'
import { CharacterImageField } from './CharacterImageField'
import { SelectOrCustom } from './SelectOrCustom'
import { SuggestInput } from './SuggestInput'
import { ChipsInput } from './ChipsInput'
import { FamilyMultiSelect } from './FamilyMultiSelect'
import { CharacterBackgroundField } from './CharacterBackgroundField'
import { CharacterRelations } from './CharacterRelations'
import type { CharacterRelationship } from '@/types/relationship'
import { useCharacterOptionsStore } from '@/stores/character-options-store'
import { useEffect } from 'react'

export const ATTRIBUTE_KEYS = [
  'motivations', 'weaknesses', 'internalConflict', 'personality', 'virtues',
  'flaws', 'jobStudies', 'clothing', 'skills', 'health', 'hobbies', 'extraData',
] as const

const ATTRIBUTE_SECTIONS: { title: string; keys: readonly string[] }[] = [
  { title: 'sheetPhysical', keys: ['jobStudies', 'clothing', 'skills', 'health'] },
  { title: 'sheetEmotional', keys: ['personality', 'virtues', 'flaws', 'weaknesses', 'motivations', 'internalConflict'] },
  { title: 'sheetLifestyle', keys: ['hobbies', 'extraData'] },
]

export interface CharacterDraft {
  name: string
  description: string
  sheetBackgroundMode: SheetBackgroundMode
  sheetBackgroundImages: string[]
  nicknames: string[]
  age: string
  gender: string | null
  heightCm: string
  orientation: string | null
  maritalStatus: string | null
  species: string
  birthPlace: string
  birthDate: string
  role: string | null
  roleSpec: string
  isOC: boolean
  parents: string[]
  children: string[]
  storyPoint: StoryPoint | null
  attributes: Record<string, string>
}

export function emptyDraft(): CharacterDraft {
  return {
    name: '', description: '', sheetBackgroundMode: 'default', sheetBackgroundImages: [], nicknames: [], age: '', gender: null, heightCm: '',
    orientation: null, maritalStatus: null, species: '', birthPlace: '', birthDate: '',
    role: null, roleSpec: '', isOC: false, parents: [], children: [], storyPoint: null,
    attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, ''])),
  }
}

export function draftFromCharacter(c: Character, allCharacters: Character[] = []): CharacterDraft {
  const d = emptyDraft()
  d.name = c.name
  d.description = c.description ?? ''
  d.sheetBackgroundMode = c.sheetBackgroundMode ?? 'default'
  d.sheetBackgroundImages = [...(c.sheetBackgroundImages ?? [])]
  d.nicknames = [...c.nicknames]
  d.age = c.age ?? ''
  d.gender = c.gender ?? null
  d.heightCm = c.heightCm ? String(c.heightCm) : ''
  d.orientation = c.orientation ?? null
  d.maritalStatus = c.maritalStatus ?? null
  d.species = c.species ?? ''
  d.birthPlace = c.birthPlace ?? ''
  d.birthDate = c.birthDate ?? ''
  d.role = c.role ?? null
  d.roleSpec = c.roleSpec ?? ''
  d.isOC = c.isOC
  d.parents = [...c.parentIds]
  d.children = allCharacters
    .filter((item) => item.id !== c.id && item.parentIds.includes(c.id))
    .map((item) => item.id)
  d.storyPoint = c.storyPoint ?? null
  for (const k of ATTRIBUTE_KEYS) {
    d.attributes[k] = c.attributes?.[k] ?? ''
  }
  return d
}

export function draftToInput(draft: CharacterDraft) {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    sheetBackgroundMode: draft.sheetBackgroundMode,
    nicknames: draft.nicknames,
    age: draft.age.trim() || null,
    gender: draft.gender?.trim() || null,
    heightCm: draft.heightCm ? Number(draft.heightCm) : null,
    orientation: draft.orientation?.trim() || null,
    maritalStatus: draft.maritalStatus?.trim() || null,
    species: draft.species.trim() || null,
    birthPlace: draft.birthPlace.trim() || null,
    birthDate: draft.birthDate.trim() || null,
    role: draft.role?.trim() || null,
    roleSpec: draft.roleSpec.trim() || null,
    isOC: draft.isOC,
    parentIds: draft.parents,
    storyPoint: draft.storyPoint,
    attributes: Object.fromEntries(
      ATTRIBUTE_KEYS.filter((k) => draft.attributes[k]?.trim()).map((k) => [k, draft.attributes[k].trim()]),
    ),
  }
}

function Field({
  id, label, boxed, srOnly, children,
}: {
  id: string
  label: string
  boxed?: boolean
  srOnly?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={boxed ? 'character-form__fact' : undefined}>
      <label htmlFor={id} className={srOnly ? 'sr-only' : 'character-form__label'}>{label}</label>
      {children}
    </div>
  )
}

export function CharacterFormFields({
  draft, setDraft, disabled = false, allCharacters, character,
  imageUrl, onImageChange, backgroundImageDataUrls, onBackgroundNewImagesChange,
  showStoryPoint = true, identityOverlap = true, afterIdentity = null,
  relations, onAddRelation, onRemoveRelation,
}: {
  draft: CharacterDraft
  setDraft: React.Dispatch<React.SetStateAction<CharacterDraft>>
  disabled?: boolean
  allCharacters: Character[]
  character: Character | null
  imageUrl: string | null
  onImageChange: (dataUrl: string | null) => void
  backgroundImageDataUrls: string[]
  onBackgroundNewImagesChange: (images: string[]) => void
  showStoryPoint?: boolean
  identityOverlap?: boolean
  afterIdentity?: React.ReactNode
  relations?: CharacterRelationship[]
  onAddRelation?: () => void
  onRemoveRelation?: (relation: CharacterRelationship) => void
}) {
  const { t, i18n } = useTranslation()

  const loadOptions = useCharacterOptionsStore((s) => s.load)
  const getOptions = useCharacterOptionsStore((s) => s.getOptions)

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  const set = <K extends keyof CharacterDraft>(key: K, value: CharacterDraft[K]) => {
    if (disabled) return
    setDraft((d) => ({ ...d, [key]: value }))
  }
  const setAttr = (key: string, value: string) => {
    if (disabled) return
    setDraft((d) => ({ ...d, attributes: { ...d.attributes, [key]: value } }))
  }

  const others = allCharacters.filter((c) => c.id !== character?.id)
  const selectableParents = others.filter((c) => !c.parentIds.includes(character?.id ?? ''))
  const selectableChildren = others
  const speciesSuggestions = Array.from(new Set(
    allCharacters.map((c) => c.species).filter((s): s is string => Boolean(s)),
  ))
  const birthPlaceSuggestions = Array.from(new Set(
    allCharacters.map((c) => c.birthPlace).filter((s): s is string => Boolean(s)),
  ))

  const toSelectOptions = (rows: CharacterOptionRow[]) =>
    rows.map((o) => ({ value: o.value, label: i18n.language === 'en' ? o.labelEn ?? o.label : o.label }))

  const genderOptions = toSelectOptions(getOptions('gender'))
  const orientationOptions = toSelectOptions(getOptions('orientation'))
  const maritalOptions = toSelectOptions(getOptions('maritalStatus'))
  const roleOptions = toSelectOptions(getOptions('role'))

  return (
    <>
      <div className={`character-form__identity flex flex-col items-center gap-3 sm:flex-row sm:items-end${identityOverlap ? '' : ' character-form__identity--flow'}`}>
        <CharacterImageField imageUrl={imageUrl} onChange={onImageChange} disabled={disabled} />
        <div className="w-full min-w-0 flex-1 pb-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="character-form__kicker">{t('characterApp.sheetBasicHeading')}</p>
            <div className="character-form__type-toggle" role="radiogroup" aria-label={t('characterApp.fieldIsOC')}>
              <label className={`character-form__type-option ${!draft.isOC ? 'character-form__type-option--checked' : ''}`}>
                <input type="radio" name="char-type" className="sr-only" checked={!draft.isOC} disabled={disabled}
                  onChange={() => set('isOC', false)} />
                {t('characterApp.characterTypeFictional')}
              </label>
              <label className={`character-form__type-option ${draft.isOC ? 'character-form__type-option--checked' : ''}`}>
                <input type="radio" name="char-type" className="sr-only" checked={draft.isOC} disabled={disabled}
                  onChange={() => set('isOC', true)} />
                {t('characterApp.ocBadge')}
              </label>
            </div>
          </div>
          <Field id="char-name" label={t('characterApp.fieldName')} srOnly>
            <input
              id="char-name"
              type="text"
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={t('characterApp.fieldName')}
              className="character-form__name"
              disabled={disabled}
            />
          </Field>
          <div className="mt-1.5">
            <Field id="char-nicknames" label={t('characterApp.fieldNicknames')} srOnly>
              <ChipsInput id="char-nicknames" value={draft.nicknames} onChange={(v) => set('nicknames', v)}
                placeholder={t('characterApp.fieldNicknamesPlaceholder')} disabled={disabled} />
            </Field>
          </div>
        </div>
      </div>

      {afterIdentity}

      <Field id="char-description" label={t('characterApp.fieldDescription')} srOnly>
        <textarea
          id="char-description"
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder={t('characterApp.fieldDescriptionPlaceholder')}
          rows={2}
          className="character-form__control mt-4"
          disabled={disabled}
        />
      </Field>

      <div className="mt-8 space-y-8">
        <AccordionSection variant="sheet" title={t('characterApp.sheetBackgroundTitle')} defaultOpen>
          <div className="mt-3">
            <CharacterBackgroundField
              mode={draft.sheetBackgroundMode}
              existingImages={draft.sheetBackgroundImages}
              newImages={backgroundImageDataUrls}
              onModeChange={(mode) => set('sheetBackgroundMode', mode)}
              onExistingImagesChange={(images) => set('sheetBackgroundImages', images)}
              onNewImagesChange={onBackgroundNewImagesChange}
              disabled={disabled}
            />
          </div>
        </AccordionSection>

        <AccordionSection variant="sheet" title={t('characterApp.sheetFactsHeading')} defaultOpen>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id="char-age" label={t('characterApp.fieldAge')} boxed>
              <input id="char-age" type="text" value={draft.age} onChange={(e) => set('age', e.target.value)}
                placeholder={t('characterApp.fieldAgePlaceholder')} className="character-form__control" disabled={disabled} />
            </Field>
            <Field id="char-height" label={t('characterApp.fieldHeight')} boxed>
              <input id="char-height" type="number" min={0} max={500} value={draft.heightCm} onChange={(e) => set('heightCm', e.target.value)}
                className="character-form__control" disabled={disabled} />
            </Field>
            <Field id="char-gender" label={t('characterApp.fieldGender')} boxed>
              <SelectOrCustom id="char-gender" value={draft.gender} options={genderOptions}
                onChange={(v) => set('gender', v)} disabled={disabled} />
            </Field>
            <Field id="char-orientation" label={t('characterApp.fieldOrientation')} boxed>
              <SelectOrCustom id="char-orientation" value={draft.orientation} options={orientationOptions}
                onChange={(v) => set('orientation', v)} disabled={disabled} />
            </Field>
            <Field id="char-marital" label={t('characterApp.fieldMaritalStatus')} boxed>
              <SelectOrCustom id="char-marital" value={draft.maritalStatus} options={maritalOptions}
                onChange={(v) => set('maritalStatus', v)} disabled={disabled} />
            </Field>
            <Field id="char-species" label={t('characterApp.fieldSpecies')} boxed>
              <SuggestInput id="char-species" value={draft.species} onChange={(v) => set('species', v)}
                suggestions={speciesSuggestions} placeholder={t('characterApp.fieldSpeciesPlaceholder')} disabled={disabled} />
            </Field>
            <Field id="char-birthplace" label={t('characterApp.fieldBirthPlace')} boxed>
              <SuggestInput id="char-birthplace" value={draft.birthPlace} onChange={(v) => set('birthPlace', v)}
                suggestions={birthPlaceSuggestions} placeholder={t('characterApp.fieldBirthPlacePlaceholder')} disabled={disabled} />
            </Field>
            <Field id="char-birthdate" label={t('characterApp.fieldBirthDate')} boxed>
              <input id="char-birthdate" type="text" value={draft.birthDate} onChange={(e) => set('birthDate', e.target.value)}
                className="character-form__control" disabled={disabled} />
            </Field>
            {showStoryPoint && (
              <Field id="char-storypoint" label={t('characterApp.storyPoint')} boxed>
                <select
                  id="char-storypoint"
                  value={draft.storyPoint ?? ''}
                  onChange={(e) => set('storyPoint', e.target.value === '' ? null : e.target.value as StoryPoint)}
                  disabled={disabled}
                  className="character-form__control"
                >
                  <option value="">—</option>
                  {STORY_POINTS.map((point) => (
                    <option key={point} value={point}>{t(`characterApp.storyPoint_${point}`)}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </AccordionSection>

        <AccordionSection variant="sheet" title={t('characterApp.sectionRole')} defaultOpen>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id="char-role" label={t('characterApp.fieldRole')} boxed>
              <SelectOrCustom id="char-role" value={draft.role} options={roleOptions}
                onChange={(v) => set('role', v)} disabled={disabled} />
            </Field>
            <Field id="char-rolespec" label={t('characterApp.fieldRoleSpec')} boxed>
              <input id="char-rolespec" type="text" value={draft.roleSpec} onChange={(e) => set('roleSpec', e.target.value)}
                placeholder={t('characterApp.fieldRoleSpecPlaceholder')} className="character-form__control" disabled={disabled} />
            </Field>
          </div>
        </AccordionSection>

        {others.length > 0 ? (
          <AccordionSection variant="sheet" title={t('characterApp.sectionFamily')} defaultOpen>
            <div className="mt-3 space-y-4">
              <Field id="char-parents" label={t('characterApp.fieldParents')}>
                <div className="mt-1.5">
                  <FamilyMultiSelect id="char-parents" options={selectableParents} selected={draft.parents}
                    onChange={(v) => set('parents', v)} disabled={disabled} />
                </div>
              </Field>
              <Field id="char-children" label={t('characterApp.fieldChildren')}>
                <div className="mt-1.5">
                  <FamilyMultiSelect id="char-children" options={selectableChildren} selected={draft.children}
                    onChange={(v) => set('children', v)} disabled={disabled} />
                </div>
              </Field>
              {character && onAddRelation && (
                <div>
                  <CharacterRelations
                    character={character}
                    characters={allCharacters}
                    relations={relations ?? []}
                    onAddRelation={onAddRelation}
                    onRemoveRelation={onRemoveRelation}
                    showTree={false}
                    embedded
                  />
                </div>
              )}
            </div>
          </AccordionSection>
        ) : (
          <div className="character-form__fact" role="note">
            <p className="character-form__label">{t('characterApp.sectionFamily')}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-light)' }}>
              {t('characterApp.familySuggestCreate')}
            </p>
          </div>
        )}

        {ATTRIBUTE_SECTIONS.map((section) => (
          <AccordionSection
            key={section.title}
            variant="sheet"
            title={t(`characterApp.${section.title}`)}
            defaultOpen={section.keys.some((key) => Boolean(draft.attributes[key]?.trim()))}
          >
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {section.keys.map((key) => (
                <div key={key} className="character-form__attribute">
                  <label htmlFor={`char-attr-${key}`} className="character-form__attribute-label">
                    {t(`characterApp.attr_${key}`)}
                  </label>
                  <textarea
                    id={`char-attr-${key}`}
                    value={draft.attributes[key]}
                    onChange={(e) => setAttr(key, e.target.value)}
                    rows={2}
                    placeholder={t(`characterApp.attr_${key}_placeholder`)}
                    className="character-form__control"
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>
          </AccordionSection>
        ))}
      </div>
    </>
  )
}
