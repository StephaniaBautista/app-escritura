import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check } from 'lucide-react'
import type { MergeConflict } from '@/types/branch'
import { cn } from '@/lib/utils'

type Choice = 'ours' | 'theirs' | 'base'

interface ConflictResolverProps {
  conflicts: MergeConflict[]
  mergedContent: { type: string; content: (unknown | null)[] }
  resolving: boolean
  onResolve: (content: unknown) => Promise<void>
  onCancel: () => void
}

function nodeToText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { type?: string; text?: string; content?: unknown[] }
  if (typeof n.text === 'string') return n.text
  if (Array.isArray(n.content)) return n.content.map(nodeToText).join('')
  return ''
}

function ChoiceCard({
  label,
  text,
  selected,
  onSelect,
  emptyLabel,
}: {
  label: string
  text: string
  selected: boolean
  onSelect: () => void
  emptyLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex-1 min-w-0 rounded-lg border p-2 text-left transition-colors',
        selected && 'ring-2'
      )}
      style={{
        borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
        background: selected ? 'var(--color-accent-light)' : 'var(--color-background)',
        color: 'var(--color-ink)',
      }}
    >
      <span className="flex items-center gap-1 text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>
        {selected && <Check className="w-3 h-3" style={{ color: 'var(--color-accent)' }} />}
        {label}
      </span>
      <span className="block text-xs leading-snug truncate">
        {text ? text : emptyLabel}
      </span>
    </button>
  )
}

export function ConflictResolver({
  conflicts,
  mergedContent,
  resolving,
  onResolve,
  onCancel,
}: ConflictResolverProps) {
  const { t } = useTranslation()
  const [choices, setChoices] = useState<Record<number, Choice>>(
    Object.fromEntries(conflicts.map((c) => [c.index, 'ours' as Choice])),
  )

  const handleResolve = async () => {
    const buffer = [...mergedContent.content]
    for (const conflict of conflicts) {
      const choice = choices[conflict.index] ?? 'ours'
      const node = choice === 'ours' ? conflict.ours : choice === 'theirs' ? conflict.theirs : conflict.base
      if (conflict.index >= buffer.length) {
        buffer.push(node)
      } else {
        buffer[conflict.index] = node
      }
    }
    const content = {
      type: 'doc',
      content: buffer.flatMap((n) => {
        if (!n) return []
        if (typeof n === 'object' && !Array.isArray(n)) {
          const node = n as { type?: string; content?: unknown[] }
          if (node.type === 'doc' && Array.isArray(node.content)) return node.content
        }
        return [n]
      }),
    }
    await onResolve(content)
  }

  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
          {t('branches.conflictsTitle')}
        </h3>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
        {t('branches.conflictsDesc')}
      </p>

      <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
        {conflicts.map((conflict) => (
          <div key={conflict.index}>
            <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-light)' }}>
              {t(conflict.kind === 'added' ? 'branches.conflictAdded' : 'branches.conflictModified', {
                index: conflict.index + 1,
              })}
            </p>
            <div className="flex gap-2">
              <ChoiceCard
                label={t('branches.keepOurs')}
                text={nodeToText(conflict.ours)}
                emptyLabel={t('branches.removed')}
                selected={choices[conflict.index] === 'ours'}
                onSelect={() => setChoices((s) => ({ ...s, [conflict.index]: 'ours' }))}
              />
              <ChoiceCard
                label={t('branches.keepTheirs')}
                text={nodeToText(conflict.theirs)}
                emptyLabel={t('branches.removed')}
                selected={choices[conflict.index] === 'theirs'}
                onSelect={() => setChoices((s) => ({ ...s, [conflict.index]: 'theirs' }))}
              />
              <ChoiceCard
                label={t('branches.keepBase')}
                text={nodeToText(conflict.base)}
                emptyLabel={t('branches.noContent')}
                selected={choices[conflict.index] === 'base'}
                onSelect={() => setChoices((s) => ({ ...s, [conflict.index]: 'base' }))}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border hover:opacity-80 transition-colors"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink)' }}
        >
          {t('branches.cancel')}
        </button>
        <button
          type="button"
          onClick={handleResolve}
          disabled={resolving}
          className="px-4 py-2 text-sm rounded-lg text-white hover:opacity-90 transition-colors disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}
        >
          {resolving ? t('branches.merging') : t('branches.resolveAndMerge')}
        </button>
      </div>
    </div>
  )
}
