import { test, expect, type APIRequestContext } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL_ADMIN = 'test@archivum.app'

let adminReq: APIRequestContext
let targetReq: APIRequestContext
let targetUser: { id: string; email: string }

test.describe('Admin gestión de cuentas (ban/suspender/eliminar)', () => {
  test.beforeAll(async ({ playwright }) => {
    adminReq = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    })
    const loginAdmin = await adminReq.post(`${API}/auth/sign-in/email`, {
      data: { email: EMAIL_ADMIN, password: PASSWORD },
      maxRedirects: 5,
    })
    expect(loginAdmin.status()).toBeLessThan(400)

    targetReq = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    })
    const email = `e2e-account-${Date.now()}@archivum.app`
    const signUp = await targetReq.post(`${API}/auth/sign-up/email`, {
      data: { email, password: PASSWORD, name: 'E2E Account' },
      maxRedirects: 5,
    })
    expect(signUp.status()).toBeLessThan(400)
    const me = await (await targetReq.get(`${API}/me`)).json()
    targetUser = { id: me.user.id, email }
  })

  test.afterAll(async () => {
    if (adminReq && targetUser) {
      await adminReq.delete(`${API}/admin/users/${targetUser.id}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
      await adminReq.dispose()
      await targetReq.dispose()
    }
  })

  async function loginAttempt(email: string, context: APIRequestContext) {
    return context.post(`${API}/auth/sign-in/email`, {
      data: { email, password: PASSWORD },
      maxRedirects: 5,
    })
  }

  test('banear bloquea el login y desbanear lo restaura', async () => {
    const ban = await adminReq.patch(`${API}/admin/users/${targetUser.id}/status`, {
      data: { status: 'banned' },
    })
    expect(ban.status()).toBe(200)

    const blocked = await loginAttempt(targetUser.email, targetReq)
    expect(blocked.status()).toBe(403)
    const body = await blocked.json()
    expect(body.error.code).toBe('ACCOUNT_BANNED')

    const unban = await adminReq.patch(`${API}/admin/users/${targetUser.id}/status`, {
      data: { status: 'active' },
    })
    expect(unban.status()).toBe(200)

    const restored = await loginAttempt(targetUser.email, targetReq)
    expect(restored.status()).toBeLessThan(400)
  })

  test('suspender bloquea el login hasta la fecha', async () => {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const suspend = await adminReq.patch(`${API}/admin/users/${targetUser.id}/status`, {
      data: { status: 'suspended', until },
    })
    expect(suspend.status()).toBe(200)

    const blocked = await loginAttempt(targetUser.email, targetReq)
    expect(blocked.status()).toBe(403)
    const body = await blocked.json()
    expect(body.error.code).toBe('ACCOUNT_SUSPENDED')

    const reactivate = await adminReq.patch(`${API}/admin/users/${targetUser.id}/status`, {
      data: { status: 'active' },
    })
    expect(reactivate.status()).toBe(200)
  })

  test('el admin no puede banearse a sí mismo', async () => {
    const me = await (await adminReq.get(`${API}/me`)).json()
    const ban = await adminReq.patch(`${API}/admin/users/${me.user.id}/status`, {
      data: { status: 'banned' },
    })
    expect(ban.status()).toBe(400)
    const body = await ban.json()
    expect(body.error.code).toBe('SELF_TARGET')
  })

  test('eliminar una cuenta la borra definitivamente', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    })
    const email = `e2e-delete-${Date.now()}@archivum.app`
    const signUp = await ctx.post(`${API}/auth/sign-up/email`, {
      data: { email, password: PASSWORD, name: 'To Delete' },
      maxRedirects: 5,
    })
    expect(signUp.status()).toBeLessThan(400)
    const me = await (await ctx.get(`${API}/me`)).json()

    const del = await adminReq.delete(`${API}/admin/users/${me.user.id}`, { headers: { 'Content-Type': 'text/plain' } })
    expect(del.status()).toBe(200)

    const login = await ctx.post(`${API}/auth/sign-in/email`, {
      data: { email, password: PASSWORD },
      maxRedirects: 5,
    })
    expect(login.status()).toBe(400)
    await ctx.dispose()
  })
})
