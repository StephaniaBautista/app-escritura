import { test, expect, type APIRequestContext } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL_ADMIN = 'test@archivum.app'

let ctx: { req: APIRequestContext; projectId: string; createdIds: string[] }

test.describe('Opciones por fandom', () => {
  test.beforeAll(async ({ playwright }) => {
    const req = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    })
    const login = await req.post(`${API}/auth/sign-in/email`, {
      data: { email: EMAIL_ADMIN, password: PASSWORD },
      maxRedirects: 5,
    })
    expect(login.status()).toBeLessThan(400)

    const project = await (await req.post(`${API}/projects`, {
      data: { name: 'Test Fandom E2E' },
    })).json()

    const fandomA = await (await req.post(`${API}/story-options`, {
      data: { type: 'fandom', value: 'E2E Fandom A', label: 'E2E Fandom A' },
    })).json()
    const fandomB = await (await req.post(`${API}/story-options`, {
      data: { type: 'fandom', value: 'E2E Fandom B', label: 'E2E Fandom B' },
    })).json()
    const shipA = await (await req.post(`${API}/story-options`, {
      data: { type: 'ship', value: 'E2E Ship A', label: 'E2E Ship A', fandoms: ['E2E Fandom A'] },
    })).json()
    const shipB = await (await req.post(`${API}/story-options`, {
      data: { type: 'ship', value: 'E2E Ship B', label: 'E2E Ship B', fandoms: ['E2E Fandom B'] },
    })).json()

    ctx = { req, projectId: project.id, createdIds: [fandomA.id, fandomB.id, shipA.id, shipB.id] }
  })

  test.afterAll(async () => {
    if (ctx?.req) {
      for (const id of ctx.createdIds) {
        await ctx.req.delete(`${API}/story-options/${id}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
      }
      await ctx.req.delete(`${API}/projects/${ctx.projectId}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
      await ctx.req.dispose()
    }
  })

  async function loginAdmin(page: import('@playwright/test').Page) {
    await page.goto('/login')
    await page.fill('input[name="email"]', EMAIL_ADMIN)
    await page.fill('input[name="password"]', PASSWORD)
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
    await expect(dialog.getByPlaceholder('e.g. Harry Potter, Star Wars...')).toBeVisible()
  }

  async function addFandom(dialog: import('@playwright/test').Locator, value: string) {
    const input = dialog.getByPlaceholder('e.g. Harry Potter, Star Wars...')
    await input.fill(value)
    await input.press('Enter')
    await expect(dialog.getByText(value, { exact: true })).toBeVisible()
  }

  test('filtra ships por fandom y pregunta el fandom al crear uno nuevo', async ({ page }) => {
    await loginAdmin(page)
    await openWizardBasicsFanfic(page)

    const dialog = page.getByRole('dialog')
    await addFandom(dialog, 'E2E Fandom A')

    await dialog.getByRole('button', { name: /Couples/ }).click()
    const shipsInput = dialog.locator('#story-ships')
    await expect(shipsInput).toBeVisible()

    await shipsInput.fill('E2E Ship')
    await expect(dialog.getByText('E2E Ship A')).toBeVisible()
    await expect(dialog.getByText('E2E Ship B')).not.toBeVisible()

    await shipsInput.fill('E2E New Ship A')
    await shipsInput.press('Enter')
    await expect(dialog.getByText(/Which fandom does/)).toBeVisible()
    const confirm = dialog.getByRole('button', { name: 'Confirm' })
    await expect(confirm).toBeEnabled()
    await confirm.click()
    await expect(dialog.getByText('E2E New Ship A', { exact: true })).toBeVisible()

    const shipsForA = await (await ctx.req.get(`${API}/story-options?type=ship&fandoms=${encodeURIComponent('E2E Fandom A')}`)).json()
    const created = shipsForA.find((o: { value: string }) => o.value === 'E2E New Ship A')
    expect(created).toBeTruthy()
    expect(created.fandoms).toEqual(['E2E Fandom A'])
    ctx.createdIds.push(created.id)

    const shipsForB = await (await ctx.req.get(`${API}/story-options?type=ship&fandoms=${encodeURIComponent('E2E Fandom B')}`)).json()
    expect(shipsForB.some((o: { value: string }) => o.value === 'E2E New Ship A')).toBe(false)
  })

  test('crossover: con dos fandoms seleccionados se sugieren los ships de ambos', async ({ page }) => {
    await loginAdmin(page)
    await openWizardBasicsFanfic(page)

    const dialog = page.getByRole('dialog')
    await addFandom(dialog, 'E2E Fandom A')
    await addFandom(dialog, 'E2E Fandom B')

    await dialog.getByRole('button', { name: /Couples/ }).click()
    const shipsInput = dialog.locator('#story-ships')
    await expect(shipsInput).toBeVisible()

    await shipsInput.fill('E2E Ship')
    await expect(dialog.getByText('E2E Ship A')).toBeVisible()
    await expect(dialog.getByText('E2E Ship B')).toBeVisible()
  })
})
