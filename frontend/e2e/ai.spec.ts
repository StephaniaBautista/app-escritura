import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test'
import type { AiAnalysis, AiAnalysisInput, AiConversation, AiConversationDetail } from '../src/types/ai'

interface PhaseFixture {
  projectId: string
  chapterId: string
  secondChapterId: string
  characterId: string
  subplotId: string
  storageStatePath: string
  deniedStorageStatePath: string
  deniedProjectId: string
  historyConversationId: string
}

const API = 'http://localhost:3001/api'
const fixturePath = process.env.AI_E2E_FIXTURE ?? join(tmpdir(), 'archivum-phase9-fixture.json')
const test = base.extend<{ phase: PhaseFixture }>({
  phase: async ({}, use) => {
    const fixture: unknown = JSON.parse(await readFile(fixturePath, 'utf8'))
    const keys = ['projectId', 'chapterId', 'secondChapterId', 'characterId', 'subplotId', 'storageStatePath', 'deniedStorageStatePath', 'deniedProjectId', 'historyConversationId']
    if (!fixture || typeof fixture !== 'object' || !keys.every((key) => key in fixture && typeof Reflect.get(fixture, key) === 'string')) {
      throw new Error('AI_E2E_FIXTURE must reference an authenticated synthetic Phase 9 fixture')
    }
    await use(fixture as PhaseFixture)
  },
  storageState: async ({ phase }, use) => use(phase.storageStatePath),
})

test.use({ channel: process.env.AI_E2E_BROWSER_CHANNEL })

const aiUrl = (phase: PhaseFixture, path = '') => `${API}/projects/${phase.projectId}/ai${path}`

async function createConversation(request: APIRequestContext, phase: PhaseFixture, data: Record<string, string> = {}): Promise<AiConversation> {
  const response = await request.post(aiUrl(phase, '/conversations'), { data: { mode: 'adviser', title: `E2E AI ${randomUUID()}`, ...data } })
  expect(response.status()).toBe(201)
  return response.json()
}

async function openAssistant(page: Page, phase: PhaseFixture) {
  await page.goto(`/app/documents/${phase.projectId}?tab=ai`)
  await expect(page.getByTestId('ai-workspace').getByRole('button', { name: 'Asesor', exact: true })).toBeVisible()
}

function analysis(phase: PhaseFixture, suggestions: AiAnalysis['suggestions'], quote = 'Ariadna tiene diecisiete años.'): AiAnalysis {
  const sources = [{ id: `document:${phase.chapterId}`, type: 'document', title: 'Capítulo sintético E2E', excerpt: quote }]
  return {
    suggestions, sources,
    provider: 'balanced', model: 'mock-e2e-no-provider-call',
  }
}

async function mockAnalysis(page: Page, phase: PhaseFixture, kind: string, result: AiAnalysis) {
  const inputs: AiAnalysisInput[] = []
  await page.route(`**/api/projects/${phase.projectId}/ai/${kind}`, async (route) => {
    expect(route.request().method()).toBe('POST')
    inputs.push(route.request().postDataJSON())
    await route.fulfill({ json: result })
  })
  return inputs
}

