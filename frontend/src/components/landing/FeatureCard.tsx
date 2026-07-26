import type { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  delay?: number
}

export function FeatureCard({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <div
      className="group p-5 rounded border transition-all hover-lift card-click scroll-reveal"
      style={{
        background: 'var(--color-background)',
        borderColor: 'var(--color-paper-lines)',
        transitionDelay: `${delay}ms`,
      }}
    >
      <div
        className="w-10 h-10 rounded flex items-center justify-center mb-3 transition-all group-hover:scale-110 group-hover:rotate-3"
        style={{
          background: 'var(--color-paper)',
          border: '1px solid var(--color-paper-lines)',
        }}
      >
        <Icon className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
      </div>
      <h3
        className="font-display text-lg font-bold mb-1"
        style={{ color: 'var(--color-ink)' }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
        {description}
      </p>
    </div>
  )
}
