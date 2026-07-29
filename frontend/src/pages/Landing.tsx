import { LandingNav, LandingFooter } from '@/components/landing'
import {
  Hero,
  Features,
  EditorSection,
  CharactersSection,
  TimelineSection,
  WorldbuildingSection,
  AISection,
  StructureSection,
  StatsSection,
  ExportSection,
  PricingSection,
  CTASection,
} from '@/pages/landing-sections'

export function Landing() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <LandingNav />
      <Hero />
      <Features />
      <EditorSection />
      <CharactersSection />
      <TimelineSection />
      <WorldbuildingSection />
      <AISection />
      <StructureSection />
      <StatsSection />
      <ExportSection />
      <PricingSection />
      <CTASection />
      <LandingFooter />
    </div>
  )
}
