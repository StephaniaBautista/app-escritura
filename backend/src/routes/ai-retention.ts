import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export function registerAiRetention(app: FastifyInstance) {
  let timer: ReturnType<typeof setInterval> | undefined
  let running = false
  const cleanup = async () => {
    if (running) return
    running = true
    try {
      await prisma.aiConversation.deleteMany({ where: { expiresAt: { lte: new Date() } } })
    } catch {
      app.log.warn({ operation: 'ai-history-retention' }, 'Expired AI history cleanup will retry')
    } finally {
      running = false
    }
  }
  app.addHook('onReady', async () => {
    void cleanup()
    timer = setInterval(() => { void cleanup() }, 60 * 60 * 1000)
    timer.unref()
  })
  app.addHook('onClose', async () => { if (timer) clearInterval(timer) })
}
