import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import type { Character, CharacterInput, SheetBackgroundMode } from '@/types/character'
import { useCharactersStore } from '@/stores/characters-store'
import { useToastStore } from '@/stores/toast-store'
import { AccordionSection } from '@/components/ui/AccordionSection'
import { CharacterImageField } from './CharacterImageField'
import { SelectOrCustom } from './SelectOrCustom'
import { SuggestInput } from './SuggestInput'
import { ChipsInput } from './ChipsInput'
import { FamilyMultiSelect } from './FamilyMultiSelect'
import { CharacterBackgroundField } from './CharacterBackgroundField'

const ATTRIBUTE_KEYS = [
  'motivations', 'weaknesses', 'internalConflict', 'personality', 'virtues',
  'flaws', 'jobStudies', 'clothing', 'skills', 'health', 'hobbies', 'extraData',
] as const

const ATTRIBUTE_SECTIONS: { title: string; keys: readonly string[] }[] = [
  { title: 'sheetPhysical', keys: ['jobStudies', 'clothing', 'skills', 'health'] },
  { title: 'sheetEmotional', keys: ['personality', 'virtues', 'flaws', 'weaknesses', 'motivations', 'internalConflict'] },
  { title: 'sheetLifestyle', keys: ['hobbies', 'extraData'] },
]

interface Draft {
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
  attributes: Record<string, string>
}

function emptyDraft(): Draft {
  return {
    name: '', description: '', sheetBackgroundMode: 'default', sheetBackgroundImages: [], nicknames: [], age: '', gender: null, heightCm: '',
    orientation: null, maritalStatus: null, species: '', birthPlace: '', birthDate: '',
    role: null, roleSpec: '', isOC: false, parents: [], children: [],
    attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, ''])),
  }
}

