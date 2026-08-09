import { test, expect, type APIRequestContext } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL_A = 'test@archivum.app'
const EMAIL_B = `global-options-${Date.now()}@archivum.app`

let ctx: { requestA: APIRequestContext; requestB: APIRequestContext; projectA: string; createdOptionIds: string[] }

test.describe('Story options global + autocomplete', () => {
  test.beforeAll(async ({ playwright }) => {
    const requestA = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    })
    const loginA = await requestA.post(`${API}/auth/sign-in/email`, {
      data: { email: EMAIL_A, password: PASSWORD },
      maxRedirects: 5,
    })
    expect(loginA.status()).toBeLessThan(400)

    const requestB = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    })
    const signUpB = await requestB.post(`${API}/auth/sign-up/email`, {
      data: { email: EMAIL_B, password: PASSWORD, name: 'Global Options B' },
      maxRedirects: 5,
    })
    expect(signUpB.status()).toBeLessThan(400)

    const projectA = await (await requestA.post(`${API}/projects`, {
      data: { name: 'Test Global Options A' },
    })).json()

    ctx = { requestA, requestB, projectA: projectA.id, createdOptionIds: [] }
  })

  test.afterAll(async () => {
    if (ctx?.requestA) {
      for (const id of ctx.createdOptionIds) {
        await ctx.requestA.delete(`${API}/story-options/${id}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
      }
      await ctx.requestA.delete(`${API}/projects/${ctx.projectA}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
      await ctx.requestA.dispose()
      await ctx.requestB.dispose()
    }
  })

  async function login(page: import('@playwright/test').Page, email: string) {
    await page.goto('/login')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')
  }

  async function openWizardBasicsFanfic(page: import('@playwright/test').Page, projectId: string) {
    await page.goto(`/app/documents/${projectId}`)
    await page.getByRole('button', { name: 'Completar historia' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Información' }).click()
    await expect(dialog.getByLabel('Fanfic?')).toBeVisible()
    const fandomLoaded = page.waitForResponse(
      (r) => r.url().includes('/story-options?type=fandom') && r.status() === 200,
      { timeout: 15000 },
    )
    await dialog.getByLabel('Fanfic?').selectOption('yes')
    await fandomLoaded
    await expect(dialog.getByPlaceholder('ej: Harry Potter, Star Wars...')).toBeVisible()
  }

  test('cuenta A crea fandoms y ships globales desde el autocompletado del wizard', async ({ page }) => {
    await login(page, EMAIL_A)
    await openWizardBasicsFanfic(page, ctx.projectA)

    const dialog = page.getByRole('dialog')
    const fandomInput = dialog.getByPlaceholder('ej: Harry Potter, Star Wars...')
    await fandomInput.fill('E2E Global Fandom')
    await fandomInput.press('Enter')
    await expect(dialog.getByText('E2E Global Fandom', { exact: true })).toBeVisible()

    await dialog.getByRole('button', { name: /(Couples|Parejas)/ }).click()
    const shipsInput = dialog.locator('#story-ships')
    await expect(shipsInput).toBeVisible()
    await shipsInput.fill('E2E Global Ship')
    await shipsInput.press('Enter')
    await expect(dialog.getByText(/(Which fandom does|¿A qué fandom pertenece)/)).toBeVisible()
    const confirm = dialog.getByRole('button', { name: 'Confirmar' })
    await expect(confirm).toBeEnabled()
    await confirm.click()
    await expect(dialog.getByText('E2E Global Ship', { exact: true })).toBeVisible()

    const fandoms = await (await ctx.requestA.get(`${API}/story-options?type=fandom`)).json()
    const fandom = fandoms.find((o: { value: string }) => o.value === 'E2E Global Fandom')
    expect(fandom).toBeTruthy()
    ctx.createdOptionIds.push(fandom.id)

    const ships = await (await ctx.requestA.get(`${API}/story-options?type=ship`)).json()
    const ship = ships.find((o: { value: string }) => o.value === 'E2E Global Ship')
    expect(ship).toBeTruthy()
    ctx.createdOptionIds.push(ship.id)
  })

  test('la cuenta B ve el pool global (opciones creadas por A) a través de su propia sesión', async () => {
    const fandoms = await (await ctx.requestB.get(`${API}/story-options?type=fandom`)).json()
    expect(fandoms.some((o: { value: string }) => o.value === 'E2E Global Fandom')).toBe(true)

    const ships = await (await ctx.requestB.get(`${API}/story-options?type=ship`)).json()
    expect(ships.some((o: { value: string }) => o.value === 'E2E Global Ship')).toBe(true)
  })
})
