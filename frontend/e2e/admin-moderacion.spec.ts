import { test, expect, type APIRequestContext } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL_ADMIN = 'test@archivum.app'
const EMAIL_USER = `admin-blocked-${Date.now()}@archivum.app`

let ctx: { adminReq: APIRequestContext; userReq: APIRequestContext; createdIds: string[] }

test.describe('Admin moderación del pool global', () => {
  test.beforeAll(async ({ playwright }) => {
    const adminReq = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    })
    const loginAdmin = await adminReq.post(`${API}/auth/sign-in/email`, {
      data: { email: EMAIL_ADMIN, password: PASSWORD },
      maxRedirects: 5,
    })
    expect(loginAdmin.status()).toBeLessThan(400)

    const userReq = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    })
    const signUpUser = await userReq.post(`${API}/auth/sign-up/email`, {
      data: { email: EMAIL_USER, password: PASSWORD, name: 'Normal User' },
      maxRedirects: 5,
    })
    expect(signUpUser.status()).toBeLessThan(400)

    const a = await (await adminReq.post(`${API}/story-options`, {
      data: { type: 'fandom', value: 'E2E Moderation Keep', label: 'E2E Moderation Keep' },
    })).json()
    const b = await (await adminReq.post(`${API}/story-options`, {
      data: { type: 'fandom', value: 'E2E Moderation Kepp', label: 'E2E Moderation Kepp' },
    })).json()

    ctx = { adminReq, userReq, createdIds: [a.id, b.id] }
  })

  test.afterAll(async () => {
    if (ctx?.adminReq) {
      for (const id of ctx.createdIds) {
        await ctx.adminReq.delete(`${API}/admin/story-options/${id}`).catch(() => {})
      }
      await ctx.adminReq.dispose()
      await ctx.userReq.dispose()
    }
  })

  async function login(page: import('@playwright/test').Page, email: string) {
    await page.goto('/login')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')
  }

  test('el superadmin ve los duplicados agrupados y elimina el resto', async ({ page }) => {
    await login(page, EMAIL_ADMIN)
    await page.goto('/app/admin')

    const heading = page.getByRole('heading', { name: /Moderation/ })
    await expect(heading).toBeVisible()

    await expect(page.getByText('E2E Moderation Keep').first()).toBeAttached()
    await expect(page.getByText('E2E Moderation Kepp').first()).toBeAttached()

    await page.getByRole('button', { name: /Delete the others/ }).click()

    await expect(page.getByText('E2E Moderation Keep').first()).toBeAttached()

    const fandoms = await (await ctx.adminReq.get(`${API}/story-options?type=fandom`)).json()
    const keeps = fandoms.filter((o: { value: string }) => o.value.toLowerCase().includes('e2e moderation keep'))
    expect(keeps).toHaveLength(1)
    ctx.createdIds = ctx.createdIds.filter((id) => keeps.some((o: { id: string }) => o.id === id))
  })

  test('un usuario normal no puede acceder a /app/admin', async ({ page }) => {
    await login(page, EMAIL_USER)
    await page.goto('/app/admin')

    await page.waitForURL('**/app', { timeout: 15000 })
    expect(page.url()).not.toContain('/admin')
  })
})
