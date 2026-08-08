import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, GripVertical, Users, Heart, Tag as TagIcon, Check, Copy, Search } from 'lucide-react'
import { adminApi, type FandomNode, type FandomTree } from '@/services/admin'
import type { StoryOption } from '@/services/options'
import { useToastStore } from '@/stores/toast-store'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type ChildType = 'ship' | 'character'

const CHILD_TYPES: ChildType[] = ['ship', 'character']

const TYPE_ICONS: Record<ChildType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  ship: Heart,
  character: Users,
}

export function ModerationSection() {
  const { t } = useTranslation()
  const toast = useToastStore()
  const [tree, setTree] = useState<FandomTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [overFandom, setOverFandom] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FandomNode | null>(null)
  const [fandomQuery, setFandomQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [tagGroups, setTagGroups] = useState<StoryOption[][] | null>(null)
  const [tagKept, setTagKept] = useState<Record<number, string>>({})

  const load = async () => {
    try {
      const [treeRes, tagsRes] = await Promise.all([adminApi.listFandomTree(), adminApi.listGroups('tag')])
      setTree(treeRes)
      setTagGroups(tagsRes.groups)
      setSelected((prev) => {
        if (prev && treeRes.fandoms.some((f) => f.value === prev)) return prev
        return treeRes.fandoms[0]?.value ?? null
      })
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  const filteredFandoms = tree?.fandoms.filter((f) => f.label.toLowerCase().includes(fandomQuery.trim().toLowerCase())) ?? []

  useEffect(() => {
    if (!tree) return
    const q = fandomQuery.trim().toLowerCase()
    if (!q) return
    const matches = tree.fandoms.filter((f) => f.label.toLowerCase().includes(q))
    if (matches.length > 0 && !matches.some((f) => f.value === selected)) {
      setSelected(matches[0].value)
    }
  }, [fandomQuery, tree, selected])

  const selectedFandom = tree?.fandoms.find((f) => f.value === selected) ?? null
  const children = tree?.children[selected ?? ''] ?? { ship: [], character: [] }

  const handleDrop = async (e: React.DragEvent, fandomValue: string) => {
    e.preventDefault()
    setOverFandom(null)
    const optionId = draggedId ?? e.dataTransfer.getData('text/plain')
    if (!optionId || !fandomValue || fandomValue === selected) return
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await adminApi.moveOption(optionId, fandomValue)
      toast.success(t('admin.moved', { fandom: tree?.fandoms.find((f) => f.value === fandomValue)?.label ?? fandomValue }))
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleDeleteFandom = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await adminApi.deleteOption(deleteTarget.id)
      toast.success(t('admin.deleted'))
      setDeleteTarget(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteOption = async (option: StoryOption) => {
    setBusy(true)
    try {
      await adminApi.deleteOption(option.id)
      toast.success(t('admin.deleted'))
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const deleteTag = async (id: string) => {
    setBusy(true)
    try {
      await adminApi.deleteOption(id)
      toast.success(t('admin.deleted'))
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const mergeTagGroup = async (group: StoryOption[], groupIndex: number) => {
    const keep = tagKept[groupIndex] ?? group[0]?.id
    const toDelete = group.filter((o) => o.id !== keep)
    if (toDelete.length === 0) return
    setBusy(true)
    try {
      for (const opt of toDelete) {
        await adminApi.deleteOption(opt.id)
      }
      toast.success(t('admin.merged'))
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const keepForGroup = (groupIndex: number) => tagKept[groupIndex] ?? tagGroups?.[groupIndex]?.[0]?.id

  const childCount = (type: ChildType) => children[type].length

  return (
    <div>
      <ErrorMessage message={error} />

      {loading ? (
        <LoadingState label={t('common.loading')} className="notebook-paper" />
      ) : !tree || tree.fandoms.length === 0 ? (
        <div className="notebook-paper p-8 text-center">
          <p style={{ color: 'var(--color-ink-faint)' }}>{t('admin.noFandoms')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
          <aside className="notebook-paper p-2 h-fit md:sticky md:top-4">
            <p className="px-2 pt-1 pb-2 text-xs font-medium" style={{ color: 'var(--color-ink-faint)' }}>
              {t('admin.fandoms')}
            </p>
            <div className="relative px-1 pb-2">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-ink-faint)' }} />
              <input
                value={fandomQuery}
                onChange={(e) => setFandomQuery(e.target.value)}
                placeholder={t('admin.fandomSearchPlaceholder')}
                aria-label={t('admin.fandomSearchPlaceholder')}
                className="w-full rounded-lg border pl-8 pr-3 py-1.5 text-sm"
                style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
              />
            </div>
            {filteredFandoms.length === 0 ? (
              <p className="px-2 py-3 text-sm text-center" style={{ color: 'var(--color-ink-faint)' }}>
                {t('admin.noResults')}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredFandoms.map((fandom) => {
                const isActive = selected === fandom.value
                const isOver = overFandom === fandom.value
                return (
                  <div
                    key={fandom.value}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    aria-label={`${fandom.label} — ${t('admin.fandomCounts', {
                      ship: fandom.counts.ship,
                      character: fandom.counts.character,
                    })}`}
                    onClick={() => setSelected(fandom.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelected(fandom.value)
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setOverFandom(fandom.value)
                    }}
                    onDragLeave={() => setOverFandom((prev) => (prev === fandom.value ? null : prev))}
                    onDrop={(e) => handleDrop(e, fandom.value)}
                    className={`rounded-lg px-2.5 py-2 cursor-pointer transition-colors border ${
                      isOver ? 'border-dashed' : 'border-transparent'
                    }`}
                    style={{
                      background: isActive || isOver ? 'var(--color-accent-light)' : 'transparent',
                      borderColor: isOver ? 'var(--color-accent)' : isActive ? 'var(--color-accent)' : 'transparent',
                      color: 'var(--color-ink)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{fandom.label}</span>
                      <button
                        type="button"
                        aria-label={`${t('admin.deleteFandom')} ${fandom.label}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(fandom)
                        }}
                        className="p-1 rounded hover:opacity-70 flex-shrink-0"
                        style={{ color: 'var(--color-ink-faint)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                      {t('admin.fandomCounts', { ship: fandom.counts.ship, character: fandom.counts.character })}
                    </p>
                  </div>
                )
              })}
              </div>
            )}
            <p className="px-2 pt-3 text-[11px] leading-snug" style={{ color: 'var(--color-ink-faint)' }}>
              {t('admin.dragHint')}
            </p>
          </aside>

          <div className="space-y-4">
            {selectedFandom && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
                  {selectedFandom.label}
                </h3>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDeleteTarget(selectedFandom)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border hover:opacity-80 disabled:opacity-50"
                  style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                >
                  <Trash2 className="w-4 h-4" />
                  {t('admin.deleteFandom')}
                </button>
              </div>
            )}

            {CHILD_TYPES.map((type) => {
              const items = children[type]
              const Icon = TYPE_ICONS[type]
              if (items.length === 0) return null
              return (
                <div key={type} className="notebook-paper p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                    <h4 className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                      {t(`admin.types.${type}`)}
                    </h4>
                    <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                      {childCount(type)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((opt) => (
                      <div
                        key={opt.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedId(opt.id)
                          e.dataTransfer.setData('text/plain', opt.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragEnd={() => setDraggedId(null)}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-grab active:cursor-grabbing"
                        style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)', color: 'var(--color-ink)' }}
                        title={t('admin.dragToMove')}
                      >
                        <GripVertical className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }} />
                        <span className="truncate max-w-[220px]">{opt.label}</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDeleteOption(opt)}
                          className="p-1 rounded hover:opacity-70 flex-shrink-0"
                          style={{ color: 'var(--color-ink-faint)' }}
                          aria-label={`${t('admin.delete')} ${opt.label}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {selectedFandom && CHILD_TYPES.every((type) => children[type].length === 0) && (
              <div className="notebook-paper p-8 text-center">
                <p style={{ color: 'var(--color-ink-faint)' }}>{t('admin.emptyFandom')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && (
        <section className="mt-6" aria-label={t('admin.tagsSection')}>
          <div className="flex items-center gap-2 mb-3">
            <TagIcon className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            <h3 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
              {t('admin.tagsSection')}
            </h3>
            <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
              {t('admin.groupedBy')}
            </span>
          </div>

          {!tagGroups ? (
            <LoadingState label={t('common.loading')} className="notebook-paper" />
          ) : tagGroups.length === 0 ? (
            <div className="notebook-paper p-8 text-center">
              <p style={{ color: 'var(--color-ink-faint)' }}>{t('admin.noTags')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tagGroups.map((group, groupIndex) => {
                const keep = keepForGroup(groupIndex)
                const hasDuplicates = group.length > 1
                return (
                  <div key={groupIndex} className="notebook-paper p-4">
                    <div className="flex flex-wrap gap-2">
                      {group.map((opt) => {
                        const isKeep = keep === opt.id
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                              hasDuplicates ? 'cursor-pointer' : ''
                            }`}
                            style={{
                              borderColor: isKeep ? 'var(--color-accent)' : 'var(--color-paper-lines)',
                              background: isKeep ? 'var(--color-accent-light)' : 'var(--color-background)',
                              color: 'var(--color-ink)',
                            }}
                            onClick={() => {
                              if (hasDuplicates) setTagKept((k) => ({ ...k, [groupIndex]: opt.id }))
                            }}
                            role={hasDuplicates ? 'radio' : undefined}
                            aria-checked={hasDuplicates ? isKeep : undefined}
                            tabIndex={hasDuplicates ? 0 : undefined}
                          >
                            {hasDuplicates &&
                              (isKeep ? (
                                <Check className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                              ) : (
                                <Copy className="w-4 h-4" style={{ color: 'var(--color-ink-faint)' }} />
                              ))}
                            <span className="truncate max-w-[280px]">{opt.label}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-end mt-3">
                      {hasDuplicates ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => mergeTagGroup(group, groupIndex)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                          style={{ background: 'var(--color-accent)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t('admin.deleteOthers')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => deleteTag(group[0].id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80 disabled:opacity-50"
                          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t('admin.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('admin.deleteFandomTitle')}
        message={t('admin.deleteFandomConfirm', { name: deleteTarget?.label ?? '' })}
        confirmLabel={t('common.delete')}
        onConfirm={handleDeleteFandom}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
