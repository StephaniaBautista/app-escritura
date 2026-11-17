import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Plus, Hourglass } from 'lucide-react'
import type { TimelineEra, TimelineEraInput, TimelineEvent, TimelineEventInput } from '@/types/timeline'
import { useTimelineStore } from '@/stores/timeline-store'
import { useCharactersStore } from '@/stores/characters-store'
import { useDocumentStore } from '@/stores/document-store'
import { useStructureStore } from '@/stores/structure-store'
import { characterOptionLabel } from '@/lib/character-labels'
import { flattenRelatedDocuments } from '@/lib/timeline-related-points'
import { filterVisibleSubplotItems } from '@/lib/subplot-visibility'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingState } from '@/components/ui/LoadingState'
import { SubplotsLayerButton } from '@/components/structure/SubplotsLayerButton'
import { FranjasTimeline } from './FranjasTimeline'
import { ConfiguracionSection } from './ConfiguracionSection'
import { EraDialog } from './EraDialog'
import { EventDialog, type EventImageChange } from './EventDialog'
import { TimelineAiButton } from './TimelineAiButton'
import { TimelineAiProposals } from './TimelineAiProposals'
import {
  eraFillToInput,
  eraPatchFromFill,
  eventFillToInput,
  eventPatchFromFill,
  matchCharacterIds,
  persistTimelineFills,
  sameTimelineKey,
} from './timeline-ai'
import { timelineApi } from '@/services/timeline'
import type { AiTimelineEraFill, AiTimelineEventFill, AiTimelineFillResult } from '@/types/ai'

interface TimelinePanelProps {
  projectId: string
}

type EraDialogState = { open: false } | { open: true; era: TimelineEra | null }
type EventDialogState = { open: false } | { open: true; event: TimelineEvent | null }

