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

  test('muestra la evolución como persona extra sin solaparla', async ({ browser }) => {
    const projectId = await createProject('E2E Evolución Árbol')
    const source = await createCharacter(projectId, { name: 'Alice', storyPoint: 'inicio' })
    const evolution = await req.post(`${API}/characters/${source.id}/evolve`, {
      data: {
        reason: 'Cambia durante la historia',
        changes: { name: 'Alicia', storyPoint: 'desarrollo' },
      },
    })
    expect(evolution.status()).toBe(201)

    const page = await newPage(browser)
    await openDiagrams(page, projectId)
    await page.getByTestId('generate-family').click()

    const treePersons = page.locator('[data-testid="family-tree-person"]')
    await expect(treePersons).toHaveCount(2)
    await expect(page.getByText('Alice', { exact: true })).toBeVisible()
    await expect(page.getByText('Alicia', { exact: true })).toBeVisible()

    const sourceBox = await treePersons.filter({ has: page.getByText('Alice', { exact: true }) }).boundingBox()
    const evolutionBox = await treePersons.filter({ has: page.getByText('Alicia', { exact: true }) }).boundingBox()
    expect(sourceBox).not.toBeNull()
    expect(evolutionBox).not.toBeNull()
    if (!sourceBox || !evolutionBox) throw new Error('No se encontraron las tarjetas de evolución')
    const separated = sourceBox.x + sourceBox.width <= evolutionBox.x
      || evolutionBox.x + evolutionBox.width <= sourceBox.x
      || sourceBox.y + sourceBox.height <= evolutionBox.y
      || evolutionBox.y + evolutionBox.height <= sourceBox.y
    expect(separated).toBe(true)

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

  test('incluye las evoluciones como personajes extra en el mapa de relaciones', async ({ browser }) => {
    const projectId = await createProject('E2E Evolución Relaciones')
    const source = await createCharacter(projectId, { name: 'Alice', storyPoint: 'inicio' })
    const evolution = await req.post(`${API}/characters/${source.id}/evolve`, {
      data: {
        reason: 'Cambia durante la historia',
        changes: { name: 'Alicia', storyPoint: 'desarrollo' },
      },
    })
    expect(evolution.status()).toBe(201)
    await createCharacter(projectId, { name: 'Kitty' })

    const page = await newPage(browser)
    await openDiagrams(page, projectId)
    await page.getByTestId('generate-relationships').click()

    await expect(page.locator('[data-testid="diagram-character-node"]')).toHaveCount(3)
    await expect(page.getByText('Alice')).toBeVisible()
    await expect(page.getByText('Alicia')).toBeVisible()

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

  test('diagrama manual: relación "Otra" con color y estilo de línea', async ({ browser }) => {
    const projectId = await createProject('E2E Diagrama Estilo')
    await createCharacter(projectId, { name: 'Lyra' })
    await createCharacter(projectId, { name: 'Will' })
    const page = await newPage(browser)
    await openDiagrams(page, projectId)

    await page.getByTestId('new-diagram').click()
    await page.getByPlaceholder('Nombre del diagrama').fill('Pizarra estilos')
    await page.getByRole('button', { name: 'Nuevo diagrama' }).last().click()
    await expect(page.getByRole('heading', { name: 'Pizarra estilos' })).toBeVisible()

    await page.getByLabel('Añadir personaje').selectOption({ label: 'Lyra' })
    await page.getByLabel('Añadir personaje').selectOption({ label: 'Will' })
    await expect(page.locator('[data-testid="diagram-character-node"]')).toHaveCount(2)

    const source = await page.locator('.react-flow__node', { hasText: 'Lyra' }).locator('.react-flow__handle.source').boundingBox()
    const target = await page.locator('.react-flow__node', { hasText: 'Will' }).locator('.react-flow__handle.target').boundingBox()
    expect(source).not.toBeNull()
    expect(target).not.toBeNull()
    if (!source || !target) throw new Error('No se encontraron los handles')
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
    await page.mouse.down()
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 })
    await page.mouse.up()

    await page.getByLabel('Tipo de relación').selectOption({ label: 'Otra' })
    await page.getByPlaceholder('Nombre de la relación (ej: rivales)...').fill('Rivales')
    await page.getByRole('button', { name: '#22c55e' }).click()
    await page.getByRole('button', { name: 'Punteada' }).click()
    await page.getByRole('button', { name: 'Guardar relación' }).click()

    const edge = page.locator('.react-flow__edge').filter({ hasText: 'Rivales' })
    await expect(edge).toBeVisible()
    const edgePath = edge.locator('.react-flow__edge-path')
    await expect(edgePath).toHaveAttribute('style', /rgb\(34, ?197, ?94\)/)
    await expect(edgePath).toHaveAttribute('style', /stroke-dasharray/)

    const interaction = edge.locator('.react-flow__edge-interaction')
    const interactionBox = await interaction.boundingBox()
    expect(interactionBox).not.toBeNull()
    if (!interactionBox) throw new Error('No se encontro el area del edge')
    await interaction.click({ position: { x: interactionBox.width / 2, y: 10 } })
    await expect(page.getByRole('heading', { name: 'Editar relación' })).toBeVisible()
    await page.getByRole('button', { name: '#ef4444' }).click()
    await page.getByRole('button', { name: 'Sólida' }).click()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(edgePath).toHaveAttribute('style', /rgb\(239, ?68, ?68\)/)
    expect(await edgePath.getAttribute('style')).not.toContain('stroke-dasharray')

    await page.close()
  })

  test('hermanas declaradas: conecta exactamente los IDs elegidos con evolución presente', async ({ browser }) => {
    const projectId = await createProject('E2E Hermanas Evolución')
    const aliciaV1 = await createCharacter(projectId, { name: 'Alicia', storyPoint: 'inicio' })
    const evolution = await req.post(`${API}/characters/${aliciaV1.id}/evolve`, {
      data: {
        reason: 'Cambia durante la historia',
        changes: { name: 'Alicia', storyPoint: 'desarrollo' },
      },
    })
    expect(evolution.status()).toBe(201)
    const aliciaV2 = await evolution.json()
    const lizzie = await createCharacter(projectId, { name: 'Lizzie Hearts' })
    const kitty = await createCharacter(projectId, { name: 'Kitty Cheshire' })
    const fagin = await createCharacter(projectId, { name: 'Fagin' })
    const rel = await req.post(`${API}/projects/${projectId}/relationships`, {
      data: {
        characterAId: lizzie.id,
        characterBId: aliciaV2.id,
        type: 'family',
        label: 'hermanas',
      },
    })
    expect(rel.status()).toBe(201)
    const partner = await req.post(`${API}/projects/${projectId}/relationships`, {
      data: {
        characterAId: lizzie.id,
        characterBId: kitty.id,
        type: 'romance',
      },
    })
    expect(partner.status()).toBe(201)
    const partner2 = await req.post(`${API}/projects/${projectId}/relationships`, {
      data: {
        characterAId: aliciaV2.id,
        characterBId: fagin.id,
        type: 'romance',
      },
    })
    expect(partner2.status()).toBe(201)

    const page = await newPage(browser)
    await openDiagrams(page, projectId)
    await page.getByTestId('generate-family').click()

    const treePersons = page.locator('[data-testid="family-tree-person"]')
    await expect(treePersons).toHaveCount(5)
    await expect(page.getByText('Alicia')).toHaveCount(2)
    await expect(page.getByText('Lizzie Hearts')).toBeVisible()
    await expect(page.getByText('Kitty Cheshire')).toBeVisible()
    await expect(page.getByText('Fagin')).toBeVisible()

    const siblingBar = page.locator('[data-testid="family-sibling-bar"]')
    await expect(siblingBar).toHaveCount(1)
    const expectedMemberIds = [aliciaV2.id, lizzie.id].sort().join(',')
    await expect(siblingBar).toHaveAttribute('data-member-ids', expectedMemberIds)

    const coupleBars = page.locator('[data-testid="family-couple-bar"]')
    await expect(coupleBars).toHaveCount(2)
    const siblingLineY = await siblingBar.locator('line').nth(2).evaluate((element) =>
      element.getBoundingClientRect().y)
    for (let index = 0; index < await coupleBars.count(); index += 1) {
      const coupleLineY = await coupleBars.nth(index).locator('line').nth(2).evaluate((element) =>
        element.getBoundingClientRect().y)
      expect(siblingLineY - coupleLineY).toBeGreaterThanOrEqual(10)
    }

    const treeContainer = page.getByTestId('family-tree')
    const treeContainerBox = await treeContainer.boundingBox()
    expect(treeContainerBox).not.toBeNull()
    if (!treeContainerBox) throw new Error('No se encontró el contenedor del árbol')
    const siblingBottomY = await siblingBar.evaluate((element) => {
      const lines = element.querySelectorAll('line')
      return lines[lines.length - 1].getBoundingClientRect().bottom
    })
    expect(siblingBottomY).toBeLessThanOrEqual(treeContainerBox.y + treeContainerBox.height)

    const boxes = await treePersons.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
      }),
    )
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const separated = boxes[i].right <= boxes[j].left
          || boxes[j].right <= boxes[i].left
          || boxes[i].bottom <= boxes[j].top
          || boxes[j].bottom <= boxes[i].top
        expect(separated).toBe(true)
      }
    }

    await page.getByLabel('Volver a diagramas').click()
    await page.getByTestId('generate-relationships').click()
    await expect(page.locator('[data-testid="diagram-character-node"]')).toHaveCount(5)
    await expect(page.getByText('Alicia')).toHaveCount(2)
    await expect(page.getByText('Lizzie Hearts')).toBeVisible()

    await page.close()
  })

  test('primos automáticos, progenitor desconocido y hover que resalta la línea', async ({ browser }) => {
    const projectId = await createProject('E2E Primos y Hover')
    const abuela = await createCharacter(projectId, { name: 'Abuela' })
    const hijaA = await createCharacter(projectId, { name: 'Hija A', parentIds: [abuela.id] })
    const hijoB = await createCharacter(projectId, { name: 'Hijo B', parentIds: [abuela.id] })
    const nietaA = await createCharacter(projectId, { name: 'Nieta A', parentIds: [hijaA.id] })
    const nietoB = await createCharacter(projectId, { name: 'Nieto B', parentIds: [hijoB.id] })
    const padreSolo = await createCharacter(projectId, { name: 'Padre Solo' })
    await createCharacter(projectId, { name: 'Hija de Padre Solo', parentIds: [padreSolo.id] })
    const rel = await req.post(`${API}/projects/${projectId}/relationships`, {
      data: {
        characterAId: hijaA.id,
        characterBId: hijoB.id,
        type: 'family',
        label: 'hermanos',
      },
    })
    expect(rel.status()).toBe(201)

    const page = await newPage(browser)
    await openDiagrams(page, projectId)
    await page.getByTestId('generate-family').click()

    const cousinBar = page.locator('[data-testid="family-cousin-bar"]')
    await expect(cousinBar).toHaveCount(1)
    const expectedCousinIds = [nietaA.id, nietoB.id].sort().join(',')
    await expect(cousinBar).toHaveAttribute('data-member-ids', expectedCousinIds)

    await expect(page.locator('[data-testid="unknown-parent-card"]').first()).toBeVisible()

    const treePaths = page.locator('[data-testid="family-tree"] svg path')
    await page.mouse.move(0, 0)
    const before = await treePaths.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('opacity')))
    expect(before.every((opacity) => opacity === null || opacity === '1'),
      `before: ${JSON.stringify(before)}`).toBe(true)

    await page.locator('[data-testid="family-tree-person"]')
      .filter({ has: page.getByText('Padre Solo', { exact: true }) })
      .hover()
    await expect.poll(async () => {
      const opacities = await treePaths.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('opacity')))
      return opacities.some((opacity) => opacity === '1')
        && opacities.some((opacity) => opacity === '0.12')
    }, { timeout: 5000 }).toBe(true)

    await page.mouse.move(0, 0)
    await expect.poll(async () => {
      const opacities = await treePaths.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('opacity')))
      return opacities.every((opacity) => opacity === null || opacity === '1')
    }, { timeout: 5000 }).toBe(true)

    await page.close()
  })
})
