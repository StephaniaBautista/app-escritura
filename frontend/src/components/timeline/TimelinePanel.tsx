import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Plus, Hourglass, Loader2, X } from 'lucide-react'
import type { TimelineEra, TimelineEraInput, TimelineEvent, TimelineEventInput } from '@/types/timeline'
import { useTimelineStore } from '@/stores/timeline-store'
import { useCharactersStore } from '@/stores/characters-store'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingState } from '@/components/ui/LoadingState'
import { FranjasTimeline } from './FranjasTimeline'
import { ConfiguracionSection } from './ConfiguracionSection'
import { EraDialog } from './EraDialog'

interface TimelinePanelProps {
  projectId: string
}

interface EventFormState {
  id: string | null
  title: string
  date: string
  description: string
  eraId: string | null
  characterIds: string[]
}

const EMPTY_FORM: EventFormState = { id: null, title: '', date: '', description: '', eraId: null, characterIds: [] }

export function TimelinePanel({ projectId }: TimelinePanelProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { events, eras, isLoading, load, loadEras, createEra, removeEra, create, update, remove } = useTimelineStore()
  const { characters, load: loadCharacters } = useCharactersStore()
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TimelineEvent | null>(null)
  const [eraPromptOpen, setEraPromptOpen] = useState(false)
  const [deleteEraTarget, setDeleteEraTarget] = useState<TimelineEra | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    load(projectId)
    loadEras(projectId)
    loadCharacters(projectId)
  }, [projectId, load, loadEras, loadCharacters])

  useEffect(() => {
    if (selectedId && !events.find((e) => e.id === selectedId)) setSelectedId(null)
    if (!selectedId && events.length > 0) setSelectedId(events[0].id)
  }, [events, selectedId])

  const openNew = () => {
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (event: TimelineEvent) => {
    setForm({
      id: event.id,
      title: event.title,
      date: event.date ?? '',
      description: event.description ?? '',
      eraId: event.eraId ?? null,
      characterIds: event.characterIds,
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error(t('timelineApp.fieldTitle'))
      return
    }
    setIsSaving(true)
    const data: TimelineEventInput = {
      title: form.title.trim(),
      date: form.date.trim() || null,
      description: form.description.trim() || null,
      eraId: form.eraId,
      characterIds: form.characterIds,
    }
    try {
      if (form.id) {
        await update(form.id, data)
        toast.success(t('timelineApp.updated'))
      } else {
        const created = await create(projectId, data)
        if (created) setSelectedId(created.id)
        toast.success(t('timelineApp.created'))
      }
      setFormOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateEra = async (data: TimelineEraInput) => {
    await createEra(projectId, data)
    setEraPromptOpen(false)
  }

  const toggleCharacter = (id: string) => {
    setForm((f) => ({
      ...f,
      characterIds: f.characterIds.includes(id) ? f.characterIds.filter((c) => c !== id) : [...f.characterIds, id],
    }))
  }

  const inputStyle = {
    background: 'var(--color-background)',
    borderColor: 'var(--color-paper-lines)',
    color: 'var(--color-ink)',
  } as const

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <Clock className="w-6 h-6" style={{ color: 'var(--color-accent-violet)' }} />
            {t('timelineApp.title')}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
            {t('timelineApp.subtitle')} · {events.length}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEraPromptOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)', background: 'var(--color-paper)' }}
          >
            <Hourglass className="w-4 h-4" style={{ color: 'var(--color-accent-teal)' }} />
            {t('timelineApp.agregarEpoca')}
          </button>
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus className="w-4 h-4" />
            {t('timelineApp.agregarEvento')}
          </button>
        </div>
      </div>

      {isLoading && events.length === 0 ? (
        <LoadingState label={t('common.loading')} className="notebook-paper" />
      ) : (
        <FranjasTimeline
          events={events}
          eras={eras}
          characters={characters.map((c) => ({ id: c.id, name: c.name }))}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onDeleteEra={setDeleteEraTarget}
        />
      )}

      <ConfiguracionSection />

      <EraDialog
        isOpen={eraPromptOpen}
        onSubmit={handleCreateEra}
        onCancel={() => setEraPromptOpen(false)}
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

      {formOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={isSaving ? undefined : () => setFormOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border shadow-2xl" style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>{form.id ? t('timelineApp.edit') : t('timelineApp.agregarEvento')}</h2>
              <button type="button" onClick={() => setFormOpen(false)} disabled={isSaving} aria-label={t('timelineApp.cancel')} className="hover:opacity-70 disabled:opacity-50">
                <X className="h-5 w-5" style={{ color: 'var(--color-ink-light)' }} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label htmlFor="event-title" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('timelineApp.fieldTitle')}</label>
                <input id="event-title" type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={t('timelineApp.fieldTitlePlaceholder')} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="event-era" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('timelineApp.fieldEpoca')}</label>
                <select id="event-era" value={form.eraId ?? ''} onChange={(e) => setForm((f) => ({ ...f, eraId: e.target.value || null }))} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                  <option value="">{t('timelineApp.laneGeneral')}</option>
                  {eras.map((era) => (
                    <option key={era.id} value={era.id}>{era.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="event-date" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('timelineApp.fieldDate')}</label>
                <input id="event-date" type="text" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} placeholder={t('timelineApp.fieldDatePlaceholder')} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="event-description" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('timelineApp.fieldDescription')}</label>
                <textarea id="event-description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder={t('timelineApp.fieldDescriptionPlaceholder')} rows={3} disabled={isSaving} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>{t('timelineApp.fieldCharacters')}</label>
                {characters.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>{t('timelineApp.noCharacters')}</p>
                ) : (
                  <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
                    {characters.map((c) => {
                      const active = form.characterIds.includes(c.id)
                      return (
                        <button key={c.id} type="button" onClick={() => toggleCharacter(c.id)} disabled={isSaving} aria-pressed={active} className="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors" style={{ borderColor: active ? 'var(--color-accent-violet)' : 'var(--color-paper-lines)', background: active ? 'var(--color-accent-violet-light)' : 'var(--color-background)', color: active ? 'var(--color-accent-violet)' : 'var(--color-ink-light)' }}>
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <button type="button" onClick={() => setFormOpen(false)} disabled={isSaving} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ color: 'var(--color-ink-light)' }}>{t('timelineApp.cancel')}</button>
              <button type="button" onClick={handleSave} disabled={isSaving} aria-busy={isSaving} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('timelineApp.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={deleteTarget !== null} title={t('timelineApp.deleteTitle')} message={`${t('timelineApp.confirmDelete')} ${deleteTarget?.title ?? ''}`} confirmLabel={t('common.delete')} onConfirm={() => { if (deleteTarget) remove(deleteTarget.id); setDeleteTarget(null) }} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
