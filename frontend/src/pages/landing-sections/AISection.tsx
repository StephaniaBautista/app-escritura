import { useTranslation } from 'react-i18next'
import { MessageSquare, Bot, Lightbulb, ChevronRight } from 'lucide-react'
import { SectionHeader, NotebookPaper, useScrollReveal } from '@/components/landing'

export function AISection() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const modes = [
    {
      icon: MessageSquare,
      title: t('ai.chat'),
      desc: t('ai.chatDesc'),
      example: { user: t('ai.chatUser'), ai: t('ai.chatAi') },
    },
    {
      icon: Bot,
      title: t('ai.characterAi'),
      desc: t('ai.characterAiDesc'),
      example: { user: t('ai.characterUser'), ai: t('ai.characterAi2') },
    },
    {
      icon: Lightbulb,
      title: t('ai.suggestions'),
      desc: t('ai.suggestionsDesc'),
      example: null,
    },
  ]

  return (
    <section id="ai" className="py-20 px-6" ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('ai.tag')}
          title={t('ai.title')}
          description={t('ai.description')}
          align="center"
        />

        <div className="grid md:grid-cols-3 gap-6">
          {modes.map((m, i) => (
            <NotebookPaper key={i} className="p-6 transition-all hover-lift scroll-reveal" style={{ transitionDelay: `${i * 150}ms` }}>
              <div className="w-12 h-12 rounded flex items-center justify-center mb-4" style={{ background: 'var(--color-accent-light)' }}>
                <m.icon className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
              </div>
              <h3 className="font-display text-xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>{m.title}</h3>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>{m.desc}</p>
              {m.example && (
                <div className="space-y-2 text-sm">
                  <div className="p-2.5 rounded" style={{ background: 'var(--color-background)' }}>
                    <p style={{ color: 'var(--color-ink-light)' }}>{m.example.user}</p>
                  </div>
                  <div className="p-2.5 rounded border-l-3" style={{ background: 'var(--color-accent-light)', borderColor: 'var(--color-accent)' }}>
                    <p style={{ color: 'var(--color-ink)' }}>{m.example.ai}</p>
                  </div>
                </div>
              )}
              {!m.example && (
                <div className="p-3 rounded text-sm" style={{ background: 'var(--color-background)' }}>
                  <div className="space-y-1.5">
                    {[t('ai.inconsistency'), t('ai.plotHole'), t('ai.autocomplete')].map((text, j) => (
                      <div key={j} className="flex items-start gap-2 transition-all hover:translate-x-1">
                        <ChevronRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                        <span style={{ color: 'var(--color-ink-light)' }}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </NotebookPaper>
          ))}
        </div>
      </div>
    </section>
  )
}
