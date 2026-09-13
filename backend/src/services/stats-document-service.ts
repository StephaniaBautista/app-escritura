import { countDocumentWords, visibleDocumentText } from '../lib/document-words.js'
import { localDay, normalizeTimeZone } from '../lib/stats-time.js'
import { writingTransaction } from '../lib/stats-transaction.js'
import { requireActiveWriter } from './stats-access.js'
import type { UpdateDocumentInput } from './document-service.js'

export async function updateWrittenDocument(id: string, userId: string, data: UpdateDocumentInput) {
  const timeZone = normalizeTimeZone(data.timeZone)
  const now = new Date()
  const wordCount = countDocumentWords(data.content)
  const visibleText = visibleDocumentText(data.content)
  return writingTransaction(async (tx) => {
    await requireActiveWriter(tx, userId)
    const document = await tx.document.findFirst({ where: { id, userId, project: { userId } } })
    if (!document) return null
    if (data.folderId && !await tx.folder.findFirst({ where: { id: data.folderId, projectId: document.projectId }, select: { id: true } })) return null
    if (data.parentId && !await tx.document.findFirst({ where: { id: data.parentId, projectId: document.projectId, userId }, select: { id: true } })) return null
    const oldCount = document.wordCount ?? countDocumentWords(document.content)
    const wordsAdded = visibleText === visibleDocumentText(document.content) ? 0 : Math.max(0, wordCount - oldCount)
    const updated = await tx.document.update({ where: { id }, data: {
      title: data.title, content: data.content, folderId: data.folderId, parentId: data.parentId, order: data.order, wordCount,
    } })
    if (wordsAdded > 0) {
      const day = localDay(now, timeZone)
      await tx.writingStats.upsert({
        where: { userId_documentId_day: { userId, documentId: id, day } },
        create: { userId, documentId: id, projectId: document.projectId, day, wordsAdded },
        update: { wordsAdded: { increment: wordsAdded } },
      })
    }
    return updated
  })
}
