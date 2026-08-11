import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X, GitFork } from 'lucide-react'
import { storyPointsAfter, type Character, type StoryPoint } from '@/types/character'
import { useCharactersStore } from '@/stores/characters-store'
import { useToastStore } from '@/stores/toast-store'
import { AccordionSection } from '@/components/ui/AccordionSection'
import { CharacterFormFields, draftFromCharacter, draftToInput } from './CharacterFormFields'

interface CharacterEvolutionDialogProps {
  character: Character
  allCharacters: Character[]
  onClose: () => void
  onEvolved: (evolved: Character) => void
}

export function CharacterEvolutionDialog({ character, allCharacters, onClose, onEvolved }: CharacterEvolutionDialogProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const charactersStore = useCharactersStore()
  const [draft, setDraft] = useState(() => {
    const d = draftFromCharacter(character)
    d.storyPoint = null
    return d
  })
  const [reason, setReason] = useState('')
  const [backgroundImageDataUrls, setBackgroundImageDataUrls] = useState<string[]>([])
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
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

      if (imageDataUrl && evolved) {
        const evolvedId = evolved.id
        await charactersStore.uploadImage(evolvedId, imageDataUrl)
        evolved = charactersStore.characters.find((c) => c.id === evolvedId) ?? evolved
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
        onClose()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={isSaving ? undefined : onClose} />
      <div
        className="character-form relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[var(--radius)] border shadow-2xl"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
      >
        <header className="character-form__hero character-form__hero--evolution">
          <div className="character-form__hero-content">
            <div className="min-w-0">
              <p className="character-form__eyebrow">{t('characterApp.evolveTitle')}</p>
              <h2 className="character-form__title">{character.name}</h2>
            </div>
            <button type="button" onClick={onClose} disabled={isSaving} aria-label={t('characterApp.cancel')} className="character-form__close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="px-4 pb-6 sm:px-7">
          <AccordionSection variant="sheet" title={t('characterApp.evolutionSection')} defaultOpen>
            <div className="mt-3 space-y-4">
              <div>
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
              <div>
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
          </AccordionSection>

          <div className="mt-8">
            <CharacterFormFields
              draft={draft}
              setDraft={setDraft}
              disabled={isSaving}
              allCharacters={allCharacters}
              character={character}
              imageUrl={imageDataUrl ?? character.imageUrl ?? null}
              onImageChange={setImageDataUrl}
              backgroundImageDataUrls={backgroundImageDataUrls}
              onBackgroundNewImagesChange={setBackgroundImageDataUrls}
              showStoryPoint={false}
            />
          </div>
        </div>

        <footer className="character-form__footer">
          <button type="button" onClick={onClose} disabled={isSaving} className="character-form__button"
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
        </footer>
      </div>
    </div>
  )
}
