import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

const API = 'http://localhost:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL = 'test@archivum.app'

let req: APIRequestContext
let projectIds: string[]
let authState: Awaited<ReturnType<Page['context']['storageState']>>

test.describe('Diagramas (Fase 6)', () => {
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

  async function openDiagrams(page: Page, projectId: string) {
    await page.goto(`/app/documents/${projectId}?tab=diagrams`)
    await page.getByRole('heading', { name: 'Diagramas' }).waitFor()
  }

  test('genera árbol genealógico desde la familia y une a las parejas', async ({ browser }) => {
    const projectId = await createProject('E2E Diagrama Árbol')
    const lyra = await createCharacter(projectId, { name: 'Lyra' })
    const will = await createCharacter(projectId, { name: 'Will' })
    await createCharacter(projectId, { name: 'Percy', parentIds: [will.id, lyra.id] })
    const rel = await req.post(`${API}/projects/${projectId}/relationships`, {
      data: { characterAId: lyra.id, characterBId: will.id, type: 'romance' },
    })
    expect(rel.status()).toBe(201)
    const page = await newPage(browser)
    await openDiagrams(page, projectId)

    await page.getByTestId('generate-family').click()
    const treePersons = page.locator('[data-testid="family-tree-person"]')
    await expect(treePersons).toHaveCount(3)
    await expect(page.getByTestId('family-couple-bar')).toBeVisible()
    await expect(page.getByText('Lyra')).toBeVisible()
    await expect(page.getByText('Percy')).toBeVisible()

    const nodeFor = (name: string) => treePersons.filter({ has: page.getByText(name, { exact: true }) })
    const lyraBox = await nodeFor('Lyra').boundingBox()
    const willBox = await nodeFor('Will').boundingBox()
    const percyBox = await nodeFor('Percy').boundingBox()
    expect(lyraBox).not.toBeNull()
    expect(willBox).not.toBeNull()
    expect(percyBox).not.toBeNull()
    if (!lyraBox || !willBox || !percyBox) throw new Error('No se encontraron los nodos del arbol')
    expect(Math.abs(lyraBox.y - willBox.y)).toBeLessThan(2)
    expect(percyBox.y).toBeGreaterThan(Math.max(lyraBox.y, willBox.y))
    const parentCenters = [lyraBox.x + lyraBox.width / 2, willBox.x + willBox.width / 2].sort((a, b) => a - b)
    const childCenter = percyBox.x + percyBox.width / 2
    expect(childCenter).toBeGreaterThan(parentCenters[0])
    expect(childCenter).toBeLessThan(parentCenters[1])

    await page.close()
  })

  test('mapa de relaciones muestra las conexiones estructuradas y filtra por tipo', async ({ browser }) => {
    const projectId = await createProject('E2E Diagrama Relaciones')
    const lyra = await createCharacter(projectId, { name: 'Lyra' })
    const will = await createCharacter(projectId, { name: 'Will' })
    await createCharacter(projectId, { name: 'Marisa' })
    const rel = await req.post(`${API}/projects/${projectId}/relationships`, {
      data: { characterAId: lyra.id, characterBId: will.id, type: 'romance' },
    })
    expect(rel.status()).toBe(201)
    const page = await newPage(browser)
    await openDiagrams(page, projectId)

    await page.getByTestId('generate-relationships').click()
    await expect(page.locator('[data-testid="diagram-character-node"]')).toHaveCount(3)
    const romanceEdge = page.locator('.react-flow__edge-textwrapper', { hasText: 'Romance' })
    await expect(romanceEdge).toBeVisible()

    await page.getByRole('button', { name: 'Amistad' }).click()
    await expect(romanceEdge).toBeHidden()

    await page.getByRole('button', { name: 'Romance' }).click()
    await expect(romanceEdge).toBeVisible()

    await page.close()
  })

  test('diagrama manual: añade personaje y nota', async ({ browser }) => {
    const projectId = await createProject('E2E Diagrama Manual')
    await createCharacter(projectId, { name: 'Lyra' })
    await createCharacter(projectId, { name: 'Will' })
    const page = await newPage(browser)
    await openDiagrams(page, projectId)

    await page.getByTestId('new-diagram').click()
    await page.getByPlaceholder('Nombre del diagrama').fill('Mi pizarra')
    await page.getByRole('button', { name: 'Nuevo diagrama' }).last().click()

    await expect(page.getByRole('heading', { name: 'Mi pizarra' })).toBeVisible()

    await page.getByLabel('Añadir personaje').selectOption({ label: 'Lyra' })
    await expect(page.locator('[data-testid="diagram-character-node"]')).toHaveCount(1)

    await page.getByRole('button', { name: 'Añadir nota' }).click()
    await expect(page.locator('[data-testid="diagram-note-node"]')).toHaveCount(1)

    await page.close()
  })
})
