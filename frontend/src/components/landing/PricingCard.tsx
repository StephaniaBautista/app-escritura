import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'

interface PricingFeature {
  text: string
  included: boolean
}

interface PricingCardProps {
  name: string
  price: string
  period: string
  description: string
  features: PricingFeature[]
  cta: string
  highlight?: boolean
  delay?: number
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  highlight = false,
  delay = 0,
}: PricingCardProps) {
  return (
    <div
      className={`notebook-paper p-6 flex flex-col transition-all hover-lift scroll-reveal ${
        highlight ? 'ring-2 scale-105' : ''
      }`}
      style={{
        '--tw-ring-color': 'var(--color-accent)',
        transitionDelay: `${delay}ms`,
      } as React.CSSProperties}
    >
      {highlight && (
        <div
          className="stamp text-xs mb-4 self-start animate-stamp"
          style={{ color: 'var(--color-accent)' }}
        >
          Popular
        </div>
      )}

      <h3 className="font-display text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>
        {name}
      </h3>

      <div className="flex items-baseline gap-1 mt-2">
        <span className="font-display text-4xl font-bold" style={{ color: 'var(--color-ink)' }}>
          {price}
        </span>
        <span className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          {period}
        </span>
      </div>

      <p className="text-sm mt-2 mb-6" style={{ color: 'var(--color-ink-light)' }}>
        {description}
      </p>

      <div className="space-y-2.5 mb-6 flex-1">
        {features.map((f, j) => (
          <div key={j} className="flex items-start gap-2 text-sm">
            {f.included ? (
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent-teal)' }} />
            ) : (
              <X className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }} />
            )}
            <span style={{ color: f.included ? 'var(--color-ink)' : 'var(--color-ink-faint)' }}>
              {f.text}
            </span>
          </div>
        ))}
      </div>

      <Link
        to="/register"
        className={`block text-center py-2.5 rounded text-sm font-medium transition-all hover:opacity-90 hover:scale-105 card-click ${
          highlight ? 'text-white shadow-md' : 'border'
        }`}
        style={
          highlight
            ? { background: 'var(--color-accent)', color: 'white' }
            : { borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }
        }
      >
        {cta}
      </Link>
    </div>
  )
}
