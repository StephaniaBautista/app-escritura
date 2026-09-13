import { useTranslation } from 'react-i18next'
import { WorldImageField } from './WorldImageField'

interface RaceImageFieldProps {
  imageUrl: string | null
  onChange: (dataUrl: string | null) => void
  disabled?: boolean
}

export function RaceImageField({ imageUrl, onChange, disabled = false }: RaceImageFieldProps) {
  const { t } = useTranslation()
  return (
    <WorldImageField
      imageUrl={imageUrl}
      onChange={onChange}
      disabled={disabled}
      inputId="race-image"
      label={t('worldApp.raceUploadImage')}
      errorMessage={t('worldApp.raceImageError')}
    />
  )
}
