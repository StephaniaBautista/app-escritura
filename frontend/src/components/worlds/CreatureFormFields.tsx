import { useTranslation } from 'react-i18next'
import { WorldImageField } from './WorldImageField'
import './world-sheet.css'

export const CREATURE_DANGER_TYPES = ['none', 'low', 'medium', 'high', 'lethal'] as const

export interface CreatureFormState {
  id: string | null
  name: string
  species: string
  dangerType: string
  description: string
  imageUrl: string | null
}

export const EMPTY_CREATURE_FORM: CreatureFormState = {
  id: null,
  name: '',
  species: '',
  dangerType: '',
  description: '',
  imageUrl: null,
}

interface CreatureFormFieldsProps {
  form: CreatureFormState
  onChange: (patch: Partial<CreatureFormState>) => void
  isSaving: boolean
}

export function CreatureFormFields({ form, onChange, isSaving }: CreatureFormFieldsProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className="world-sheet__identity">
        <WorldImageField
          imageUrl={form.imageUrl}
          onChange={(imageUrl) => onChange({ imageUrl })}
          disabled={isSaving}
          inputId="creature-image"
          label={t('worldApp.creatureUploadImage')}
          errorMessage={t('worldApp.creatureImageError')}
          plateClassName="world-sheet__plate--token"
        />
        <div className="min-w-0">
          <label htmlFor="creature-name" className="sr-only">{t('worldApp.name')}</label>
          <input
            id="creature-name"
            type="text"
            value={form.name}
            placeholder={t('worldApp.creatureNamePlaceholder')}
            onChange={(e) => onChange({ name: e.target.value })}
            disabled={isSaving}
            className="world-sheet__name"
          />
          <div className="world-sheet__class">
            <label htmlFor="creature-species" className="character-form__label">{t('worldApp.creatureSpeciesLabel')}</label>
            <input
              id="creature-species"
              type="text"
              value={form.species}
              placeholder={t('worldApp.creatureSpeciesPlaceholder')}
              onChange={(e) => onChange({ species: e.target.value })}
              disabled={isSaving}
              className="character-form__control mt-1.5"
            />
          </div>
        </div>
      </div>

      <div className="world-sheet__body">
        <div>
          <label htmlFor="creature-danger" className="character-form__label">{t('worldApp.dangerLabel')}</label>
          <div className="world-sheet__danger mt-1.5">
            {form.dangerType ? (
              <span className={`world-sheet__danger-dot world-sheet__danger-dot--${form.dangerType}`} aria-hidden="true" />
            ) : null}
            <select
              id="creature-danger"
              value={form.dangerType}
              onChange={(e) => onChange({ dangerType: e.target.value })}
              disabled={isSaving}
              className="character-form__control"
            >
              <option value="">{t('worldApp.creatureDangerPlaceholder')}</option>
              {CREATURE_DANGER_TYPES.map((type) => (
                <option key={type} value={type}>{t(`worldApp.danger.${type}`)}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="creature-description" className="character-form__label">{t('worldApp.description')}</label>
          <textarea
            id="creature-description"
            value={form.description}
            placeholder={t('worldApp.creatureDescriptionPlaceholder')}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={4}
            disabled={isSaving}
            className="character-form__control world-sheet__lede mt-1.5 resize-y"
          />
        </div>
      </div>
    </>
  )
}
