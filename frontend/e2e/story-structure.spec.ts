import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL = 'test@archivum.app'

let req: APIRequestContext
let projectIds: string[]
let authState: Awaited<ReturnType<Page['context']['storageState']>>

test.describe('Estructura del wizard (modo libre y guiado)', () => {
  test.beforeAll(async ({ playwright, browser }) => {
    req = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    })
    const login = await req.post(`${API}/auth/sign-in/email`, {
      data: { email: EMAIL, password: PASSWORD },
      maxRedirects: 5,
    })
    expect(login.status()).toBeLessThan(400)
    projectIds = []

    const page = await browser.newPage()
    await page.goto('/login')
    await page.fill('input[name="email"]', EMAIL)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')
    authState = await page.context().storageState()
    await page.close()
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

  test('modo libre: el wizard muestra las secciones de estructura con toggles y secciones custom', async ({ browser }) => {
    const projectId = await createProject('E2E Estructura Libre')
    const page = await newPage(browser)
    await page.goto(`/app/documents/${projectId}`)
    await page.getByRole('button', { name: 'Completar historia' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Estructura' }).click()

    await expect(dialog.getByText('¿Qué partes quieres incluir en tu estructura?')).toBeVisible()

    const inicio = dialog.getByRole('button', { name: 'Inicio', exact: true })
    await inicio.click()
    await expect(inicio).toHaveAttribute('aria-pressed', 'true')

    const cajas = dialog.getByRole('textbox')
    await cajas.nth(1).fill('La primera escena')

    await dialog.getByPlaceholder('Nombre de la sección (ej: Epílogo)...').fill('Epílogo')
    await dialog.getByRole('button', { name: 'Añadir sección' }).click()
    await expect(dialog.getByText('Epílogo', { exact: true })).toBeVisible()

    await dialog.getByRole('button', { name: 'Finalizar' }).click()
    await expect(dialog).not.toBeVisible()

    const project = await (await req.get(`${API}/projects/${projectId}`)).json()
    const structure = project.storyMeta.structure
    expect(structure.sections.map((s: { id: string }) => s.id)).toContain('inicio')
    expect(structure.sections.find((s: { id: string }) => s.id === 'inicio').content).toBe('La primera escena')
    expect(structure.sections.some((s: { id: string; title: string }) => s.title === 'Epílogo')).toBe(true)
  })

  test('modo guiado: elige plantilla y responde preguntas dentro de las secciones', async ({ browser }) => {
    const projectId = await createProject('E2E Estructura Guiada')
    const question = await (await req.post(`${API}/story-questions`, {
      data: { text: '¿Qué quiere lograr el protagonista?', textEn: 'What does the protagonist want to achieve?' },
    })).json()
    const template = await (await req.post(`${API}/story-templates`, {
      data: {
        name: 'E2E Plantilla',
        nameEn: 'E2E Template',
        description: 'Plantilla de prueba',
        descriptionEn: 'Test template',
        sections: [
          { id: 'inicio', questionIds: [question.id] },
          { id: 'final', questionIds: [] },
        ],
      },
    })).json()

    try {
      const page = await newPage(browser)
      await page.goto(`/app/documents/${projectId}?tab=structure`)
      await page.getByRole('button', { name: 'Completar historia' }).last().click()
      const dialog = page.getByRole('dialog')

      await dialog.getByRole('button', { name: 'Sí, modo guiado' }).click()
      await dialog.getByRole('button', { name: 'Siguiente' }).click()
      await dialog.getByRole('button', { name: 'Siguiente' }).click()

      await expect(dialog.getByText('¿Qué plantilla quieres usar para tu estructura?')).toBeVisible()
      await dialog.getByRole('button', { name: 'E2E Plantilla' }).click()

      await expect(dialog.getByText('Inicio', { exact: true })).toBeVisible()
      await expect(dialog.getByText('Final', { exact: true })).toBeVisible()
      await expect(dialog.getByText('¿Qué quiere lograr el protagonista?')).toBeVisible()

      const respuestas = dialog.getByRole('textbox')
      await respuestas.nth(1).fill('Salvar su aldea')

      await dialog.getByRole('button', { name: 'Siguiente' }).click()
      await dialog.getByRole('button', { name: 'Empezar a escribir' }).click()
      await expect(dialog).not.toBeVisible()

      const project = await (await req.get(`${API}/projects/${projectId}`)).json()
      const structure = project.storyMeta.structure
      expect(structure.templateId).toBe(template.id)
      expect(structure.sections).toHaveLength(2)
      expect(structure.sections[0].answers[question.id]).toBe('Salvar su aldea')
    } finally {
      await req.delete(`${API}/story-templates/${template.id}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
      await req.delete(`${API}/story-questions/${question.id}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
    }
  })
})
