import type { FastifyReply } from 'fastify'

export class SubplotNotInProjectError extends Error {
  constructor() {
    super('La subtrama no pertenece al proyecto')
    this.name = 'SubplotNotInProjectError'
  }
}

export function replySubplotError(reply: FastifyReply, err: unknown) {
  if (err instanceof SubplotNotInProjectError) {
    return reply.code(400).send({ error: { code: 'SUBPLOT_NOT_IN_PROJECT', message: err.message } })
  }
  throw err
}
