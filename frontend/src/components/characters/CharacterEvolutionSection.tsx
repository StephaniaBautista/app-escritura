import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, GitFork } from 'lucide-react'
import { storyPointsAfter, type Character, type StoryPoint } from '@/types/character'
import { useCharactersStore } from '@/stores/characters-store'
import { useToastStore } from '@/stores/toast-store'
import { CharacterFormFields, draftFromCharacter, draftToInput } from './CharacterFormFields'

interface CharacterEvolutionSectionProps {
  character: Character
  allCharacters: Character[]
  onCancel: () => void
  onEvolved: (evolved: Character) => void
}

export function CharacterEvolutionSection({ character, allCharacters, onCancel, onEvolved }: CharacterEvolutionSectionProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const charactersStore = useCharactersStore()
  const [draft, setDraft] = useState(() => {
    const d = draftFromCharacter(character, allCharacters)
    d.storyPoint = null
    return d
  })
  const [reason, setReason] = useState('')
  const [backgroundImageDataUrls, setBackgroundImageDataUrls] = useState<string[]>([])
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const availablePoints = storyPointsAfter(character.storyPoint)

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error(t('characterApp.errorName'))
      return
    }
    if (!reason.trim()) {
      toast.error(t('characterApp.evolveReasonRequired'))
      return
    }
    if (!draft.storyPoint) {
      toast.error(t('characterApp.evolvePointRequired'))
      return
    }
    setIsSaving(true)
    try {
      const changes = draftToInput(draft)
      let evolved = await charactersStore.evolve(character.id, reason.trim(), changes)

      if (evolved) {
        if (imageDataUrl) {
          await charactersStore.uploadImage(evolved.id, imageDataUrl)
          evolved = charactersStore.characters.find((c) => c.id === evolved.id) ?? evolved
        } else if (removeImage) {
          await charactersStore.deleteImage(evolved.id)
          evolved = charactersStore.characters.find((c) => c.id === evolved.id) ?? evolved
        }
      }

      const previousBackgroundImages = character.sheetBackgroundImages ?? []
      const backgroundImagesChanged = previousBackgroundImages.length !== draft.sheetBackgroundImages.length
        || previousBackgroundImages.some((url) => !draft.sheetBackgroundImages.includes(url))
      const shouldSyncBackground = Boolean(evolved) && (
        backgroundImageDataUrls.length > 0
        || backgroundImagesChanged
        || (draft.sheetBackgroundMode === 'default' && draft.sheetBackgroundImages.length > 0)
      )
      if (evolved && shouldSyncBackground) {
        const synced = await charactersStore.syncBackgroundImages(
          evolved.id,
          draft.sheetBackgroundMode === 'default' ? [] : draft.sheetBackgroundImages,
          backgroundImageDataUrls,
        )
        if (synced) evolved = synced
      }

      if (evolved) {
        for (const childId of allCharacters.filter((c) => c.id !== character.id)) {
          const shouldLink = draft.children.includes(childId.id)
          const isLinked = childId.parentIds.includes(evolved.id)
          if (shouldLink !== isLinked) {
            const next = shouldLink ? [...childId.parentIds, evolved.id] : childId.parentIds.filter((p) => p !== evolved.id)
            await charactersStore.update(childId.id, { parentIds: next })
          }
        }
      }

      if (evolved) {
        toast.success(t('characterApp.evolveSuccess'))
        onEvolved(evolved)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'EVOLUTION_POINT_INVALID') {
        toast.error(t('characterApp.evolvePointInvalid'))
      } else {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-2">
        <GitFork className="h-4 w-4 shrink-0" style={{ color: 'var(--color-accent-violet)' }} />
        <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
          {t('characterApp.evolveTitle')}
        </h3>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-accent-violet)' }}>
          {character.name}
        </span>
      </header>

      <div
        className="rounded-lg border border-dashed p-4"
        style={{ borderColor: 'var(--color-paper-lines)', background: 'color-mix(in srgb, var(--color-paper-lines) 14%, transparent)' }}
      >
        <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
          {t('characterApp.evolveBlankHint')}
        </p>
        <div className="mt-4">
          <label htmlFor="evo-storypoint" className="character-form__label">{t('characterApp.evolvePoint')}</label>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-faint)' }}>
            {t('characterApp.evolvePointHint', { source: t(`characterApp.storyPoint_${character.storyPoint ?? 'inicio'}`) })}
          </p>
          <select
            id="evo-storypoint"
            value={draft.storyPoint ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, storyPoint: e.target.value === '' ? null : e.target.value as StoryPoint }))}
            disabled={isSaving}
            className="character-form__control mt-2"
          >
            <option value="">—</option>
            {availablePoints.map((point) => (
              <option key={point} value={point}>{t(`characterApp.storyPoint_${point}`)}</option>
            ))}
            {draft.storyPoint && !availablePoints.includes(draft.storyPoint) && (
              <option value={draft.storyPoint}>{t(`characterApp.storyPoint_${draft.storyPoint}`)}</option>
            )}
          </select>
        </div>
        <div className="mt-4">
          <label htmlFor="evo-reason" className="character-form__label">{t('characterApp.evolveReason')}</label>
          <textarea
            id="evo-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('characterApp.evolveReasonPlaceholder')}
            rows={4}
            disabled={isSaving}
            className="character-form__control mt-2"
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-faint)' }}>
            {t('characterApp.evolveReasonHint')}
          </p>
        </div>
      </div>

      <CharacterFormFields
        draft={draft}
        setDraft={setDraft}
        disabled={isSaving}
        allCharacters={allCharacters}
        character={character}
        imageUrl={removeImage ? null : imageDataUrl ?? character.imageUrl ?? null}
        onImageChange={(v) => {
          if (v === null) {
            setRemoveImage(true)
            setImageDataUrl(null)
          } else {
            setRemoveImage(false)
            setImageDataUrl(v)
          }
        }}
        backgroundImageDataUrls={backgroundImageDataUrls}
        onBackgroundNewImagesChange={setBackgroundImageDataUrls}
        showStoryPoint={false}
        identityOverlap={false}
      />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isSaving} className="character-form__button"
          style={{ color: 'var(--color-ink-light)' }}>
          {t('characterApp.cancel')}
        </button>
        <button type="button" onClick={handleSave} disabled={isSaving} aria-busy={isSaving} className="character-form__button text-white"
          style={{ background: 'var(--color-accent-violet)' }}>
          {isSaving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 data-testid="character-evolve-spinner" className="w-4 h-4 animate-spin" />
              {t('common.saving')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <GitFork className="h-4 w-4" />
              {t('characterApp.evolve')}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
