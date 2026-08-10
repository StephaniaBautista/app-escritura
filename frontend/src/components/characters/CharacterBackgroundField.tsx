import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon, Upload, X } from 'lucide-react'
import type { SheetBackgroundMode } from '@/types/character'
import { useToastStore } from '@/stores/toast-store'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 3 * 1024 * 1024
const MAX_IMAGES = 6

interface CharacterBackgroundFieldProps {
  mode: SheetBackgroundMode
  existingImages: string[]
  newImages: string[]
  onModeChange: (mode: SheetBackgroundMode) => void
  onExistingImagesChange: (images: string[]) => void
  onNewImagesChange: (images: string[]) => void
}

const MODES: { value: SheetBackgroundMode; label: string; description: string }[] = [
  { value: 'default', label: 'sheetBackgroundDefault', description: 'sheetBackgroundDefaultDescription' },
  { value: 'single', label: 'sheetBackgroundSingle', description: 'sheetBackgroundSingleDescription' },
  { value: 'collage', label: 'sheetBackgroundCollage', description: 'sheetBackgroundCollageDescription' },
]

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read-error'))
    reader.readAsDataURL(file)
  })
}

export function CharacterBackgroundField({
  mode,
  existingImages,
  newImages,
  onModeChange,
  onExistingImagesChange,
  onNewImagesChange,
}: CharacterBackgroundFieldProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)

  const total = mode === 'single' ? 1 : MAX_IMAGES
  const count = existingImages.length + newImages.length
  const remaining = Math.max(0, total - count)

  const removeImage = (url: string, isNew: boolean) => {
    if (isNew) {
      onNewImagesChange(newImages.filter((image) => image !== url))
    } else {
      onExistingImagesChange(existingImages.filter((image) => image !== url))
    }
  }

  const handleFiles = async (files: File[]) => {
    if (files.length === 0 || mode === 'default') return

    const validFiles = files.filter((file) => ALLOWED_MIMES.includes(file.type) && file.size <= MAX_BYTES)
    if (validFiles.length !== files.length) toast.error(t('characterApp.imageError'))

    const total = mode === 'single' ? 1 : MAX_IMAGES
    const count = existingImages.length + newImages.length
    const available = total - count
    if (available <= 0 || validFiles.length > available) {
      toast.error(t('characterApp.sheetBackgroundTooMany', { total }))
      return
    }

    setIsLoading(true)
    try {
      const dataUrls = await Promise.all(validFiles.slice(0, available).map(readAsDataUrl))
      if (mode === 'single') {
        onExistingImagesChange([])
        onNewImagesChange(dataUrls.slice(0, 1))
      } else {
        onNewImagesChange([...newImages, ...dataUrls].slice(0, MAX_IMAGES - existingImages.length))
      }
    } catch {
      toast.error(t('characterApp.imageError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleModeChange = (nextMode: SheetBackgroundMode) => {
    onModeChange(nextMode)
    if (nextMode === 'single') {
      onExistingImagesChange(existingImages.slice(0, 1))
      onNewImagesChange(newImages.slice(0, 1))
    }
  }

  return (
    <fieldset
      className="character-background-field rounded-[var(--radius)] border p-3"
      style={{ borderColor: 'var(--color-paper-lines)' }}
      onPaste={(event) => {
        const file = Array.from(event.clipboardData?.items ?? [])
          .find((item) => item.type.startsWith('image/'))
          ?.getAsFile()
        if (file) void handleFiles([file])
      }}
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('characterApp.sheetBackgroundTitle')}>
        {MODES.map((option) => (
          <label
            key={option.value}
            htmlFor={`sheet-background-${option.value}`}
            className="character-background-option flex cursor-pointer gap-2 rounded-[var(--radius)] border p-2.5 transition-colors"
            style={{
              borderColor: mode === option.value ? 'var(--color-accent)' : 'var(--color-paper-lines)',
              background: mode === option.value ? 'var(--color-accent-light)' : 'var(--color-background)',
            }}
          >
            <input
              id={`sheet-background-${option.value}`}
              type="radio"
              name="sheet-background-mode"
              value={option.value}
              checked={mode === option.value}
              onChange={() => handleModeChange(option.value)}
              className="mt-0.5 accent-[var(--color-accent)]"
              aria-label={t(`characterApp.${option.label}`)}
            />
            <span className="min-w-0">
              <span className="block text-xs font-semibold" style={{ color: 'var(--color-ink)' }}>
                {t(`characterApp.${option.label}`)}
              </span>
              <span className="mt-0.5 block text-[11px] leading-tight" style={{ color: 'var(--color-ink-faint)' }}>
                {t(`characterApp.${option.description}`)}
              </span>
            </span>
          </label>
        ))}
      </div>

      {mode !== 'default' && (
        <div className="mt-3 space-y-2">
          <input
            ref={inputRef}
            id="sheet-background-upload"
            type="file"
            aria-label={t('characterApp.sheetBackgroundUpload')}
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple={mode === 'collage'}
            className="hidden"
            onChange={(event) => {
              void handleFiles(Array.from(event.target.files ?? []))
              event.currentTarget.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isLoading || remaining === 0}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
          >
            <Upload className="h-3.5 w-3.5" />
            {isLoading ? t('characterApp.imageLoading') : t('characterApp.sheetBackgroundUpload')}
          </button>

          {(existingImages.length > 0 || newImages.length > 0) ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label={t('characterApp.sheetBackgroundImages')}>
              {existingImages.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-md border" style={{ borderColor: 'var(--color-paper-lines)' }}>
                  <img src={url} alt={t('characterApp.sheetBackgroundImageAlt')} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url, false)}
                    aria-label={t('characterApp.sheetBackgroundRemove')}
                    className="absolute right-1 top-1 rounded-full p-1 text-white transition-opacity hover:opacity-80"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {newImages.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-md border" style={{ borderColor: 'var(--color-paper-lines)' }}>
                  <img src={url} alt={t('characterApp.sheetBackgroundImageAlt')} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url, true)}
                    aria-label={t('characterApp.sheetBackgroundRemove')}
                    className="absolute right-1 top-1 rounded-full p-1 text-white transition-opacity hover:opacity-80"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed px-3 py-4 text-center text-xs" style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-faint)' }}>
              <ImageIcon className="h-4 w-4" />
              {t('characterApp.sheetBackgroundEmpty')}
            </div>
          )}
          <p className="character-form__image-counter" aria-live="polite">
            <span className={remaining === 0 ? 'character-form__image-counter--full' : undefined}>
              {t('characterApp.sheetImageCounter', { count, total })}
            </span>
            <span aria-hidden="true"> · </span>
            {remaining > 0 ? (
              <span>{t('characterApp.sheetImageRemaining', { remaining })}</span>
            ) : (
              <span className="character-form__image-counter--full">{t('characterApp.sheetImageFull')}</span>
            )}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--color-ink-faint)' }}>
            {t('characterApp.sheetBackgroundLimit')}
          </p>
        </div>
      )}
    </fieldset>
  )
}
