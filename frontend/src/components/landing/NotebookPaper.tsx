import type { ReactNode, CSSProperties } from 'react'

interface NotebookPaperProps {
  children: ReactNode
  className?: string
  spiral?: boolean
  lines?: boolean
  style?: CSSProperties
}

export function NotebookPaper({ children, className = '', spiral = false, lines = false, style }: NotebookPaperProps) {
  return (
    <div
      className={`notebook-paper ${spiral ? 'notebook-spiral' : ''} ${className}`}
      style={{
        background: 'var(--color-paper)',
        border: '1px solid var(--color-paper-lines)',
        ...style,
      }}
    >
      {lines ? (
        <div className="notebook-lines-only p-4">{children}</div>
      ) : (
        children
      )}
    </div>
  )
}
