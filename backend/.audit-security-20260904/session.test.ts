import { expect, it } from 'vitest'
import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'

it('S01: la cookie conserva una sesión borrada y su rol anterior', async () => {
  const db: Record<string, Record<string, unknown>[]> = { user: [], session: [], account: [], verification: [] }
  const auth = betterAuth({
    baseURL: 'http://localhost:3001',
    secret: 'synthetic-audit-secret-32-characters-minimum-only',
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true },
    user: { additionalFields: { role: { type: 'string', defaultValue: 'superadmin', input: false } } },
    session: { cookieCache: { enabled: true, maxAge: 86400 } },
  })
  const res = await auth.handler(new Request('http://localhost:3001/api/auth/sign-up/email', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3001' },
    body: JSON.stringify({ email: 'audit@example.invalid', password: 'Synthetic-Password-12345', name: 'Audit' }),
  }))
  expect(res.status).toBe(200)
  const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
  expect(db.session.length).toBe(1)
  db.session.splice(0)
  db.user[0].role = 'user'
  const cached = await auth.api.getSession({ headers: new Headers({ cookie }) })
  const fresh = await auth.api.getSession({ headers: new Headers({ cookie }), query: { disableCookieCache: true } })
  expect(cached?.user.role).toBe('superadmin')
  expect(fresh).toBeNull()
})

it('F01/F02: la configuración sin verificación deja login bloqueado y forgot-password no existe', async () => {
  const db: Record<string, Record<string, unknown>[]> = { user: [], session: [], account: [], verification: [] }
  const auth = betterAuth({ baseURL: 'http://localhost:3001', secret: 'synthetic-audit-secret-32-characters-minimum-only', database: memoryAdapter(db), emailAndPassword: { enabled: true, requireEmailVerification: true } })
  const call = (path: string) => auth.handler(new Request(`http://localhost:3001/api/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3001' }, body: JSON.stringify({ email: 'audit@example.invalid', password: 'Synthetic-Password-12345', name: 'Audit' }) }))
  const signup = await call('sign-up/email')
  expect(signup.status).toBe(200)
  expect((await signup.json()).token).toBeNull()
  const signin = await call('sign-in/email')
  expect(signin.status).toBe(403)
  expect((await signin.json()).code).toBe('EMAIL_NOT_VERIFIED')
  expect((await call('forgot-password')).status).toBe(404)
})
