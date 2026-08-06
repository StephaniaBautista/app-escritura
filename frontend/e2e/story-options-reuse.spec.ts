import { test, expect, type APIRequestContext } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'

let ctx: { request: APIRequestContext; projectId: string; shipId: string; characterId: string; tagId: string; fandomId: string | null }

test.describe('Story options reuse per account', () => {
  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    })

    const loginRes = await request.post(`${API}/auth/sign-in/email`, {
      data: { email: 'test@archivum.app', password: 'Test1234!' },
      maxRedirects: 5,
    })
    expect(loginRes.status()).toBeLessThan(400)

    const projectRes = await request.post(`${API}/projects`, {
      data: { name: 'Test Story Options Reuse' },
    })
    const project = await projectRes.json()

    const ship = await (await request.post(`${API}/story-options`, {
      data: { type: 'ship', value: 'Test Ship E2E', label: 'Test Ship E2E' },
    })).json()
    const character = await (await request.post(`${API}/story-options`, {
      data: { type: 'character', value: 'Test Character E2E', label: 'Test Character E2E' },
    })).json()
    const tag = await (await request.post(`${API}/story-options`, {
      data: { type: 'tag', value: 'Test Tag E2E', label: 'Test Tag E2E' },
    })).json()

    ctx = { request, projectId: project.id, shipId: ship.id, characterId: character.id, tagId: tag.id, fandomId: null }
  })

  test.afterAll(async () => {
    if (ctx?.request) {
      if (ctx.fandomId) await ctx.request.delete(`${API}/story-options/${ctx.fandomId}`).catch(() => {})
      if (ctx.tagId) await ctx.request.delete(`${API}/story-options/${ctx.tagId}`).catch(() => {})
      if (ctx.characterId) await ctx.request.delete(`${API}/story-options/${ctx.characterId}`).catch(() => {})
      if (ctx.shipId) await ctx.request.delete(`${API}/story-options/${ctx.shipId}`).catch(() => {})
      if (ctx.projectId) await ctx.request.delete(`${API}/projects/${ctx.projectId}`).catch(() => {})
      await ctx.request.dispose()
    }
  })

  async function login(page: import('@playwright/test').Page) {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@archivum.app')
    await page.fill('input[name="password"]', 'Test1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')
  }

  async function openWizardBasicsFanfic(page: import('@playwright/test').Page) {
    await page.goto(`/app/documents/${ctx.projectId}`)
    await page.getByRole('button', { name: 'Complete story' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /Basics/ }).click()
    await expect(dialog.getByLabel('Fanfic?')).toBeVisible()
    const fandomLoaded = page.waitForResponse(
      (r) => r.url().includes('/story-options?type=fandom') && r.status() === 200,
      { timeout: 15000 },
    )
    await dialog.getByLabel('Fanfic?').selectOption('yes')
    await fandomLoaded
    await expect(dialog.locator('select').filter({ hasText: 'e.g. Harry Potter' })).toBeVisible()
  }

  test('agrega un fandom custom: aparece chip y el dropdown muestra la opción marcada (no vacío)', async ({ page }) => {
    await login(page)
    await openWizardBasicsFanfic(page)

    const dialog = page.getByRole('dialog')
    const fandomSelect = dialog.locator('select').filter({ hasText: 'e.g. Harry Potter' })

    await dialog.getByRole('button', { name: 'Add custom option' }).last().click()
    const input = dialog.getByPlaceholder('Type the option...')
    await expect(input).toBeVisible()
    await input.fill('Test Fandom E2E')
    await input.press('Enter')

    await expect(dialog.getByText('Test Fandom E2E', { exact: true })).toBeVisible()

    const fandomIdRes = await ctx.request.get(`${API}/story-options?type=fandom`)
    const fandoms = await fandomIdRes.json()
    const created = fandoms.find((o: { value: string }) => o.value === 'Test Fandom E2E')
    ctx.fandomId = created?.id ?? null

    const checked = fandomSelect.locator('option', { hasText: '✓ Test Fandom E2E' })
    await expect(checked.first()).toBeAttached()
    await expect(checked.first()).toBeDisabled()
  })

  test('el fandom guardado aparece en el dropdown tras recargar (reutilizable)', async ({ page }) => {
    await login(page)
    await openWizardBasicsFanfic(page)

    const dialog = page.getByRole('dialog')
    const fandomSelect = dialog.locator('select').filter({ hasText: 'e.g. Harry Potter' })
    await expect(fandomSelect.locator('option', { hasText: 'Test Fandom E2E' }).first()).toBeAttached({ timeout: 15000 })
  })

  test('ships, personajes y etiquetas guardadas por cuenta aparecen en el wizard', async ({ page }) => {
    await login(page)
    await openWizardBasicsFanfic(page)

    const dialog = page.getByRole('dialog')

    await dialog.getByRole('button', { name: /Couples/ }).click()
    await expect(dialog.locator('select#story-ships option', { hasText: 'Test Ship E2E' }).first()).toBeAttached()

    await dialog.getByRole('button', { name: /Characters/ }).click()
    await expect(dialog.locator('select#story-characters option', { hasText: 'Test Character E2E' }).first()).toBeAttached()

    await dialog.getByRole('button', { name: /Tags & narrator/ }).click()
    await expect(dialog.locator('select#story-tags option', { hasText: 'Test Tag E2E' }).first()).toBeAttached()
  })
})
