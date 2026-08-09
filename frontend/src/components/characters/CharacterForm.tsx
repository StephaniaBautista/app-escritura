import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, X } from 'lucide-react'
import type { Character, CharacterInput } from '@/types/character'
import { useCharactersStore } from '@/stores/characters-store'
import { useToastStore } from '@/stores/toast-store'
import { CharacterImageField } from './CharacterImageField'
import { SelectOrCustom } from './SelectOrCustom'
import { ChipsInput } from './ChipsInput'
import { FamilyMultiSelect } from './FamilyMultiSelect'

const ATTRIBUTE_KEYS = [
  'motivations', 'weaknesses', 'internalConflict', 'personality', 'virtues',
  'flaws', 'jobStudies', 'clothing', 'skills', 'health', 'hobbies', 'extraData',
] as const

interface Draft {
  name: string
  description: string
  nicknames: string[]
  age: string
  gender: string
  heightCm: string
  orientation: string
  maritalStatus: string
  species: string
  birthPlace: string
  birthDate: string
  role: string
  roleSpec: string
  isOC: boolean
  parents: string[]
  children: string[]
  attributes: Record<string, string>
}

function emptyDraft(): Draft {
  return {
    name: '', description: '', nicknames: [], age: '', gender: '', heightCm: '',
    orientation: '', maritalStatus: '', species: '', birthPlace: '', birthDate: '',
    role: '', roleSpec: '', isOC: false, parents: [], children: [],
    attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, ''])),
  }
}

function draftFromCharacter(c: Character): Draft {
  const d = emptyDraft()
  d.name = c.name
  d.description = c.description ?? ''
  d.nicknames = [...c.nicknames]
  d.age = c.age ?? ''
  d.gender = c.gender ?? ''
  d.heightCm = c.heightCm ? String(c.heightCm) : ''
  d.orientation = c.orientation ?? ''
  d.maritalStatus = c.maritalStatus ?? ''
  d.species = c.species ?? ''
  d.birthPlace = c.birthPlace ?? ''
  d.birthDate = c.birthDate ?? ''
  d.role = c.role ?? ''
  d.roleSpec = c.roleSpec ?? ''
  d.isOC = c.isOC
  d.parents = [...c.parentIds]
  for (const k of ATTRIBUTE_KEYS) {
    d.attributes[k] = c.attributes?.[k] ?? ''
  }
  return d
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--color-paper-lines)' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
        style={{ color: 'var(--color-ink)' }}
      >
        {title}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--color-ink-faint)' }} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

const inputStyle = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-paper-lines)',
  color: 'var(--color-ink)',
} as const

