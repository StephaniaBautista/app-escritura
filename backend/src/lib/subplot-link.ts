import { prisma } from './prisma.js'
import { SubplotNotInProjectError } from './subplot-errors.js'

export { SubplotNotInProjectError, replySubplotError } from './subplot-errors.js'

export async function resolveSubplotId(
  projectId: string,
  subplotId: string | null | undefined,
): Promise<string | null | undefined> {
  if (subplotId === undefined) return undefined
  if (subplotId === null) return null
  const subplot = await prisma.subplot.findFirst({ where: { id: subplotId, projectId }, select: { id: true } })
  if (!subplot) throw new SubplotNotInProjectError()
  return subplot.id
}
