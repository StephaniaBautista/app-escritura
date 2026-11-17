import 'dotenv/config'
import { completeWizard } from './src/services/ai-wizard.js'
import { prisma } from './src/lib/prisma.js'

async function main() {
  const projectId = 'cmu03ijoc0002x5t1us7oq9a6'
  const userId = (await prisma.project.findFirst({ where: { id: projectId }, select: { userId: true } }))!.userId
  for (const stage of ['description', 'tags', 'structure', 'basics'] as const) {
    const started = Date.now()
    try {
      const result = await completeWizard(projectId, userId, { stage, locale: 'es' })
      console.log(stage, 'OK', Date.now() - started, 'ms', {
        suggestions: result.suggestions.length,
        metaKeys: Object.keys(result.meta),
        descLen: result.description?.length ?? 0,
        sources: result.sources.length,
      })
    } catch (error) {
      const e = error as { code?: string; statusCode?: number }
      console.log(stage, 'FAIL', Date.now() - started, 'ms', e.code, e.statusCode)
    }
  }
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
