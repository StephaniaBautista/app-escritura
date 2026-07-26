import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import {
  PenLine, BookOpen, GitBranch, Users, Clock, Network,
  ScrollText, Layers, BarChart3, FileText, Share2, MessageSquare, Bot, Lightbulb,
  ChevronRight, ArrowRight,
  FolderTree, Globe, Bookmark, Star
} from 'lucide-react'
import {
  SectionHeader,
  NotebookPaper,
  PostIt,
  FeatureCard,
  PricingCard,
  ContributionGraph,
  LandingNav,
  LandingFooter,
  useScrollReveal,
} from '@/components/landing'

export function Landing() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <LandingNav />
      <Hero />
      <Features />
      <Editor />
      <Characters />
      <Timeline />
      <Worldbuilding />
      <AI />
      <Structure />
      <Stats />
      <Export />
      <Pricing />
      <CTA />
      <LandingFooter />
    </div>
  )
}

function Hero() {
  const { t } = useTranslation()

  return (
    <section className="pt-28 pb-20 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-none mb-6"
              style={{ color: 'var(--color-ink)' }}
            >
              <Trans i18nKey="hero.title">
                Tu historia merece un <span className="pencil-underline">taller</span>, no un bloc de notas
              </Trans>
            </h1>

            <p className="text-lg mb-8 max-w-lg leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded font-medium text-white transition-all hover:opacity-90 hover:scale-105 hover:shadow-lg shadow-md card-click"
                style={{ background: 'var(--color-accent)' }}
              >
                {t('hero.cta')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 rounded font-medium transition-all hover:opacity-80 hover:scale-105 border card-click"
                style={{ color: 'var(--color-ink)', borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)' }}
              >
                {t('hero.ctaSecondary')}
              </a>
            </div>
          </div>

          <div className="relative animate-fade-in-right" style={{ animationDelay: '0.3s', opacity: 0 }}>
            <NotebookPaper spiral className="p-6 animate-paper-flutter" style={{ '--rotate': '1deg' } as React.CSSProperties}>
              <div className="notebook-lines-only min-h-[280px] p-4 font-body text-sm leading-7" style={{ color: 'var(--color-ink)' }}>
                <h3 className="font-display text-2xl font-bold mb-4" style={{ color: 'var(--color-ink)' }}>
                  {t('editor.chapter')}
                </h3>
                <p className="mb-3">{t('editor.text1')}</p>
                <p className="mb-3">{t('editor.text2')}</p>
                <p className="animate-typing" style={{ color: 'var(--color-ink-light)' }}>{t('editor.text3')}</p>
                <div className="mt-4 pt-3 border-t flex items-center gap-2 text-xs" style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-faint)' }}>
                  <span className="highlight-yellow">{t('editor.words')}</span>
                  <span>·</span>
                  <span>{t('editor.saved')}</span>
                </div>
              </div>
            </NotebookPaper>

            <PostIt variant="yellow" className="absolute -bottom-4 -right-4 w-48">
              <div className="font-display text-base font-bold mb-1">Nota rápida</div>
              <div style={{ color: 'var(--color-ink-light)' }}>Recordar: Elena llega tarde al café porque perdió el autobús</div>
            </PostIt>

            <PostIt variant="blue" className="absolute -top-3 -left-3 w-40">
              <div className="font-medium">Rama: final-alternativo</div>
              <div style={{ color: 'var(--color-ink-faint)' }}>3 cambios pendientes</div>
            </PostIt>
          </div>
        </div>
      </div>
    </section>
  )
}

function Features() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const features = [
    { icon: PenLine, title: t('features.editor'), desc: t('features.editorDesc') },
    { icon: FolderTree, title: t('features.chapters'), desc: t('features.chaptersDesc') },
    { icon: Bookmark, title: t('features.notes'), desc: t('features.notesDesc') },
    { icon: GitBranch, title: t('features.git'), desc: t('features.gitDesc') },
    { icon: Users, title: t('features.characters'), desc: t('features.charactersDesc') },
    { icon: Clock, title: t('features.timeline'), desc: t('features.timelineDesc') },
    { icon: Network, title: t('features.relations'), desc: t('features.relationsDesc') },
    { icon: ScrollText, title: t('features.lore'), desc: t('features.loreDesc') },
    { icon: Layers, title: t('features.subplots'), desc: t('features.subplotsDesc') },
    { icon: BarChart3, title: t('features.stats'), desc: t('features.statsDesc') },
  ]

  return (
    <section id="features" className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('features.tag')}
          title={t('features.title')}
          description={t('features.description')}
          align="center"
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FeatureCard key={i} icon={f.icon} title={f.title} description={f.desc} delay={i * 50} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Editor() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const folders = [
    { name: 'Mi Novela', indent: 0, open: true },
    { name: 'Capitulo 1', indent: 1 },
    { name: 'Capitulo 2', indent: 1 },
    { name: 'Notas', indent: 1, open: true },
    { name: 'Investigacion', indent: 2 },
    { name: 'Cuentos', indent: 0 },
    { name: 'Poesia', indent: 0 },
  ]

  return (
    <section className="py-20 px-6" ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('editor.tag')}
          title={t('editor.title')}
          description={t('editor.description')}
        />

        <div className="grid md:grid-cols-12 gap-6">
          <div className="md:col-span-4 scroll-reveal-left">
            <NotebookPaper className="p-4 hover-lift">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: 'var(--color-paper-lines)' }}>
                <FolderTree className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                <span className="font-mono text-xs font-medium" style={{ color: 'var(--color-ink)' }}>{t('editor.explorer')}</span>
              </div>
              <div className="space-y-0.5 text-sm">
                {folders.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:opacity-80 transition-all hover:translate-x-1"
                    style={{ paddingLeft: `${f.indent * 16 + 8}px`, color: 'var(--color-ink)' }}
                  >
                    <FolderIcon open={f.open} />
                    <span>{f.name}</span>
                  </div>
                ))}
              </div>
            </NotebookPaper>
          </div>

          <div className="md:col-span-8 scroll-reveal-right">
            <NotebookPaper spiral className="p-6 hover-lift">
              <div className="notebook-lines-only min-h-[280px] p-4 text-sm leading-7" style={{ color: 'var(--color-ink)' }}>
                <h3 className="font-display text-2xl font-bold mb-4" style={{ color: 'var(--color-ink)' }}>{t('editor.chapter')}</h3>
                <p className="mb-3">{t('editor.text1')}</p>
                <p className="mb-3">{t('editor.text2')}</p>
                <p className="mb-3" style={{ color: 'var(--color-ink-light)' }}>{t('editor.text3')}</p>
                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-faint)' }}>
                  <span>{t('editor.words')}</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {t('editor.savedStatus')}
                  </span>
                </div>
              </div>
            </NotebookPaper>
          </div>
        </div>
      </div>
    </section>
  )
}

