import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Subplot, SubplotInput, SubplotStatus } from '@/types/structure'
import { useStructureStore } from '@/stores/structure-store'
import { useToastStore } from '@/stores/toast-store'
import { ColorDot } from '@/components/ui/ColorDot'
import { SectionModal } from '@/components/worlds/SectionModal'
import { PALETTE } from '@/components/timeline/timeline-constants'

const SUBPLOT_STATUSES: SubplotStatus[] = ['active', 'resolved', 'dropped']

const inputStyle = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-paper-lines)',
  color: 'var(--color-ink)',
} as const

interface SubplotDialogProps {
  projectId: string
  subplot: Subplot | null
  onClose: () => void
}

export function SubplotDialog({ projectId, subplot, onClose }: SubplotDialogProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { createSubplot, updateSubplot } = useStructureStore()
  const [title, setTitle] = useState(subplot?.title ?? '')
  const [description, setDescription] = useState(subplot?.description ?? '')
  const [status, setStatus] = useState<SubplotStatus>(subplot?.status ?? 'active')
  const [color, setColor] = useState<string | null>(subplot?.color ?? null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t('structureApp.subplotTitleRequired'))
      return
    }
    setIsSaving(true)
    try {
      const data: SubplotInput = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        color,
      }
      const result = subplot ? await updateSubplot(subplot.id, data) : await createSubplot(projectId, data)
      if (result) {
        toast.success(t('common.save'))
        onClose()
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SectionModal
      title={subplot ? t('structureApp.editSubplot') : t('structureApp.newSubplot')}
      isSaving={isSaving}
      onClose={onClose}
      onSave={handleSave}
    >
      <div>
        <label htmlFor="subplot-title" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
          {t('structureApp.subplotTitle')}
        </label>
        <input
          id="subplot-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSaving}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </div>
      <div>
        <label htmlFor="subplot-description" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
          {t('structureApp.subplotDescription')}
        </label>
        <textarea
          id="subplot-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isSaving}
          className="w-full rounded-lg border px-3 py-2 text-sm resize-y"
          style={inputStyle}
        />
      </div>
      <div>
        <label htmlFor="subplot-status" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
          {t('structureApp.subplotStatus')}
        </label>
        <select
          id="subplot-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as SubplotStatus)}
          disabled={isSaving}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        >
          {SUBPLOT_STATUSES.map((value) => (
            <option key={value} value={value}>{t(`structureApp.status.${value}`)}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          {t('structureApp.subplotColor')}
        </span>
        <ColorDot
          value={color}
          palette={PALETTE}
          label={t('structureApp.subplotColor')}
          clearLabel={t('structureApp.colorNone')}
          onChange={setColor}
          disabled={isSaving}
        />
      </div>
    </SectionModal>
  )
}
