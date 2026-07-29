import { useTranslation } from 'react-i18next'
import { FolderTree } from 'lucide-react'
import { SectionHeader, NotebookPaper, useScrollReveal } from '@/components/landing'

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

export function EditorSection() {
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
