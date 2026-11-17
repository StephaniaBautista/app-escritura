import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Download } from 'lucide-react'
import { FormSheet } from '@/components/ui/FormSheet'
import { Ao3FormatOptions } from './Ao3FormatOptions'
import {
  DEFAULT_AO3_OPTIONS,
  downloadBlob,
  exportApi,
  type Ao3ExportOptions,
  type ExportFormat,
} from '@/services/export'
import { useToastStore } from '@/stores/toast-store'

interface ExportPanelProps {
  documentId: string
  documentTitle: string
  hasChildren?: boolean
  isOpen: boolean
  onClose: () => void
}

const FORMATS: ExportFormat[] = ['pdf', 'md', 'html', 'ao3']

export function ExportPanel({ documentId, documentTitle, hasChildren = false, isOpen, onClose }: ExportPanelProps) {
  const { t } = useTranslation('exportApp')
  const success = useToastStore((s) => s.success)
  const error = useToastStore((s) => s.error)
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [includeChildren, setIncludeChildren] = useState(false)
  const [ao3, setAo3] = useState<Ao3ExportOptions>(DEFAULT_AO3_OPTIONS)
  const [isExporting, setIsExporting] = useState(false)
  const [copyText, setCopyText] = useState<string | null>(null)

  const runExport = async (mode: 'download' | 'copy') => {
    setIsExporting(true)
    try {
      const result = await exportApi.exportDocument(documentId, {
        format,
        includeChildren: hasChildren ? includeChildren : false,
        ao3: format === 'ao3' ? ao3 : undefined,
      })
      if (mode === 'copy') {
        const text = await result.blob.text()
        await navigator.clipboard.writeText(text)
        success(t('copied'))
      } else {
        downloadBlob(result.filename, result.blob)
        success(t('downloaded'))
      }
      if (format === 'ao3') {
        const text = await result.blob.text()
        setCopyText(text)
      }
      if (mode === 'download') onClose()
    } catch (err) {
      error(err instanceof Error ? err.message : t('failed'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <FormSheet
      isOpen={isOpen}
      title={t('title')}
      closeLabel={t('close')}
      confirmLabel={t('download')}
      isSaving={isExporting}
      onClose={onClose}
      onConfirm={() => { void runExport('download') }}
    >
      <p className="text-sm mb-4" style={{ color: 'var(--color-ink-light)' }}>
        {t('description', { title: documentTitle })}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {FORMATS.map((item) => {
          const active = format === item
          return (
            <button
              key={item}
              type="button"
              onClick={() => setFormat(item)}
              className="rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors"
              style={{
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-paper-lines)'}`,
                background: active ? 'var(--color-accent)' : 'var(--color-paper)',
                color: active ? '#fff' : 'var(--color-ink)',
              }}
            >
              <span className="block font-semibold uppercase text-xs tracking-wide">{t(`format.${item}`)}</span>
              <span className="block text-xs mt-1 opacity-80">{t(`formatDesc.${item}`)}</span>
            </button>
          )
        })}
      </div>

      {hasChildren && (
        <label className="mb-4 flex items-center gap-2 text-sm" style={{ color: 'var(--color-ink)' }}>
          <input
            type="checkbox"
            checked={includeChildren}
            onChange={(e) => setIncludeChildren(e.target.checked)}
          />
          {t('includeChildren')}
        </label>
      )}

      {format === 'ao3' && (
        <div className="space-y-3">
          <Ao3FormatOptions value={ao3} onChange={setAo3} />
          <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
            {t('ao3PasteHint')}
          </p>
          <button
            type="button"
            onClick={() => { void runExport('copy') }}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--color-accent)' }}
          >
            <Copy className="h-4 w-4" />
            {t('copyHtml')}
          </button>
          {copyText !== null && (
            <textarea
              readOnly
              value={copyText}
              className="h-28 w-full rounded-lg border p-2 text-xs"
              style={{
                background: 'var(--color-background)',
                borderColor: 'var(--color-paper-lines)',
                color: 'var(--color-ink)',
              }}
              aria-label={t('preview')}
            />
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--color-ink-faint)' }}>
        <Download className="h-3.5 w-3.5" />
        {t('downloadHint')}
      </div>
    </FormSheet>
  )
}
