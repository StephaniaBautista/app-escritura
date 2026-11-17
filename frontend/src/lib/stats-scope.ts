import type { StatsDocument, StatsPeriod, StatsQuery, StatsRequestQuery } from '@/types/stats'

function shiftIsoDay(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

const presetDays = new Set(['7', '30', '60', '90'])

function keepRange(query: StatsQuery): Pick<StatsQuery, 'period' | 'from' | 'to' | 'timeZone'> {
  return { period: query.period, from: query.from, to: query.to, timeZone: query.timeZone }
}

export function statsRequestQuery(query: StatsQuery): StatsRequestQuery {
  const documentId = query.subpageId ?? query.documentId
  const scope = {
    timeZone: query.timeZone,
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(documentId ? { documentId } : {}),
  }
  if (query.period === 'all') return { ...scope, allTime: true }
  if (query.period === 'custom') return { ...scope, from: query.from, to: query.to }
  return { ...scope, days: Number(query.period) as 7 | 30 | 60 | 90 }
}

export function changeStatsScope(query: StatsQuery, field: 'projectId' | 'documentId' | 'subpageId', value: string): StatsQuery {
  if (field === 'projectId') {
    return { ...keepRange(query), ...(value ? { projectId: value } : {}) }
  }
  if (field === 'documentId') {
    return {
      ...keepRange(query),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(value ? { documentId: value } : {}),
    }
  }
  return {
    ...keepRange(query),
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.documentId ? { documentId: query.documentId } : {}),
    ...(value ? { subpageId: value } : {}),
  }
}

export function changeStatsPeriod(query: StatsQuery, period: StatsPeriod, today: string): StatsQuery {
  if (period === 'all' || period === 'custom') return { ...query, period }
  if (!presetDays.has(period)) return query
  return { ...query, period, from: shiftIsoDay(today, 1 - Number(period)), to: today }
}

export function changeStatsRange(query: StatsQuery, field: 'from' | 'to', value: string): StatsQuery {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return query
  if (field === 'from') return { ...query, period: 'custom', from: value, to: query.to < value ? value : query.to }
  return { ...query, period: 'custom', to: value, from: query.from > value ? value : query.from }
}

export function rootDocuments(documents: StatsDocument[], projectId: string): StatsDocument[] {
  return documents.filter((document) => document.projectId === projectId && !document.parentId)
}

export function childDocuments(documents: StatsDocument[], parentId: string): StatsDocument[] {
  return documents.filter((document) => document.parentId === parentId)
}
