import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

const API = 'http://localhost:3001/api'
const EMAIL = 'test@archivum.app'
const PASSWORD = 'Test1234!'

let req: APIRequestContext
let projectId: string
let characterId: string
let chapterId: string
let subpageId: string
let authState: Awaited<ReturnType<Page['context']['storageState']>>

test.use({ channel: process.env.AI_E2E_BROWSER_CHANNEL })

async function newPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: authState })
  return context.newPage()
}

test.beforeAll(async ({ playwright }) => {
  req = await playwright.request.newContext({
    extraHTTPHeaders: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
  })
  const login = await req.post(`${API}/auth/sign-in/email`, { data: { email: EMAIL, password: PASSWORD }, maxRedirects: 5 })
  expect(login.status()).toBeLessThan(400)
  authState = await req.storageState()

  const project = await (await req.post(`${API}/projects`, { data: { name: `E2E Chat Personajes ${Date.now()}` } })).json()
  projectId = project.id
  const root = await (await req.post(`${API}/documents`, { data: { title: 'Manuscrito', projectId, type: 'document' } })).json()
  const chapter = await (await req.post(`${API}/documents`, { data: { title: 'Capítulo 1', projectId, type: 'chapter', parentId: root.id, order: 0 } })).json()
  chapterId = chapter.id
  const subpage = await (await req.post(`${API}/documents`, { data: { title: 'Escena extra', projectId, type: 'subpage', parentId: chapterId, order: 1 } })).json()
  subpageId = subpage.id
  const character = await (await req.post(`${API}/projects/${projectId}/characters`, { data: { name: 'Ada E2E' } })).json()
  characterId = character.id
})

test.afterAll(async () => {
  await req?.delete(`${API}/projects/${projectId}`, { headers: { 'Content-Type': 'text/plain' } }).catch(() => undefined)
  await req?.dispose()
})

test('la API expone capítulos y subpáginas y acepta una subpágina como límite de conocimiento', async () => {
  const capabilities = await (await req.get(`${API}/projects/${projectId}/ai/capabilities`)).json()

  expect(capabilities.pages).toContainEqual({ id: chapterId, title: 'Capítulo 1', type: 'chapter', parentId: expect.any(String) })
  expect(capabilities.pages).toContainEqual({ id: subpageId, title: 'Escena extra', type: 'subpage', parentId: chapterId })

  const created = await req.post(`${API}/projects/${projectId}/ai/conversations`, {
    data: { mode: 'character', title: 'E2E chat personaje', characterId, chapterId: subpageId },
  })

  expect(created.status()).toBe(201)
  expect(await created.json()).toMatchObject({ mode: 'character', characterId, chapterId: subpageId })
})

test('la ficha solo ofrece hablar con el personaje y abre su conversación', async ({ browser }) => {
  const page = await newPage(browser)
  await page.goto(`/app/documents/${projectId}?tab=characters`)
  await page.locator('.notebook-paper.rounded-xl', { hasText: 'Ada E2E' }).first().click()

  const sheet = page.getByRole('dialog')
  const talk = sheet.getByRole('link', { name: 'Hablar con tu personaje' })
  await expect(talk).toBeVisible()
  await expect(sheet.getByText('Sabe hasta')).toHaveCount(0)
  await expect(sheet.getByRole('textbox')).toHaveCount(0)

  await talk.click()

  const zone = page.getByTestId('ai-characters-dashboard')
  await expect(page).toHaveURL(new RegExp(`/app/ai-characters\\?project=${projectId}&character=${characterId}`))
  await expect(zone.getByRole('heading', { name: 'Ada E2E' })).toBeVisible()
  await expect(zone.getByRole('combobox', { name: 'Sabe hasta' })).toBeVisible()
  await expect(zone.getByLabel('Tu mensaje')).toBeEnabled()
  await page.close()
})

test('la zona muestra el elenco como tarjetas y empieza la conversación al elegir una', async ({ browser }) => {
  const page = await newPage(browser)
  await page.goto(`/app/ai-characters?project=${projectId}`)

  const zone = page.getByTestId('ai-characters-dashboard')
  await expect(zone.getByRole('heading', { name: '¿Con quién quieres hablar?' })).toBeVisible()
  await expect(zone.getByLabel('Tu mensaje')).toHaveCount(0)

  await zone.getByRole('button', { name: /Ada E2E/ }).click()

  await expect(page).toHaveURL(/character=/)
  await expect(zone.getByText('Habla con Ada E2E')).toBeVisible()
  await expect(zone.getByRole('heading', { name: 'Ada E2E' })).toBeVisible()
  await page.close()
})

test('la conversación limita el conocimiento a un capítulo o a una subpágina', async ({ browser }) => {
  const page = await newPage(browser)
  await page.goto(`/app/ai-characters?project=${projectId}&character=${characterId}`)

  const scope = page.getByRole('combobox', { name: 'Sabe hasta' })
  await expect(scope).toBeVisible()
  await expect.poll(async () => (await scope.locator('option').allTextContents()).length).toBeGreaterThan(1)

  const options = await scope.locator('option').allTextContents()
  expect(options).toContain('Capítulo · Capítulo 1')
  expect(options).toContain('\u00A0\u00A0Subpágina · Escena extra')
  await expect(page.getByText('No conoce nada que ocurra después de ese punto.')).toBeVisible()

  await scope.selectOption(subpageId)

  await expect(scope).toHaveValue(subpageId)
  await expect(page).toHaveURL(new RegExp(`scope=${subpageId}`))
  await page.close()
})
