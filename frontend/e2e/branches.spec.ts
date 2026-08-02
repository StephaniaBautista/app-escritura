import { test, expect, type APIRequestContext } from '@playwright/test'

const API = 'http://127.0.0.1:3001/api'

const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const doc = (content: unknown[]) => ({ type: 'doc', content })

let ctx: {
  request: APIRequestContext
  projectId: string
  documentId: string
  mainBranchId: string
  featureBranchId: string
  conflictBranchId: string
  conflictVersionId: string
}

test.describe('Branches API (ramas + merge)', () => {
  test.describe.configure({ mode: 'serial' })
  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()

    const loginRes = await request.post(`${API}/auth/sign-in/email`, {
      data: { email: 'test@archivum.app', password: 'Test1234!' },
      maxRedirects: 5,
    })
    if (loginRes.status() >= 400) {
      throw new Error(`Login failed (${loginRes.status()}): ${await loginRes.text()}`)
    }

    const projectRes = await request.post(`${API}/projects`, { data: { name: 'Test Branches E2E' } })
    const project = await projectRes.json()

    const docRes = await request.post(`${API}/documents`, {
      data: { title: 'Test Branches Doc', type: 'document', projectId: project.id },
    })
    const doc = await docRes.json()

    ctx = { request, projectId: project.id, documentId: doc.id } as typeof ctx
  })

  test.afterAll(async () => {
    if (ctx?.request) {
      if (ctx.documentId) await ctx.request.delete(`${API}/documents/${ctx.documentId}`).catch(() => {})
      if (ctx.projectId) await ctx.request.delete(`${API}/projects/${ctx.projectId}`).catch(() => {})
      await ctx.request.dispose()
    }
  })

  test('GET /documents/:id/branches devuelve la rama main automáticamente', async () => {
    const res = await ctx.request.get(`${API}/documents/${ctx.documentId}/branches`)
    expect(res.ok()).toBeTruthy()
    const branches = await res.json()
    expect(branches).toHaveLength(1)
    expect(branches[0].name).toBe('main')
    expect(branches[0].isMain).toBe(true)
    ctx.mainBranchId = branches[0].id
  })

  test('POST /documents/:id/branches crea rama nueva', async () => {
    const res = await ctx.request.post(`${API}/documents/${ctx.documentId}/branches`, {
      data: { name: 'feature' },
    })
    expect(res.status()).toBe(201)
    const branch = await res.json()
    expect(branch.name).toBe('feature')
    expect(branch.isMain).toBe(false)
    ctx.featureBranchId = branch.id
  })

  test('POST /branches/:id/versions crea versión en la rama', async () => {
    await ctx.request.patch(`${API}/documents/${ctx.documentId}`, {
      data: { content: doc([p('base')]) },
    })
    const mainVer = await ctx.request.post(`${API}/documents/${ctx.documentId}/versions`, { data: {} })
    expect(mainVer.status()).toBe(201)
    const mainVersion = await mainVer.json()

    const branchRes = await ctx.request.post(`${API}/documents/${ctx.documentId}/branches`, {
      data: { name: 'conflicto', sourceVersionId: mainVersion.id },
    })
    expect(branchRes.status()).toBe(201)
    ctx.conflictBranchId = (await branchRes.json()).id
    ctx.conflictVersionId = mainVersion.id
  })

  test('Merge con conflicto: devuelve 409 con la lista de conflictos', async () => {
    await ctx.request.patch(`${API}/documents/${ctx.documentId}`, {
      data: { content: doc([p('cambio branch')]) },
    })
    const branchVer = await ctx.request.post(`${API}/branches/${ctx.conflictBranchId}/versions`, { data: {} })
    expect(branchVer.status()).toBe(201)

    await ctx.request.patch(`${API}/documents/${ctx.documentId}`, {
      data: { content: doc([p('cambio main')]) },
    })
    const mainVer = await ctx.request.post(`${API}/documents/${ctx.documentId}/versions`, { data: {} })
    expect(mainVer.status()).toBe(201)

    const res = await ctx.request.post(`${API}/branches/${ctx.conflictBranchId}/merge`, {
      data: { targetBranchId: ctx.mainBranchId },
    })
    expect(res.status()).toBe(409)
    const body = await res.json()
    expect(body.merged).toBe(false)
    expect(body.conflicts).toHaveLength(1)
    expect(body.conflicts[0].index).toBe(0)
    expect(body.conflicts[0].kind).toBe('modified')
  })

  test('Merge con resolución: crea el merge commit en la rama destino', async () => {
    const res = await ctx.request.post(`${API}/branches/${ctx.conflictBranchId}/merge`, {
      data: {
        targetBranchId: ctx.mainBranchId,
        resolution: { content: doc([p('resuelto')]) },
      },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.merged).toBe(true)
    expect(body.version.branchId).toBe(ctx.mainBranchId)
    expect(body.version.version).toBe(3)
    expect(body.version.content).toEqual(doc([p('resuelto')]))
  })

  test('Merge sin conflictos (rama sin cambios): crea commit limpio', async () => {
    await ctx.request.patch(`${API}/documents/${ctx.documentId}`, {
      data: { content: doc([p('base')]) },
    })
    const featureVer = await ctx.request.post(`${API}/branches/${ctx.featureBranchId}/versions`, { data: {} })
    expect(featureVer.status()).toBe(201)

    const res = await ctx.request.post(`${API}/branches/${ctx.featureBranchId}/merge`, {
      data: { targetBranchId: ctx.mainBranchId },
    })
    const status = res.status()
    const body = await res.text()
    expect(status, `Expected 201 but got ${status}: ${body}`).toBeLessThan(400)
    const json = JSON.parse(body)
    expect(json.merged).toBe(true)
    expect(json.version.branchId).toBe(ctx.mainBranchId)
  })

  test('Merge misma rama: devuelve error', async () => {
    const res = await ctx.request.post(`${API}/branches/${ctx.mainBranchId}/merge`, {
      data: { targetBranchId: ctx.mainBranchId },
    })
    expect(res.status()).toBe(400)
  })

  test('GET /documents/:id/branches/graph devuelve nodos y aristas', async () => {
    const res = await ctx.request.get(`${API}/documents/${ctx.documentId}/branches/graph`)
    expect(res.ok()).toBeTruthy()
    const graph = await res.json()
    expect(graph.nodes.length).toBeGreaterThanOrEqual(4)
    expect(graph.branches.length).toBe(3)
    expect(graph.branches.some((b: { name: string }) => b.name === 'main')).toBe(true)
    expect(graph.edges.length).toBeGreaterThanOrEqual(1)
  })

  test('PATCH y DELETE de rama (rename + delete)', async () => {
    const renameRes = await ctx.request.patch(`${API}/branches/${ctx.featureBranchId}`, {
      data: { name: 'renombrada' },
    })
    expect(renameRes.ok()).toBeTruthy()
    expect((await renameRes.json()).name).toBe('renombrada')

    const getBefore = await ctx.request.get(`${API}/branches/${ctx.featureBranchId}`)
    const beforeBody = await getBefore.text()
    expect(getBefore.status(), `GET before delete failed (${getBefore.status()}): ${beforeBody}`).toBeLessThan(400)

    const deleteRes = await ctx.request.delete(`${API}/branches/${ctx.featureBranchId}`)
    const delStatus = deleteRes.status()
    const delBody = await deleteRes.text()
    expect(delStatus, `DELETE failed (${delStatus}): ${delBody}`).toBeLessThan(400)

    const mainDelete = await ctx.request.delete(`${API}/branches/${ctx.mainBranchId}`)
    expect(mainDelete.status()).toBe(400)
  })
})
