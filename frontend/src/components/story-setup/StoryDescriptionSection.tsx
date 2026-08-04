import { useTranslation } from 'react-i18next'
import { BookOpen, Pencil, Sparkles } from 'lucide-react'
import type { StoryMeta } from '@/types/story'

interface StoryDescriptionSectionProps {
  description: string | null
  storyMeta: StoryMeta
  onEdit: () => void
}

function DisplayRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm flex flex-col sm:flex-row sm:gap-2">
      <dt className="font-medium flex-shrink-0 sm:w-40" style={{ color: 'var(--color-ink)' }}>{label}</dt>
      <dd style={{ color: 'var(--color-ink-light)' }}>{value}</dd>
    </div>
  )
}

function buildRows(meta: StoryMeta, t: (key: string, opts?: Record<string, unknown>) => string): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = []

  if (meta.rating) rows.push({ label: t('storySetup.rating'), value: t(`storySetup.ratings.${meta.rating}`) })
  if (Array.isArray(meta.type) && meta.type.length) rows.push({ label: t('storySetup.type'), value: meta.type.join(', ') })
  if (typeof meta.isFanfic === 'boolean') rows.push({ label: t('storySetup.isFanfic'), value: meta.isFanfic ? t('common.yes') : t('common.no') })
  if (Array.isArray(meta.fandoms) && meta.fandoms.length) rows.push({ label: t('storySetup.fandoms'), value: meta.fandoms.join(', ') })
  if (Array.isArray(meta.categories) && meta.categories.length) rows.push({ label: t('storySetup.categories'), value: meta.categories.join(', ') })
  if (Array.isArray(meta.ships) && meta.ships.length) rows.push({ label: t('storySetup.ships'), value: meta.ships.join(', ') })
  if (Array.isArray(meta.characters) && meta.characters.length) {
    const chars = meta.characters.map((c) => (c.isOC ? `${c.name} (OC)` : c.name))
    rows.push({ label: t('storySetup.characters'), value: chars.join(', ') })
  }
  if (Array.isArray(meta.tags) && meta.tags.length) rows.push({ label: t('storySetup.tags'), value: meta.tags.join(', ') })
  if (meta.narrator) rows.push({ label: t('storySetup.narrator'), value: meta.narrator })

  return rows
}

export function StoryDescriptionSection({ description, storyMeta, onEdit }: StoryDescriptionSectionProps) {
  const { t } = useTranslation()
  const rows = buildRows(storyMeta, t)
  const hasContent = Boolean(description?.trim()) || rows.length > 0

  return (
    <div className="notebook-paper p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
          <BookOpen className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
          {t('storySetup.descriptionSectionTitle')}
        </h2>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Pencil className="w-3.5 h-3.5" />
          {hasContent ? t('storySetup.edit') : t('storySetup.complete')}
        </button>
      </div>

      {!hasContent ? (
        <div className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          <Sparkles className="w-4 h-4 inline-block mr-1.5 align-text-bottom" />
          {t('storySetup.metaEmpty')}
        </div>
      ) : (
        <div className="space-y-3">
          {description?.trim() && (
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-light)' }}>{description}</p>
          )}
          {rows.length > 0 && (
            <dl className="space-y-1.5">
              {rows.map((row) => (
                <DisplayRow key={row.label} label={row.label} value={row.value} />
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  )
}
