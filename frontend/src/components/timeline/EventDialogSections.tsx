import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, ChevronDown, X } from 'lucide-react'
import type { TimelineEvent } from '@/types/timeline'
import type { Subplot } from '@/types/structure'
import { collectEventGroupNames, NEW_GROUP_OPTION, normalizeGroupName } from '@/lib/timeline-groups'
import { subplotLayerColor } from '@/lib/subplot-visibility'
import { useToastStore } from '@/stores/toast-store'
import { PillButton, UnderlineInput, UnderlineSelect } from '@/components/ui/SheetFields'
import { EVENT_ICONS } from './timeline-constants'
import { EventIcon } from './EventIcon'

const GENERAL_GROUP = ''

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 3 * 1024 * 1024

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
  disabled?: boolean
}

export function IconPicker({ value, onChange, disabled = false }: IconPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative inline-flex items-center gap-2">
      <span className="text-[15px]" style={{ color: 'var(--color-ink)' }}>{t('timelineApp.fieldIcon')}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label={t('timelineApp.fieldIcon')}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1 border-b pb-1 hover:opacity-80 disabled:opacity-50"
        style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
      >
        <EventIcon icon={value} className="h-5 w-5" />
        <ChevronDown className="h-4 w-4" style={{ color: 'var(--color-ink-light)' }} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={t('timelineApp.fieldIcon')}
          className="absolute right-0 top-full z-20 mt-2 grid w-48 grid-cols-4 gap-1 rounded-xl border p-2 shadow-lg"
          style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
        >
          {Object.entries(EVENT_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={value === key}
              aria-label={key}
              onClick={() => {
                onChange(key)
                setOpen(false)
              }}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:opacity-80"
              style={{ background: value === key ? 'var(--color-accent-light)' : 'transparent', color: 'var(--color-ink)' }}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read-error'))
    reader.readAsDataURL(file)
  })
}

interface EventImageFieldProps {
  preview: string | null
  onChange: (dataUrl: string | null) => void
  disabled?: boolean
}

