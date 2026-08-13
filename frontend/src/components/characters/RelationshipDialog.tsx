import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, X } from 'lucide-react'
import type { Character } from '@/types/character'
import { RELATIONSHIP_TYPES, type RelationshipType } from '@/types/relationship'
import { useRelationshipsStore } from '@/stores/relationships-store'
import { useToastStore } from '@/stores/toast-store'

const FAMILY_LABEL_KEYS = [
  'relFamilyLabel_brother', 'relFamilyLabel_sister', 'relFamilyLabel_cousin', 'relFamilyLabel_grandfather',
  'relFamilyLabel_grandmother', 'relFamilyLabel_uncle', 'relFamilyLabel_aunt', 'relFamilyLabel_nephew',
  'relFamilyLabel_niece', 'relFamilyLabel_father', 'relFamilyLabel_mother', 'relFamilyLabel_son',
  'relFamilyLabel_daughter', 'relFamilyLabel_partner', 'relFamilyLabel_exPartner', 'relFamilyLabel_spouse',
]

interface RelationshipDialogProps {
  character: Character
  allCharacters: Character[]
  onClose: () => void
  onCreated: () => void
}

export function RelationshipDialog({ character, allCharacters, onClose, onCreated }: RelationshipDialogProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const relationshipsStore = useRelationshipsStore()
  const [type, setType] = useState<RelationshipType>('romance')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const others = allCharacters.filter((c) => c.id !== character.id)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const nameCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const candidate of allCharacters) {
      counts.set(candidate.name, (counts.get(candidate.name) ?? 0) + 1)
    }
    return counts
  }, [allCharacters])

  const optionLabel = (candidate: Character): string => {
    if (candidate.evolvesFromId) {
      const source = allCharacters.find((item) => item.id === candidate.evolvesFromId)
      const suffix = source
        ? t('characterApp.relEvolutionOf', { name: source.name })
        : t('characterApp.evolutions')
      return `${candidate.name} (${suffix})`
    }
    if ((nameCounts.get(candidate.name) ?? 0) > 1) {
      return `${candidate.name} (${t('characterApp.relVersionOriginal')})`
    }
    return candidate.name
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selected) => selected !== id) : [...prev, id])
  }

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      toast.error(t('characterApp.relPersonRequired'))
      return
    }
    if ((type === 'family' || type === 'custom') && !label.trim()) {
      toast.error(t('characterApp.relLabelRequired'))
      return
    }
    setIsSaving(true)
    try {
      let createdCount = 0
      for (const targetId of selectedIds) {
        const relation = await relationshipsStore.create(character.projectId, {
          characterAId: character.id,
          characterBId: targetId,
          type,
          label: (type === 'family' || type === 'custom') ? label.trim() : null,
          description: description.trim() || null,
        })
        if (relation) createdCount += 1
      }
      if (createdCount > 0) {
        toast.success(t('characterApp.relAddedMultiple', { count: createdCount }))
        onCreated()
        onClose()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setIsSaving(false)
    }
  }

  const inputStyle = {
    background: 'var(--color-background)',
    borderColor: 'var(--color-paper-lines)',
    color: 'var(--color-ink)',
  } as const

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={isSaving ? undefined : onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
            {t('characterApp.relDialogTitle', { name: character.name })}
          </h2>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label={t('characterApp.cancel')} className="hover:opacity-70 disabled:opacity-50">
            <X className="h-5 w-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="rel-type" className="character-form__label">{t('characterApp.relType')}</label>
            <select
              id="rel-type"
              value={type}
              onChange={(e) => setType(e.target.value as RelationshipType)}
              disabled={isSaving}
              className="character-form__control mt-1.5"
            >
              {RELATIONSHIP_TYPES.map((option) => (
                <option key={option} value={option}>{t(`characterApp.relType_${option}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rel-target" className="character-form__label">{t('characterApp.relPerson')}</label>
            <div
              className="mt-1.5 max-h-52 space-y-0.5 overflow-y-auto rounded-lg border p-2"
              style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}
              role="group"
              aria-label={t('characterApp.relPerson')}
            >
              {others.length === 0 ? (
                <p className="px-1.5 py-1 text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                  {t('characterApp.relNoOthers')}
                </p>
              ) : (
                others.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 transition-opacity hover:opacity-80"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelected(c.id)}
                      disabled={isSaving}
                      className="shrink-0"
                    />
                    <span className="min-w-0 truncate text-sm" style={{ color: 'var(--color-ink)' }}>
                      {optionLabel(c)}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {(type === 'family' || type === 'custom') && (
            <div>
              <label htmlFor="rel-label" className="character-form__label">{t('characterApp.relLabel')}</label>
              <input
                id="rel-label"
                type="text"
                list="rel-label-suggestions"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t('characterApp.relLabelPlaceholder')}
                disabled={isSaving}
                className="character-form__control mt-1.5"
                style={inputStyle}
              />
              <datalist id="rel-label-suggestions">
                {FAMILY_LABEL_KEYS.map((key) => (
                  <option key={key} value={t(`characterApp.${key}`)} />
                ))}
              </datalist>
            </div>
          )}

          <div>
            <label htmlFor="rel-description" className="character-form__label">{t('characterApp.relDescription')}</label>
            <textarea
              id="rel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('characterApp.relDescriptionPlaceholder')}
              rows={2}
              disabled={isSaving}
              className="character-form__control mt-1.5 resize-y"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="character-form__button"
            style={{ color: 'var(--color-ink-light)' }}
          >
            {t('characterApp.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            aria-busy={isSaving}
            className="character-form__button text-white"
            style={{ background: 'var(--color-accent-violet)' }}
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 data-testid="relationship-save-spinner" className="h-4 w-4 animate-spin" />
                {t('common.saving')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                {t('characterApp.relSave')}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
