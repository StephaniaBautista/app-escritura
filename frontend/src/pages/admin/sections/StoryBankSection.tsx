import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QuestionsManager } from './QuestionsManager'
import { TemplatesManager } from './TemplatesManager'

type BankTab = 'questions' | 'templates'

export function StoryBankSection() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<BankTab>('questions')

  const tabs: { id: BankTab; label: string }[] = [
    { id: 'questions', label: t('admin.bank.questionsTitle') },
    { id: 'templates', label: t('admin.bank.templatesTitle') },
  ]

  return (
    <div>
      <div className="flex gap-1 border-b mb-5 overflow-x-auto" style={{ borderColor: 'var(--color-paper-lines)' }}>
        {tabs.map((tb) => {
          const isActive = tab === tb.id
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
              style={{
                color: isActive ? 'var(--color-accent)' : 'var(--color-ink-light)',
                borderColor: isActive ? 'var(--color-accent)' : 'transparent',
              }}
            >
              {tb.label}
            </button>
          )
        })}
      </div>

      {tab === 'questions' && <QuestionsManager />}
      {tab === 'templates' && <TemplatesManager />}
    </div>
  )
}
