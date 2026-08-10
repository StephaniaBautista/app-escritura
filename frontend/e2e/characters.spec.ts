import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

const API = 'http://localhost:3001/api'
const PASSWORD = 'Test1234!'
const EMAIL = 'test@archivum.app'

let req: APIRequestContext
let projectIds: string[]
let authState: Awaited<ReturnType<Page['context']['storageState']>>

test.describe('Personajes (Fase 5)', () => {
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

  async function openCharactersTab(page: Page, projectId: string) {
    await page.goto(`/app/documents/${projectId}?tab=characters`)
    await page.getByRole('heading', { name: 'Personajes', exact: true }).waitFor()
  }

  test('CRUD completo desde la pestaña Personajes', async ({ browser }) => {
    const projectId = await createProject('E2E Personajes CRUD')
    const page = await newPage(browser)
    await openCharactersTab(page, projectId)

    await expect(page.getByText('Sin personajes todavía')).toBeVisible()

    await page.getByRole('button', { name: 'Nuevo personaje' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nombre').fill('Lyra Belacqua')
    await dialog.getByLabel('Apodos').fill('Ly')
    await dialog.getByLabel('Apodos').press('Enter')
    await dialog.getByLabel('Apodos').fill('Silvertongue')
    await dialog.getByLabel('Apodos').press('Enter')
    await dialog.getByLabel('Edad').fill('17')
    await dialog.getByLabel('Género').selectOption({ label: 'Femenino' })
    await dialog.getByLabel('Altura (cm)').fill('165')
    await dialog.getByLabel('Rol', { exact: true }).selectOption({ label: 'Principal' })
    await dialog.getByLabel('Especificación del rol').fill('Protagonista')
    await dialog.getByRole('button', { name: 'Características emocionales' }).click()
    await dialog.getByLabel('Motivaciones').fill('Encontrar a su padre')
    await dialog.getByLabel('Personalidad').fill('Curiosa y valiente')
    await dialog.getByRole('button', { name: 'Guardar' }).click()

    const detail = page.getByRole('dialog')
    await expect(detail.getByText('Motivaciones')).toBeVisible()
    await expect(detail.getByText('Encontrar a su padre')).toBeVisible()
    await expect(detail.getByText('Sin vínculos familiares')).toBeVisible()
    await detail.getByLabel('Cancelar').click()

    const card = page.locator('.notebook-paper', { hasText: 'Lyra Belacqua' }).first()
    await expect(card).toBeVisible()
    await expect(card).toContainText('Principal')
    await expect(card).toContainText('17')
    await expect(card).toContainText('Ly, Silvertongue')

    await card.click()
    const detail2 = page.getByRole('dialog')
    await detail2.getByRole('button', { name: 'Editar' }).click()
    const editDialog = page.getByRole('dialog')
    await editDialog.getByLabel('Edad').fill('18')
    await editDialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('dialog').getByText('18')).toBeVisible()
    await page.getByRole('dialog').getByLabel('Cancelar').click()

    const kebab = card.locator('button[aria-label="Más opciones"]')
    await kebab.hover()
    await kebab.click()
    await page.getByRole('button', { name: 'Eliminar' }).last().click()
    await page.getByRole('button', { name: 'Eliminar' }).last().click()
    await expect(page.getByText('Sin personajes todavía')).toBeVisible()

    await page.close()
  })

  test('filtros por rol, género y altura', async ({ browser }) => {
    const projectId = await createProject('E2E Personajes Filtros')
    await createCharacter(projectId, { name: 'Arya', role: 'Principal', gender: 'Femenino', heightCm: 155 })
    await createCharacter(projectId, { name: 'Ned', role: 'Secundario', gender: 'Masculino', heightCm: 190 })
    await createCharacter(projectId, { name: 'Bran', role: 'Secundario', gender: 'Masculino', heightCm: 160 })

    const page = await newPage(browser)
    await openCharactersTab(page, projectId)

    await expect(page.getByText('Arya')).toBeVisible()
    await expect(page.getByText('Ned')).toBeVisible()

    await page.getByPlaceholder('Buscar por nombre...').fill('ned')
    await expect(page.getByText('Ned')).toBeVisible()
    await expect(page.locator('.notebook-paper', { hasText: 'Arya' })).toHaveCount(0)

    await page.getByPlaceholder('Buscar por nombre...').fill('')
    await page.getByLabel('Rol').selectOption({ label: 'Secundario' })
    await expect(page.locator('.notebook-paper', { hasText: 'Arya' })).toHaveCount(0)
    await expect(page.locator('.notebook-paper', { hasText: 'Ned' })).toHaveCount(1)

    await page.getByLabel('Altura').selectOption({ label: 'Muy alta (>185 cm)' })
    await expect(page.locator('.notebook-paper', { hasText: 'Ned' })).toHaveCount(1)
    await expect(page.locator('.notebook-paper', { hasText: 'Bran' })).toHaveCount(0)

    await page.getByLabel('Rol').selectOption('')
    await expect(page.locator('.notebook-paper', { hasText: 'Ned' })).toHaveCount(1)
    await expect(page.locator('.notebook-paper', { hasText: 'Bran' })).toHaveCount(0)

    await page.getByPlaceholder('Buscar por nombre...').fill('zzz')
    await expect(page.getByText('Ningún personaje coincide con los filtros')).toBeVisible()

    await page.close()
  })

  test('árbol genealógico: conectar padres e hijos y verlos en la ficha', async ({ browser }) => {
    const projectId = await createProject('E2E Personajes Familia')
    const ned = await createCharacter(projectId, { name: 'Ned Stark', role: 'Principal' })
    const catelyn = await createCharacter(projectId, { name: 'Catelyn Stark', role: 'Secundario' })
    await createCharacter(projectId, { name: 'Robb Stark', role: 'Secundario', parentIds: [ned.id] })

    const page = await newPage(browser)
    await openCharactersTab(page, projectId)

    const nedCard = page.locator('.notebook-paper', { hasText: 'Ned Stark' }).first()
    await nedCard.click()
    const detail = page.getByRole('dialog')
    await expect(detail.getByText('Robb Stark')).toBeVisible()
    await detail.getByLabel('Cancelar').click()

    const catelynCard = page.locator('.notebook-paper', { hasText: 'Catelyn Stark' }).first()
    await catelynCard.click()
    await page.getByRole('dialog').getByRole('button', { name: 'Editar' }).click()
    const editDialog = page.getByRole('dialog')
    await editDialog.getByLabel('Hijos').selectOption({ label: 'Robb Stark' })
    await editDialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Guardar' })).toHaveCount(0)

    const detailDialog = page.getByRole('dialog')
    await expect(detailDialog.getByText('Hijos')).toBeVisible()
    await expect(detailDialog.getByText('Robb Stark').first()).toBeVisible()

    await page.close()
  })

  test('evolución: hereda atributos y registra el motivo', async ({ browser }) => {
    const projectId = await createProject('E2E Personajes Evolución')
    await createCharacter(projectId, {
      name: 'Lyra',
      role: 'Principal',
      age: '17',
      attributes: { personality: 'Curiosa' },
    })

    const page = await newPage(browser)
    await openCharactersTab(page, projectId)

    const card = page.locator('.notebook-paper', { hasText: 'Lyra' }).first()
    await card.click()
    const detail = page.getByRole('dialog')
    await detail.getByRole('button', { name: 'Crear evolución' }).click()

    const evolveDialog = page.getByRole('dialog')
    await evolveDialog.getByLabel('Nombre').fill('Lyra la Dama')
    await evolveDialog.getByLabel('¿Qué evolucionó y por qué?').fill('Tras el segundo libro se vuelve reservada')
    await evolveDialog.getByRole('button', { name: 'Crear evolución' }).click()

    await expect(page.getByRole('dialog').getByText('Lyra la Dama')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('Evolución de Lyra')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('Tras el segundo libro se vuelve reservada')).toBeVisible()

    await page.getByRole('dialog').getByLabel('Cancelar').click()

    const evolvedCard = page.locator('.notebook-paper', { hasText: 'Lyra la Dama' }).first()
    await expect(evolvedCard).toBeVisible()
    await expect(evolvedCard).toContainText('Evolución de')

    await evolvedCard.click()
    await expect(page.getByRole('dialog').getByText('Curiosa')).toBeVisible()

    await page.close()
  })

  test('ficha editorial: cambia entre fondo predeterminado, imagen única y collage', async ({ browser }) => {
    const projectId = await createProject('E2E Ficha Personaje')
    await createCharacter(projectId, {
      name: 'Bridget of Hearts',
      role: 'Principal',
      description: 'Princesa de corazones',
      attributes: { personality: 'Carismática' },
      sheetBackgroundMode: 'default',
    })

    const page = await newPage(browser)
    await openCharactersTab(page, projectId)

    await page.locator('.notebook-paper', { hasText: 'Bridget of Hearts' }).first().click()
    await expect(page.getByTestId('character-sheet')).toHaveAttribute('data-background-mode', 'default')

    await page.getByRole('dialog').getByRole('button', { name: 'Editar' }).click()
    const editDialog = page.getByRole('dialog')
    await editDialog.getByLabel('Imagen única').check()
    await editDialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByTestId('character-sheet')).toHaveAttribute('data-background-mode', 'single')

    await page.getByRole('dialog').getByRole('button', { name: 'Editar' }).click()
    await page.getByRole('dialog').getByLabel('Collage').check()
    await expect(page.getByRole('dialog').getByText(/de 6 imágenes/)).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByTestId('character-sheet')).toHaveAttribute('data-background-mode', 'collage')

    await page.close()
  })
})
