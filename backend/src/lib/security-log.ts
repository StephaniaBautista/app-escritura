import type { FastifyRequest } from 'fastify'

export function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 1) return `${email.slice(0, at)}***@${email.slice(at + 1)}`
  return `${email[0]}***@${email.slice(at + 1)}`
}

export interface SecurityEventData {
  event: string
  email?: string
  userId?: string
  detail?: string
}

export function logSecurityEvent(request: FastifyRequest, data: SecurityEventData) {
  request.log.warn(
    {
      security: true,
      event: data.event,
      userId: data.userId,
      email: data.email ? maskEmail(data.email) : undefined,
      ip: request.ip,
      detail: data.detail,
    },
    `security event: ${data.event}`,
  )
}
