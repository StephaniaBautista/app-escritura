import { test, expect, type APIRequestContext } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL_ADMIN = 'test@archivum.app'
const EMAIL_USER = `admin-blocked-${Date.now()}@archivum.app`
const FANDOM_KEEP = `E2E Keep ${Date.now()}`
const FANDOM_DUP = `E2E Kepp ${Date.now()}`

let ctx: { adminReq: APIRequestContext; userReq: APIRequestContext; createdIds: string[] }

test.describe('Admin moderación por fandom', () => {
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

    const keep = await (await adminReq.post(`${API}/story-options`, {
      data: { type: 'fandom', value: FANDOM_KEEP, label: FANDOM_KEEP },
    })).json()
    const dup = await (await adminReq.post(`${API}/story-options`, {
      data: { type: 'fandom', value: FANDOM_DUP, label: FANDOM_DUP },
    })).json()
    const ship = await (await adminReq.post(`${API}/story-options`, {
      data: { type: 'ship', value: 'E2E Moved Ship', label: 'E2E Moved Ship', fandoms: [FANDOM_DUP] },
    })).json()

    ctx = { adminReq, userReq, createdIds: [keep.id, dup.id, ship.id] }
  })

  test.afterAll(async () => {
    if (ctx?.adminReq) {
      for (const id of ctx.createdIds) {
        await ctx.adminReq.delete(`${API}/admin/story-options/${id}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
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

  test('el superadmin ve los hijos por fandom, los mueve con drag & drop y borra el fandom vacío', async ({ page }) => {
    await login(page, EMAIL_ADMIN)
    await page.goto('/app/admin')

    const heading = page.getByRole('heading', { name: /Admin panel/ })
    await expect(heading).toBeVisible()
    await expect(page.getByRole('button', { name: /Moderation/ })).toBeVisible()

    await expect(page.getByText(FANDOM_KEEP, { exact: true }).first()).toBeAttached()
    await expect(page.getByText(FANDOM_DUP, { exact: true }).first()).toBeAttached()

    await page.getByText(FANDOM_DUP, { exact: true }).first().click()
    await expect(page.getByText('E2E Moved Ship')).toBeVisible()

    const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
    await page.getByText('E2E Moved Ship').dispatchEvent('dragstart', { dataTransfer })
    await page.getByText(FANDOM_KEEP, { exact: true }).first().dispatchEvent('dragover', { dataTransfer })
    await page.getByText(FANDOM_KEEP, { exact: true }).first().dispatchEvent('drop', { dataTransfer })

    await expect
      .poll(async () => {
        const treeAfter = await (await ctx.adminReq.get(`${API}/admin/story-options/tree`)).json()
        const keepNode = treeAfter.fandoms.find((f: { value: string }) => f.value === FANDOM_KEEP)
        return keepNode?.counts.ship ?? 0
      })
      .toBe(1)

    const treeAfter = await (await ctx.adminReq.get(`${API}/admin/story-options/tree`)).json()
    const keepNode = treeAfter.fandoms.find((f: { value: string }) => f.value === FANDOM_KEEP)
    const dupNode = treeAfter.fandoms.find((f: { value: string }) => f.value === FANDOM_DUP)
    expect(dupNode.counts.ship).toBe(0)

    const delDup = await ctx.adminReq.delete(`${API}/admin/story-options/${dupNode.id}`, { headers: { 'Content-Type': 'text/plain' } })
    expect(delDup.status()).toBe(200)

    const treeFinal = await (await ctx.adminReq.get(`${API}/admin/story-options/tree`)).json()
    expect(treeFinal.fandoms.some((f: { value: string }) => f.value === FANDOM_DUP)).toBe(false)
    ctx.createdIds = ctx.createdIds.filter((id) => id !== dupNode.id)
  })

  test('no permite borrar un fandom que todavía tiene hijos (409)', async () => {
    const fandomWithChild = `E2E Blocked ${Date.now()}`
    const fandom = await (await ctx.adminReq.post(`${API}/story-options`, {
      data: { type: 'fandom', value: fandomWithChild, label: fandomWithChild },
    })).json()
    const child = await (await ctx.adminReq.post(`${API}/story-options`, {
      data: { type: 'character', value: 'E2E Blocked Character', label: 'E2E Blocked Character', fandoms: [fandomWithChild] },
    })).json()
    ctx.createdIds.push(fandom.id, child.id)

    const del = await ctx.adminReq.delete(`${API}/admin/story-options/${fandom.id}`, { headers: { 'Content-Type': 'text/plain' } })
    expect(del.status()).toBe(409)
  })

  test('el buscador filtra los fandoms por texto', async ({ page }) => {
    await login(page, EMAIL_ADMIN)
    await page.goto('/app/admin')

    const search = page.getByRole('textbox', { name: /Search fandom/ })
    await expect(search).toBeVisible()

    await search.fill(FANDOM_KEEP)
    await expect(page.getByText(FANDOM_KEEP, { exact: true }).first()).toBeAttached()

    await search.fill('zzz-no-such-fandom')
    await expect(page.getByText('No results')).toBeVisible()
  })

  test('un usuario normal no puede acceder a /app/admin', async ({ page }) => {
    await login(page, EMAIL_USER)
    await page.goto('/app/admin')

    await page.waitForURL('**/app', { timeout: 15000 })
    expect(page.url()).not.toContain('/admin')
  })

  test('las etiquetas son globales: se moderan por similitud y no viven dentro de los fandoms', async ({ page }) => {
    const now = Date.now()
    const tagA = `E2E Angst ${now}`
    const tagB = `E2E angst ${now + 1}`

    const createdA = await (await ctx.adminReq.post(`${API}/story-options`, {
      data: { type: 'tag', value: tagA, label: tagA },
    })).json()
    const createdB = await (await ctx.adminReq.post(`${API}/story-options`, {
      data: { type: 'tag', value: tagB, label: tagB },
    })).json()
    ctx.createdIds.push(createdA.id, createdB.id)

    const tree = await (await ctx.adminReq.get(`${API}/admin/story-options/tree`)).json()
    for (const fandom of tree.fandoms as { counts: { ship: number; character: number; tag?: number } }[]) {
      expect(fandom.counts).not.toHaveProperty('tag')
    }

    await login(page, EMAIL_ADMIN)
    await page.goto('/app/admin')
    await expect(page.getByRole('heading', { name: /Admin panel/ })).toBeVisible()
    await expect(page.getByText(tagA, { exact: true }).first()).toBeAttached()
    await expect(page.getByText(tagB, { exact: true }).first()).toBeAttached()

    await page.getByText(tagB, { exact: true }).first().click()
    await expect(page.getByRole('button', { name: /Delete the others/ })).toBeVisible()
    await page.getByRole('button', { name: /Delete the others/ }).click()

    await expect
      .poll(async () => {
        const groupsRes = await (await ctx.adminReq.get(`${API}/admin/story-options/groups?type=tag`)).json()
        const groups = groupsRes.groups as { value: string }[][]
        return groups.flat().some((g) => g.value === tagB)
      })
      .toBe(false)
    ctx.createdIds = ctx.createdIds.filter((id) => id !== createdB.id)
  })
})
