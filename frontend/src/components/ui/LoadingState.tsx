import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  label?: string
  className?: string
}

export function LoadingState({ label, className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <Loader2 data-testid="loading-spinner" className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
      {label && (
        <p className="mt-3 text-sm" style={{ color: 'var(--color-ink-light)' }}>
          {label}
        </p>
      )}
    </div>
  )
}
