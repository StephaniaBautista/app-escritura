import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileScan, Loader2 } from 'lucide-react'
import { OCR_ACCEPT } from '@/lib/ocr-file'
import { extractOcrText, OcrApiError } from '@/services/ocr'
import { useToastStore } from '@/stores/toast-store'

interface OcrImportProps {
  onUseInLore: (text: string) => void
  onUseInGlossary: (text: string) => void
}

const ERROR_KEYS: Record<string, string> = {
  UNSUPPORTED_TYPE: 'worldApp.ocrUnsupported',
  FILE_TOO_LARGE: 'worldApp.ocrTooLarge',
  NO_FILE: 'worldApp.ocrNoFile',
  UNAUTHORIZED: 'worldApp.ocrUnauthorized',
}

export function OcrImport({ onUseInLore, onUseInGlossary }: OcrImportProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [text, setText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    setText('')
    setIsProcessing(true)
    try {
      const extracted = await extractOcrText(file)
      if (!extracted) {
        toast.error(t('worldApp.ocrEmpty'))
        return
      }
      setText(extracted)
    } catch (err) {
      const code = err instanceof OcrApiError ? err.code : 'OCR_FAILED'
      toast.error(t(ERROR_KEYS[code] ?? 'worldApp.ocrFailed'))
    } finally {
      setIsProcessing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('worldApp.ocrCopied'))
    } catch {
      toast.error(t('worldApp.ocrFailed'))
    }
  }

  const trimmed = text.trim()

  return (
    <div className="notebook-paper p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            {t('worldApp.ocrImport')}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
            {t('worldApp.ocrHint')}
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            id="ocr-file"
            type="file"
            accept={OCR_ACCEPT}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            disabled={isProcessing}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isProcessing}
            aria-busy={isProcessing}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--color-accent)' }}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileScan className="h-4 w-4" />}
            {isProcessing ? t('worldApp.ocrProcessing') : t('worldApp.ocrChooseFile')}
          </button>
        </div>
      </div>

      {fileName && (
        <p className="text-xs truncate" style={{ color: 'var(--color-ink-light)' }}>
          {fileName}
        </p>
      )}

      {trimmed.length > 0 && (
        <>
          <label htmlFor="ocr-result" className="block text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            {t('worldApp.ocrResult')}
          </label>
          <textarea
            id="ocr-result"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="w-full rounded-lg border px-3 py-2 text-sm resize-y"
            style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyText()}
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{ color: 'var(--color-ink)', border: '1px solid var(--color-paper-lines)' }}
            >
              {t('worldApp.ocrCopy')}
            </button>
            <button
              type="button"
              onClick={() => onUseInLore(trimmed)}
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{ color: 'var(--color-ink)', border: '1px solid var(--color-paper-lines)' }}
            >
              {t('worldApp.ocrUseLore')}
            </button>
            <button
              type="button"
              onClick={() => onUseInGlossary(trimmed)}
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{ color: 'var(--color-ink)', border: '1px solid var(--color-paper-lines)' }}
            >
              {t('worldApp.ocrUseGlossary')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
