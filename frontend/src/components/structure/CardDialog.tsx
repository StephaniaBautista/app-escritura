import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import type { CardType, StructureCard, CardInput } from '@/types/structure'
import { useStructureStore } from '@/stores/structure-store'
import { useToastStore } from '@/stores/toast-store'
import { ColorDot } from '@/components/ui/ColorDot'
import { SectionModal } from '@/components/worlds/SectionModal'
import { PALETTE } from '@/components/timeline/timeline-constants'

const CARD_TYPES: CardType[] = ['scene', 'chapter', 'character', 'document', 'note']

const inputStyle = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-paper-lines)',
  color: 'var(--color-ink)',
} as const

interface CardDialogProps {
  columnId: string
  card: StructureCard | null
  onClose: () => void
}

export function CardDialog({ columnId, card, onClose }: CardDialogProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { createCard, updateCard, removeCard } = useStructureStore()
  const [title, setTitle] = useState(card?.title ?? '')
  const [description, setDescription] = useState(card?.description ?? '')
  const [cardType, setCardType] = useState<CardType>(card?.cardType ?? 'scene')
  const [color, setColor] = useState<string | null>(card?.color ?? null)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t('structureApp.cardTitleRequired'))
      return
    }
    setIsSaving(true)
    try {
      const data: CardInput = {
        title: title.trim(),
        description: description.trim() || null,
        cardType,
        color,
      }
      const result = card ? await updateCard(card.id, data) : await createCard(columnId, data)
      if (result) {
        toast.success(t('common.save'))
        onClose()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!card) return
    setIsSaving(true)
    try {
      await removeCard(card.id)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SectionModal
      title={card ? t('structureApp.editCard') : t('structureApp.newCard')}
      isSaving={isSaving}
      onClose={onClose}
      onSave={handleSave}
    >
      <div>
        <label htmlFor="card-title" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
          {t('structureApp.cardTitle')}
        </label>
        <input
          id="card-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSaving}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </div>
      <div>
        <label htmlFor="card-description" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
          {t('structureApp.cardDescription')}
        </label>
        <textarea
          id="card-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isSaving}
          className="w-full rounded-lg border px-3 py-2 text-sm resize-y"
          style={inputStyle}
        />
      </div>
      <div>
        <label htmlFor="card-type" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
          {t('structureApp.cardTypeLabel')}
        </label>
        <select
          id="card-type"
          value={cardType}
          onChange={(e) => setCardType(e.target.value as CardType)}
          disabled={isSaving}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        >
          {CARD_TYPES.map((type) => (
            <option key={type} value={type}>{t(`structureApp.cardType.${type}`)}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          {t('structureApp.cardColor')}
        </span>
        <ColorDot
          value={color}
          palette={PALETTE}
          label={t('structureApp.cardColor')}
          clearLabel={t('structureApp.colorNone')}
          onChange={setColor}
          disabled={isSaving}
        />
      </div>
      {card && (
        <div className="pt-2 border-t" style={{ borderColor: 'var(--color-paper-lines)' }}>
          {confirmingDelete ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
                {t('structureApp.confirmDeleteCard')}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{ color: 'var(--color-ink-light)' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                  style={{ background: 'var(--color-danger, #dc2626)' }}
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-sm font-medium hover:opacity-70"
              style={{ color: 'var(--color-danger, #dc2626)' }}
            >
              <Trash2 className="w-4 h-4" />
              {t('structureApp.deleteCard')}
            </button>
          )}
        </div>
      )}
    </SectionModal>
  )
}
