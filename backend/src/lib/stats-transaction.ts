import type { Prisma } from '@generated/client'
import { isWritingConflict } from './stats-errors.js'
import { prisma } from './prisma.js'

export async function writingTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  let acquisitionRetries = 0
  for (let attempt = 0; attempt < 3; attempt++) {
    let callbackStarted = false
    try {
      return await prisma.$transaction((tx) => {
        callbackStarted = true
        return run(tx)
      }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 })
    }
    catch (error) {
      const code = error instanceof Error && 'code' in error ? error.code : undefined
      const conflict = isWritingConflict(error)
      const acquisitionTimeout = code === 'P2028' && !callbackStarted && acquisitionRetries === 0
      if ((!conflict && !acquisitionTimeout) || attempt === 2) throw error
      if (acquisitionTimeout) acquisitionRetries++
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)))
    }
  }
  throw new Error('WRITING_TRANSACTION_FAILED')
}
