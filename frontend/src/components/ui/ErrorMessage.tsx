import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  message: string | null
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null

  return (
    <div className="mb-6 flex items-center gap-2 text-sm p-3 rounded-lg" style={{ background: '#fef2f2', color: '#991b1b' }}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}
