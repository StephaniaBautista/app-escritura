import { useToastStore } from '@/stores/toast-store'
import { CheckCircle, XCircle, X } from 'lucide-react'

export function ToastContainer() {
  const { toasts, remove } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium"
          style={{ background: 'var(--color-paper)', color: 'var(--color-ink)', border: '1px solid var(--color-paper-lines)' }}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => remove(toast.id)}
            className="p-0.5 rounded hover:opacity-70 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
