import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, FileText, Timer, UserPlus, Users } from 'lucide-react'
import type { TimelineConfig, TimelineEra, TimelineEvent, TimelineEventInput, TimelinePrecision } from '@/types/timeline'
import type { Subplot } from '@/types/structure'
import { useCharactersStore } from '@/stores/characters-store'
import { useDocumentStore } from '@/stores/document-store'
import { useToastStore } from '@/stores/toast-store'
import { characterOptionLabel } from '@/lib/character-labels'
import { flattenRelatedDocuments } from '@/lib/timeline-related-points'
import { isTimelineEvolutionLocked } from '@/lib/timeline-evolution-gate'
import { coerceParts, datePartsToMinutes, describeEraPosition, eraContaining, parseDateParts, serializeDateParts, yearsFromRawDates, type DateParts } from '@/lib/timeline-date'
import { parseDateValue, YEAR } from '@/lib/timeline-scale'
import { FormSheet } from '@/components/ui/FormSheet'
import { ColorDot } from '@/components/ui/ColorDot'
import { PillButton, SectionTitle, UnderlineInput, UnderlineSelect } from '@/components/ui/SheetFields'
import { DatePartsPicker } from './DatePartsPicker'
import { CharacterPicker, DocumentPicker, EventGroupPicker, EventImageField, IconPicker, SubplotPicker } from './EventDialogSections'
import { DEFAULT_EVENT_ICON, EVENT_PRECISIONS, isPrecision, PALETTE } from './timeline-constants'

export interface EventImageChange {
  dataUrl: string | null
  remove: boolean
}

interface EventDialogProps {
  isOpen: boolean
  projectId: string
  event: TimelineEvent | null
  events: TimelineEvent[]
  eras: TimelineEra[]
  subplots?: Subplot[]
  timelineConfig: TimelineConfig
  onSubmit: (data: TimelineEventInput, image: EventImageChange) => Promise<void>
  onCancel: () => void
}

const NO_SUBPLOTS: Subplot[] = []

function partsFrom(raw: string | null): DateParts | null {
  const parts = parseDateParts(raw)
  if (parts) return parts
  const legacy = parseDateValue(raw)
  return legacy !== null ? { year: Math.round(legacy / YEAR) } : null
}

export function EventDialog({ isOpen, event, ...rest }: EventDialogProps) {
  if (!isOpen) return null
  return <EventForm key={event?.id ?? 'new'} event={event} {...rest} />
}

