import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnInput, StructureColumn } from '@/types/structure'
import { useStructureStore } from '@/stores/structure-store'
import { useToastStore } from '@/stores/toast-store'
import { ColorDot } from '@/components/ui/ColorDot'
import { SectionModal } from '@/components/worlds/SectionModal'
import { PALETTE } from '@/components/timeline/timeline-constants'

const inputStyle = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-paper-lines)',
  color: 'var(--color-ink)',
} as const

interface ColumnDialogProps {
  boardId: string
  column: StructureColumn | null
  onClose: () => void
}

export function ColumnDialog({ boardId, column, onClose }: ColumnDialogProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { createColumn, updateColumn } = useStructureStore()
  const [name, setName] = useState(column?.name ?? '')
  const [color, setColor] = useState<string | null>(column?.color ?? null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('structureApp.columnNameRequired'))
      return
    }
    setIsSaving(true)
    try {
      const data: ColumnInput = { name: name.trim(), color }
      const result = column ? await updateColumn(column.id, data) : await createColumn(boardId, data)
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
      title={column ? t('structureApp.editColumn') : t('structureApp.newColumn')}
      isSaving={isSaving}
      onClose={onClose}
      onSave={handleSave}
    >
      <div>
        <label htmlFor="column-name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
          {t('structureApp.columnName')}
        </label>
        <input
          id="column-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSaving}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          {t('structureApp.columnColor')}
        </span>
        <ColorDot
          value={color}
          palette={PALETTE}
          label={t('structureApp.columnColor')}
          clearLabel={t('structureApp.colorNone')}
          onChange={setColor}
          disabled={isSaving}
        />
      </div>
    </SectionModal>
  )
}
