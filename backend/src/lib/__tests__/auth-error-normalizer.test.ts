import { describe, it, expect } from 'vitest'
import { normalizeAuthError } from '../auth-error-normalizer.js'

describe('normalizeAuthError', () => {
  it('no toca errores de sign-in (ya son genéricos en BetterAuth)', () => {
    const body = { message: 'Invalid email or password' }
    const result = normalizeAuthError('/api/auth/sign-in/email', 401, body)
    expect(result).toEqual({ status: 401, body })
  })

  it('reemplaza el error de sign-up con email existente por uno genérico', () => {
    const result = normalizeAuthError('/api/auth/sign-up/email', 422, { message: 'User already exists' })
    expect(result.status).toBe(422)
    expect(result.body).toEqual({
      error: {
        code: 'SIGNUP_FAILED',
        message: expect.stringContaining('No se pudo crear la cuenta'),
      },
    })
  })

  it('no oculta que el sign-up sí pudo completar (status < 400 se pasa tal cual)', () => {
    const body = { user: { id: 'u1' }, token: 't1' }
    const result = normalizeAuthError('/api/auth/sign-up/email', 200, body)
    expect(result).toEqual({ status: 200, body })
  })

  it('no afecta a otros endpoints de auth', () => {
    const body = { message: 'Token invalid' }
    const result = normalizeAuthError('/api/auth/reset-password/reset-token', 400, body)
    expect(result).toEqual({ status: 400, body })
  })
})
