import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, Trash2, Check, Copy } from 'lucide-react'
import { adminApi } from '@/services/admin'
import type { StoryOption } from '@/services/options'
import type { OptionType } from '@/types/story'
import { useToastStore } from '@/stores/toast-store'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

const ADMIN_TYPES: OptionType[] = ['fandom', 'ship', 'character', 'tag']

export function AdminPage() {
  const { t } = useTranslation()
  const toast = useToastStore()
  const [activeType, setActiveType] = useState<OptionType>('fandom')
  const [groups, setGroups] = useState<StoryOption[][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kept, setKept] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)

  const load = async (type: OptionType) => {
    try {
      const res = await adminApi.listGroups(type)
      setGroups(res.groups)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(activeType)
  }, [activeType])

  const switchType = (type: OptionType) => {
    setLoading(true)
    setError(null)
    setKept({})
    setActiveType(type)
  }

  const deleteOne = async (id: string) => {
    setBusy(true)
    try {
      await adminApi.delete(id)
      toast.success(t('admin.deleted'))
      await load(activeType)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const mergeGroup = async (group: StoryOption[], groupIndex: number) => {
    const keep = kept[groupIndex] ?? group[0]?.id
    const toDelete = group.filter((o) => o.id !== keep)
    if (toDelete.length === 0) return
    setBusy(true)
    try {
      for (const opt of toDelete) {
        await adminApi.delete(opt.id)
      }
      toast.success(t('admin.merged'))
      await load(activeType)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const keepForGroup = (groupIndex: number) => kept[groupIndex] ?? groups[groupIndex]?.[0]?.id

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-4xl font-bold flex items-center gap-3" style={{ color: 'var(--color-ink)' }}>
            <ShieldCheck className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            {t('admin.title')}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-light)' }}>
            {t('admin.subtitle')}
          </p>
        </div>

        <div className="flex gap-1 border-b mb-6 overflow-x-auto" style={{ borderColor: 'var(--color-paper-lines)' }}>
          {ADMIN_TYPES.map((type) => {
            const isActive = activeType === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => switchType(type)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
                style={{
                  color: isActive ? 'var(--color-accent)' : 'var(--color-ink-light)',
                  borderColor: isActive ? 'var(--color-accent)' : 'transparent',
                }}
              >
                {t(`admin.types.${type}`)}
              </button>
            )
          })}
        </div>

        <ErrorMessage message={error} />

        {loading ? (
          <LoadingState label={t('common.loading')} className="notebook-paper" />
        ) : groups.length === 0 ? (
          <div className="notebook-paper p-8 text-center">
            <p style={{ color: 'var(--color-ink-faint)' }}>{t('admin.noOptions')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group, groupIndex) => {
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
                            if (hasDuplicates) setKept((k) => ({ ...k, [groupIndex]: opt.id }))
                          }}
                          role={hasDuplicates ? 'radio' : undefined}
                          aria-checked={hasDuplicates ? isKeep : undefined}
                          tabIndex={hasDuplicates ? 0 : undefined}
                        >
                          {hasDuplicates && (isKeep ? <Check className="w-4 h-4" style={{ color: 'var(--color-accent)' }} /> : <Copy className="w-4 h-4" style={{ color: 'var(--color-ink-faint)' }} />)}
                          <span className="truncate max-w-[280px]">{opt.label}</span>
                          {opt.isDefault && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                              default
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-end mt-3">
                    {hasDuplicates ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => mergeGroup(group, groupIndex)}
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
                        onClick={() => deleteOne(group[0].id)}
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
      </div>
    </div>
  )
}