function FolderIcon({ open }: { open?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      {open ? (
        <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" fill="var(--color-accent-light)" stroke="var(--color-accent)" strokeWidth="1"/>
      ) : (
        <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" fill="var(--color-paper)" stroke="var(--color-paper-lines)" strokeWidth="1"/>
      )}
    </svg>
  )
}

function Characters() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const character = {
    name: t('characters.name'),
    role: t('characters.role'),
    age: '24',
    traits: [t('characters.trait1'), t('characters.trait2'), t('characters.trait3')],
    motivation: t('characters.motivationText'),
    weakness: t('characters.weaknessText'),
  }

  return (
    <section className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('characters.tag')}
          title={t('characters.title')}
          description={t('characters.description')}
        />

        <div className="grid md:grid-cols-2 gap-8">
          <NotebookPaper className="p-6 scroll-reveal-left hover-lift">
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-20 h-24 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-accent-light)', border: '2px dashed var(--color-accent)' }}
              >
                <Users className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>{character.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>{character.role}</span>
                  <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>{t('characters.age')}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--color-ink-faint)' }}>{t('characters.traits')}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {character.traits.map((tr) => (
                    <span key={tr} className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-background)', color: 'var(--color-ink)' }}>{tr}</span>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--color-ink-faint)' }}>{t('characters.motivation')}</span>
                <p className="mt-1" style={{ color: 'var(--color-ink)' }}>{character.motivation}</p>
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--color-ink-faint)' }}>{t('characters.weakness')}</span>
                <p className="mt-1" style={{ color: 'var(--color-ink)' }}>{character.weakness}</p>
              </div>
            </div>
          </NotebookPaper>

          <div className="space-y-4 scroll-reveal-right">
            {[
              { icon: Users, title: t('characters.familyTree'), desc: t('characters.familyTreeDesc') },
              { icon: Star, title: t('characters.evolution'), desc: t('characters.evolutionDesc') },
              { icon: Lightbulb, title: t('characters.aiComplete'), desc: t('characters.aiCompleteDesc') },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded border transition-all hover-lift card-click" style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <item.icon className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                  <h4 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>{item.title}</h4>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Timeline() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const events = [
    { time: t('timeline.morning'), title: t('timeline.morningEvent'), characters: ['María', 'Padre'] },
    { time: t('timeline.noon'), title: t('timeline.noonEvent'), characters: ['María', 'Desconocido'] },
    { time: t('timeline.afternoon'), title: t('timeline.afternoonEvent'), characters: ['María', 'Elena'] },
    { time: t('timeline.night'), title: t('timeline.nightEvent'), characters: ['María'] },
  ]

  return (
    <section className="py-20 px-6" ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('timeline.tag')}
          title={t('timeline.title')}
          description={t('timeline.description')}
        />

        <NotebookPaper className="p-8 scroll-reveal-scale">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ background: 'var(--color-paper-lines)' }}></div>
            <div className="space-y-8">
              {events.map((e, i) => (
                <div key={i} className="relative pl-12 scroll-reveal" style={{ transitionDelay: `${i * 150}ms` }}>
                  <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full border-2" style={{ borderColor: 'var(--color-accent)', background: 'var(--color-paper)' }}></div>
                  <div className="text-xs font-mono mb-1" style={{ color: 'var(--color-accent)' }}>{e.time}</div>
                  <h4 className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>{e.title}</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {e.characters.map((c) => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </NotebookPaper>
      </div>
    </section>
  )
}

function Worldbuilding() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const items = [
    { icon: Users, title: t('worldbuilding.races'), desc: t('worldbuilding.racesDesc') },
    { icon: ScrollText, title: t('worldbuilding.lore'), desc: t('worldbuilding.loreDesc') },
    { icon: Globe, title: t('worldbuilding.worldmap'), desc: t('worldbuilding.worldmapDesc') },
    { icon: BookOpen, title: t('worldbuilding.glossary'), desc: t('worldbuilding.glossaryDesc') },
    { icon: Star, title: t('worldbuilding.creatures'), desc: t('worldbuilding.creaturesDesc') },
    { icon: Network, title: t('worldbuilding.relations'), desc: t('worldbuilding.relationsDesc') },
  ]

  return (
    <section className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('worldbuilding.tag')}
          title={t('worldbuilding.title')}
          description={t('worldbuilding.description')}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((f, i) => (
            <FeatureCard key={i} icon={f.icon} title={f.title} description={f.desc} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  )
}

function AI() {
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

function Structure() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const columns = [
    { name: t('structure.start'), cards: [t('structure.startCard1'), t('structure.startCard2')] },
    { name: t('structure.development'), cards: [t('structure.devCard1'), t('structure.devCard2')] },
    { name: t('structure.climax'), cards: [t('structure.climaxCard')] },
    { name: t('structure.conclusion'), cards: [] },
  ]

  return (
    <section className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('structure.tag')}
          title={t('structure.title')}
          description={t('structure.description')}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {columns.map((col, i) => (
            <div key={i} className="rounded border p-3 scroll-reveal" style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', transitionDelay: `${i * 100}ms` }}>
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--color-ink)' }}>{col.name}</h4>
              <div className="space-y-2">
                {col.cards.map((card, j) => (
                  <NotebookPaper key={j} className="p-3 text-sm cursor-grab hover-lift card-click">
                    <div className="font-medium" style={{ color: 'var(--color-ink)' }}>{card}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>{j + 1}</div>
                  </NotebookPaper>
                ))}
                <button
                  className="w-full p-2 rounded border border-dashed text-xs transition-all hover:opacity-80 hover:scale-105"
                  style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-faint)' }}
                >
                  {t('structure.addCard')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stats() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  return (
    <section className="py-20 px-6" ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('stats.tag')}
          title={t('stats.title')}
          description={t('stats.description')}
        />

        <ContributionGraph totalWords={12847} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 scroll-reveal">
          {[
            { value: '12,847', label: t('stats.totalWords') },
            { value: '14', label: t('stats.streak') },
            { value: '918', label: t('stats.average') },
            { value: '23h', label: t('stats.totalTime') },
          ].map((stat, i) => (
            <div key={i} className="text-center p-4 rounded border" style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}>
              <div className="font-display text-3xl font-bold" style={{ color: 'var(--color-ink)' }}>{stat.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Export() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const formats = [
    { icon: FileText, name: t('exportSection.pdf'), desc: t('exportSection.pdfDesc') },
    { icon: ScrollText, name: t('exportSection.markdown'), desc: t('exportSection.markdownDesc') },
    { icon: Globe, name: t('exportSection.html'), desc: t('exportSection.htmlDesc') },
    { icon: Share2, name: t('exportSection.ao3'), desc: t('exportSection.ao3Desc') },
  ]

  return (
    <section className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t('exportSection.tag')}
          title={t('exportSection.title')}
          description={t('exportSection.description')}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {formats.map((f, i) => (
            <NotebookPaper key={i} className="p-5 text-center transition-all hover-lift scroll-reveal" style={{ transitionDelay: `${i * 100}ms` }}>
              <div
                className="w-12 h-12 rounded flex items-center justify-center mx-auto mb-3 transition-transform hover:scale-110 hover:rotate-6"
                style={{ background: 'var(--color-accent-light)' }}
              >
                <f.icon className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
              </div>
              <h3 className="font-display text-lg font-bold mb-1" style={{ color: 'var(--color-ink)' }}>{f.name}</h3>
              <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{f.desc}</p>
            </NotebookPaper>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  const plans = [
    {
      name: t('pricing.gratis.name'),
      price: t('pricing.gratis.price'),
      period: t('pricing.perMonth'),
      desc: t('pricing.gratis.desc'),
      features: [
        { text: t('pricing.gratis.f1'), included: true },
        { text: t('pricing.gratis.f2'), included: true },
        { text: t('pricing.gratis.f3'), included: true },
        { text: t('pricing.gratis.f4'), included: true },
        { text: t('pricing.gratis.f5'), included: true },
        { text: t('pricing.gratis.f6'), included: true },
        { text: t('pricing.gratis.f7'), included: true },
        { text: t('pricing.gratis.f8'), included: false },
        { text: t('pricing.gratis.f9'), included: false },
        { text: t('pricing.gratis.f10'), included: false },
      ],
      cta: t('pricing.gratis.cta'),
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
        { text: t('pricing.pro.f8'), included: true },
        { text: t('pricing.pro.f9'), included: false },
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

function CTA() {
  const sectionRef = useScrollReveal()
  const { t } = useTranslation()

  return (
    <section className="py-20 px-6" style={{ background: 'var(--color-paper)' }} ref={sectionRef}>
      <div className="max-w-2xl mx-auto text-center">
        <PostIt variant="yellow" className="inline-block p-6 mb-8 animate-wiggle scroll-reveal">
          <div className="font-display text-lg font-bold">{t('cta.noteTitle')}</div>
          <div className="text-sm mt-1" style={{ color: 'var(--color-ink-light)' }}>{t('cta.noteText')}</div>
        </PostIt>

        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 scroll-reveal" style={{ color: 'var(--color-ink)' }}>
          {t('cta.title')}
        </h2>
        <p className="mb-8 text-lg scroll-reveal" style={{ color: 'var(--color-ink-light)' }}>
          {t('cta.subtitle')}
        </p>

        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded font-medium text-white transition-all hover:opacity-90 hover:scale-105 hover:shadow-lg shadow-md text-lg card-click scroll-reveal"
          style={{ background: 'var(--color-accent)' }}
        >
          {t('cta.button')}
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  )
}
