import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Users, Plus, Ruler, Network } from 'lucide-react'
import type { Character } from '@/types/character'
import { useCharactersStore } from '@/stores/characters-store'
import { useRelationshipsStore } from '@/stores/relationships-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingState } from '@/components/ui/LoadingState'
import { CharacterCard } from './CharacterCard'
import { CharacterForm } from './CharacterForm'
import { CharacterDetail } from './CharacterDetail'
import { CharacterFilters } from './CharacterFilters'
import { HeightMap } from './HeightMap'
import { CharacterAiButton } from './CharacterAiButton'
import { CharacterAiProposals } from './CharacterAiProposals'
import { fillToInput, uniqueNewFills } from './character-ai'
import type { AiCharacterFill } from '@/types/ai'
import { useToastStore } from '@/stores/toast-store'
import { EMPTY_FILTERS, filterCharacters, type CharacterFiltersState } from '@/lib/character-filters'

interface CharactersPanelProps {
  projectId: string
}

export function CharactersPanel({ projectId }: CharactersPanelProps) {
  const { t } = useTranslation()
  const [, setSearchParams] = useSearchParams()
  const { characters, isLoading, load, remove, createMany } = useCharactersStore()
  const { relations, load: loadRelations } = useRelationshipsStore()
  const toast = useToastStore()

  const [filters, setFilters] = useState<CharacterFiltersState>(EMPTY_FILTERS)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Character | null>(null)
  const [seedFill, setSeedFill] = useState<AiCharacterFill | null>(null)
  const [proposals, setProposals] = useState<AiCharacterFill[] | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [evolving, setEvolving] = useState<Character | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null)
  const [heightMapOpen, setHeightMapOpen] = useState(false)

  useEffect(() => {
    load(projectId)
    loadRelations(projectId)
  }, [projectId, load, loadRelations])

  const visibleCharacters = useMemo(() => characters.filter((c) => !c.evolvesFromId), [characters])
  const filtered = useMemo(() => filterCharacters(visibleCharacters, filters), [visibleCharacters, filters])

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

  const handleAddAll = async (fills: AiCharacterFill[]) => {
    const incoming = uniqueNewFills(fills, characters.map((character) => character.name))
    if (incoming.length === 0) {
      toast.error(t('characterApp.aiAddAllSkipped'))
      setProposals(null)
      return
    }
    const result = await createMany(projectId, incoming.map(fillToInput))
    if (result.created.length && result.failed.length === 0) {
      toast.success(t('characterApp.aiAddedAll', { count: result.created.length }))
    } else if (result.created.length) {
      toast.error(t('characterApp.aiAddAllPartial', { created: result.created.length, failed: result.failed.length }))
    } else {
      toast.error(t('characterApp.aiAddAllFailed'))
    }
    const done = new Set([
      ...result.created.map((character) => character.name.trim().toLocaleLowerCase()),
      ...result.skipped.map((name) => name.trim().toLocaleLowerCase()),
    ])
    const remaining = fills.filter((fill) => !done.has(fill.name.trim().toLocaleLowerCase()))
    setProposals(remaining.length > 0 ? remaining : null)
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
            {t('characterApp.subtitle')} · {visibleCharacters.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHeightMapOpen(true)}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          >
            <Ruler className="h-4 w-4" style={{ color: 'var(--color-accent-teal)' }} />
            {t('characterApp.heightMapTitle')}
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'diagrams' })}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
            data-testid="characters-diagrams-btn"
          >
            <Network className="h-4 w-4" style={{ color: 'var(--color-accent-teal)' }} />
            {t('diagramApp.title')}
          </button>
          <button
            onClick={() => { setEditing(null); setSeedFill(null); setFormOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus className="w-4 h-4" />
            {t('characterApp.newCharacter')}
          </button>
          <CharacterAiButton
            projectId={projectId}
            tone="toolbar"
            onFilled={(fills) => {
              if (fills.length === 1 && fills[0]) {
                setEditing(null)
                setSeedFill(fills[0])
                setFormOpen(true)
                return
              }
              setProposals(fills)
            }}
          />
        </div>
      </div>

      {visibleCharacters.length > 0 && (
        <>
          <CharacterFilters characters={visibleCharacters} filters={filters} onChange={setFilters} />
        </>
      )}

      {isLoading && visibleCharacters.length === 0 ? (
        <LoadingState label={t('common.loading')} className="notebook-paper" />
      ) : visibleCharacters.length === 0 ? (
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
              onEdit={() => { setEditing(character); setSeedFill(null); setFormOpen(true) }}
              onEvolve={() => { setEvolving(character); setDetailId(character.id) }}
              onDelete={() => setDeleteTarget(character)}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <CharacterForm
          key={editing?.id ?? seedFill?.name ?? 'new'}
          projectId={projectId}
          allCharacters={characters}
          character={editing}
          seedFill={editing ? null : seedFill}
          onClose={() => { setFormOpen(false); setEditing(null); setSeedFill(null) }}
          onSaved={handleSaved}
        />
      )}

      {proposals && (
        <CharacterAiProposals
          characters={proposals}
          onClose={() => setProposals(null)}
          onPick={(fill) => {
            setProposals(null)
            setEditing(null)
            setSeedFill(fill)
            setFormOpen(true)
          }}
          onAddAll={handleAddAll}
        />
      )}

      {detail && (
        <CharacterDetail
          character={detail}
          characters={characters}
          relations={relations}
          onClose={() => setDetailId(null)}
          onEdit={() => { setDetailId(null); setEditing(detail); setSeedFill(null); setFormOpen(true) }}
          onEvolve={() => setEvolving(detail)}
          evolving={evolving?.id === detail?.id}
          onCancelEvolve={() => setEvolving(null)}
          onEvolved={handleEvolved}
          onSelect={setDetailId}
          onDelete={setDeleteTarget}
        />
      )}

      {heightMapOpen && (
        <HeightMap characters={characters} onClose={() => setHeightMapOpen(false)} />
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
