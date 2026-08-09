import { test, expect, type APIRequestContext } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'

let ctx: { request: APIRequestContext; projectId: string; documentId: string; noteId: string; posNoteId: string }

test.describe('Notes - Kebab menu edit title', () => {
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
      data: { name: 'Test Notes Kebab' },
    })
    const project = await projectRes.json()

    const docRes = await request.post(`${API}/documents`, {
      data: { title: 'Test Notes Doc', type: 'document', projectId: project.id },
    })
    const doc = await docRes.json()

    const noteRes = await request.post(`${API}/documents/${doc.id}/notes`, {
      data: { title: 'Nota original', content: 'Contenido de prueba' },
    })
    const note = await noteRes.json()

    const posNoteRes = await request.post(`${API}/documents/${doc.id}/notes`, {
      data: { title: 'Nota posicion', content: 'Contenido de posicion' },
    })
    const posNote = await posNoteRes.json()

    ctx = { request, projectId: project.id, documentId: doc.id, noteId: note.id, posNoteId: posNote.id }
  })

  test.afterAll(async () => {
    if (ctx?.request) {
      if (ctx.noteId) await ctx.request.delete(`${API}/notes/${ctx.noteId}`).catch(() => {})
      if (ctx.posNoteId) await ctx.request.delete(`${API}/notes/${ctx.posNoteId}`).catch(() => {})
      if (ctx.documentId) await ctx.request.delete(`${API}/documents/${ctx.documentId}`).catch(() => {})
      if (ctx.projectId) await ctx.request.delete(`${API}/projects/${ctx.projectId}`).catch(() => {})
      await ctx.request.dispose()
    }
  })

  test('edita el título de la nota desde el menú kebab', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@archivum.app')
    await page.fill('input[name="password"]', 'Test1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    await page.goto(`/app/documents/${ctx.projectId}?tab=notes`)
    await page.waitForSelector('select', { timeout: 10000 })

    await page.selectOption('select', ctx.documentId)
    await page.waitForSelector('text=Nota original', { timeout: 10000 })

    const postIt = page
      .getByText('Nota original', { exact: true })
      .locator('xpath=ancestor::div[contains(@style, "rotate")][1]')
    await postIt.locator('[aria-label="Más opciones"]').click()

    await page.getByRole('button', { name: 'Editar' }).click()

    const input = page.locator('input[aria-label="Editar"]')
    await expect(input).toBeVisible()
    await input.fill('Nota renombrada')
    await input.press('Enter')

    await page.waitForSelector('text=Nota renombrada', { timeout: 10000 })

    const notesRes = await ctx.request.get(`${API}/documents/${ctx.documentId}/notes`)
    const notes = await notesRes.json()
    const updated = notes.find((n: { id: string }) => n.id === ctx.noteId)
    expect(updated?.title).toBe('Nota renombrada')
  })

  test('el menú kebab se abre junto al botón (no desplazado por el rotate del post-it)', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@archivum.app')
    await page.fill('input[name="password"]', 'Test1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    await page.goto(`/app/documents/${ctx.projectId}?tab=notes`)
    await page.waitForSelector('select', { timeout: 10000 })
    await page.selectOption('select', ctx.documentId)
    await page.waitForSelector('text=Nota posicion', { timeout: 10000 })

    const postIt = page
      .getByText('Nota posicion', { exact: true })
      .locator('xpath=ancestor::div[contains(@style, "rotate")][1]')
    const kebab = postIt.locator('[aria-label="Más opciones"]')
    await kebab.click()

    const menu = page.locator('div[class*="fixed"][class*="z-50"][class*="rounded-lg"]')
    await expect(menu).toBeVisible()

    const kebabBox = await kebab.boundingBox()
    const menuBox = await menu.boundingBox()
    expect(menuBox).not.toBeNull()
    expect(kebabBox).not.toBeNull()

    const gap = (menuBox as { y: number }).y - ((kebabBox as { x: number; y: number; width: number }).y + (kebabBox as { height: number }).height)
    expect(gap).toBeGreaterThanOrEqual(0)
    expect(gap).toBeLessThan(40)

    const menuRight = (menuBox as { x: number; width: number }).x + (menuBox as { width: number }).width
    const kebabRight = (kebabBox as { x: number; width: number }).x + (kebabBox as { width: number }).width
    expect(Math.abs(menuRight - kebabRight)).toBeLessThan(8)
  })
})
