import { useState, useId, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccordionSectionProps {
  title: string
  actions?: ReactNode
  defaultOpen?: boolean
  variant?: 'default' | 'sheet'
  children: ReactNode
}

export function AccordionSection({
  title,
  actions,
  defaultOpen = true,
  variant = 'default',
  children,
}: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()

  if (variant === 'sheet') {
    return (
      <section>
        <div className="character-form__section-heading">
          <span className="character-form__section-mark" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-controls={contentId}
            className="character-form__accordion-button"
          >
            <h3 id={`${contentId}-heading`} className="character-form__accordion-title">{title}</h3>
            <ChevronDown
              className={cn('character-form__accordion-chevron', !open && 'character-form__accordion-chevron--closed')}
            />
          </button>
        </div>
        <div
          id={contentId}
          aria-hidden={!open}
          className={cn(
            'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
          style={open ? undefined : { visibility: 'hidden' }}
        >
          <div className="overflow-hidden min-h-0">{children}</div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-1 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex items-center gap-1 flex-1 min-w-0 text-left rounded transition-colors hover:opacity-80"
        >
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 motion-reduce:transition-none',
              !open && '-rotate-90'
            )}
            style={{ color: 'var(--color-ink-faint)' }}
          />
          <span
            className="text-xs font-medium uppercase tracking-wide truncate"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            {title}
          </span>
        </button>
        {actions && <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>}
      </div>
      <div
        id={contentId}
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
        style={open ? undefined : { visibility: 'hidden' }}
      >
        <div className="overflow-hidden min-h-0">{children}</div>
      </div>
    </section>
  )
}
