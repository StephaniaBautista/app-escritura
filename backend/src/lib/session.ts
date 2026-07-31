import type { FastifyRequest } from 'fastify'
import { auth } from './auth.js'

export async function getSessionUser(request: FastifyRequest) {
  const session = await auth.api.getSession({
    headers: request.headers as Record<string, string>,
  })
  return session?.user ?? null
}
