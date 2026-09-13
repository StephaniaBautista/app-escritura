import { Prisma } from '@generated/client'
import { countDocumentWords } from './document-words.js'

export async function backfillDocumentWords(db: Pick<Prisma.TransactionClient, 'document'>, apply = false) {
  let scanned = 0
  let updated = 0
  let skipped = 0
  let words = 0
  let cursor: string | undefined
  while (true) {
    const documents = await db.document.findMany({
      where: { wordCount: null }, orderBy: { id: 'asc' }, take: 100,
      select: { id: true, content: true, updatedAt: true }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    for (const document of documents) {
      const wordCount = countDocumentWords(document.content)
      scanned++
      words += wordCount
      if (apply) {
        const result = await db.document.updateMany({
          where: { id: document.id, wordCount: null, updatedAt: document.updatedAt, content: { equals: document.content ?? Prisma.JsonNull } }, data: { wordCount, updatedAt: document.updatedAt },
        })
        updated += result.count
        skipped += result.count === 0 ? 1 : 0
      }
    }
    if (documents.length < 100) return { mode: apply ? 'apply' : 'dry-run', scanned, updated, skipped, words }
    cursor = documents[documents.length - 1]!.id
  }
}
