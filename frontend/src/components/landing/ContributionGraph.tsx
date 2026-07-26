import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCountUp } from './useScrollReveal'

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS_ES = ['', 'Lun', '', 'Mie', '', 'Vie', '']
const DAY_LABELS_EN = ['', 'Mon', '', 'Wed', '', 'Fri', '']

function generateContributionData(): number[][] {
  const data: number[][] = []
  for (let week = 0; week < 52; week++) {
    const weekData: number[] = []
    for (let day = 0; day < 7; day++) {
      const rand = Math.random()
      let level = 0
      if (rand > 0.3) level = 1
      if (rand > 0.5) level = 2
      if (rand > 0.75) level = 3
      if (rand > 0.9) level = 4
      weekData.push(level)
    }
    data.push(weekData)
  }
  return data
}

function getLevelColor(level: number): string {
  switch (level) {
    case 0: return 'var(--color-graph-0)'
    case 1: return 'var(--color-graph-1)'
    case 2: return 'var(--color-graph-2)'
    case 3: return 'var(--color-graph-3)'
    case 4: return 'var(--color-graph-4)'
    default: return 'var(--color-graph-0)'
  }
}

function getTooltip(level: number, t: (key: string) => string): string {
  if (level === 0) return t('stats.noWriting')
  return `${level * 312} ${t('stats.wordsWritten')}`
}

interface ContributionGraphProps {
  totalWords?: number
}

export function ContributionGraph({ totalWords = 12847 }: ContributionGraphProps) {
  const { t, i18n } = useTranslation()
  const words = useCountUp(totalWords, 2000)
  const [graphData] = useState(generateContributionData)

  const months = i18n.language === 'en' ? MONTHS_EN : MONTHS_ES
  const dayLabels = i18n.language === 'en' ? DAY_LABELS_EN : DAY_LABELS_ES

  return (
    <div className="notebook-paper p-6 scroll-reveal-scale">
      <div className="flex items-center justify-between mb-4">
        <div className="font-display text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
          <span ref={words.ref}>{words.count.toLocaleString()}</span> {t('stats.yearWords')}
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[700px]">
          <div className="flex gap-0.5 mb-1 pl-8">
            {months.map((m, i) => (
              <div key={i} className="flex-1 text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                {m}
              </div>
            ))}
          </div>

          <div className="flex gap-0">
            <div className="flex flex-col gap-0.5 mr-1.5 pt-0.5" style={{ width: '26px' }}>
              {dayLabels.map((label, i) => (
                <div
                  key={i}
                  className="flex items-center justify-end h-[13px] text-xs pr-1"
                  style={{ color: 'var(--color-ink-faint)' }}
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="flex gap-0.5">
              {graphData.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-0.5">
                  {week.map((level, dayIdx) => (
                    <div
                      key={`${weekIdx}-${dayIdx}`}
                      className="w-[13px] h-[13px] rounded-sm cursor-pointer transition-all hover:scale-150"
                      style={{ background: getLevelColor(level) }}
                      title={getTooltip(level, t)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div
            className="flex items-center justify-between mt-3 pt-2 border-t"
            style={{ borderColor: 'var(--color-paper-lines)' }}
          >
            <div></div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-ink-faint)' }}>
              <span>{t('stats.less')}</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className="w-[13px] h-[13px] rounded-sm"
                  style={{ background: getLevelColor(level) }}
                />
              ))}
              <span>{t('stats.more')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
