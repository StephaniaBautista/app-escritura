import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, X, ImageIcon } from 'lucide-react'
import { useToastStore } from '@/stores/toast-store'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 3 * 1024 * 1024

interface CharacterImageFieldProps {
  imageUrl: string | null
  onChange: (dataUrl: string | null) => void
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read-error'))
    reader.readAsDataURL(file)
  })
}

export function CharacterImageField({ imageUrl, onChange }: CharacterImageFieldProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToastStore()

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return
    if (!ALLOWED_MIMES.includes(file.type) || file.size > MAX_BYTES) {
      toast.error(t('characterApp.imageError'))
      return
    }
    setIsLoading(true)
    try {
      const dataUrl = await readAsDataUrl(file)
      onChange(dataUrl)
    } catch {
      toast.error(t('characterApp.imageError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden border"
      style={{ borderColor: 'var(--color-paper-lines)' }}
      onPaste={(e) => {
        const item = e.clipboardData?.items
        if (!item) return
        const file = Array.from(item).find((i) => i.type.startsWith('image/'))?.getAsFile()
        if (file) handleFile(file)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {imageUrl ? (
        <div className="flex items-center gap-3 p-3">
          <img src={imageUrl} alt="" className="w-20 h-20 object-cover rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isLoading}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
            >
              {isLoading ? t('characterApp.imageLoading') : t('characterApp.imageUpload')}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all hover:opacity-80 flex items-center gap-1"
              style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-faint)' }}
            >
              <X className="w-3 h-3" />
              {t('characterApp.imageRemove')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className="w-full flex flex-col items-center gap-1.5 py-6 transition-all hover:opacity-80 disabled:opacity-50"
          style={{ color: 'var(--color-ink-faint)', background: 'var(--color-background)' }}
        >
          <ImageIcon className="w-6 h-6" />
          <span className="text-xs font-medium">{isLoading ? t('characterApp.imageLoading') : t('characterApp.imageUpload')}</span>
          <span className="text-[11px] flex items-center gap-1">
            <Upload className="w-3 h-3" />
            {t('characterApp.imagePaste')}
          </span>
        </button>
      )}
    </div>
  )
}
