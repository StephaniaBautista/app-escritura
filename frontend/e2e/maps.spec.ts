import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

const API = 'http://localhost:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL = 'test@archivum.app'

let req: APIRequestContext
let projectIds: string[]
let authState: Awaited<ReturnType<Page['context']['storageState']>>

test.describe('Mapas (M70)', () => {
  test.beforeAll(async ({ playwright }) => {
    req = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    })
    const login = await req.post(`${API}/auth/sign-in/email`, {
      data: { email: EMAIL, password: PASSWORD },
      maxRedirects: 5,
    })
    expect(login.status()).toBeLessThan(400)
    projectIds = []
    authState = await req.storageState()
  })

  test.afterAll(async () => {
    if (req) {
      for (const id of projectIds) {
        await req.delete(`${API}/projects/${id}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
      }
      await req.dispose()
    }
  })

  async function newPage(browser: Browser): Promise<Page> {
    const context = await browser.newContext({ storageState: authState })
    return context.newPage()
  }

  test('crea un mapa y muestra el lienzo con sellos', async ({ browser }) => {
    const project = await (await req.post(`${API}/projects`, { data: { name: 'E2E Mapas' } })).json()
    projectIds.push(project.id)
    const page = await newPage(browser)
    await page.goto(`/app/documents/${project.id}?tab=worlds`)
    await page.getByRole('button', { name: 'Mapa' }).click()
    await expect(page.getByText('El atlas está en blanco')).toBeVisible()
    await page.getByRole('button', { name: 'Nuevo mapa' }).click()
    await page.getByPlaceholder('Nombre del mapa...').fill('Reino del Norte')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Reino del Norte')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Castillo' })).toBeVisible()
    await page.getByRole('button', { name: 'Castillo' }).click()
    await expect(page.getByLabel('Herramientas del mapa')).toBeVisible()
  })
})
