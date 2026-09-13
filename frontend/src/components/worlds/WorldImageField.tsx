import { useRef, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { useToastStore } from '@/stores/toast-store'
import './world-sheet.css'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 3 * 1024 * 1024

interface WorldImageFieldProps {
  imageUrl: string | null
  onChange: (dataUrl: string | null) => void
  disabled?: boolean
  inputId: string
  label: string
  errorMessage: string
  plateClassName?: string
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read-error'))
    reader.readAsDataURL(file)
  })
}

export function WorldImageField({
  imageUrl,
  onChange,
  disabled = false,
  inputId,
  label,
  errorMessage,
  plateClassName,
}: WorldImageFieldProps) {
  const toast = useToastStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleFile = async (file: File | undefined | null) => {
    if (!file || disabled) return
    if (!ALLOWED_MIMES.includes(file.type) || file.size > MAX_BYTES) {
      toast.error(errorMessage)
      return
    }
    setIsLoading(true)
    try {
      onChange(await readAsDataUrl(file))
    } catch {
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const plate = ['world-sheet__plate', plateClassName, imageUrl ? '' : 'world-sheet__plate--empty']
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        disabled={disabled || isLoading}
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-label={label}
        className={plate}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-8 w-8" />
        )}
      </button>
    </>
  )
}
