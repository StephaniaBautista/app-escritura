import { prisma } from '../src/lib/prisma.js'
import { backfillDocumentWords } from '../src/lib/document-word-backfill.js'

const args = process.argv.slice(2)
if (args.some((argument) => argument !== '--apply')) throw new Error('Usage: backfill-document-word-count.ts [--apply]')
try {
  process.stdout.write(`${JSON.stringify(await backfillDocumentWords(prisma, args.includes('--apply')))}\n`)
} finally {
  await prisma.$disconnect()
}
