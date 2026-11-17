import { useTranslation } from 'react-i18next'
import { motivationIndex } from './stats-calendar'

export function MotivationalQuotes({ date }: { date: string }) {
  const { t } = useTranslation()
  return <aside className="border-l-2 pl-4 py-1" style={{ borderColor: 'var(--color-accent)' }} aria-label={t('statsApp.encouragement')}><p className="font-display text-xl">{t(`statsApp.quotes.q${motivationIndex(date, 6)}`)}</p></aside>
}
