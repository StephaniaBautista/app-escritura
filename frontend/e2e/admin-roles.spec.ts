import { test, expect, type APIRequestContext } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL_ADMIN = 'test@archivum.app'
const EMAIL_USER = `role-test-${Date.now()}@archivum.app`

let ctx: { adminReq: APIRequestContext; userId: string }

test.describe('Admin gestión de roles', () => {
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
    const signUp = await userReq.post(`${API}/auth/sign-up/email`, {
      data: { email: EMAIL_USER, password: PASSWORD, name: 'Role Test User' },
      maxRedirects: 5,
    })
    expect(signUp.status()).toBeLessThan(400)
    const me = await (await userReq.get(`${API}/me`)).json()
    ctx = { adminReq, userId: me.user.id }
    await userReq.dispose()
  })

  test.afterAll(async () => {
    if (ctx?.adminReq) {
      await ctx.adminReq.dispose()
    }
  })

  async function loginAdmin(page: import('@playwright/test').Page) {
    await page.goto('/login')
    await page.fill('input[name="email"]', EMAIL_ADMIN)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')
  }

  test('crea un rol con permisos y lo asigna a una cuenta', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/app/admin')

    await page.getByRole('button', { name: /Roles/ }).click()

    await page.getByRole('button', { name: /Create role/ }).click()
    await page.getByPlaceholder('Name (lowercase, no spaces)').fill('moderator')
    await page.getByPlaceholder('Label').fill('Moderator')
    await page.locator('button[aria-pressed="false"]', { hasText: 'Moderation' }).click()
    await page.getByRole('button', { name: 'Add', exact: true }).click()

    await expect(page.getByText('moderator')).toBeAttached()

    await page.getByRole('button', { name: /Accounts/ }).click()
    const userSelect = page.getByLabel(`Accounts ${EMAIL_USER}`)
    await expect(userSelect).toBeVisible()
    await userSelect.selectOption('moderator')
    await expect(userSelect).toHaveValue('moderator')

    const users = await (await ctx.adminReq.get(`${API}/admin/users`)).json()
    const target = users.find((u: { id: string }) => u.id === ctx.userId)
    expect(target?.role).toBe('moderator')
  })

  test('el buscador filtra los roles y las cuentas por texto', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/app/admin')

    await page.getByRole('button', { name: /Roles/ }).click()
    const roleSearch = page.getByRole('textbox', { name: /Search role/ })
    await expect(roleSearch).toBeVisible()
    await roleSearch.fill('superadmin')
    await expect(page.getByText('superadmin', { exact: true })).toBeAttached()
    await expect(page.getByText('user', { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: /Accounts/ }).click()
    const userSearch = page.getByRole('textbox', { name: /Search by name or email/ })
    await expect(userSearch).toBeVisible()
    await userSearch.fill('role-test-')
    const list = page.locator('.divide-y')
    await expect(list.getByText(EMAIL_USER, { exact: true })).toBeVisible()
    await expect(list.getByText(EMAIL_ADMIN, { exact: true })).toHaveCount(0)
  })

  test('elimina el rol y las cuentas asignadas pasan a user', async () => {
    const roles = await (await ctx.adminReq.get(`${API}/admin/roles`)).json()
    const moderator = roles.find((r: { name: string }) => r.name === 'moderator')
    expect(moderator).toBeTruthy()

    const del = await ctx.adminReq.delete(`${API}/admin/roles/${moderator.id}`, {
      headers: { 'Content-Type': 'text/plain' },
    })
    expect(del.status()).toBeLessThan(400)

    const users = await (await ctx.adminReq.get(`${API}/admin/users`)).json()
    const target = users.find((u: { id: string }) => u.id === ctx.userId)
    expect(target?.role).toBe('user')
  })
})
