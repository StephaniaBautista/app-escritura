import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Pencil, GitFork, History, Trash2, Check, Loader2 } from 'lucide-react'
import type { Character } from '@/types/character'
import type { CharacterRelationship } from '@/types/relationship'
import { FamilyTree } from './FamilyTree'
import { CharacterSheet } from './CharacterSheet'
import { RelationshipDialog } from './RelationshipDialog'
import { useCharactersStore } from '@/stores/characters-store'
import { useRelationshipsStore } from '@/stores/relationships-store'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface CharacterDetailProps {
  character: Character
  characters: Character[]
  relations?: CharacterRelationship[]
  onClose: () => void
  onEdit: () => void
  onEvolve: () => void
  onSelect: (id: string) => void
  onDelete: (character: Character) => void
}

export function CharacterDetail({ character, characters, relations = [], onClose, onEdit, onEvolve, onSelect, onDelete }: CharacterDetailProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const setEvolutionReason = useCharactersStore((s) => s.setEvolutionReason)
  const removeRelation = useRelationshipsStore((s) => s.remove)
  const source = characters.find((c) => c.id === character.evolvesFromId)
  const [editingReason, setEditingReason] = useState(false)
  const [reasonDraft, setReasonDraft] = useState('')
  const [isSavingReason, setIsSavingReason] = useState(false)
  const [relDialogOpen, setRelDialogOpen] = useState(false)
  const [relRemoveTarget, setRelRemoveTarget] = useState<CharacterRelationship | null>(null)

  const handleRemoveRelation = async () => {
    if (!relRemoveTarget) return
    await removeRelation(relRemoveTarget.id)
    setRelRemoveTarget(null)
  }

  const handleSaveReason = async () => {
    setIsSavingReason(true)
    try {
      await setEvolutionReason(character.id, reasonDraft.trim())
      toast.success(t('characterApp.evolveReasonUpdated'))
      setEditingReason(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setIsSavingReason(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default bg-black/50" onClick={onClose} aria-label={t('characterApp.closeDetail')} />
      <div
        className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-y-auto rounded-[var(--radius)] shadow-2xl"
        style={{ background: 'var(--color-paper)' }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
          style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
        >
          <h2 className="font-display flex min-w-0 items-center gap-2 truncate text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
            {t('characterApp.sheetLabel')}
          </h2>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onEvolve}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 sm:px-3"
              style={{ background: 'var(--color-accent-violet-light)', color: 'var(--color-accent-violet)' }}
            >
              <GitFork className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('characterApp.evolve')}</span>
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 sm:px-3"
              style={{ background: 'var(--color-accent)' }}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('characterApp.edit')}</span>
            </button>
            <button type="button" onClick={onClose} aria-label={t('characterApp.cancel')} className="p-1 hover:opacity-70">
              <X className="h-5 w-5" style={{ color: 'var(--color-ink-light)' }} />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-3 sm:p-5">
          <CharacterSheet
            character={character}
            characters={characters}
            relations={relations}
            onSelectCharacter={onSelect}
            onAddRelation={() => setRelDialogOpen(true)}
            onRemoveRelation={setRelRemoveTarget}
          />

          {source && (
            <section className="rounded-lg border p-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <div className="flex items-center justify-between gap-2">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-accent-violet)' }}>
                  <History className="h-3.5 w-3.5" />
                  {t('characterApp.evolvedFrom')} {source.name}
                  {character.storyPoint && (
                    <span
                      className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: 'var(--color-accent-violet-light)', color: 'var(--color-accent-violet)' }}
                    >
                      {t(`characterApp.storyPoint_${character.storyPoint}`)}
                    </span>
                  )}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { setReasonDraft(character.evolutionReason ?? ''); setEditingReason(true) }}
                    aria-label={t('characterApp.evolveReasonEdit')}
                    className="rounded p-1 hover:opacity-70"
                    style={{ color: 'var(--color-ink-light)' }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(character)}
                    aria-label={t('characterApp.evolveDelete')}
                    className="rounded p-1 hover:opacity-70"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {editingReason ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={reasonDraft}
                    onChange={(e) => setReasonDraft(e.target.value)}
                    rows={3}
                    placeholder={t('characterApp.evolveReasonPlaceholder')}
                    className="character-form__control"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingReason(false)}
                      className="character-form__button"
                      style={{ color: 'var(--color-ink-light)' }}
                    >
                      {t('characterApp.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveReason}
                      disabled={isSavingReason}
                      aria-busy={isSavingReason}
                      className="character-form__button text-white"
                      style={{ background: 'var(--color-accent-violet)' }}
                    >
                      {isSavingReason ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <Check className="h-4 w-4" />
                          {t('characterApp.evolveReasonSave')}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
                  {character.evolutionReason || t('characterApp.evolveReasonEmpty')}
                </p>
              )}
            </section>
          )}

          {(character.evolutions?.length ?? 0) > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
                {t('characterApp.evolutions')}
              </h3>
              <div className="space-y-1.5">
                {character.evolutions?.map((evolution) => (
                  <button
                    key={evolution.id}
                    type="button"
                    onClick={() => onSelect(evolution.id)}
                    className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-opacity hover:opacity-80"
                    style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
                  >
                    <History className="h-4 w-4 shrink-0" style={{ color: 'var(--color-accent-violet)' }} />
                    <span className="text-sm font-medium">{evolution.name}</span>
                    {evolution.storyPoint && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: 'var(--color-accent-violet-light)', color: 'var(--color-accent-violet)' }}
                      >
                        {t(`characterApp.storyPoint_${evolution.storyPoint}`)}
                      </span>
                    )}
                    {evolution.evolutionReason && (
                      <span className="ml-auto truncate text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                        {evolution.evolutionReason}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-ink-faint)' }}>
              {t('characterApp.familyTree')}
            </h3>
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <FamilyTree character={character} characters={characters} onSelect={onSelect} />
            </div>
          </section>
        </div>
      </div>

      {relDialogOpen && (
        <RelationshipDialog
          character={character}
          allCharacters={characters}
          onClose={() => setRelDialogOpen(false)}
          onCreated={() => undefined}
        />
      )}

      <ConfirmDialog
        isOpen={relRemoveTarget !== null}
        title={t('characterApp.relRemoveTitle')}
        message={`${t('characterApp.relRemoveConfirm')} ${relRemoveTarget
          ? (relRemoveTarget.characterAId === character.id ? relRemoveTarget.characterB.name : relRemoveTarget.characterA.name)
          : ''}`}
        confirmLabel={t('common.delete')}
        onConfirm={handleRemoveRelation}
        onCancel={() => setRelRemoveTarget(null)}
      />
    </div>
  )
}
