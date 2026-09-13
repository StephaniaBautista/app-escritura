import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { WorldFormSheet } from './WorldFormSheet'

interface RaceFormSheetProps {
  title: string
  isSaving: boolean
  onClose: () => void
  onSave: () => void
  children: ReactNode
}

export function RaceFormSheet({ title, isSaving, onClose, onSave, children }: RaceFormSheetProps) {
  const { t } = useTranslation()
  return (
    <WorldFormSheet
      variant="race"
      eyebrow={t('worldApp.raceSheetLabel')}
      title={title}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
    >
      {children}
    </WorldFormSheet>
  )
}
