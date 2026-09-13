import { useTranslation } from 'react-i18next'
import { AccordionSection } from '@/components/ui/AccordionSection'
import { RaceImageField } from './RaceImageField'
import { WorldPdfField } from './WorldPdfField'
import './world-sheet.css'

export interface RaceFormState {
  id: string | null
  name: string
  classification: string
  description: string
  physicalTraits: string
  magicDescription: string
  spiritualTraits: string
  lifeExpectancy: string
  language: string
  culture: string
  religion: string
  origin: string
  territory: string
  relationsWithOthers: string
  importantNotes: string
  imageUrl: string | null
  pdfUrl: string | null
  pdfName: string | null
}

export const EMPTY_RACE_FORM: RaceFormState = {
  id: null,
  name: '',
  classification: '',
  description: '',
  physicalTraits: '',
  magicDescription: '',
  spiritualTraits: '',
  lifeExpectancy: '',
  language: '',
  culture: '',
  religion: '',
  origin: '',
  territory: '',
  relationsWithOthers: '',
  importantNotes: '',
  imageUrl: null,
  pdfUrl: null,
  pdfName: null,
}

interface RaceFormFieldsProps {
  form: RaceFormState
  onChange: (patch: Partial<RaceFormState>) => void
  pdfFile: File | null
  onPdfFile: (file: File | null) => void
  onRemovePdf: () => void
  isSaving: boolean
}

export function RaceFormFields({ form, onChange, pdfFile, onPdfFile, onRemovePdf, isSaving }: RaceFormFieldsProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className="world-sheet__identity">
        <RaceImageField
          imageUrl={form.imageUrl}
          onChange={(imageUrl) => onChange({ imageUrl })}
          disabled={isSaving}
        />
        <div className="min-w-0">
          <label htmlFor="race-name" className="sr-only">{t('worldApp.name')}</label>
          <input
            id="race-name"
            type="text"
            value={form.name}
            placeholder={t('worldApp.raceNamePlaceholder')}
            disabled={isSaving}
            onChange={(e) => onChange({ name: e.target.value })}
            className="world-sheet__name"
          />
          <div className="world-sheet__class">
            <Field
              id="race-classification"
              label={t('worldApp.classification')}
              value={form.classification}
              placeholder={t('worldApp.raceClassificationPlaceholder')}
              disabled={isSaving}
              onChange={(classification) => onChange({ classification })}
            />
          </div>
        </div>
      </div>

      <div className="world-sheet__body">
        <Area
          id="race-description"
          label={t('worldApp.raceGeneralDescription')}
          value={form.description}
          placeholder={t('worldApp.raceDescriptionPlaceholder')}
          rows={3}
          className="world-sheet__lede"
          disabled={isSaving}
          onChange={(description) => onChange({ description })}
        />

        <AccordionSection title={t('worldApp.raceBodySpirit')} variant="sheet">
          <div className="world-sheet__grid">
            <Area
              id="race-traits"
              label={t('worldApp.physicalTraits')}
              value={form.physicalTraits}
              placeholder={t('worldApp.racePhysicalPlaceholder')}
              rows={3}
              disabled={isSaving}
              onChange={(physicalTraits) => onChange({ physicalTraits })}
            />
          </div>
          <div className="world-sheet__grid world-sheet__grid--2">
            <Area
              id="race-magic"
              label={t('worldApp.ownMagic')}
              value={form.magicDescription}
              placeholder={t('worldApp.raceMagicPlaceholder')}
              rows={3}
              disabled={isSaving}
              onChange={(magicDescription) => onChange({ magicDescription })}
            />
            <Area
              id="race-spirit"
              label={t('worldApp.spiritualTraits')}
              value={form.spiritualTraits}
              placeholder={t('worldApp.raceSpiritualPlaceholder')}
              rows={3}
              disabled={isSaving}
              onChange={(spiritualTraits) => onChange({ spiritualTraits })}
            />
          </div>
          <div className="world-sheet__grid world-sheet__grid--2">
            <Field
              id="race-life"
              label={t('worldApp.lifeExpectancy')}
              value={form.lifeExpectancy}
              placeholder={t('worldApp.raceLifePlaceholder')}
              disabled={isSaving}
              onChange={(lifeExpectancy) => onChange({ lifeExpectancy })}
            />
            <Field
              id="race-language"
              label={t('worldApp.language')}
              value={form.language}
              placeholder={t('worldApp.raceLanguagePlaceholder')}
              disabled={isSaving}
              onChange={(language) => onChange({ language })}
            />
          </div>
        </AccordionSection>

        <AccordionSection title={t('worldApp.raceCultureWorld')} variant="sheet">
          <div className="world-sheet__grid world-sheet__grid--2">
            <Area
              id="race-culture"
              label={t('worldApp.cultureSociety')}
              value={form.culture}
              placeholder={t('worldApp.raceCulturePlaceholder')}
              rows={3}
              disabled={isSaving}
              onChange={(culture) => onChange({ culture })}
            />
            <Area
              id="race-religion"
              label={t('worldApp.religionBeliefs')}
              value={form.religion}
              placeholder={t('worldApp.raceReligionPlaceholder')}
              rows={3}
              disabled={isSaving}
              onChange={(religion) => onChange({ religion })}
            />
          </div>
          <div className="world-sheet__grid world-sheet__grid--2">
            <Area
              id="race-origin"
              label={t('worldApp.originHistory')}
              value={form.origin}
              placeholder={t('worldApp.raceOriginPlaceholder')}
              rows={3}
              disabled={isSaving}
              onChange={(origin) => onChange({ origin })}
            />
            <Area
              id="race-territory"
              label={t('worldApp.territory')}
              value={form.territory}
              placeholder={t('worldApp.raceTerritoryPlaceholder')}
              rows={3}
              disabled={isSaving}
              onChange={(territory) => onChange({ territory })}
            />
          </div>
          <div className="world-sheet__grid">
            <Area
              id="race-relations"
              label={t('worldApp.relationsWithOthers')}
              value={form.relationsWithOthers}
              placeholder={t('worldApp.raceRelationsPlaceholder')}
              rows={3}
              disabled={isSaving}
              onChange={(relationsWithOthers) => onChange({ relationsWithOthers })}
            />
            <div className="world-sheet__note">
              <Area
                id="race-notes"
                label={t('worldApp.importantNotes')}
                value={form.importantNotes}
                placeholder={t('worldApp.raceNotesPlaceholder')}
                rows={3}
                disabled={isSaving}
                onChange={(importantNotes) => onChange({ importantNotes })}
              />
            </div>
            <WorldPdfField
              inputId="race-pdf"
              pdfName={form.pdfName}
              pdfFile={pdfFile}
              disabled={isSaving}
              onPdfFile={onPdfFile}
              onRemovePdf={onRemovePdf}
            />
          </div>
        </AccordionSection>
      </div>
    </>
  )
}

function Field({
  id, label, value, placeholder, disabled, onChange,
}: {
  id: string
  label: string
  value: string
  placeholder: string
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
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="character-form__control mt-1.5"
      />
    </div>
  )
}

function Area({
  id, label, value, placeholder, rows, disabled, onChange, className,
}: {
  id: string
  label: string
  value: string
  placeholder: string
  rows: number
  disabled: boolean
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="character-form__label">{label}</label>
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`character-form__control mt-1.5 resize-y ${className ?? ''}`.trim()}
      />
    </div>
  )
}