test.describe('Fase 9: API real y respuestas generativas simuladas explícitas', () => {
  test('la API persiste conversaciones, conserva historial y rechaza escritura sin llamar al proveedor', async ({ request, phase }) => {
    const capabilities = await request.get(aiUrl(phase, '/capabilities'))
    expect(capabilities.status()).toBe(200)
    expect(await capabilities.json()).toMatchObject({ permissions: { chat: true, characters: true, suggestions: true }, canCopy: false })
    const conversation = await createConversation(request, phase)
    try {
      const detail = await request.get(aiUrl(phase, `/conversations/${conversation.id}`))
      expect(await detail.json()).toMatchObject({ id: conversation.id, messages: [] })
      const response = await request.post(aiUrl(phase, `/conversations/${conversation.id}/messages`), {
        data: { message: 'Continúa la escena', requestId: randomUUID(), locale: 'es' },
      })
      expect(response.status()).toBe(422)
      expect(await response.json()).toEqual({ error: 'AI_WRITING_BLOCKED' })
      const after = await request.get(aiUrl(phase, `/conversations/${conversation.id}`))
      expect((await after.json()).messages).toEqual([])
      const history = await request.get(aiUrl(phase, `/conversations/${phase.historyConversationId}`))
      const persisted: AiConversationDetail = await history.json()
      expect(history.status()).toBe(200)
      expect(persisted.messages.map((message) => message.role)).toEqual(['user', 'assistant'])
      expect(persisted.messages[1].sources.length).toBeGreaterThan(0)
    } finally {
      expect((await request.delete(aiUrl(phase, `/conversations/${conversation.id}`))).status()).toBe(204)
    }
  })

  test('la API exige sesión, permisos y propiedad del proyecto', async ({ playwright, phase }) => {
    const anonymous = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } })
    const denied = await playwright.request.newContext({ storageState: phase.deniedStorageStatePath })
    try {
      expect((await anonymous.get(aiUrl(phase, '/capabilities'))).status()).toBe(401)
      expect((await denied.get(aiUrl(phase, '/capabilities'))).status()).toBe(404)
      const forbidden = await denied.post(`${API}/projects/${phase.deniedProjectId}/ai/conversations`, { data: { mode: 'adviser' } })
      expect(forbidden.status()).toBe(403)
    } finally {
      await anonymous.dispose()
      await denied.dispose()
    }
  })

  test('la cuenta sintética sin permisos ve el estado de acceso restringido', async ({ browser, phase }) => {
    const context = await browser.newContext({ storageState: phase.deniedStorageStatePath })
    try {
      const page = await context.newPage()
      await page.goto(`/app/documents/${phase.deniedProjectId}?tab=ai`)
      const workspace = page.getByTestId('ai-workspace')
      await expect(workspace.getByText('Tu rol no tiene acceso a estas herramientas de IA. El administrador puede concederte los permisos.')).toBeVisible()
      await expect(workspace.getByRole('button', { name: 'Nueva conversación' })).toHaveCount(0)
      await expect(workspace.getByRole('button', { name: 'Revisar texto' })).toHaveCount(0)
    } finally {
      await context.close()
    }
  })

  test('el historial real sobrevive recarga y el texto de IA restringe copiar', async ({ page, request, phase }) => {
    const history: AiConversationDetail = await (await request.get(aiUrl(phase, `/conversations/${phase.historyConversationId}`))).json()
    await openAssistant(page, phase)
    await page.getByRole('combobox', { name: 'Historial', exact: true }).selectOption(history.id)
    const answer = page.getByRole('log').getByText(history.messages[1].content, { exact: true })
    await expect(answer).toBeVisible()
    await expect(answer.locator('..')).toHaveClass(/ai-panel__protected/)
    await page.getByTestId('ai-workspace').locator('summary').filter({ hasText: /^Fuentes/ }).click()
    await expect(page.getByText(history.messages[1].sources[0].title, { exact: true })).toBeVisible()
    await page.reload()
    await page.getByRole('combobox', { name: 'Historial', exact: true }).selectOption(history.id)
    await expect(answer).toBeVisible()
  })

  test('el chat conserva el mensaje tras un error y reintenta el mismo turno con respuesta simulada', async ({ page, request, phase }) => {
    const conversation = await createConversation(request, phase)
    const sent: { message: string; requestId: string; direction?: string }[] = []
    await page.route(`**/api/projects/${phase.projectId}/ai/conversations/*/messages`, async (route) => {
      const input: { message: string; requestId: string; direction?: string } = route.request().postDataJSON()
      sent.push(input)
      if (sent.length === 1) {
        await route.fulfill({ status: 503, json: { error: 'AI_PROVIDER_UNAVAILABLE' } })
        return
      }
      const createdAt = new Date().toISOString()
      await route.fulfill({ json: {
        conversationId: conversation.id,
        messages: [
          { id: 'mock-user', role: 'user', content: input.message, sources: [], provider: null, model: null, createdAt },
          { id: 'mock-assistant', role: 'assistant', content: 'Respuesta simulada: revisa la motivación antes del giro.', sources: analysis(phase, []).sources, provider: 'balanced', model: 'mock-e2e-no-provider-call', createdAt },
        ],
      } })
    })
    try {
      await openAssistant(page, phase)
      await page.getByRole('combobox', { name: 'Historial', exact: true }).selectOption(conversation.id)
      await page.getByRole('textbox', { name: 'Tu mensaje', exact: true }).fill('¿Qué motivación sostiene el giro?')
      await page.getByTestId('ai-workspace').locator('summary').filter({ hasText: 'Dirección de la escena (opcional)' }).click()
      await page.getByRole('textbox', { name: 'Dirección de la escena (opcional)', exact: true }).fill('Quiero que Ariadna cuestione su promesa.')
      await page.getByRole('button', { name: 'Enviar', exact: true }).click()
      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page.getByRole('textbox', { name: 'Tu mensaje', exact: true })).toHaveValue('¿Qué motivación sostiene el giro?')
      await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
      await expect(page.getByRole('log')).toContainText('Respuesta simulada: revisa la motivación antes del giro.')
      expect(sent).toHaveLength(2)
      expect(sent[0].requestId).toBe(sent[1].requestId)
      expect(sent[0].direction).toBe('Quiero que Ariadna cuestione su promesa.')
      expect(sent[1].direction).toBe(sent[0].direction)
      await expect(page.getByRole('log').locator('article')).toHaveCount(2)
      await expect(page.getByRole('alert')).toHaveCount(0)
    } finally {
      await request.delete(aiUrl(phase, `/conversations/${conversation.id}`))
    }
  })

  test('Character.AI crea conversaciones reales con historial separado por capítulo', async ({ page, request, phase }) => {
    const createdIds: string[] = []
    try {
      await openAssistant(page, phase)
      const workspace = page.getByTestId('ai-workspace')
      await workspace.getByRole('button', { name: 'Personajes', exact: true }).click()
      await expect(workspace.getByRole('button', { name: 'Nueva conversación' })).toBeDisabled()
      await workspace.getByRole('combobox', { name: 'Personaje', exact: true }).selectOption(phase.characterId)
      await workspace.getByRole('combobox', { name: 'Conocimiento hasta el capítulo', exact: true }).selectOption(phase.chapterId)
      const firstResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/ai/conversations'))
      await workspace.getByRole('button', { name: 'Nueva conversación' }).click()
      const first: AiConversation = await (await firstResponse).json()
      createdIds.push(first.id)
      expect(first).toMatchObject({ mode: 'character', characterId: phase.characterId, chapterId: phase.chapterId })
      await expect(workspace.getByRole('combobox', { name: 'Historial', exact: true })).toHaveValue(first.id)
      await workspace.getByRole('combobox', { name: 'Conocimiento hasta el capítulo', exact: true }).selectOption(phase.secondChapterId)
      await expect(workspace.getByRole('combobox', { name: 'Historial', exact: true })).toHaveValue('')
      await expect(workspace.locator(`option[value="${first.id}"]`)).toHaveCount(0)
      const secondResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/ai/conversations'))
      await workspace.getByRole('button', { name: 'Nueva conversación' }).click()
      const second: AiConversation = await (await secondResponse).json()
      createdIds.push(second.id)
      expect(second.chapterId).toBe(phase.secondChapterId)
      await workspace.getByRole('combobox', { name: 'Conocimiento hasta el capítulo', exact: true }).selectOption(phase.chapterId)
      await workspace.getByRole('combobox', { name: 'Historial', exact: true }).selectOption(first.id)
      await expect(workspace.locator(`option[value="${second.id}"]`)).toHaveCount(0)
    } finally {
      for (const id of createdIds) await request.delete(aiUrl(phase, `/conversations/${id}`))
    }
  })

  test('la revisión simulada resalta el pasaje y descarta marcas al editar el texto', async ({ page, phase }) => {
    await page.goto(`/app/editor/${phase.projectId}/${phase.chapterId}`)
    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible()
    const originalText = await editor.innerText()
    const quote = originalText.split('\n').find((line) => line.trim().length > 10)!
    expect(quote.length).toBeGreaterThan(10)
    const inputs = await mockAnalysis(page, phase, 'suggestions', analysis(phase, [{
      id: 'mock-age-check', kind: 'inconsistency', title: 'Comprobar la edad de Ariadna',
      description: 'Resultado simulado: compara esta edad con su ficha.', sourceIds: [`document:${phase.chapterId}`],
      documentId: phase.chapterId, quote,
    }], quote))
    await page.getByRole('button', { name: 'Abrir asistente' }).click()
    const workspace = page.getByTestId('ai-workspace')
    await workspace.getByRole('button', { name: 'Revisión', exact: true }).click()
    await workspace.getByRole('button', { name: 'Revisar texto' }).click()
    const mark = editor.locator('[data-ai-suggestion="mock-age-check"]')
    await expect(mark).toHaveText(quote)
    await expect(editor).toHaveText(originalText)
    await expect(mark).toHaveCSS('text-decoration-style', 'wavy')
    expect(await mark.evaluate((element) => {
      const sample = document.createElement('span')
      sample.style.color = 'var(--color-accent)'
      document.body.append(sample)
      const matches = getComputedStyle(element).textDecorationColor === getComputedStyle(sample).color
      sample.remove()
      return matches
    })).toBe(true)
    await workspace.getByRole('button', { name: 'Ver pasaje' }).click()
    await expect(editor).toBeFocused()
    await editor.press('ArrowRight')
    await editor.press('x')
    expect(await editor.innerText()).toContain(`${quote}x`)
    await expect(mark).toHaveCount(0)
    await expect(workspace.getByText('Comprobar la edad de Ariadna')).toHaveCount(0)
    const live = workspace.getByRole('checkbox', { name: 'Revisar mientras escribo' })
    await live.check()
    await expect.poll(() => inputs.length).toBe(2)
    await editor.press('y')
    await expect.poll(() => inputs.at(-1)?.draftContent).toContain(`${quote}xy`)
    await expect(workspace.getByText('Comprobar la edad de Ariadna')).toBeVisible()
    await live.uncheck()
  })

  test('la sugerencia simulada de personaje requiere aceptar y conserva los demás campos', async ({ page, request, phase }) => {
    const characterUrl = `${API}/characters/${phase.characterId}`
    const before = await (await request.get(characterUrl)).json()
    await mockAnalysis(page, phase, 'character-suggestions', analysis(phase, [{
      id: 'mock-personality', kind: 'character_completion', title: 'Personalidad observadora',
      description: 'Dato simulado con fuente del manuscrito.', sourceIds: [`document:${phase.chapterId}`],
      characterId: phase.characterId, field: 'attributes.personality', value: 'Observadora en la prueba E2E',
      documentId: phase.chapterId, quote: 'Ariadna tiene diecisiete años.',
    }]))
    await page.goto(`/app/documents/${phase.projectId}?tab=characters`)
    await page.locator('.notebook-paper.rounded-xl', { hasText: before.name }).first().click()
    await page.getByRole('button', { name: 'Extraer datos del manuscrito' }).click()
    await expect(page.getByText('Observadora en la prueba E2E', { exact: true })).toBeVisible()
    expect((await (await request.get(characterUrl)).json()).attributes).toEqual(before.attributes)
    await page.getByRole('button', { name: 'Aceptar campo' }).click()
    await expect(page.getByRole('button', { name: 'Aplicado', exact: true })).toBeDisabled()
    const after = await (await request.get(characterUrl)).json()
    expect(after.attributes).toEqual({ ...before.attributes, personality: 'Observadora en la prueba E2E' })
    expect(after.name).toBe(before.name)
  })

  test('la sugerencia simulada de subtrama solo se guarda al aceptarla', async ({ page, request, phase }) => {
    const subplotsUrl = `${API}/projects/${phase.projectId}/subplots`
    const before: { id: string }[] = await (await request.get(subplotsUrl)).json()
    await mockAnalysis(page, phase, 'subplot-suggestions', analysis(phase, [{
      id: 'mock-subplot', kind: 'subplot', title: 'La promesa del faro E2E', description: 'Propuesta simulada que complementa la motivación principal.',
      sourceIds: [`document:${phase.chapterId}`], relation: 'complementary',
    }]))
    await page.goto(`/app/documents/${phase.projectId}?tab=structure`)
    await page.getByTestId('subplots-layer-button').click()
    await page.getByRole('button', { name: 'Sugerir subtramas' }).click()
    await expect(page.getByText('La promesa del faro E2E', { exact: true })).toBeVisible()
    expect((await (await request.get(subplotsUrl)).json()).length).toBe(before.length)
    await page.getByRole('button', { name: 'Añadir a mis subtramas' }).click()
    await expect(page.getByRole('button', { name: 'Subtrama añadida' })).toBeDisabled()
    const after: { id: string; title: string; description: string }[] = await (await request.get(subplotsUrl)).json()
    expect(after).toHaveLength(before.length + 1)
    const added = after.find((subplot) => subplot.title === 'La promesa del faro E2E')!
    expect(added.description).toContain('Complementaria')
    await request.delete(`${API}/subplots/${added.id}`)
  })

  test('el asistente se adapta a móvil y tablet sin desbordar sus controles', async ({ page, phase }) => {
    await openAssistant(page, phase)
    for (const width of [320, 375, 414, 768]) {
      await page.setViewportSize({ width, height: 900 })
      const workspace = page.getByTestId('ai-workspace')
      await expect(workspace).toBeVisible()
      const bounds = await workspace.boundingBox()
      expect(bounds).not.toBeNull()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1)
      expect(await workspace.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
      await workspace.getByRole('button', { name: 'Personajes', exact: true }).click()
      await expect(workspace.getByRole('combobox', { name: 'Conocimiento hasta el capítulo', exact: true })).toBeVisible()
      await workspace.getByRole('button', { name: 'Revisión', exact: true }).click()
      await expect(workspace.getByRole('button', { name: 'Revisar texto' })).toBeVisible()
    }
  })
})
