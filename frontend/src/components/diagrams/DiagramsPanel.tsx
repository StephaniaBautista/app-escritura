import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GitBranch, Network, Plus, Pencil, Trash2, Users } from 'lucide-react'
import type { Diagram } from '@/types/diagram'
import { useDiagramsStore } from '@/stores/diagrams-store'
import { useCharactersStore } from '@/stores/characters-store'
import { useRelationshipsStore } from '@/stores/relationships-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InputDialog } from '@/components/ui/InputDialog'
import { LoadingState } from '@/components/ui/LoadingState'
import { DiagramCanvas } from './DiagramCanvas'

interface DiagramsPanelProps {
  projectId: string
}

export function DiagramsPanel({ projectId }: DiagramsPanelProps) {
  const { t } = useTranslation()
  const { diagrams, isLoading, load, create, generate, rename, remove } = useDiagramsStore()
  const { characters, load: loadCharacters } = useCharactersStore()
  const { relations, load: loadRelations } = useRelationshipsStore()
  const [openDiagram, setOpenDiagram] = useState<Diagram | null>(null)
  const [namePrompt, setNamePrompt] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Diagram | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Diagram | null>(null)
  const [isGeneratingFamily, setIsGeneratingFamily] = useState(false)
  const [isGeneratingRelations, setIsGeneratingRelations] = useState(false)

  useEffect(() => {
    load(projectId)
    loadCharacters(projectId)
    loadRelations(projectId)
  }, [projectId, load, loadCharacters, loadRelations])

  const handleCreate = async (name: string) => {
    const diagram = await create(projectId, { name, type: 'custom' })
    setNamePrompt(false)
    if (diagram) setOpenDiagram(diagram)
  }

  const handleGenerateFamily = async () => {
    setIsGeneratingFamily(true)
    const diagram = await generate(projectId, 'familyTree')
    setIsGeneratingFamily(false)
    if (diagram) setOpenDiagram(diagram)
  }

  const handleGenerateRelations = async () => {
    setIsGeneratingRelations(true)
    const diagram = await generate(projectId, 'relationships')
    setIsGeneratingRelations(false)
    if (diagram) setOpenDiagram(diagram)
  }

  const handleRename = async (name: string) => {
    if (renameTarget) await rename(renameTarget.id, name)
    setRenameTarget(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await remove(deleteTarget.id)
    if (openDiagram?.id === deleteTarget.id) setOpenDiagram(null)
    setDeleteTarget(null)
  }

  if (openDiagram) {
    return (
      <DiagramCanvas
        key={openDiagram.id}
        diagram={openDiagram}
        characters={characters}
        relations={relations}
        onBack={() => {
          setOpenDiagram(null)
          load(projectId)
        }}
        onDelete={() => {
          setDeleteTarget(openDiagram)
          setOpenDiagram(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
          <Network className="w-6 h-6" style={{ color: 'var(--color-accent-teal)' }} />
          {t('diagramApp.title')}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
          {t('diagramApp.subtitle')} · {diagrams.length}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setNamePrompt(true)}
          className="notebook-paper flex flex-col items-center justify-center gap-2 rounded-xl p-6 text-center transition-all hover:opacity-85"
          data-testid="new-diagram"
        >
          <Plus className="h-6 w-6" style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{t('diagramApp.newDiagram')}</span>
          <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{t('diagramApp.custom')}</span>
        </button>

        <button
          type="button"
          onClick={handleGenerateFamily}
          disabled={isGeneratingFamily || characters.length === 0}
          className="notebook-paper flex flex-col items-center justify-center gap-2 rounded-xl p-6 text-center transition-all hover:opacity-85 disabled:opacity-40"
          data-testid="generate-family"
        >
          <GitBranch className="h-6 w-6" style={{ color: 'var(--color-accent-violet)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{t('diagramApp.generateFamily')}</span>
          <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{t('diagramApp.generateFamilyDesc')}</span>
        </button>

        <button
          type="button"
          onClick={handleGenerateRelations}
          disabled={isGeneratingRelations || characters.length === 0}
          className="notebook-paper flex flex-col items-center justify-center gap-2 rounded-xl p-6 text-center transition-all hover:opacity-85 disabled:opacity-40"
          data-testid="generate-relationships"
        >
          <Network className="h-6 w-6" style={{ color: 'var(--color-accent-teal)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{t('diagramApp.generateRelationships')}</span>
          <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{t('diagramApp.generateRelationshipsDesc')}</span>
        </button>
      </div>

      {isLoading && diagrams.length === 0 ? (
        <LoadingState label={t('common.loading')} className="notebook-paper" />
      ) : diagrams.length === 0 ? (
        <div className="notebook-paper p-10 text-center">
          <Network className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-teal)' }} />
          <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>{t('diagramApp.empty')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-ink-faint)' }}>{t('diagramApp.emptyDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {diagrams.map((diagram) => (
            <div key={diagram.id} className="notebook-paper p-4 flex flex-col gap-3" data-testid={`diagram-${diagram.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold truncate" style={{ color: 'var(--color-ink)' }}>
                    {diagram.name}
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                    {diagram.type === 'familyTree'
                      ? t('diagramApp.family')
                      : diagram.type === 'relationships'
                        ? t('diagramApp.relationships')
                        : t('diagramApp.custom')}
                    {' · '}
                    {t('diagramApp.nodeCount', { count: (diagram.layout.nodes ?? []).length })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setRenameTarget(diagram)}
                    aria-label={t('diagramApp.rename')}
                    className="rounded p-1 hover:opacity-70"
                    style={{ color: 'var(--color-ink-light)' }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(diagram)}
                    aria-label={t('common.delete')}
                    className="rounded p-1 hover:opacity-70"
                    style={{ color: 'var(--color-danger, #dc2626)' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenDiagram(diagram)}
                className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'var(--color-accent)' }}
              >
                <Users className="h-3.5 w-3.5" />
                {t('diagramApp.open')}
              </button>
            </div>
          ))}
        </div>
      )}

      <InputDialog
        isOpen={namePrompt}
        title={t('diagramApp.newDiagram')}
        placeholder={t('diagramApp.newDiagramPlaceholder')}
        confirmLabel={t('diagramApp.newDiagram')}
        onSubmit={handleCreate}
        onCancel={() => setNamePrompt(false)}
      />

      <InputDialog
        isOpen={renameTarget !== null}
        title={t('diagramApp.rename')}
        placeholder={t('diagramApp.namePlaceholder')}
        initialValue={renameTarget?.name ?? ''}
        confirmLabel={t('diagramApp.rename')}
        onSubmit={handleRename}
        onCancel={() => setRenameTarget(null)}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('diagramApp.deleteTitle')}
        message={`${t('diagramApp.confirmDelete')} ${deleteTarget?.name ?? ''}`}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
