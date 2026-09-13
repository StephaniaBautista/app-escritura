import { useTranslation } from 'react-i18next'
import './world-sheet.css'

export interface GlossaryFormState {
  id: string | null
  word: string
  pronunciation: string
  meaning: string
}

export const EMPTY_GLOSSARY_FORM: GlossaryFormState = {
  id: null,
  word: '',
  pronunciation: '',
  meaning: '',
}

interface GlossaryFormFieldsProps {
  form: GlossaryFormState
  onChange: (patch: Partial<GlossaryFormState>) => void
  isSaving: boolean
}

export function GlossaryFormFields({ form, onChange, isSaving }: GlossaryFormFieldsProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className="world-sheet__identity world-sheet__identity--plain">
        <div className="min-w-0">
          <label htmlFor="glossary-word" className="sr-only">{t('worldApp.word')}</label>
          <input
            id="glossary-word"
            type="text"
            value={form.word}
            placeholder={t('worldApp.glossaryWordPlaceholder')}
            onChange={(e) => onChange({ word: e.target.value })}
            disabled={isSaving}
            className="world-sheet__name"
          />
          <label htmlFor="glossary-pronunciation" className="sr-only">{t('worldApp.pronunciation')}</label>
          <input
            id="glossary-pronunciation"
            type="text"
            value={form.pronunciation}
            placeholder={t('worldApp.glossaryPronunciationPlaceholder')}
            onChange={(e) => onChange({ pronunciation: e.target.value })}
            disabled={isSaving}
            className="world-sheet__phonetic"
          />
        </div>
      </div>

      <div className="world-sheet__body">
        <div className="world-sheet__note">
          <label htmlFor="glossary-meaning" className="character-form__label">{t('worldApp.meaning')}</label>
          <p className="world-sheet__hint">{t('worldApp.glossaryMeaningHint')}</p>
          <textarea
            id="glossary-meaning"
            value={form.meaning}
            placeholder={t('worldApp.glossaryMeaningPlaceholder')}
            onChange={(e) => onChange({ meaning: e.target.value })}
            rows={6}
            disabled={isSaving}
            className="character-form__control world-sheet__lede mt-1.5 resize-y"
          />
        </div>
      </div>
    </>
  )
}
