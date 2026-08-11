import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, Plus } from 'lucide-react'
import type { Character } from '@/types/character'
import { useCharactersStore } from '@/stores/characters-store'
import { useRelationshipsStore } from '@/stores/relationships-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingState } from '@/components/ui/LoadingState'
import { CharacterCard } from './CharacterCard'
import { CharacterForm } from './CharacterForm'
import { CharacterDetail } from './CharacterDetail'
import { CharacterEvolutionDialog } from './CharacterEvolutionDialog'
import { CharacterFilters } from './CharacterFilters'
import { HeightMap } from './HeightMap'
import { EMPTY_FILTERS, filterCharacters, type CharacterFiltersState } from '@/lib/character-filters'

interface CharactersPanelProps {
  projectId: string
}

export function CharactersPanel({ projectId }: CharactersPanelProps) {
  const { t } = useTranslation()
  const { characters, isLoading, load, remove } = useCharactersStore()
  const { relations, load: loadRelations } = useRelationshipsStore()

  const [filters, setFilters] = useState<CharacterFiltersState>(EMPTY_FILTERS)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Character | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [evolving, setEvolving] = useState<Character | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null)

  useEffect(() => {
    load(projectId)
    loadRelations(projectId)
  }, [projectId, load, loadRelations])

  const filtered = useMemo(() => filterCharacters(characters, filters), [characters, filters])

  const detail = characters.find((c) => c.id === detailId) ?? null

  const handleSaved = (character: Character) => {
    setEditing(null)
    setDetailId(character.id)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await remove(deleteTarget.id)
    setDeleteTarget(null)
    if (detailId === deleteTarget.id) setDetailId(null)
  }

  const handleEvolved = (evolved: Character) => {
    setEvolving(null)
    setDetailId(evolved.id)
  }

  const evolutionCount = (id: string) =>
    characters.filter((c) => c.evolvesFromId === id).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <Users className="w-6 h-6" style={{ color: 'var(--color-accent-teal)' }} />
            {t('characterApp.title')}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
            {t('characterApp.subtitle')} · {characters.length}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          {t('characterApp.newCharacter')}
        </button>
      </div>

      {characters.length > 0 && (
        <>
          <CharacterFilters characters={characters} filters={filters} onChange={setFilters} />
          <HeightMap characters={characters} />
        </>
      )}

      {isLoading && characters.length === 0 ? (
        <LoadingState label={t('common.loading')} className="notebook-paper" />
      ) : characters.length === 0 ? (
        <div className="notebook-paper p-10 text-center">
          <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-teal)' }} />
          <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>{t('characterApp.empty')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-ink-faint)' }}>{t('characterApp.emptyDesc')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="notebook-paper p-8 text-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          {t('characterApp.noResults')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              evolutionCount={evolutionCount(character.id)}
              onOpen={() => setDetailId(character.id)}
              onEdit={() => { setEditing(character); setFormOpen(true) }}
              onEvolve={() => setEvolving(character)}
              onDelete={() => setDeleteTarget(character)}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <CharacterForm
          key={editing?.id ?? 'new'}
          projectId={projectId}
          allCharacters={characters}
          character={editing}
          onClose={() => { setFormOpen(false); setEditing(null) }}
          onSaved={handleSaved}
        />
      )}

      {detail && (
        <CharacterDetail
          character={detail}
          characters={characters}
          relations={relations}
          onClose={() => setDetailId(null)}
          onEdit={() => { setDetailId(null); setEditing(detail); setFormOpen(true) }}
          onEvolve={() => { setDetailId(null); setEvolving(detail) }}
          onSelect={setDetailId}
          onDelete={setDeleteTarget}
        />
      )}

      {evolving && (
        <CharacterEvolutionDialog
          character={evolving}
          allCharacters={characters}
          onClose={() => setEvolving(null)}
          onEvolved={handleEvolved}
        />
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={deleteTarget?.evolvesFromId ? t('characterApp.evolveDeleteTitle') : t('characterApp.deleteTitle')}
        message={deleteTarget?.evolvesFromId
          ? t('characterApp.evolveDeleteConfirm')
          : `${t('characterApp.confirmDelete')} ${deleteTarget?.name ?? ''}`}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
