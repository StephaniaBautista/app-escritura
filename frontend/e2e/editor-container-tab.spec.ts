import { test, expect, type APIRequestContext } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'

let ctx: { request: APIRequestContext; projectId: string; containerId: string; firstTabId: string }

test.describe('Editor: el documento (contenedor) siempre lleva a una pestaña', () => {
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
      data: { name: 'Test Editor Tabs' },
    })
    const project = await projectRes.json()

    const containerRes = await request.post(`${API}/documents`, {
      data: { title: 'Novela Tabs', type: 'document', projectId: project.id },
    })
    const container = await containerRes.json()

    const tabRes = await request.post(`${API}/documents`, {
      data: { title: 'Pestaña 1', type: 'chapter', projectId: project.id, parentId: container.id },
    })
    const tab = await tabRes.json()

    ctx = { request, projectId: project.id, containerId: container.id, firstTabId: tab.id }
  })

  test.afterAll(async () => {
    if (ctx?.request) {
      if (ctx.containerId) await ctx.request.delete(`${API}/documents/${ctx.containerId}`).catch(() => {})
      if (ctx.projectId) await ctx.request.delete(`${API}/projects/${ctx.projectId}`).catch(() => {})
      await ctx.request.dispose()
    }
  })

  test('abrir el contenedor redirige a su primera pestaña y aterriza en el editor editable', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@archivum.app')
    await page.fill('input[name="password"]', 'Test1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')

    await page.goto(`/app/editor/${ctx.projectId}/${ctx.containerId}`)

    await page.waitForURL(new RegExp(`/app/editor/${ctx.projectId}/${ctx.firstTabId}$`), { timeout: 10000 })
    await page.waitForSelector('.ProseMirror', { timeout: 10000 })

    const url = page.url()
    expect(url).not.toContain(`/app/editor/${ctx.projectId}/${ctx.containerId}`)
  })
})
