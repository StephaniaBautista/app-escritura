import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

const API = 'http://localhost:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL = 'test@archivum.app'

let req: APIRequestContext
let projectIds: string[]
let authState: Awaited<ReturnType<Page['context']['storageState']>>

test.describe('Línea del tiempo (Fase 6)', () => {
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

  async function openTimeline(page: Page, projectId: string) {
    await page.goto(`/app/documents/${projectId}?tab=timeline`)
    await page.getByRole('heading', { name: 'Línea del tiempo' }).waitFor()
  }

  test('CRUD de eventos: crear, editar, reordenar y borrar', async ({ browser }) => {
    const projectId = await createProject('E2E Timeline CRUD')
    const page = await newPage(browser)
    await openTimeline(page, projectId)

    await expect(page.getByText('Sin eventos todavía')).toBeVisible()

    await page.getByRole('button', { name: 'Nuevo evento' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Título').fill('La caída de la torre')
    await dialog.getByLabel('Fecha o momento').fill('Año 3')
    await dialog.getByLabel('Descripción').fill('El castillo se derrumba')
    await dialog.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('La caída de la torre')).toBeVisible()
    await expect(page.getByText('Año 3')).toBeVisible()

    await page.getByRole('button', { name: 'Nuevo evento' }).click()
    const dialog2 = page.getByRole('dialog')
    await dialog2.getByLabel('Título').fill('El regreso del rey')
    await dialog2.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('El regreso del rey')).toBeVisible()

    const first = page.locator('[data-testid^="timeline-event-"]').first()
    await expect(first).toContainText('La caída de la torre')

    const second = page.locator('[data-testid^="timeline-event-"]').nth(1)
    await second.getByRole('button', { name: 'Subir' }).click()
    await expect(page.locator('[data-testid^="timeline-event-"]').first()).toContainText('El regreso del rey')

    await page.getByRole('button', { name: 'Editar' }).first().click()
    const editDialog = page.getByRole('dialog')
    await editDialog.getByLabel('Título').fill('El regreso del rey (editado)')
    await editDialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('El regreso del rey (editado)')).toBeVisible()

    await page.getByRole('button', { name: 'Eliminar' }).first().click()
    await page.getByRole('button', { name: 'Eliminar' }).last().click()
    await expect(page.locator('[data-testid^="timeline-event-"]')).toHaveCount(1)
    await page.getByRole('button', { name: 'Eliminar' }).first().click()
    await page.getByRole('button', { name: 'Eliminar' }).last().click()
    await expect(page.getByText('Sin eventos todavía')).toBeVisible()

    await page.close()
  })

  test('evento con personajes involucrados muestra los chips', async ({ browser }) => {
    const projectId = await createProject('E2E Timeline Chips')
    const lyra = await createCharacter(projectId, { name: 'Lyra', heightCm: 165 })
    await createCharacter(projectId, { name: 'Will', heightCm: 180 })
    const page = await newPage(browser)
    await openTimeline(page, projectId)

    await page.getByRole('button', { name: 'Nuevo evento' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Título').fill('El primer encuentro')
    await dialog.getByRole('button', { name: 'Lyra', exact: true }).click()
    await dialog.getByRole('button', { name: 'Will', exact: true }).click()
    await dialog.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('El primer encuentro')).toBeVisible()
    await expect(page.locator('span', { hasText: 'Lyra' }).first()).toBeVisible()
    await expect(page.locator('span', { hasText: 'Will' }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Eliminar' }).first().click()
    await page.getByRole('button', { name: 'Eliminar' }).last().click()

    await page.close()
  })
})
