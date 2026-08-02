import { test, expect, type APIRequestContext } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'

let ctx: { request: APIRequestContext; projectId: string; documentId: string }

test.describe('Auto-Versionado API', () => {
  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext({
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    })

    const loginRes = await request.post(`${API}/auth/sign-in/email`, {
      data: { email: 'test@archivum.app', password: 'Test1234!' },
      maxRedirects: 5,
    })

    const status = loginRes.status()
    if (status >= 400) {
      const body = await loginRes.text()
      throw new Error(`Login failed (${status}): ${body}`)
    }

    const projectRes = await request.post(`${API}/projects`, {
      data: { name: 'Test AutoVersion E2E' },
    })
    const project = await projectRes.json()

    const docRes = await request.post(`${API}/documents`, {
      data: { title: 'Test AutoVersion Doc', type: 'document', projectId: project.id },
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

  test('GET /settings retorna settings con defaults de autoVersion', async () => {
    const res = await ctx.request.get(`${API}/settings`)
    expect(res.ok()).toBeTruthy()
    const settings = await res.json()
    expect(settings.autoVersion).toBeDefined()
    expect(settings.autoVersion.inactivity.enabled).toBe(true)
    expect(settings.autoVersion.exit.enabled).toBe(true)
    expect(settings.autoVersion.hourly.enabled).toBe(true)
  })

  test('PATCH /settings actualiza configuración de autoVersion', async () => {
    const res = await ctx.request.patch(`${API}/settings`, {
      data: {
        autoVersion: {
          inactivity: { enabled: false, intervalMs: 600000 },
          hourly: { enabled: false, intervalMs: 7200000 },
        },
      },
    })
    expect(res.ok()).toBeTruthy()
    const settings = await res.json()
    expect(settings.autoVersion.inactivity.enabled).toBe(false)
    expect(settings.autoVersion.hourly.enabled).toBe(false)
    expect(settings.autoVersion.exit.enabled).toBe(true)

    await ctx.request.patch(`${API}/settings`, {
      data: {
        autoVersion: {
          inactivity: { enabled: true, intervalMs: 300000 },
          hourly: { enabled: true, intervalMs: 3600000 },
        },
      },
    })
  })

  test('PATCH /documents/:id/activity actualiza lastActivityAt', async () => {
    const res = await ctx.request.patch(`${API}/documents/${ctx.documentId}/activity`, {
      data: { lastActivityAt: new Date().toISOString() },
    })
    const status = res.status()
    const body = await res.text()
    expect(status, `Expected 2xx but got ${status}: ${body}`).toBeLessThan(400)
    const json = JSON.parse(body)
    expect(json.ok).toBe(true)
  })

  test('POST /auto-version/check crea versión con trigger exit si hay cambios', async () => {
    await ctx.request.patch(`${API}/documents/${ctx.documentId}`, {
      data: { content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Contenido para test exit' }] }] } },
    })

    const res = await ctx.request.post(`${API}/auto-version/check/${ctx.documentId}`, {
      data: { trigger: 'exit' },
    })
    const status = res.status()
    const body = await res.text()
    expect(status, `Expected 2xx but got ${status}: ${body}`).toBeLessThan(400)
    const json = JSON.parse(body)
    expect(json.created).toBe(true)
    expect(json.version).toBeDefined()
  })

  test('POST /auto-version/check no crea versión duplicada si no hay cambios', async () => {
    const res = await ctx.request.post(`${API}/auto-version/check/${ctx.documentId}`, {
      data: { trigger: 'exit' },
    })
    const status = res.status()
    const body = await res.text()
    expect(status, `Expected 2xx but got ${status}: ${body}`).toBeLessThan(400)
    const json = JSON.parse(body)
    expect(json.created).toBe(false)
  })

  test('POST /auto-version/check retorna error con trigger inválido', async () => {
    const res = await ctx.request.post(`${API}/auto-version/check/${ctx.documentId}`, {
      data: { trigger: 'invalid_trigger' },
    })
    expect(res.status()).toBe(400)
  })

  test('POST /auto-version/check no crea versión si trigger deshabilitado', async () => {
    await ctx.request.patch(`${API}/settings`, {
      data: { autoVersion: { inactivity: { enabled: false, intervalMs: 300000 } } },
    })

    await ctx.request.patch(`${API}/documents/${ctx.documentId}`, {
      data: { content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cambio inactivity disabled' }] }] } },
    })

    const res = await ctx.request.post(`${API}/auto-version/check/${ctx.documentId}`, {
      data: { trigger: 'inactivity' },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.created).toBe(false)

    await ctx.request.patch(`${API}/settings`, {
      data: { autoVersion: { inactivity: { enabled: true, intervalMs: 300000 } } },
    })
  })

  test('Versiones se crean sin límite', async () => {
    const beforeRes = await ctx.request.get(`${API}/documents/${ctx.documentId}/versions`)
    const before = await beforeRes.json()
    const countBefore = before.length

    for (let i = 0; i < 3; i++) {
      const patchRes = await ctx.request.patch(`${API}/documents/${ctx.documentId}`, {
        data: { content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Sin limite ${i}` }] }] } },
      })
      expect(patchRes.ok(), `PATCH failed: ${patchRes.status()}`).toBeTruthy()

      const verRes = await ctx.request.post(`${API}/documents/${ctx.documentId}/versions`, {
        data: {},
      })
      const verStatus = verRes.status()
      const verBody = await verRes.text()
      expect(verStatus, `Version create failed (${verStatus}): ${verBody}`).toBeLessThan(400)
    }

    const afterRes = await ctx.request.get(`${API}/documents/${ctx.documentId}/versions`)
    const after = await afterRes.json()
    expect(after.length).toBe(countBefore + 3)
  })
})
