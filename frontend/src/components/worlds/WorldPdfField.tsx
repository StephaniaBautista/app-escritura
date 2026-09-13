import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, X } from 'lucide-react'
import './world-sheet.css'

interface WorldPdfFieldProps {
  inputId: string
  pdfName: string | null
  pdfFile: File | null
  disabled: boolean
  onPdfFile: (file: File | null) => void
  onRemovePdf: () => void
}

export function WorldPdfField({
  inputId,
  pdfName,
  pdfFile,
  disabled,
  onPdfFile,
  onRemovePdf,
}: WorldPdfFieldProps) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const attachedName = pdfFile?.name ?? pdfName

  return (
    <div className="world-sheet__note">
      <p className="character-form__label">{t('worldApp.pdfOptional')}</p>
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="application/pdf"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        disabled={disabled}
        onChange={(e) => {
          onPdfFile(e.target.files?.[0] ?? null)
          if (fileRef.current) fileRef.current.value = ''
        }}
      />
      <div className="world-sheet__file mt-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          aria-label={t('worldApp.attachPdf')}
          className={
            attachedName
              ? 'world-sheet__plate world-sheet__plate--file'
              : 'world-sheet__plate world-sheet__plate--empty world-sheet__plate--file'
          }
        >
          <FileText className="h-6 w-6" />
        </button>
        {attachedName ? (
          <span className="world-sheet__file-name inline-flex min-w-0 items-center gap-1">
            <span className="truncate">{attachedName}</span>
            <button
              type="button"
              onClick={() => { onPdfFile(null); onRemovePdf() }}
              disabled={disabled}
              aria-label={t('common.remove')}
              className="rounded p-0.5 hover:opacity-70 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <span className="world-sheet__file-name">{t('worldApp.attachPdf')}</span>
        )}
      </div>
    </div>
  )
}
