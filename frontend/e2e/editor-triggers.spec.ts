import { test, expect, type APIRequestContext } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'

let ctx: { request: APIRequestContext; projectId: string; documentId: string }

test.describe('Editor - Auto-Version Triggers', () => {
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
      data: { name: 'Test Editor Triggers' },
    })
    const project = await projectRes.json()

    const docRes = await request.post(`${API}/documents`, {
      data: { title: 'Test Editor Doc', type: 'document', projectId: project.id },
    })
    const doc = await docRes.json()

    ctx = { request, projectId: project.id, documentId: doc.id }
  })

  test.afterAll(async () => {
    if (ctx?.request) {
      if (ctx.documentId) await ctx.request.delete(`${API}/documents/${ctx.documentId}`).catch(() => {})
      if (ctx.projectId) await ctx.request.delete(`${API}/projects/${ctx.projectId}`).catch(() => {})
      await ctx.request.dispose()
    }
  })

  test('useAutoVersion hook se monta sin errores de consola', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@archivum.app')
    await page.fill('input[name="password"]', 'Test1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    await page.goto(`/app/editor/${ctx.projectId}/${ctx.documentId}`)
    await page.waitForSelector('.ProseMirror', { timeout: 10000 })

    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Test')
    await page.waitForTimeout(1000)

    const hookErrors = errors.filter(
      (e) => e.includes('useAutoVersion') || e.includes('auto-version') || e.includes('settings-store')
    )
    expect(hookErrors).toHaveLength(0)
  })

  test('PATCH /activity se llama como heartbeat tras escribir', async ({ page }) => {
    const activityCalls: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/activity') && req.method() === 'PATCH') {
        activityCalls.push(req.url())
      }
    })

    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@archivum.app')
    await page.fill('input[name="password"]', 'Test1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    await page.goto(`/app/editor/${ctx.projectId}/${ctx.documentId}`)
    await page.waitForSelector('.ProseMirror', { timeout: 10000 })

    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Test heartbeat')

    await page.waitForTimeout(35000)

    expect(activityCalls.length).toBeGreaterThanOrEqual(1)
  })

  test('POST /auto-version/check funciona via API directa (exit trigger)', async () => {
    await ctx.request.patch(`${API}/documents/${ctx.documentId}`, {
      data: { content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Contenido para exit trigger' }] }] } },
    })

    const res = await ctx.request.post(`${API}/auto-version/check/${ctx.documentId}`, {
      data: { trigger: 'exit' },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.created).toBe(true)
  })
})