function EventForm({ projectId, event, events, eras, subplots = NO_SUBPLOTS, timelineConfig, onSubmit, onCancel }: Omit<EventDialogProps, 'isOpen'>) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { characters, isLoading: charactersLoading, load: loadCharacters } = useCharactersStore()
  const { documentTree, loadDocumentTree } = useDocumentStore()
  const [docsLoading, setDocsLoading] = useState(true)

  useEffect(() => {
    void loadCharacters(projectId)
  }, [projectId, loadCharacters])

  useEffect(() => {
    let cancelled = false
    setDocsLoading(true)
    void loadDocumentTree(projectId).finally(() => {
      if (!cancelled) setDocsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [projectId, loadDocumentTree])

  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [icon, setIcon] = useState(event?.icon ?? DEFAULT_EVENT_ICON)
  const [color, setColor] = useState<string | null>(event?.color ?? null)
  const [groupName, setGroupName] = useState<string | null>(event?.groupName ?? null)
  const [subplotId, setSubplotId] = useState<string | null>(event?.subplotId ?? null)
  const [precision, setPrecision] = useState<TimelinePrecision>(isPrecision(event?.precision) ? event.precision : 'year')
  const [start, setStart] = useState<DateParts>(() => partsFrom(event?.date ?? null) ?? { year: 0 })
  const [end, setEnd] = useState<DateParts | null>(() => partsFrom(event?.endDate ?? null))
  const [characterIds, setCharacterIds] = useState<string[]>(event?.characterIds ?? [])
  const [relatedDocumentIds, setRelatedDocumentIds] = useState<string[]>(event?.relatedDocumentIds ?? [])
  const [showCharacters, setShowCharacters] = useState(characterIds.length > 0)
  const [showDocuments, setShowDocuments] = useState(relatedDocumentIds.length > 0)
  const documentOptions = useMemo(() => flattenRelatedDocuments(documentTree), [documentTree])
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const contextYears = useMemo(
    () => yearsFromRawDates([
      ...eras.flatMap((e) => [e.startDate, e.endDate]),
      ...events.flatMap((e) => [e.date, e.endDate]),
    ]),
    [eras, events],
  )

  const yearUnit = t('timelineApp.unitYears')
  const startMinutes = Number.isFinite(start.year) ? datePartsToMinutes(coerceParts(start, precision)) : null
  const startHint = startMinutes !== null ? describeEraPosition(eras, startMinutes, yearUnit) : null
  const endHint = end && Number.isFinite(end.year) ? describeEraPosition(eras, datePartsToMinutes(coerceParts(end, precision)), yearUnit) : null
  const imagePreview = removeImage ? null : imageDataUrl ?? event?.imageUrl ?? null

  const characterOptions = useMemo(
    () => characters.map((c) => {
      const locked = isTimelineEvolutionLocked(
        c,
        characters,
        events,
        event?.id ?? null,
        startMinutes,
        parseDateValue,
      )
      return {
        id: c.id,
        name: characterOptionLabel(c, characters, t),
        imageUrl: c.imageUrl,
        locked,
        lockedHint: locked ? t('timelineApp.evolutionNeedsOriginal') : undefined,
      }
    }),
    [characters, events, event?.id, startMinutes, t],
  )
  const lockedIds = useMemo(
    () => new Set(characterOptions.filter((option) => option.locked).map((option) => option.id)),
    [characterOptions],
  )

  useEffect(() => {
    setCharacterIds((ids) => {
      const next = ids.filter((id) => !lockedIds.has(id))
      return next.length === ids.length ? ids : next
    })
  }, [lockedIds])

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t('timelineApp.fieldTitle'))
      return
    }
    if (startMinutes === null || (end && !Number.isFinite(end.year))) {
      toast.error(t('timelineApp.yearRequired'))
      return
    }
    setIsSaving(true)
    try {
      await onSubmit(
        {
          title: title.trim(),
          description: description.trim() || null,
          icon,
          color,
          groupName,
          subplotId,
          precision,
          date: serializeDateParts(coerceParts(start, precision), precision),
          endDate: end ? serializeDateParts(coerceParts(end, precision), precision) : null,
          eraId: eraContaining(eras, startMinutes)?.id ?? null,
          characterIds: characterIds.filter((id) => !lockedIds.has(id)),
          relatedDocumentIds,
        },
        { dataUrl: imageDataUrl, remove: removeImage && Boolean(event?.imageUrl) },
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormSheet
      isOpen
      title={event ? t('timelineApp.editEvento') : t('timelineApp.agregarEvento')}
      closeLabel={t('timelineApp.cancel')}
      confirmLabel={t('timelineApp.save')}
      isSaving={isSaving}
      onClose={onCancel}
      onConfirm={handleSubmit}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-end gap-5">
          <IconPicker value={icon} onChange={setIcon} disabled={isSaving} />
          <div className="inline-flex items-center gap-3">
            <span className="text-[15px]" style={{ color: 'var(--color-ink)' }}>{t('timelineApp.fieldColor')}</span>
            <ColorDot value={color} palette={PALETTE} label={t('timelineApp.fieldColor')} onChange={setColor} clearLabel={t('timelineApp.colorDefault')} disabled={isSaving} />
          </div>
        </div>

        <div className="space-y-2">
          <UnderlineInput autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('timelineApp.eventNamePlaceholder')} aria-label={t('timelineApp.eventNamePlaceholder')} disabled={isSaving} />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('timelineApp.eventDetailsPlaceholder')}
            aria-label={t('timelineApp.eventDetailsPlaceholder')}
            rows={1}
            disabled={isSaving}
            className="sheet-underline w-full resize-y bg-transparent border-0 border-b py-2.5 text-[15px] placeholder:opacity-70 disabled:opacity-60"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          />
        </div>

        <EventGroupPicker events={events} value={groupName} onChange={setGroupName} disabled={isSaving} />

        {subplots.length > 0 && (
          <SubplotPicker subplots={subplots} value={subplotId} onChange={setSubplotId} disabled={isSaving} />
        )}

        <EventImageField
          preview={imagePreview}
          onChange={(dataUrl) => {
            setImageDataUrl(dataUrl)
            setRemoveImage(dataUrl === null)
          }}
          disabled={isSaving}
        />

        <section className="space-y-3">
          <SectionTitle icon={Users}>{t('timelineApp.relatedInfo')}</SectionTitle>
          <div className="flex flex-col items-center gap-3">
            <PillButton icon={UserPlus} onClick={() => setShowCharacters((s) => !s)} aria-expanded={showCharacters} disabled={isSaving}>
              {t('timelineApp.selectRelatedChars')}
              {characterIds.length > 0 ? ` (${characterIds.length})` : ''}
            </PillButton>
            {showCharacters && (
              <CharacterPicker
                options={characterOptions}
                selected={characterIds}
                onToggle={(id) => setCharacterIds((l) => toggle(l, id))}
                emptyLabel={t('timelineApp.noCharacters')}
                loadingLabel={t('common.loading')}
                isLoading={charactersLoading}
                disabled={isSaving}
              />
            )}
            <PillButton icon={FileText} onClick={() => setShowDocuments((s) => !s)} aria-expanded={showDocuments} disabled={isSaving}>
              {t('timelineApp.selectRelatedPoints')}
              {relatedDocumentIds.length > 0 ? ` (${relatedDocumentIds.length})` : ''}
            </PillButton>
            {showDocuments && (
              <DocumentPicker
                options={docsLoading ? [] : documentOptions}
                selected={relatedDocumentIds}
                onToggle={(id) => setRelatedDocumentIds((l) => toggle(l, id))}
                emptyLabel={t('timelineApp.noDocuments')}
                loadingLabel={t('common.loading')}
                isLoading={docsLoading}
                disabled={isSaving}
              />
            )}
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle icon={Timer}>{t('timelineApp.setDateTitle')}</SectionTitle>
          <div className="pl-7">
            <UnderlineSelect
              id="event-precision"
              label={t('timelineApp.precisionLabel')}
              value={precision}
              onChange={(e) => { if (isPrecision(e.target.value)) setPrecision(e.target.value) }}
              disabled={isSaving}
              className="min-w-[260px]"
            >
              {EVENT_PRECISIONS.map((p) => (
                <option key={p.value} value={p.value}>{t(`timelineApp.${p.labelKey}`)}</option>
              ))}
            </UnderlineSelect>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <DatePartsPicker idPrefix="event-start" value={start} precision={precision} onChange={setStart} disabled={isSaving} contextYears={contextYears} timelineConfig={timelineConfig} />
            <p className="min-h-5 text-[15px]" style={{ color: 'var(--color-ink)' }}>{startHint ?? ''}</p>
            {end && (
              <>
                <ArrowDown className="h-4 w-4" style={{ color: 'var(--color-ink-faint)' }} aria-hidden />
                <DatePartsPicker idPrefix="event-end" value={end} precision={precision} onChange={setEnd} disabled={isSaving} contextYears={contextYears} timelineConfig={timelineConfig} />
                <p className="min-h-5 text-[15px]" style={{ color: 'var(--color-ink)' }}>{endHint ?? ''}</p>
              </>
            )}
            <PillButton icon={Timer} onClick={() => setEnd((e) => (e ? null : { ...start }))} aria-pressed={end !== null} disabled={isSaving}>
              {end ? t('timelineApp.removePeriod') : t('timelineApp.changePeriod')}
            </PillButton>
          </div>
        </section>
      </div>
    </FormSheet>
  )
}
