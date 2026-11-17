import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AiUsageCharts } from '../AiUsageCharts'
import type { AiUsageReport } from '@/services/admin'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}))

const report: AiUsageReport = {
  from: '2026-09-01T00:00:00.000Z',
  to: '2026-09-03T00:00:00.000Z',
  totals: { requests: 3, promptTokens: 1600, completionTokens: 300, totalTokens: 1900, estimatedUsd: 0.00254 },
  models: [
    { vendor: 'openai', model: 'gpt-5.6-luna', preset: 'private', requests: 2, promptTokens: 600, completionTokens: 100, totalTokens: 700, estimatedUsd: 0.0024 },
    { vendor: 'muse', model: 'muse-spark-1.3-contributor', preset: 'saver', requests: 1, promptTokens: 1000, completionTokens: 200, totalTokens: 1200, estimatedUsd: 0.00014 },
  ],
  days: [
    { date: '2026-09-01', requests: 2, promptTokens: 1500, completionTokens: 280, totalTokens: 1780, estimatedUsd: 0.00214 },
    { date: '2026-09-02', requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedUsd: 0 },
    { date: '2026-09-03', requests: 1, promptTokens: 100, completionTokens: 20, totalTokens: 120, estimatedUsd: 0.0004 },
  ],
}

describe('AiUsageCharts', () => {
  it('renders series, mix and heat charts for a report', () => {
    render(<AiUsageCharts report={report} />)
    expect(screen.getByRole('region', { name: 'admin.aiUsage.charts' })).toBeInTheDocument()
    expect(screen.getByText('admin.aiUsage.chartTokens')).toBeInTheDocument()
    expect(screen.getByText('admin.aiUsage.chartByVendor')).toBeInTheDocument()
    expect(screen.getByText('admin.aiUsage.chartTokenMix')).toBeInTheDocument()
    expect(screen.getByText('admin.aiUsage.chartHeat')).toBeInTheDocument()
  })
})
