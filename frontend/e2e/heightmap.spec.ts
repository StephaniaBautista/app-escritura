import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

const API = 'http://localhost:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL = 'test@archivum.app'

let req: APIRequestContext
let projectIds: string[]
let authState: Awaited<ReturnType<Page['context']['storageState']>>

test.describe('Mapa de alturas (Fase 6)', () => {
  test.beforeAll(async ({ playwright }) => {
    req = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    })
    let login = await req.post(`${API}/auth/sign-in/email`, {
      data: { email: EMAIL, password: PASSWORD },
      maxRedirects: 5,
    })
    if (login.status() >= 400) {
      login = await req.post(`${API}/auth/sign-in/email`, {
        data: { email: EMAIL, password: PASSWORD },
        maxRedirects: 5,
      })
    }
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

  async function createProject(name: string): Promise<string> {
    const project = await (await req.post(`${API}/projects`, { data: { name } })).json()
    projectIds.push(project.id)
    return project.id
  }

  async function createCharacter(projectId: string, data: Record<string, unknown>) {
    const res = await req.post(`${API}/projects/${projectId}/characters`, { data })
    expect(res.status()).toBe(201)
    return res.json()
  }

  test('foto de grupo ordenada por altura con desconocidas al final', async ({ browser }) => {
    const projectId = await createProject('E2E Mapa de alturas')
    await createCharacter(projectId, { name: 'Tall', heightCm: 195 })
    await createCharacter(projectId, { name: 'NoHeight' })
    await createCharacter(projectId, { name: 'Short', heightCm: 150 })
    const page = await newPage(browser)
    await page.goto(`/app/documents/${projectId}?tab=characters`)
    await page.getByRole('heading', { name: 'Personajes', exact: true }).waitFor()

    await expect(page.getByText('Mapa de alturas', { exact: true })).toBeVisible()

    const figures = page.getByRole('figure')
    await expect(figures).toHaveCount(3)
    await expect(figures.nth(0).getByText('150 cm', { exact: true })).toBeVisible()
    await expect(figures.nth(1).getByText('195 cm', { exact: true })).toBeVisible()
    await expect(figures.nth(2).getByText('Sin altura', { exact: true })).toBeVisible()

    await expect(figures.nth(0)).toHaveAttribute('title', 'Short')
    await expect(figures.nth(1)).toHaveAttribute('title', 'Tall')
    await expect(figures.nth(2)).toHaveAttribute('title', 'NoHeight')

    await page.close()
  })
})
