import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL_ADMIN = 'test@archivum.app'

let ctx: { req: APIRequestContext; createdQuestionIds: string[]; createdTemplateIds: string[] }
let authState: Awaited<ReturnType<Page['context']['storageState']>>

test.describe('Admin: banco de preguntas y plantillas', () => {
  test.beforeAll(async ({ playwright, browser }) => {
    const req = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    })
    const login = await req.post(`${API}/auth/sign-in/email`, {
      data: { email: EMAIL_ADMIN, password: PASSWORD },
      maxRedirects: 5,
    })
    expect(login.status()).toBeLessThan(400)
    ctx = { req, createdQuestionIds: [], createdTemplateIds: [] }

    const page = await browser.newPage()
    await page.goto('/login')
    await page.fill('input[name="email"]', EMAIL_ADMIN)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')
    authState = await page.context().storageState()
    await page.close()
  })

  test.afterAll(async () => {
    if (ctx?.req) {
      for (const id of ctx.createdTemplateIds) {
        await ctx.req.delete(`${API}/story-templates/${id}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
      }
      for (const id of ctx.createdQuestionIds) {
        await ctx.req.delete(`${API}/story-questions/${id}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
      }
      await ctx.req.dispose()
    }
  })

  async function openBank(browser: Browser): Promise<Page> {
    const context = await browser.newContext({ storageState: authState })
    const page = await context.newPage()
    await page.goto('/app/admin')
    await page.getByRole('button', { name: 'Estructura' }).click()
    await expect(page.getByRole('button', { name: 'Nueva pregunta' })).toBeVisible()
    return page
  }

  test('crea una pregunta, edita su texto y la elimina', async ({ browser }) => {
    const page = await openBank(browser)

    await page.getByRole('button', { name: 'Nueva pregunta' }).click()
    await page.getByLabel('Texto (es)').fill('¿Qué relación tiene con su mejor amigo?')
    await page.getByLabel('Texto (en)').fill('What is their relationship with their best friend?')
    await page.getByRole('button', { name: 'Crear pregunta' }).click()

    const createdText = page.getByText('¿Qué relación tiene con su mejor amigo?', { exact: true })
    await expect(createdText).toBeVisible()

    const list = await (await ctx.req.get(`${API}/story-questions`)).json()
    const question = list.find((q: { text: string }) => q.text === '¿Qué relación tiene con su mejor amigo?')
    expect(question).toBeTruthy()
    ctx.createdQuestionIds.push(question.id)

    const row = createdText.locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
    await row.getByLabel('Editar pregunta').click()
    await page.getByLabel('Texto (es)').fill('¿Qué relación tiene con su madre?')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('¿Qué relación tiene con su madre?', { exact: true })).toBeVisible()

    await row.getByLabel('Eliminar pregunta').click()
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('¿Qué relación tiene con su madre?', { exact: true })).not.toBeVisible()
    ctx.createdQuestionIds = ctx.createdQuestionIds.filter((id) => id !== question.id)
  })

  test('crea una plantilla con secciones estándar y personalizada asignando preguntas', async ({ browser }) => {
    const question = await (await ctx.req.post(`${API}/story-questions`, {
      data: { text: '¿Cuál es el conflicto central?', textEn: 'What is the central conflict?' },
    })).json()
    ctx.createdQuestionIds.push(question.id)

    const page = await openBank(browser)
    await page.getByRole('button', { name: 'Plantillas de estructura' }).click()
    await page.getByRole('button', { name: 'Nueva plantilla' }).click()
    const dialog = page.getByRole('dialog')

    await dialog.getByLabel('Nombre (es)').fill('E2E Plantilla Admin')
    await dialog.getByLabel('Nombre (en)').fill('E2E Admin Template')
    await dialog.getByLabel('Descripción (es)').fill('Plantilla de prueba admin')

    await dialog.getByLabel('Añadir sección estándar').selectOption('inicio')
    await expect(dialog.getByText('Inicio', { exact: true })).toBeVisible()

    await dialog.getByPlaceholder('Nombre de la sección personalizada...').fill('Prólogo')
    await dialog.getByRole('button', { name: 'Añadir', exact: true }).click()
    await expect(dialog.getByText('Prólogo', { exact: true })).toBeVisible()

    await dialog.locator('details').first().click()
    await dialog.getByText('¿Cuál es el conflicto central?').click()
    await dialog.locator('details').first().click()

    await dialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('E2E Plantilla Admin', { exact: true })).toBeVisible()

    const list = await (await ctx.req.get(`${API}/story-templates`)).json()
    const template = list.find((t: { name: string }) => t.name === 'E2E Plantilla Admin')
    expect(template).toBeTruthy()
    expect(template.sections).toHaveLength(2)
    expect(template.sections[0].questionIds).toContain(question.id)
    expect(template.sections[1].id.startsWith('custom-')).toBe(true)

    const row = page.getByText('E2E Plantilla Admin', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
    await row.getByLabel('Eliminar plantilla').click()
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('E2E Plantilla Admin', { exact: true })).not.toBeVisible()
    ctx.createdTemplateIds = ctx.createdTemplateIds.filter((id) => id !== template.id)
    await ctx.req.delete(`${API}/story-questions/${question.id}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
    ctx.createdQuestionIds = ctx.createdQuestionIds.filter((id) => id !== question.id)
  })
})