export function TimelinePanel({ projectId }: TimelinePanelProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { events, eras, timelineConfig, isLoading, load, loadConfig, loadEras, createEra, updateEra, removeEra, create, update, uploadImage, remove } = useTimelineStore()
  const { characters, load: loadCharacters } = useCharactersStore()
  const { documentTree, loadDocumentTree } = useDocumentStore()
  const subplots = useStructureStore((state) => state.subplots)
  const hiddenSubplotIds = useStructureStore((state) => state.hiddenSubplotIds)
  const documentOptions = useMemo(() => flattenRelatedDocuments(documentTree), [documentTree])
  const visibleEvents = useMemo(() => filterVisibleSubplotItems(events, hiddenSubplotIds), [events, hiddenSubplotIds])
  const [eventDialog, setEventDialog] = useState<EventDialogState>({ open: false })
  const [eraDialog, setEraDialog] = useState<EraDialogState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<TimelineEvent | null>(null)
  const [deleteEraTarget, setDeleteEraTarget] = useState<TimelineEra | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [proposals, setProposals] = useState<AiTimelineFillResult | null>(null)

  useEffect(() => {
    load(projectId)
    loadConfig(projectId)
    loadEras(projectId)
    loadCharacters(projectId)
    void loadDocumentTree(projectId)
  }, [projectId, load, loadConfig, loadEras, loadCharacters, loadDocumentTree])

  const effectiveSelectedId = selectedId && visibleEvents.some((e) => e.id === selectedId) ? selectedId : null

  const handleSaveEvent = async (data: TimelineEventInput, image: EventImageChange) => {
    if (!eventDialog.open) return
    const existing = eventDialog.event
    const payload: TimelineEventInput = image.remove && !image.dataUrl ? { ...data, imageUrl: null } : data
    const saved = existing ? await update(existing.id, payload) : await create(projectId, payload)
    if (!saved) return
    if (image.dataUrl) await uploadImage(saved.id, image.dataUrl)
    setSelectedId(saved.id)
    toast.success(existing ? t('timelineApp.updated') : t('timelineApp.created'))
    setEventDialog({ open: false })
  }

  const handleSaveEra = async (data: TimelineEraInput) => {
    if (!eraDialog.open) return
    const saved = eraDialog.era ? await updateEra(eraDialog.era.id, data) : await createEra(projectId, data)
    if (saved) setEraDialog({ open: false })
  }

  const resolveEraId = (eraName: string | undefined, extra: { name: string; id: string }[] = []) => {
    if (!eraName) return null
    const match = [...eras, ...extra].find((era) => sameTimelineKey(era.name, eraName))
    return match?.id ?? null
  }

  const handlePickEra = async (fill: AiTimelineEraFill) => {
    const existing = eras.find((era) => sameTimelineKey(era.name, fill.name))
    if (existing) {
      const patch = eraPatchFromFill(existing, fill)
      if (patch) await updateEra(existing.id, patch)
    } else {
      await createEra(projectId, eraFillToInput(fill))
    }
    setProposals((current) => current ? { ...current, eras: current.eras.filter((era) => !sameTimelineKey(era.name, fill.name)) } : null)
  }

  const handlePickEvent = async (fill: AiTimelineEventFill) => {
    let extraEra: { name: string; id: string } | null = null
    if (fill.eraName && !resolveEraId(fill.eraName)) {
      const eraFill = proposals?.eras.find((era) => sameTimelineKey(era.name, fill.eraName ?? ''))
      const created = await createEra(projectId, eraFillToInput(eraFill ?? { name: fill.eraName }))
      if (created) extraEra = created
    }
    const eraId = resolveEraId(fill.eraName, extraEra ? [extraEra] : [])
    const characterIds = matchCharacterIds(fill.characterNames, characters)
    const existing = events.find((event) => sameTimelineKey(event.title, fill.title))
    if (existing) {
      const patch = eventPatchFromFill(existing, fill, eraId, characterIds)
      if (patch) await update(existing.id, patch)
    } else {
      await create(projectId, eventFillToInput(fill, eraId, characterIds))
    }
    setProposals((current) => {
      if (!current) return null
      return {
        ...current,
        events: current.events.filter((event) => !sameTimelineKey(event.title, fill.title)),
        eras: extraEra ? current.eras.filter((era) => !sameTimelineKey(era.name, extraEra.name)) : current.eras,
      }
    })
  }

  const handleAddAll = async () => {
    if (!proposals) return
    const result = await persistTimelineFills(
      projectId,
      proposals,
      { eras, events },
      characters,
      timelineApi,
    )
    await Promise.all([load(projectId), loadEras(projectId)])
    if (result.createdEras + result.createdEvents + result.updated === 0 && result.failed === 0) {
      toast.error(t('timelineApp.aiAddAllSkipped'))
      setProposals(null)
      return
    }
    if (result.failed === 0) {
      toast.success(t('timelineApp.aiAddedAll', { eras: result.createdEras, events: result.createdEvents, updated: result.updated }))
      setProposals(null)
      return
    }
    if (result.createdEras + result.createdEvents + result.updated > 0) {
      toast.error(t('timelineApp.aiAddAllPartial', { created: result.createdEras + result.createdEvents + result.updated, failed: result.failed }))
    } else {
      toast.error(t('timelineApp.aiAddAllFailed'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--color-ink)' }}>
            <Clock className="h-6 w-6" style={{ color: 'var(--color-accent-violet)' }} />
            {t('timelineApp.title')}
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-ink-faint)' }}>
            {t('timelineApp.subtitle')} · {events.length}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TimelineAiButton
            projectId={projectId}
            empty={eras.length === 0 && events.length === 0}
            onFilled={setProposals}
          />
          <SubplotsLayerButton projectId={projectId} align="end" />
          <button
            type="button"
            onClick={() => setEraDialog({ open: true, era: null })}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)', background: 'var(--color-paper)' }}
          >
            <Hourglass className="h-4 w-4" style={{ color: 'var(--color-accent-teal)' }} />
            {t('timelineApp.agregarEpoca')}
          </button>
          <button
            type="button"
            onClick={() => setEventDialog({ open: true, event: null })}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus className="h-4 w-4" />
            {t('timelineApp.agregarEvento')}
          </button>
        </div>
      </div>

      {isLoading && events.length === 0 ? (
        <LoadingState label={t('common.loading')} className="notebook-paper" />
      ) : (
        <FranjasTimeline
          events={visibleEvents}
          eras={eras}
          subplots={subplots}
          timelineConfig={timelineConfig}
          characters={characters.map((c) => ({ id: c.id, name: characterOptionLabel(c, characters, t) }))}
          documents={documentOptions}
          selectedId={effectiveSelectedId}
          onSelect={setSelectedId}
          onEdit={(event) => setEventDialog({ open: true, event })}
          onDelete={setDeleteTarget}
          onEditEra={(era) => setEraDialog({ open: true, era })}
          onDeleteEra={setDeleteEraTarget}
        />
      )}

      <ConfiguracionSection projectId={projectId} />

      <EraDialog
        isOpen={eraDialog.open}
        era={eraDialog.open ? eraDialog.era : null}
        eras={eras}
        timelineConfig={timelineConfig}
        onSubmit={handleSaveEra}
        onCancel={() => setEraDialog({ open: false })}
      />

      <EventDialog
        isOpen={eventDialog.open}
        projectId={projectId}
        event={eventDialog.open ? eventDialog.event : null}
        events={events}
        eras={eras}
        subplots={subplots}
        timelineConfig={timelineConfig}
        onSubmit={handleSaveEvent}
        onCancel={() => setEventDialog({ open: false })}
      />

      <ConfirmDialog
        isOpen={deleteEraTarget !== null}
        title={t('timelineApp.deleteEraTitle')}
        message={`${t('timelineApp.confirmDeleteEra')} ${deleteEraTarget?.name ?? ''}`}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (deleteEraTarget) removeEra(deleteEraTarget.id)
          setDeleteEraTarget(null)
        }}
        onCancel={() => setDeleteEraTarget(null)}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('timelineApp.deleteTitle')}
        message={`${t('timelineApp.confirmDelete')} ${deleteTarget?.title ?? ''}`}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (deleteTarget) remove(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {proposals && (proposals.eras.length > 0 || proposals.events.length > 0) ? (
        <TimelineAiProposals
          eras={proposals.eras}
          events={proposals.events}
          onClose={() => setProposals(null)}
          onPickEra={(fill) => { void handlePickEra(fill) }}
          onPickEvent={(fill) => { void handlePickEvent(fill) }}
          onAddAll={handleAddAll}
        />
      ) : null}
    </div>
  )
}
