interface SectionHeaderProps {
  tag: string
  title: string
  description?: string
  align?: 'left' | 'center'
}

export function SectionHeader({ tag, title, description, align = 'left' }: SectionHeaderProps) {
  return (
    <div className={`mb-12 scroll-reveal ${align === 'center' ? 'text-center' : ''}`}>
      <span
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: 'var(--color-accent)' }}
      >
        {tag}
      </span>
      <h2
        className="text-4xl md:text-5xl font-display font-bold mt-3"
        style={{ color: 'var(--color-ink)' }}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 ${align === 'center' ? 'max-w-2xl mx-auto' : 'max-w-2xl'}`}
          style={{ color: 'var(--color-ink-light)' }}
        >
          {description}
        </p>
      )}
    </div>
  )
}
