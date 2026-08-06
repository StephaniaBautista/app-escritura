import { describe, it, expect, vi } from 'vitest'
import { maskEmail, logSecurityEvent } from '../security-log.js'

describe('maskEmail', () => {
  it('enmascara el dominio local manteniendo la primera letra', () => {
    expect(maskEmail('juan.perez@example.com')).toBe('j***@example.com')
  })

  it('enmascara emails de 1 letra de dominio local', () => {
    expect(maskEmail('a@example.com')).toBe('a***@example.com')
  })

  it('mantiene el dominio intacto', () => {
    expect(maskEmail('test@archivum.app').endsWith('@archivum.app')).toBe(true)
  })
})

describe('logSecurityEvent', () => {
  it('registra el evento sin exponer el email completo ni datos sensibles', () => {
    const warn = vi.fn()
    const request = { ip: '1.2.3.4', log: { warn } } as never

    logSecurityEvent(request as Parameters<typeof logSecurityEvent>[0], {
      event: 'auth.sign_in.failed',
      email: 'victima@example.com',
    })

    expect(warn).toHaveBeenCalledTimes(1)
    const [payload, msg] = warn.mock.calls[0]
    expect(msg).toContain('auth.sign_in.failed')
    expect(payload.email).toBe('v***@example.com')
    expect(payload.ip).toBe('1.2.3.4')
    expect(payload.security).toBe(true)
    expect(JSON.stringify(payload)).not.toContain('victima@example.com')
  })
})