function draftFromCharacter(c: Character): Draft {
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
  for (const k of ATTRIBUTE_KEYS) {
    d.attributes[k] = c.attributes?.[k] ?? ''
  }
  return d
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

interface CharacterFormProps {
  projectId: string
  allCharacters: Character[]
  character: Character | null
  onClose: () => void
  onSaved: (character: Character) => void
}

export function CharacterForm({ projectId, allCharacters, character, onClose, onSaved }: CharacterFormProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const charactersStore = useCharactersStore()
  const [draft, setDraft] = useState<Draft>(() => character ? draftFromCharacter(character) : emptyDraft())
  const [backgroundImageDataUrls, setBackgroundImageDataUrls] = useState<string[]>([])
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const setAttr = (key: string, value: string) =>
    setDraft((d) => ({ ...d, attributes: { ...d.attributes, [key]: value } }))

  const others = allCharacters.filter((c) => c.id !== character?.id)
  const selectableParents = others.filter((c) => !c.parentIds.includes(character?.id ?? ''))
  const selectableChildren = others
  const speciesSuggestions = Array.from(new Set(
    allCharacters.map((c) => c.species).filter((s): s is string => Boolean(s)),
  ))
  const birthPlaceSuggestions = Array.from(new Set(
    allCharacters.map((c) => c.birthPlace).filter((s): s is string => Boolean(s)),
  ))

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error(t('characterApp.errorName'))
      return
    }
    setIsSaving(true)
    try {
      const input: CharacterInput = {
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
        attributes: Object.fromEntries(
          ATTRIBUTE_KEYS.filter((k) => draft.attributes[k]?.trim()).map((k) => [k, draft.attributes[k].trim()]),
        ),
      }

      let saved = character
        ? await charactersStore.update(character.id, input)
        : await charactersStore.create(projectId, input)

      if (imageDataUrl && saved) {
        const savedId = saved.id
        await charactersStore.uploadImage(savedId, imageDataUrl)
        saved = charactersStore.characters.find((c) => c.id === savedId) ?? saved
      }

      const previousBackgroundImages = character?.sheetBackgroundImages ?? []
      const backgroundImagesChanged = previousBackgroundImages.length !== draft.sheetBackgroundImages.length
        || previousBackgroundImages.some((url) => !draft.sheetBackgroundImages.includes(url))
      const shouldSyncBackground = Boolean(saved) && (
        backgroundImageDataUrls.length > 0
        || backgroundImagesChanged
        || (draft.sheetBackgroundMode === 'default' && draft.sheetBackgroundImages.length > 0)
      )
      if (saved && shouldSyncBackground) {
        const synced = await charactersStore.syncBackgroundImages(
          saved.id,
          draft.sheetBackgroundMode === 'default' ? [] : draft.sheetBackgroundImages,
          backgroundImageDataUrls,
        )
        if (synced) saved = synced
      }

      if (saved) {
        for (const childId of others) {
          const shouldLink = draft.children.includes(childId.id)
          const isLinked = childId.parentIds.includes(saved.id)
          if (shouldLink !== isLinked) {
            const next = shouldLink ? [...childId.parentIds, saved.id] : childId.parentIds.filter((p) => p !== saved.id)
            await charactersStore.update(childId.id, { parentIds: next })
          }
        }
      }

      if (saved) {
        toast.success(t('characterApp.saved'))
        onSaved(saved)
        onClose()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setIsSaving(false)
    }
  }

  const genderOptions = [
    { value: 'Femenino', label: t('characterApp.genderFemale') },
    { value: 'Masculino', label: t('characterApp.genderMale') },
    { value: 'No binario', label: t('characterApp.genderNonBinary') },
    { value: 'Fluido', label: t('characterApp.genderFluid') },
  ]
  const orientationOptions = [
    { value: 'Heterosexual', label: t('characterApp.orientationHetero') },
    { value: 'Homosexual', label: t('characterApp.orientationHomo') },
    { value: 'Bisexual', label: t('characterApp.orientationBi') },
    { value: 'Pansexual', label: t('characterApp.orientationPan') },
    { value: 'Asexual', label: t('characterApp.orientationAsexual') },
  ]
  const maritalOptions = [
    { value: 'Soltero/a', label: t('characterApp.maritalSingle') },
    { value: 'Casado/a', label: t('characterApp.maritalMarried') },
    { value: 'En pareja', label: t('characterApp.maritalPartner') },
    { value: 'Divorciado/a', label: t('characterApp.maritalDivorced') },
    { value: 'Viudo/a', label: t('characterApp.maritalWidowed') },
  ]
  const roleOptions = [
    { value: 'Principal', label: t('characterApp.roleMain') },
    { value: 'Secundario', label: t('characterApp.roleSecondary') },
    { value: 'Extra', label: t('characterApp.roleExtra') },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="character-form relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[var(--radius)] border shadow-2xl"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
      >
        <header className="character-form__hero">
          <div className="character-form__hero-content">
            <div className="min-w-0">
              <p className="character-form__eyebrow">{t('characterApp.sheetLabel')}</p>
              <h2 className="character-form__title">{character ? character.name : t('characterApp.newCharacter')}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label={t('characterApp.cancel')} className="character-form__close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="px-4 pb-6 sm:px-7">
          <div className="character-form__identity flex flex-col items-center gap-3 sm:flex-row sm:items-end">
            <CharacterImageField imageUrl={imageDataUrl ?? character?.imageUrl ?? null} onChange={setImageDataUrl} />
            <div className="w-full min-w-0 flex-1 pb-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="character-form__kicker">{t('characterApp.sheetBasicHeading')}</p>
                <div className="character-form__type-toggle" role="radiogroup" aria-label={t('characterApp.fieldIsOC')}>
                  <label className={`character-form__type-option ${!draft.isOC ? 'character-form__type-option--checked' : ''}`}>
                    <input type="radio" name="char-type" className="sr-only" checked={!draft.isOC}
                      onChange={() => set('isOC', false)} />
                    {t('characterApp.characterTypeFictional')}
                  </label>
                  <label className={`character-form__type-option ${draft.isOC ? 'character-form__type-option--checked' : ''}`}>
                    <input type="radio" name="char-type" className="sr-only" checked={draft.isOC}
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
                />
              </Field>
              <div className="mt-1.5">
                <Field id="char-nicknames" label={t('characterApp.fieldNicknames')} srOnly>
                  <ChipsInput id="char-nicknames" value={draft.nicknames} onChange={(v) => set('nicknames', v)}
                    placeholder={t('characterApp.fieldNicknamesPlaceholder')} />
                </Field>
              </div>
            </div>
          </div>

          <Field id="char-description" label={t('characterApp.fieldDescription')} srOnly>
            <textarea
              id="char-description"
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder={t('characterApp.fieldDescriptionPlaceholder')}
              rows={2}
              className="character-form__control mt-4"
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
                  onNewImagesChange={setBackgroundImageDataUrls}
                />
              </div>
            </AccordionSection>

            <AccordionSection variant="sheet" title={t('characterApp.sheetFactsHeading')} defaultOpen>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id="char-age" label={t('characterApp.fieldAge')} boxed>
                  <input id="char-age" type="text" value={draft.age} onChange={(e) => set('age', e.target.value)}
                    placeholder={t('characterApp.fieldAgePlaceholder')} className="character-form__control" />
                </Field>
                <Field id="char-height" label={t('characterApp.fieldHeight')} boxed>
                  <input id="char-height" type="number" min={0} max={500} value={draft.heightCm} onChange={(e) => set('heightCm', e.target.value)}
                    className="character-form__control" />
                </Field>
                <Field id="char-gender" label={t('characterApp.fieldGender')} boxed>
                  <SelectOrCustom id="char-gender" value={draft.gender} options={genderOptions}
                    onChange={(v) => set('gender', v)} />
                </Field>
                <Field id="char-orientation" label={t('characterApp.fieldOrientation')} boxed>
                  <SelectOrCustom id="char-orientation" value={draft.orientation} options={orientationOptions}
                    onChange={(v) => set('orientation', v)} />
                </Field>
                <Field id="char-marital" label={t('characterApp.fieldMaritalStatus')} boxed>
                  <SelectOrCustom id="char-marital" value={draft.maritalStatus} options={maritalOptions}
                    onChange={(v) => set('maritalStatus', v)} />
                </Field>
                <Field id="char-species" label={t('characterApp.fieldSpecies')} boxed>
                  <SuggestInput id="char-species" value={draft.species} onChange={(v) => set('species', v)}
                    suggestions={speciesSuggestions} placeholder={t('characterApp.fieldSpeciesPlaceholder')} />
                </Field>
                <Field id="char-birthplace" label={t('characterApp.fieldBirthPlace')} boxed>
                  <SuggestInput id="char-birthplace" value={draft.birthPlace} onChange={(v) => set('birthPlace', v)}
                    suggestions={birthPlaceSuggestions} placeholder={t('characterApp.fieldBirthPlacePlaceholder')} />
                </Field>
                <Field id="char-birthdate" label={t('characterApp.fieldBirthDate')} boxed>
                  <input id="char-birthdate" type="text" value={draft.birthDate} onChange={(e) => set('birthDate', e.target.value)}
                    className="character-form__control" />
                </Field>
              </div>
            </AccordionSection>

            <AccordionSection variant="sheet" title={t('characterApp.sectionRole')} defaultOpen>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id="char-role" label={t('characterApp.fieldRole')} boxed>
                  <SelectOrCustom id="char-role" value={draft.role} options={roleOptions}
                    onChange={(v) => set('role', v)} />
                </Field>
                <Field id="char-rolespec" label={t('characterApp.fieldRoleSpec')} boxed>
                  <input id="char-rolespec" type="text" value={draft.roleSpec} onChange={(e) => set('roleSpec', e.target.value)}
                    placeholder={t('characterApp.fieldRoleSpecPlaceholder')} className="character-form__control" />
                </Field>
              </div>
            </AccordionSection>

            {others.length > 0 ? (
              <AccordionSection variant="sheet" title={t('characterApp.sectionFamily')} defaultOpen>
                <div className="mt-3 space-y-4">
                  <Field id="char-parents" label={t('characterApp.fieldParents')}>
                    <div className="mt-1.5">
                      <FamilyMultiSelect id="char-parents" options={selectableParents} selected={draft.parents}
                        onChange={(v) => set('parents', v)} />
                    </div>
                  </Field>
                  <Field id="char-children" label={t('characterApp.fieldChildren')}>
                    <div className="mt-1.5">
                      <FamilyMultiSelect id="char-children" options={selectableChildren} selected={draft.children}
                        onChange={(v) => set('children', v)} />
                    </div>
                  </Field>
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
                      />
                    </div>
                  ))}
                </div>
              </AccordionSection>
            ))}
          </div>
        </div>

        <footer className="character-form__footer">
          <button type="button" onClick={onClose} disabled={isSaving} className="character-form__button"
            style={{ color: 'var(--color-ink-light)' }}>
            {t('characterApp.cancel')}
          </button>
          <button type="button" onClick={handleSave} disabled={isSaving} aria-busy={isSaving} className="character-form__button text-white"
            style={{ background: 'var(--color-accent)' }}>
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 data-testid="character-save-spinner" className="w-4 h-4 animate-spin" />
                {t('common.saving')}
              </span>
            ) : t('characterApp.save')}
          </button>
        </footer>
      </div>
    </div>
  )
}