export function EventImageField({ preview, onChange, disabled = false }: EventImageFieldProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return
    if (!ALLOWED_MIMES.includes(file.type) || file.size > MAX_BYTES) {
      toast.error(t('timelineApp.imageError'))
      return
    }
    try {
      onChange(await readAsDataUrl(file))
    } catch {
      toast.error(t('timelineApp.imageError'))
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIMES.join(',')}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {preview && (
        <div className="relative">
          <img src={preview} alt="" className="max-h-40 rounded-xl border object-cover" style={{ borderColor: 'var(--color-paper-lines)' }} />
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            aria-label={t('timelineApp.imageRemove')}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full text-white shadow"
            style={{ background: 'var(--color-accent)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <PillButton icon={Camera} onClick={() => inputRef.current?.click()} disabled={disabled}>
        {preview ? t('timelineApp.changeImage') : t('timelineApp.addImage')}
      </PillButton>
    </div>
  )
}

interface ChipOption {
  id: string
  name: string
  imageUrl?: string | null
  locked?: boolean
  lockedHint?: string
}

interface ChipsPickerProps {
  options: ChipOption[]
  selected: string[]
  onToggle: (id: string) => void
  emptyLabel: string
  disabled?: boolean
}

function initials(name: string): string {
  const parts = name.split(' / ')
  const leaf = parts[parts.length - 1] ?? name
  return leaf
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function ChipsPicker({ options, selected, onToggle, emptyLabel, disabled = false }: ChipsPickerProps) {
  if (options.length === 0) {
    return <p className="text-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>{emptyLabel}</p>
  }
  return (
    <div className="flex max-h-40 flex-wrap justify-center gap-1.5 overflow-y-auto rounded-xl border p-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
      {options.map((opt) => {
        const active = selected.includes(opt.id)
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            disabled={disabled}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? 'text-white' : ''}`}
            style={{
              borderColor: active ? 'var(--color-accent)' : 'var(--color-paper-lines)',
              background: active ? 'var(--color-accent)' : 'var(--color-background)',
              color: active ? undefined : 'var(--color-ink-light)',
            }}
          >
            {opt.name}
          </button>
        )
      })}
    </div>
  )
}

interface CharacterPickerProps {
  options: ChipOption[]
  selected: string[]
  onToggle: (id: string) => void
  emptyLabel: string
  loadingLabel?: string
  isLoading?: boolean
  disabled?: boolean
}

interface EventGroupPickerProps {
  events: TimelineEvent[]
  value: string | null
  onChange: (groupName: string | null) => void
  disabled?: boolean
}

export function EventGroupPicker({ events, value, onChange, disabled = false }: EventGroupPickerProps) {
  const { t } = useTranslation()
  const groups = useMemo(() => collectEventGroupNames(events), [events])
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setCreating(false)
    setDraft('')
  }, [value])

  const selectValue = creating ? NEW_GROUP_OPTION : (value ?? GENERAL_GROUP)

  const handleSelect = (next: string) => {
    if (next === NEW_GROUP_OPTION) {
      setCreating(true)
      setDraft(value ?? '')
      return
    }
    setCreating(false)
    setDraft('')
    onChange(normalizeGroupName(next))
  }

  const commitDraft = () => {
    const normalized = normalizeGroupName(draft)
    if (!normalized) {
      setCreating(false)
      setDraft('')
      return
    }
    onChange(normalized)
    setCreating(false)
    setDraft('')
  }

  return (
    <div className="space-y-3">
      <UnderlineSelect
        id="event-group"
        label={t('timelineApp.fieldGroup')}
        value={selectValue}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={disabled}
        className="w-full min-w-[260px]"
      >
        <option value={GENERAL_GROUP}>{t('timelineApp.laneGeneral')}</option>
        {value && !groups.includes(value) && (
          <option value={value}>{value}</option>
        )}
        {groups.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
        <option value={NEW_GROUP_OPTION}>{t('timelineApp.newGroup')}</option>
      </UnderlineSelect>
      {creating && (
        <UnderlineInput
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitDraft()
            }
          }}
          placeholder={t('timelineApp.newGroupPlaceholder')}
          aria-label={t('timelineApp.newGroupPlaceholder')}
          maxLength={100}
          disabled={disabled}
        />
      )}
    </div>
  )
}

export function DocumentPicker(props: CharacterPickerProps) {
  return <CharacterPicker {...props} />
}

interface SubplotPickerProps {
  subplots: Subplot[]
  value: string | null
  onChange: (subplotId: string | null) => void
  disabled?: boolean
}

export function SubplotPicker({ subplots, value, onChange, disabled = false }: SubplotPickerProps) {
  const { t } = useTranslation()
  const selected = subplots.find((subplot) => subplot.id === value) ?? null
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full border"
          style={{ background: selected ? subplotLayerColor(selected) : 'transparent', borderColor: selected ? subplotLayerColor(selected) : 'var(--color-paper-lines)' }}
          aria-hidden
        />
        <UnderlineSelect
          id="event-subplot"
          label={t('structureApp.subplotField')}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled}
          className="w-full min-w-[260px]"
        >
          <option value="">{t('structureApp.noSubplot')}</option>
          {subplots.map((subplot) => (
            <option key={subplot.id} value={subplot.id}>{subplot.title}</option>
          ))}
        </UnderlineSelect>
      </div>
      <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{t('structureApp.subplotLayerHint')}</p>
    </div>
  )
}

export function CharacterPicker({
  options,
  selected,
  onToggle,
  emptyLabel,
  loadingLabel,
  isLoading = false,
  disabled = false,
}: CharacterPickerProps) {
  if (isLoading && options.length === 0) {
    return <p className="text-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>{loadingLabel ?? emptyLabel}</p>
  }
  if (options.length === 0) {
    return <p className="text-center text-sm" style={{ color: 'var(--color-ink-faint)' }}>{emptyLabel}</p>
  }
  return (
    <ul className="w-full max-h-56 space-y-1.5 overflow-y-auto rounded-xl border p-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
      {options.map((opt) => {
        const active = selected.includes(opt.id)
        const locked = Boolean(opt.locked)
        return (
          <li key={opt.id}>
            <button
              type="button"
              onClick={() => onToggle(opt.id)}
              disabled={disabled || (locked && !active)}
              aria-pressed={active}
              aria-disabled={locked && !active ? true : undefined}
              title={locked ? opt.lockedHint : undefined}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:opacity-90 disabled:opacity-50"
              style={{
                background: active ? 'var(--color-accent-light)' : 'transparent',
                color: 'var(--color-ink)',
              }}
            >
              {opt.imageUrl ? (
                <img src={opt.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              ) : (
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'var(--color-accent-violet-light)', color: 'var(--color-accent-violet)' }}
                >
                  {initials(opt.name) || '?'}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{opt.name}</span>
                {locked && opt.lockedHint && (
                  <span className="block truncate text-[11px]" style={{ color: 'var(--color-ink-faint)' }}>
                    {opt.lockedHint}
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
