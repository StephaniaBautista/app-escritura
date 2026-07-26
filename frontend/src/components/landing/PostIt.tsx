import type { ReactNode } from 'react'

type PostItVariant = 'yellow' | 'blue' | 'pink'

interface PostItProps {
  children: ReactNode
  variant?: PostItVariant
  className?: string
}

const variantStyles: Record<PostItVariant, { bg: string; border: string; shadow: string; rotate: string }> = {
  yellow: {
    bg: 'var(--color-postit-yellow)',
    border: 'var(--color-postit-yellow-border)',
    shadow: 'var(--color-postit-yellow-shadow)',
    rotate: '-1deg',
  },
  blue: {
    bg: 'var(--color-postit-blue)',
    border: 'var(--color-postit-blue-border)',
    shadow: 'var(--color-postit-blue-shadow)',
    rotate: '1deg',
  },
  pink: {
    bg: 'var(--color-postit-pink)',
    border: 'var(--color-postit-pink-border)',
    shadow: 'var(--color-postit-pink-shadow)',
    rotate: '-0.5deg',
  },
}

export function PostIt({ children, variant = 'yellow', className = '' }: PostItProps) {
  const style = variantStyles[variant]

  return (
    <div
      className={`p-3 text-xs ${className}`}
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        boxShadow: `2px 2px 0 ${style.shadow}`,
        transform: `rotate(${style.rotate})`,
        color: 'var(--color-ink)',
      }}
    >
      {children}
    </div>
  )
}
