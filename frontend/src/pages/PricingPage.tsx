import { Link } from 'react-router-dom'
import {
  Check, X, ArrowRight, MessageSquare, Bot, Lightbulb,
  ChevronDown
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LandingNav, LandingFooter, useScrollReveal } from '@/components/landing'

export function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <LandingNav />
      <PricingHero />
      <PlanCards />
      <ComparisonTable />
      <IAModes />
      <FAQ />
      <PricingCTA />
      <LandingFooter />
    </div>
  )
}

function PricingHero() {
  const { t } = useTranslation()

  return (
    <section className="pt-28 pb-16 px-6">
      <div className="max-w-4xl mx-auto text-center">
        

        <h1
          className="text-5xl md:text-6xl font-display font-bold leading-none mb-6"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('pricingPage.heroTitle')}
        </h1>

        <p className="text-lg mb-8 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
          {t('pricingPage.heroSubtitle')}
        </p>

      </div>
    </section>
  )
}

function PlanCards() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const plans = [
    {
      name: t('pricing.gratis.name'),
      price: t('pricing.gratis.price'),
      period: t('pricing.perMonth'),
      description: t('pricing.gratis.desc'),
      highlight: false,
      cta: t('pricingPage.startFree'),
      features: [
        t('pricing.gratis.f1'),
        t('pricing.gratis.f2'),
        t('pricing.gratis.f3'),
        t('pricing.gratis.f4'),
        t('pricing.gratis.f5'),
        t('pricing.gratis.f6'),
        t('pricing.gratis.f7'),
      ],
    },
    {
      name: t('pricing.pro.name'),
      price: t('pricing.pro.price'),
      period: t('pricing.perMonth'),
      description: t('pricing.pro.desc'),
      highlight: true,
      cta: t('pricingPage.startPro'),
      features: [
        t('pricing.pro.f1'),
        t('pricing.pro.f2'),
        t('pricing.pro.f3'),
        t('pricing.pro.f4'),
        t('pricing.pro.f5'),
        t('pricing.pro.f6'),
        t('pricing.pro.f7'),
        t('pricing.pro.f8'),
      ],
    },
    {
      name: t('pricing.premiumChat.name'),
      price: t('pricing.premiumChat.price'),
      period: t('pricing.perMonth'),
      description: t('pricing.premiumChat.desc'),
      highlight: false,
      cta: t('pricingPage.startPremium'),
      features: [
        t('pricing.premiumChat.f1'),
        t('pricing.premiumChat.f2'),
        t('pricing.premiumChat.f3'),
        t('pricing.premiumChat.f4'),
      ],
    },
    {
      name: t('pricing.premiumFull.name'),
      price: t('pricing.premiumFull.price'),
      period: t('pricing.perMonth'),
      description: t('pricing.premiumFull.desc'),
      highlight: false,
      cta: t('pricingPage.startFull'),
      features: [
        t('pricing.premiumFull.f1'),
        t('pricing.premiumFull.f2'),
        t('pricing.premiumFull.f3'),
        t('pricing.premiumFull.f4'),
      ],
    },
  ]

  return (
    <section className="pb-20 px-6" ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded border p-6 flex flex-col transition-all hover-lift scroll-reveal ${
                plan.highlight ? 'ring-2 scale-[1.02]' : ''
              }`}
              style={{
                background: 'var(--color-paper)',
                borderColor: plan.highlight ? 'var(--color-accent)' : 'var(--color-paper-lines)',
                '--tw-ring-color': 'var(--color-accent)',
                transitionDelay: `${i * 80}ms`,
              } as React.CSSProperties}
            >
              {plan.highlight && (
                <div
                  className="text-xs font-mono font-bold uppercase tracking-wider mb-3 px-2 py-1 rounded inline-block self-start"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  {t('pricing.popular')}
                </div>
              )}

              <h3 className="font-display text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>
                {plan.name}
              </h3>

              <div className="flex items-baseline gap-1 mt-2">
                <span className="font-display text-4xl font-bold" style={{ color: 'var(--color-ink)' }}>
                  {plan.price}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                  {plan.period}
                </span>
              </div>

              <p className="text-sm mt-2 mb-5" style={{ color: 'var(--color-ink-light)' }}>
                {plan.description}
              </p>

              <div className="space-y-2 mb-6 flex-1">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-2 text-xs">
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent-teal)' }} />
                    <span style={{ color: 'var(--color-ink)' }}>{f}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/register"
                className={`block text-center py-2.5 rounded text-sm font-medium transition-all hover:opacity-90 hover:scale-105 ${
                  plan.highlight ? 'text-white shadow-md' : 'border'
                }`}
                style={
                  plan.highlight
                    ? { background: 'var(--color-accent)', color: 'white' }
                    : { borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }
                }
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ComparisonTable() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const planNames = [
    t('pricing.gratis.name'),
    t('pricing.pro.name'),
    t('pricing.premiumChat.name'),
    t('pricing.premiumFull.name'),
  ]

  const comparisonRows = [
    { feature: t('comparison.basicWriting'), values: [true, true, true, true] },
    { feature: t('comparison.notes'), values: ['Básicas', 'Sin límite', 'Sin límite', 'Sin límite'] },
    { feature: t('comparison.characters'), values: ['5 por historia', 'Ilimitado', 'Ilimitado', 'Ilimitado'] },
    { feature: t('comparison.guidedMode'), values: [true, true, true, true] },
    { feature: t('comparison.branches'), values: ['1 extra', 'Ilimitado', 'Ilimitado', 'Ilimitado'] },
    { feature: t('comparison.timeline'), values: ['Sencilla', 'Avanzada', 'Avanzada', 'Avanzada'] },
    { feature: t('comparison.relations'), values: ['3 personajes', 'Ilimitado', 'Ilimitado', 'Ilimitado'] },
    { feature: t('comparison.evolution'), values: [false, true, true, true] },
    { feature: t('comparison.lore'), values: ['1 entrada', 'Ilimitado', 'Ilimitado', 'Ilimitado'] },
    { feature: t('comparison.subplots'), values: [false, true, true, true] },
    { feature: t('comparison.statistics'), values: ['Básicas', 'GitHub-style', 'GitHub-style', 'GitHub-style'] },
    { feature: t('comparison.exportPdf'), values: [true, true, true, true] },
    { feature: t('comparison.exportHtml'), values: [false, true, true, true] },
    { feature: t('comparison.sharing'), values: [true, true, true, true] },
    { feature: t('comparison.chatAi'), values: [false, false, true, true] },
    { feature: t('comparison.characterAi'), values: [false, false, false, true] },
    { feature: t('comparison.suggestions'), values: [false, false, false, true] },
    { feature: t('comparison.tokens'), values: ['-', '-', '~100K', '~400K'] },
    { feature: t('comparison.payAsYouGo'), values: ['-', '-', '$2/50K', '$2/50K'] },
  ]

  function renderCell(value: boolean | string) {
    if (value === true) return <Check className="w-4 h-4 mx-auto" style={{ color: 'var(--color-accent-teal)' }} />
    if (value === false) return <X className="w-4 h-4 mx-auto" style={{ color: 'var(--color-ink-faint)' }} />
    return <span className="text-xs" style={{ color: 'var(--color-ink)' }}>{value}</span>
  }

  return (
    <section className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 scroll-reveal">
          <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--color-accent)' }}>
            {t('comparison.tag')}
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-3" style={{ color: 'var(--color-ink)' }}>
            {t('comparison.title')}
          </h2>
          <p className="mt-4 max-w-2xl mx-auto" style={{ color: 'var(--color-ink-light)' }}>
            {t('comparison.description')}
          </p>
        </div>

        <div className="overflow-x-auto scroll-reveal-scale">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-paper-lines)' }}>
                <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--color-ink-faint)' }}>
                  {t('comparison.feature')}
                </th>
                {planNames.map((name, i) => (
                  <th
                    key={name}
                    className="py-3 px-4 text-center font-display text-lg font-bold"
                    style={{
                      color: i === 1 ? 'var(--color-accent)' : 'var(--color-ink)',
                      background: i === 1 ? 'var(--color-accent-light)' : 'transparent',
                    }}
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr
                  key={i}
                  className="transition-colors hover:opacity-80"
                  style={{ borderBottom: '1px solid var(--color-paper-lines)' }}
                >
                  <td className="py-3 px-4 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                    {row.feature}
                  </td>
                  {row.values.map((val, j) => (
                    <td
                      key={j}
                      className="py-3 px-4 text-center"
                      style={{ background: j === 1 ? 'var(--color-accent-light)' : 'transparent' }}
                    >
                      {renderCell(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function IAModes() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const modes = [
    {
      icon: MessageSquare,
      name: t('ai.chat'),
      plan: t('pricing.premiumChat.name'),
      price: t('pricing.premiumChat.price') + t('pricing.perMonth'),
      tokens: '~100K tokens/mes',
      description: t('ai.chatDesc'),
      features: [
        t('ai.chatDesc'),
      ],
    },
    {
      icon: Bot,
      name: t('ai.characterAi'),
      plan: t('pricing.premiumFull.name'),
      price: t('pricing.premiumFull.price') + t('pricing.perMonth'),
      tokens: '~400K tokens/mes',
      description: t('ai.characterAiDesc'),
      features: [
        t('ai.characterAiDesc'),
      ],
    },
    {
      icon: Lightbulb,
      name: t('ai.suggestions'),
      plan: t('pricing.premiumFull.name'),
      price: t('pricing.premiumFull.price') + t('pricing.perMonth'),
      tokens: '~400K tokens/mes',
      description: t('ai.suggestionsDesc'),
      features: [
        t('ai.suggestionsDesc'),
      ],
    },
  ]

  return (
    <section className="py-20 px-6" ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 scroll-reveal">
          <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--color-accent)' }}>
            {t('ai.tag')}
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-3" style={{ color: 'var(--color-ink)' }}>
            {t('ai.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {modes.map((mode, i) => (
            <div
              key={i}
              className="rounded border p-6 transition-all hover-lift scroll-reveal"
              style={{
                background: 'var(--color-paper)',
                borderColor: 'var(--color-paper-lines)',
                transitionDelay: `${i * 150}ms`,
              }}
            >
              <div
                className="w-12 h-12 rounded flex items-center justify-center mb-4"
                style={{ background: 'var(--color-accent-light)' }}
              >
                <mode.icon className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
              </div>

              <h3 className="font-display text-xl font-bold mb-1" style={{ color: 'var(--color-ink)' }}>
                {mode.name}
              </h3>

              <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                {mode.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') },
  ]

  return (
    <section className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12 scroll-reveal">
          <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--color-accent)' }}>
            {t('faq.tag')}
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-3" style={{ color: 'var(--color-ink)' }}>
            {t('faq.title')}
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded border overflow-hidden scroll-reveal transition-all"
              style={{
                background: 'var(--color-background)',
                borderColor: 'var(--color-paper-lines)',
                transitionDelay: `${i * 50}ms`,
              }}
            >
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="font-medium text-sm pr-4" style={{ color: 'var(--color-ink)' }}>
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 flex-shrink-0 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                  style={{ color: 'var(--color-ink-faint)' }}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === i ? 'max-h-40' : 'max-h-0'
                }`}
              >
                <div className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingCTA() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  return (
    <section className="py-20 px-6" ref={sectionRef}>
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 scroll-reveal" style={{ color: 'var(--color-ink)' }}>
          {t('cta.title')}
        </h2>
        <p className="mb-8 text-lg scroll-reveal" style={{ color: 'var(--color-ink-light)' }}>
          {t('cta.subtitle')}
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded font-medium text-white transition-all hover:opacity-90 hover:scale-105 hover:shadow-lg shadow-md text-lg scroll-reveal"
          style={{ background: 'var(--color-accent)' }}
        >
          {t('cta.button')}
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  )
}
