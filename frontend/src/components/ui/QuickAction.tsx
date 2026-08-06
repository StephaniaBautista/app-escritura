import { Link } from 'react-router'
import { Loader2 } from 'lucide-react'

interface QuickActionBaseProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  title: string
  description: string
  color?: 'accent' | 'teal' | 'violet'
  isLoading?: boolean
}

interface QuickActionLinkProps extends QuickActionBaseProps {
  href: string
  onClick?: never
}

interface QuickActionButtonProps extends QuickActionBaseProps {
  href?: never
  onClick: () => void
}

type QuickActionProps = QuickActionLinkProps | QuickActionButtonProps

export function QuickAction({ icon: Icon, title, description, href, onClick, color = 'accent', isLoading }: QuickActionProps) {
  const colorMap = {
    accent: { bg: 'var(--color-accent-light)', icon: 'var(--color-accent)', border: 'var(--color-accent)' },
    teal: { bg: 'var(--color-accent-teal-light)', icon: 'var(--color-accent-teal)', border: 'var(--color-accent-teal)' },
    violet: { bg: 'var(--color-accent-violet-light)', icon: 'var(--color-accent-violet)', border: 'var(--color-accent-violet)' },
  }
  const colors = colorMap[color]

  const content = (
    <>
      <div className="notebook-lines absolute inset-0 opacity-10 rounded-xl"></div>
      <div className="relative z-10">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 border-2"
          style={{ background: colors.bg, borderColor: colors.border }}
        >
          <Icon className="w-6 h-6" style={{ color: colors.icon }} />
        </div>
        <h3 className="font-display text-xl font-bold mb-1" style={{ color: 'var(--color-ink)' }}>{title}</h3>
        <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{description}</p>
      </div>
      <div className="absolute bottom-4 left-6 right-6 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: colors.icon }}></div>
    </>
  )

  if (onClick) {
    return (
      <button
        onClick={onClick}
        disabled={isLoading}
        className="notebook-paper p-6 relative group transition-all duration-200 text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 rounded-xl" style={{ background: 'var(--color-background)', opacity: 0.7 }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent)' }} />
          </div>
        )}
        {content}
      </button>
    )
  }

  return (
    <Link
      to={href}
      className="notebook-paper p-6 relative group transition-all duration-200"
    >
      {content}
    </Link>
  )
}
