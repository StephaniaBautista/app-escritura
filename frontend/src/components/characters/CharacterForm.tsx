import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import type { Character, CharacterInput } from '@/types/character'
import { useCharactersStore } from '@/stores/characters-store'
import { useToastStore } from '@/stores/toast-store'
import { CharacterFormFields, draftFromCharacter, draftToInput, emptyDraft } from './CharacterFormFields'

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
  const [draft, setDraft] = useState(() => character ? draftFromCharacter(character) : emptyDraft())
  const [backgroundImageDataUrls, setBackgroundImageDataUrls] = useState<string[]>([])
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error(t('characterApp.errorName'))
      return
    }
    setIsSaving(true)
    try {
      const input: CharacterInput = draftToInput(draft)

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
        for (const childId of allCharacters.filter((c) => c.id !== character?.id)) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={isSaving ? undefined : onClose} />
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
            <button type="button" onClick={onClose} disabled={isSaving} aria-label={t('characterApp.cancel')} className="character-form__close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="px-4 pb-6 sm:px-7">
          <CharacterFormFields
            draft={draft}
            setDraft={setDraft}
            disabled={isSaving}
            allCharacters={allCharacters}
            character={character}
            imageUrl={imageDataUrl ?? character?.imageUrl ?? null}
            onImageChange={setImageDataUrl}
            backgroundImageDataUrls={backgroundImageDataUrls}
            onBackgroundNewImagesChange={setBackgroundImageDataUrls}
          />
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