const labelStyle = { color: 'var(--color-ink-light)' } as const

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium mb-1" style={labelStyle}>{label}</label>
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
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const setAttr = (key: string, value: string) =>
    setDraft((d) => ({ ...d, attributes: { ...d.attributes, [key]: value } }))

  const others = allCharacters.filter((c) => c.id !== character?.id)
  const selectableParents = others.filter((c) => !c.parentIds.includes(character?.id ?? ''))
  const selectableChildren = others

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
        nicknames: draft.nicknames,
        age: draft.age.trim() || null,
        gender: draft.gender.trim() || null,
        heightCm: draft.heightCm ? Number(draft.heightCm) : null,
        orientation: draft.orientation.trim() || null,
        maritalStatus: draft.maritalStatus.trim() || null,
        species: draft.species.trim() || null,
        birthPlace: draft.birthPlace.trim() || null,
        birthDate: draft.birthDate.trim() || null,
        role: draft.role.trim() || null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b"
          style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
        >
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
            {character ? character.name : t('characterApp.newCharacter')}
          </h2>
          <button onClick={onClose} aria-label={t('characterApp.cancel')} className="hover:opacity-70">
            <X className="w-5 h-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Section title={t('characterApp.sectionBasic')}>
            <CharacterImageField imageUrl={imageDataUrl ?? character?.imageUrl ?? null} onChange={setImageDataUrl} />
            <Field id="char-name" label={t('characterApp.fieldName')}>
              <input id="char-name" type="text" value={draft.name} onChange={(e) => set('name', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2" style={inputStyle} />
            </Field>
            <Field id="char-nicknames" label={t('characterApp.fieldNicknames')}>
              <ChipsInput id="char-nicknames" value={draft.nicknames} onChange={(v) => set('nicknames', v)}
                placeholder={t('characterApp.fieldNicknamesPlaceholder')} />
            </Field>
            <Field id="char-description" label={t('characterApp.fieldDescription')}>
              <textarea id="char-description" value={draft.description} onChange={(e) => set('description', e.target.value)}
                placeholder={t('characterApp.fieldDescriptionPlaceholder')} rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2" style={inputStyle} />
            </Field>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-ink-light)' }}>
              <input type="checkbox" checked={draft.isOC} onChange={(e) => set('isOC', e.target.checked)} className="accent-violet-600" />
              {t('characterApp.fieldIsOC')}
            </label>
          </Section>

          <Section title={t('characterApp.sectionDemographics')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field id="char-age" label={t('characterApp.fieldAge')}>
                <input id="char-age" type="text" value={draft.age} onChange={(e) => set('age', e.target.value)}
                  placeholder={t('characterApp.fieldAgePlaceholder')}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2" style={inputStyle} />
              </Field>
              <Field id="char-height" label={t('characterApp.fieldHeight')}>
                <input id="char-height" type="number" min={0} max={500} value={draft.heightCm} onChange={(e) => set('heightCm', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2" style={inputStyle} />
              </Field>
              <Field id="char-gender" label={t('characterApp.fieldGender')}>
                <SelectOrCustom id="char-gender" value={draft.gender || null} options={genderOptions}
                  onChange={(v) => set('gender', v ?? '')} customPlaceholder={t('characterApp.customOption')} />
              </Field>
              <Field id="char-orientation" label={t('characterApp.fieldOrientation')}>
                <SelectOrCustom id="char-orientation" value={draft.orientation || null} options={orientationOptions}
                  onChange={(v) => set('orientation', v ?? '')} customPlaceholder={t('characterApp.customOption')} />
              </Field>
              <Field id="char-marital" label={t('characterApp.fieldMaritalStatus')}>
                <SelectOrCustom id="char-marital" value={draft.maritalStatus || null} options={maritalOptions}
                  onChange={(v) => set('maritalStatus', v ?? '')} customPlaceholder={t('characterApp.customOption')} />
              </Field>
              <Field id="char-species" label={t('characterApp.fieldSpecies')}>
                <input id="char-species" type="text" value={draft.species} onChange={(e) => set('species', e.target.value)}
                  placeholder={t('characterApp.fieldSpeciesPlaceholder')}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2" style={inputStyle} />
              </Field>
              <Field id="char-birthplace" label={t('characterApp.fieldBirthPlace')}>
                <input id="char-birthplace" type="text" value={draft.birthPlace} onChange={(e) => set('birthPlace', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2" style={inputStyle} />
              </Field>
              <Field id="char-birthdate" label={t('characterApp.fieldBirthDate')}>
                <input id="char-birthdate" type="text" value={draft.birthDate} onChange={(e) => set('birthDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2" style={inputStyle} />
              </Field>
            </div>
          </Section>

          <Section title={t('characterApp.sectionRole')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field id="char-role" label={t('characterApp.fieldRole')}>
                <SelectOrCustom id="char-role" value={draft.role || null} options={roleOptions}
                  onChange={(v) => set('role', v ?? '')} customPlaceholder={t('characterApp.customOption')} />
              </Field>
              <Field id="char-rolespec" label={t('characterApp.fieldRoleSpec')}>
                <input id="char-rolespec" type="text" value={draft.roleSpec} onChange={(e) => set('roleSpec', e.target.value)}
                  placeholder={t('characterApp.fieldRoleSpecPlaceholder')}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2" style={inputStyle} />
              </Field>
            </div>
          </Section>

          <Section title={t('characterApp.sectionFamily')}>
            <Field id="char-parents" label={t('characterApp.fieldParents')}>
              <FamilyMultiSelect id="char-parents" options={selectableParents} selected={draft.parents}
                onChange={(v) => set('parents', v)} />
            </Field>
            <Field id="char-children" label={t('characterApp.fieldChildren')}>
              <FamilyMultiSelect id="char-children" options={selectableChildren} selected={draft.children}
                onChange={(v) => set('children', v)} />
            </Field>
          </Section>

          <Section title={t('characterApp.sectionAttributes')}>
            {ATTRIBUTE_KEYS.map((key) => (
              <Field key={key} id={`char-attr-${key}`} label={t(`characterApp.attr_${key}`)}>
                <textarea id={`char-attr-${key}`} value={draft.attributes[key]} onChange={(e) => setAttr(key, e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 resize-y" style={inputStyle} />
              </Field>
            ))}
          </Section>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 px-5 py-4 border-t"
          style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
        >
          <button onClick={onClose} disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
            style={{ color: 'var(--color-ink-light)' }}>
            {t('characterApp.cancel')}
          </button>
          <button onClick={handleSave} disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}>
            {isSaving ? '...' : t('characterApp.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
