import { useTranslation } from 'react-i18next'
import type { LoreType } from '@/types/worldbuilding'
import { AccordionSection } from '@/components/ui/AccordionSection'
import { WorldPdfField } from './WorldPdfField'
import './world-sheet.css'

export const LORE_TYPES: LoreType[] = ['magic', 'faction', 'religion', 'location', 'item', 'custom']

export interface LoreFormState {
  id: string | null
  name: string
  type: LoreType | ''
  description: string
  limits: string
  powerSource: string
  cost: string
  usedBy: string
  pdfUrl: string | null
  pdfName: string | null
}

export const EMPTY_LORE_FORM: LoreFormState = {
  id: null,
  name: '',
  type: '',
  description: '',
  limits: '',
  powerSource: '',
  cost: '',
  usedBy: '',
  pdfUrl: null,
  pdfName: null,
}

interface LoreFormFieldsProps {
  form: LoreFormState
  onChange: (patch: Partial<LoreFormState>) => void
  pdfFile: File | null
  onPdfFile: (file: File | null) => void
  onRemovePdf: () => void
  isSaving: boolean
}

export function LoreFormFields({
  form,
  onChange,
  pdfFile,
  onPdfFile,
  onRemovePdf,
  isSaving,
}: LoreFormFieldsProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className="world-sheet__identity world-sheet__identity--plain">
        <div className="min-w-0">
          <label htmlFor="lore-title" className="sr-only">{t('worldApp.loreTitle')}</label>
          <input
            id="lore-title"
            type="text"
            value={form.name}
            placeholder={t('worldApp.loreTitlePlaceholder')}
            onChange={(e) => onChange({ name: e.target.value })}
            disabled={isSaving}
            className="world-sheet__name"
          />
          <div className="world-sheet__class">
            <label htmlFor="lore-type" className="character-form__label">{t('worldApp.loreTypeLabel')}</label>
            <select
              id="lore-type"
              value={form.type}
              onChange={(e) => onChange({ type: e.target.value as LoreType | '' })}
              disabled={isSaving}
              className="character-form__control mt-1.5"
            >
              <option value="" disabled>
                {t('worldApp.loreTypePlaceholder')}
              </option>
              {LORE_TYPES.map((type) => (
                <option key={type} value={type}>{t(`worldApp.loreType.${type}`)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="world-sheet__body">
        <div>
          <label htmlFor="lore-description" className="character-form__label">{t('worldApp.description')}</label>
          <p className="world-sheet__hint">{t('worldApp.loreDescriptionHint')}</p>
          <textarea
            id="lore-description"
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
            disabled={isSaving}
            className="character-form__control world-sheet__lede mt-1.5 resize-y"
          />
        </div>

        <AccordionSection title={t('worldApp.loreDetails')} variant="sheet">
          <div className="world-sheet__grid world-sheet__grid--2">
            <Field
              id="lore-power"
              label={t('worldApp.powerSource')}
              value={form.powerSource}
              disabled={isSaving}
              onChange={(value) => onChange({ powerSource: value })}
            />
            <Field
              id="lore-limits"
              label={t('worldApp.rulesLimits')}
              value={form.limits}
              disabled={isSaving}
              onChange={(value) => onChange({ limits: value })}
            />
            <Field
              id="lore-cost"
              label={t('worldApp.cost')}
              value={form.cost}
              disabled={isSaving}
              onChange={(value) => onChange({ cost: value })}
            />
            <Field
              id="lore-used-by"
              label={t('worldApp.usedBy')}
              value={form.usedBy}
              disabled={isSaving}
              onChange={(value) => onChange({ usedBy: value })}
            />
          </div>
          <WorldPdfField
            inputId="lore-pdf"
            pdfName={form.pdfName}
            pdfFile={pdfFile}
            disabled={isSaving}
            onPdfFile={onPdfFile}
            onRemovePdf={onRemovePdf}
          />
        </AccordionSection>
      </div>
    </>
  )
}

function Field({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="character-form__label">{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder="..."
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="character-form__control mt-1.5"
      />
    </div>
  )
}
