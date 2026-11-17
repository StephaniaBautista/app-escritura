import { useTranslation } from 'react-i18next'
import type { Ao3ExportOptions } from '@/services/export'

interface Ao3FormatOptionsProps {
  value: Ao3ExportOptions
  onChange: (next: Ao3ExportOptions) => void
}

const inputStyle = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-paper-lines)',
  color: 'var(--color-ink)',
} as const

export function Ao3FormatOptions({ value, onChange }: Ao3FormatOptionsProps) {
  const { t } = useTranslation('exportApp')
  const set = <K extends keyof Ao3ExportOptions>(key: K, next: Ao3ExportOptions[K]) => {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="space-y-3 rounded-xl p-3" style={{ border: '1px solid var(--color-paper-lines)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--color-ink-light)' }}>
        {t('ao3OptionsTitle')}
      </p>

      <label className="block text-xs" style={{ color: 'var(--color-ink)' }}>
        {t('fontFamily')}
        <select
          className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
          style={inputStyle}
          value={value.fontFamily}
          onChange={(e) => set('fontFamily', e.target.value as Ao3ExportOptions['fontFamily'])}
        >
          <option value="serif">{t('fontSerif')}</option>
          <option value="sans">{t('fontSans')}</option>
          <option value="mono">{t('fontMono')}</option>
        </select>
      </label>

      <label className="block text-xs" style={{ color: 'var(--color-ink)' }}>
        {t('fontSize')}: {value.fontSize}px
        <input
          type="range"
          min={12}
          max={20}
          step={1}
          className="mt-1 w-full"
          value={value.fontSize}
          onChange={(e) => set('fontSize', Number(e.target.value))}
        />
      </label>

      <label className="block text-xs" style={{ color: 'var(--color-ink)' }}>
        {t('lineSpacing')}: {value.lineSpacing.toFixed(1)}
        <input
          type="range"
          min={1.2}
          max={2.2}
          step={0.1}
          className="mt-1 w-full"
          value={value.lineSpacing}
          onChange={(e) => set('lineSpacing', Number(e.target.value))}
        />
      </label>

      <label className="block text-xs" style={{ color: 'var(--color-ink)' }}>
        {t('paragraphStyle')}
        <select
          className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
          style={inputStyle}
          value={value.paragraphStyle}
          onChange={(e) => set('paragraphStyle', e.target.value as Ao3ExportOptions['paragraphStyle'])}
        >
          <option value="block">{t('paragraphBlock')}</option>
          <option value="indent">{t('paragraphIndent')}</option>
        </select>
      </label>

      <label className="block text-xs" style={{ color: 'var(--color-ink)' }}>
        {t('sceneSeparator')}
        <input
          type="text"
          maxLength={40}
          className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
          style={inputStyle}
          value={value.sceneSeparator}
          onChange={(e) => set('sceneSeparator', e.target.value)}
        />
      </label>

      <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-ink)' }}>
        <input
          type="checkbox"
          checked={value.includeTitle}
          onChange={(e) => set('includeTitle', e.target.checked)}
        />
        {t('includeTitle')}
      </label>
    </div>
  )
}
