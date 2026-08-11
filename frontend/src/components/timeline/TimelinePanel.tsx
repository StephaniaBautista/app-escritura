import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Plus, ChevronUp, ChevronDown, Pencil, Trash2, Loader2, X } from 'lucide-react'
import type { TimelineEvent, TimelineEventInput } from '@/types/timeline'
import { useTimelineStore } from '@/stores/timeline-store'
import { useCharactersStore } from '@/stores/characters-store'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingState } from '@/components/ui/LoadingState'

interface TimelinePanelProps {
  projectId: string
}

interface EventFormState {
  id: string | null
  title: string
  date: string
  description: string
  characterIds: string[]
}

const EMPTY_FORM: EventFormState = { id: null, title: '', date: '', description: '', characterIds: [] }

export function TimelinePanel({ projectId }: TimelinePanelProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { events, isLoading, load, create, update, move, remove } = useTimelineStore()
  const { characters, load: loadCharacters } = useCharactersStore()
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TimelineEvent | null>(null)

  useEffect(() => {
    load(projectId)
    loadCharacters(projectId)
  }, [projectId, load, loadCharacters])

  const characterName = useMemo(() => {
    const map = new Map(characters.map((c) => [c.id, c.name]))
    return (id: string) => map.get(id) ?? id
  }, [characters])

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
      characterIds: form.characterIds,
    }
    try {
      if (form.id) {
        await update(form.id, data)
        toast.success(t('timelineApp.updated'))
      } else {
        await create(projectId, data)
        toast.success(t('timelineApp.created'))
      }
      setFormOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleCharacter = (id: string) => {
    setForm((f) => ({
      ...f,
      characterIds: f.characterIds.includes(id)
        ? f.characterIds.filter((c) => c !== id)
        : [...f.characterIds, id],
    }))
  }

  const inputStyle = {
    background: 'var(--color-background)',
    borderColor: 'var(--color-paper-lines)',
    color: 'var(--color-ink)',
  } as const

  return (
    <div className="space-y-4">
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
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          {t('timelineApp.newEvent')}
        </button>
      </div>

      {isLoading && events.length === 0 ? (
        <LoadingState label={t('common.loading')} className="notebook-paper" />
      ) : events.length === 0 ? (
        <div className="notebook-paper p-10 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-violet)' }} />
          <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>{t('timelineApp.empty')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-ink-faint)' }}>{t('timelineApp.emptyDesc')}</p>
        </div>
      ) : (
        <ol className="relative space-y-4 pl-6" data-testid="timeline-list">
          <span className="absolute left-2 top-1 bottom-1 w-px" style={{ background: 'var(--color-paper-lines)' }} aria-hidden="true" />
          {events.map((event, index) => (
            <li key={event.id} className="relative" data-testid={`timeline-event-${event.id}`}>
              <span
                className="absolute -left-[21px] top-3 h-3 w-3 rounded-full border-2"
                style={{ background: 'var(--color-background)', borderColor: 'var(--color-accent-violet)' }}
                aria-hidden="true"
              />
              <div className="notebook-paper p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
                      {event.title}
                    </h3>
                    {event.date && (
                      <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-accent-violet)' }}>
                        {event.date}
                      </p>
                    )}
                    {event.description && (
                      <p className="text-sm mt-1.5 whitespace-pre-wrap" style={{ color: 'var(--color-ink-light)' }}>
                        {event.description}
                      </p>
                    )}
                    {event.characterIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {event.characterIds.map((id) => (
                          <span
                            key={id}
                            className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                            style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)', color: 'var(--color-ink-light)' }}
                          >
                            {characterName(id)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(event.id, 'up')}
                      disabled={index === 0}
                      aria-label={t('timelineApp.moveUp')}
                      className="rounded p-1 hover:opacity-70 disabled:opacity-30"
                      style={{ color: 'var(--color-ink-light)' }}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(event.id, 'down')}
                      disabled={index === events.length - 1}
                      aria-label={t('timelineApp.moveDown')}
                      className="rounded p-1 hover:opacity-70 disabled:opacity-30"
                      style={{ color: 'var(--color-ink-light)' }}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(event)}
                      aria-label={t('timelineApp.edit')}
                      className="rounded p-1 hover:opacity-70"
                      style={{ color: 'var(--color-ink-light)' }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(event)}
                      aria-label={t('common.delete')}
                      className="rounded p-1 hover:opacity-70"
                      style={{ color: 'var(--color-danger, #dc2626)' }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={isSaving ? undefined : () => setFormOpen(false)} />
          <div
            className="relative w-full max-w-md rounded-2xl border shadow-2xl"
            style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
          >
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
                {form.id ? t('timelineApp.edit') : t('timelineApp.newEvent')}
              </h2>
              <button type="button" onClick={() => setFormOpen(false)} disabled={isSaving} aria-label={t('timelineApp.cancel')} className="hover:opacity-70 disabled:opacity-50">
                <X className="h-5 w-5" style={{ color: 'var(--color-ink-light)' }} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label htmlFor="event-title" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
                  {t('timelineApp.fieldTitle')}
                </label>
                <input
                  id="event-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={t('timelineApp.fieldTitlePlaceholder')}
                  disabled={isSaving}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="event-date" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
                  {t('timelineApp.fieldDate')}
                </label>
                <input
                  id="event-date"
                  type="text"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  placeholder={t('timelineApp.fieldDatePlaceholder')}
                  disabled={isSaving}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="event-description" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
                  {t('timelineApp.fieldDescription')}
                </label>
                <textarea
                  id="event-description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t('timelineApp.fieldDescriptionPlaceholder')}
                  rows={3}
                  disabled={isSaving}
                  className="w-full rounded-lg border px-3 py-2 text-sm resize-y"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
                  {t('timelineApp.fieldCharacters')}
                </label>
                {characters.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>{t('timelineApp.noCharacters')}</p>
                ) : (
                  <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
                    {characters.map((c) => {
                      const active = form.characterIds.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCharacter(c.id)}
                          disabled={isSaving}
                          aria-pressed={active}
                          className="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                          style={{
                            borderColor: active ? 'var(--color-accent-violet)' : 'var(--color-paper-lines)',
                            background: active ? 'var(--color-accent-violet-light)' : 'var(--color-background)',
                            color: active ? 'var(--color-accent-violet)' : 'var(--color-ink-light)',
                          }}
                        >
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={isSaving}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ color: 'var(--color-ink-light)' }}
              >
                {t('timelineApp.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                aria-busy={isSaving}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ background: 'var(--color-accent)' }}
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('timelineApp.save')}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  )
}
