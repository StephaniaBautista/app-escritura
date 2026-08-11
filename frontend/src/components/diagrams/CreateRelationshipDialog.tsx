import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, X } from 'lucide-react'
import { RELATIONSHIP_TYPES, type RelationshipType } from '@/types/relationship'

interface CreateRelationshipDialogProps {
  sourceName: string
  targetName: string
  onCancel: () => void
  onSave: (data: { type: RelationshipType; label: string | null; description: string | null }) => Promise<void>
}

export function CreateRelationshipDialog({ sourceName, targetName, onCancel, onSave }: CreateRelationshipDialogProps) {
  const { t } = useTranslation()
  const [type, setType] = useState<RelationshipType>('romance')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const inputStyle = {
    background: 'var(--color-background)',
    borderColor: 'var(--color-paper-lines)',
    color: 'var(--color-ink)',
  } as const

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        type,
        label: (type === 'family' || type === 'custom') && label.trim() ? label.trim() : null,
        description: description.trim() || null,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={isSaving ? undefined : onCancel} />
      <div
        className="relative w-full max-w-sm rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <h2 className="font-display text-base font-bold" style={{ color: 'var(--color-ink)' }}>
            {t('diagramApp.selectRelationshipType')}
          </h2>
          <button type="button" onClick={onCancel} disabled={isSaving} aria-label={t('common.cancel')} className="hover:opacity-70 disabled:opacity-50">
            <X className="h-5 w-5" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-xs" style={{ color: 'var(--color-ink-light)' }}>
            {sourceName} ↔ {targetName}
          </p>
          <div>
            <label htmlFor="canvas-rel-type" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
              {t('diagramApp.selectRelationshipType')}
            </label>
            <select
              id="canvas-rel-type"
              value={type}
              onChange={(e) => setType(e.target.value as RelationshipType)}
              disabled={isSaving}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={inputStyle}
            >
              {RELATIONSHIP_TYPES.map((option) => (
                <option key={option} value={option}>{t(`diagramApp.type_${option}`)}</option>
              ))}
            </select>
          </div>

          {(type === 'family' || type === 'custom') && (
            <div>
              <label htmlFor="canvas-rel-label" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
                {t('characterApp.relLabel')}
              </label>
              <input
                id="canvas-rel-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t('diagramApp.customLabelPlaceholder')}
                disabled={isSaving}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label htmlFor="canvas-rel-description" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
              {t('characterApp.relDescription')}
            </label>
            <textarea
              id="canvas-rel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={isSaving}
              className="w-full rounded-lg border px-3 py-2 text-sm resize-y"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <button
            type="button"
            onClick={onCancel}
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
            style={{ background: 'var(--color-accent-violet)' }}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('characterApp.relSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
