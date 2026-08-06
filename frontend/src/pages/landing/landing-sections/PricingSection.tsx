import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { SectionHeader, PricingCard, useScrollReveal } from '@/components/landing'

export function PricingSection() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const plans = [
    {
      name: t('pricing.free.name'),
      price: t('pricing.free.price'),
      period: t('pricing.perMonth'),
      desc: t('pricing.free.desc'),
      features: [
        { text: t('pricing.free.f1'), included: true },
        { text: t('pricing.free.f2'), included: true },
        { text: t('pricing.free.f3'), included: true },
        { text: t('pricing.free.f4'), included: true },
        { text: t('pricing.free.f5'), included: true },
        { text: t('pricing.free.f6'), included: true },
        { text: t('pricing.free.f7'), included: true },
        { text: t('pricing.free.f8'), included: true },
        { text: t('pricing.free.f9'), included: false },
        { text: t('pricing.free.f10'), included: false },
        { text: t('pricing.free.f11'), included: false },
        { text: t('pricing.free.f12'), included: false },
      ],
      cta: t('pricing.free.cta'),
      highlight: false,
    },
    {
      name: t('pricing.medium.name'),
      price: t('pricing.medium.price'),
      period: t('pricing.perMonth'),
      desc: t('pricing.medium.desc'),
      features: [
        { text: t('pricing.medium.f1'), included: true },
        { text: t('pricing.medium.f2'), included: true },
        { text: t('pricing.medium.f3'), included: true },
        { text: t('pricing.medium.f4'), included: true },
        { text: t('pricing.medium.f5'), included: true },
        { text: t('pricing.medium.f6'), included: true },
        { text: t('pricing.medium.f7'), included: true },
        { text: t('pricing.medium.f8'), included: true },
        { text: t('pricing.medium.f9'), included: false },
      ],
      cta: t('pricing.medium.cta'),
      highlight: false,
    },
    {
      name: t('pricing.pro.name'),
      price: t('pricing.pro.price'),
      period: t('pricing.perMonth'),
      desc: t('pricing.pro.desc'),
      features: [
        { text: t('pricing.pro.f1'), included: true },
        { text: t('pricing.pro.f2'), included: true },
        { text: t('pricing.pro.f3'), included: true },
        { text: t('pricing.pro.f4'), included: true },
        { text: t('pricing.pro.f5'), included: true },
        { text: t('pricing.pro.f6'), included: true },
        { text: t('pricing.pro.f7'), included: true },
        { text: t('pricing.pro.f8'), included: false },
      ],
      cta: t('pricing.pro.cta'),
      highlight: true,
    },
    {
      name: t('pricing.premiumChat.name'),
      price: t('pricing.premiumChat.price'),
      period: t('pricing.perMonth'),
      desc: t('pricing.premiumChat.desc'),
      features: [
        { text: t('pricing.premiumChat.f1'), included: true },
        { text: t('pricing.premiumChat.f2'), included: true },
        { text: t('pricing.premiumChat.f3'), included: true },
        { text: t('pricing.premiumChat.f4'), included: true },
      ],
      cta: t('pricing.premiumChat.cta'),
      highlight: false,
    },
    {
      name: t('pricing.premiumCharacter.name'),
      price: t('pricing.premiumCharacter.price'),
      period: t('pricing.perMonth'),
      desc: t('pricing.premiumCharacter.desc'),
      features: [
        { text: t('pricing.premiumCharacter.f1'), included: true },
        { text: t('pricing.premiumCharacter.f2'), included: true },
        { text: t('pricing.premiumCharacter.f3'), included: true },
        { text: t('pricing.premiumCharacter.f4'), included: true },
      ],
      cta: t('pricing.premiumCharacter.cta'),
      highlight: false,
    },
    {
      name: t('pricing.premiumFull.name'),
      price: t('pricing.premiumFull.price'),
      period: t('pricing.perMonth'),
      desc: t('pricing.premiumFull.desc'),
      features: [
        { text: t('pricing.premiumFull.f1'), included: true },
        { text: t('pricing.premiumFull.f2'), included: true },
        { text: t('pricing.premiumFull.f3'), included: true },
        { text: t('pricing.premiumFull.f4'), included: true },
      ],
      cta: t('pricing.premiumFull.cta'),
      highlight: false,
    },
  ]

  return (
    <section id="pricing" className="py-20 px-6" ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('pricing.tag')}
          title={t('pricing.title')}
          description={t('pricing.description')}
          align="center"
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan, i) => (
            <PricingCard
              key={i}
              name={plan.name}
              price={plan.price}
              period={plan.period}
              description={plan.desc}
              features={plan.features}
              cta={plan.cta}
              highlight={plan.highlight}
              delay={i * 100}
            />
          ))}
        </div>

        <div className="text-center mt-8 scroll-reveal">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 text-sm font-medium px-6 py-3 rounded border transition-all hover:opacity-80 hover:scale-105"
            style={{ color: 'var(--color-ink)', borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)' }}
          >
            {t('pricing.seeAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
