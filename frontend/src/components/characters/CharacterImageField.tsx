import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, X, ImageIcon } from 'lucide-react'
import { useToastStore } from '@/stores/toast-store'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 3 * 1024 * 1024

interface CharacterImageFieldProps {
  imageUrl: string | null
  onChange: (dataUrl: string | null) => void
  disabled?: boolean
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read-error'))
    reader.readAsDataURL(file)
  })
}

export function CharacterImageField({ imageUrl, onChange, disabled = false }: CharacterImageFieldProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToastStore()

  const handleFile = async (file: File | undefined | null) => {
    if (!file || disabled) return
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
      className="flex shrink-0 flex-col items-center"
      onPaste={(e) => {
        if (disabled) return
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
        <div className="character-form__portrait">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading || disabled}
          aria-label={isLoading ? t('characterApp.imageLoading') : t('characterApp.imageUpload')}
          className="character-form__portrait character-form__portrait--empty"
        >
          <ImageIcon className="h-6 w-6" />
        </button>
      )}
      <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading || disabled}
          className="character-form__portrait-action"
        >
          <Upload className="h-3 w-3" />
          {isLoading ? t('characterApp.imageLoading') : t('characterApp.imageUpload')}
        </button>
        {imageUrl && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="character-form__portrait-action"
          >
            <X className="h-3 w-3" />
            {t('characterApp.imageRemove')}
          </button>
        )}
      </div>
    </div>
  )
}
