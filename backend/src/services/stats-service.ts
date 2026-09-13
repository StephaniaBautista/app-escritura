import type { Prisma } from '@generated/client'
import { prisma } from '../lib/prisma.js'
import { countDocumentWords } from '../lib/document-words.js'
import { calculateWritingStats, descendantDocumentIds } from '../lib/stats-calculations.js'
import { localDay, normalizeTimeZone } from '../lib/stats-time.js'
import { requireActiveWriter } from './stats-access.js'
import { StatsError, type StatsQuery } from './stats-types.js'

async function currentWords(where: Prisma.DocumentWhereInput): Promise<number> {
  const cached = await prisma.document.aggregate({ where, _sum: { wordCount: true } })
  let total = cached._sum.wordCount ?? 0
  let cursor: string | undefined
  while (true) {
    const rows = await prisma.document.findMany({
      where: { ...where, wordCount: null }, select: { id: true, content: true },
      orderBy: { id: 'asc' }, take: 200, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    total += rows.reduce((sum, document) => sum + countDocumentWords(document.content), 0)
    if (rows.length < 200) return total
    cursor = rows[rows.length - 1]!.id
  }
}

export const statsService = {
  async get(userId: string, query: StatsQuery) {
    await requireActiveWriter(prisma, userId)
    const timeZone = normalizeTimeZone(query.timeZone)
    const projects = await prisma.project.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
    const documents = await prisma.document.findMany({
      where: { userId, project: { userId } }, select: { id: true, title: true, projectId: true, parentId: true }, orderBy: { title: 'asc' },
    })
    if (query.projectId && !projects.some((project) => project.id === query.projectId)) throw new StatsError('NOT_FOUND', 404)
    const selected = query.documentId ? documents.find((document) => document.id === query.documentId) : undefined
    if (query.documentId && (!selected || (query.projectId && selected.projectId !== query.projectId))) throw new StatsError('NOT_FOUND', 404)
    const documentIds = selected ? descendantDocumentIds(documents.filter((document) => document.projectId === selected.projectId), selected.id) : undefined
    const scope = { userId, ...(query.projectId ? { projectId: query.projectId } : {}), ...(documentIds ? { documentId: { in: documentIds } } : {}) }
    const rows = await prisma.writingStats.groupBy({
      by: ['day'], where: scope, _sum: { wordsAdded: true, activeMilliseconds: true }, orderBy: { day: 'asc' },
    })
    const totalWords = await currentWords({ userId, project: { userId }, ...(query.projectId ? { projectId: query.projectId } : {}), ...(documentIds ? { id: { in: documentIds } } : {}) })
    const history = rows.map((row) => ({ day: row.day, wordsAdded: row._sum.wordsAdded ?? 0, activeMilliseconds: row._sum.activeMilliseconds ?? 0 }))
    return { timeZone, ...calculateWritingStats(history, localDay(new Date(), timeZone), query.days ?? 365, totalWords), projects, documents }
  },
}
