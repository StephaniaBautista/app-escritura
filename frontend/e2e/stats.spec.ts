import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test'
import type { WritingStats } from '../src/types/stats'

interface StatsFixture {
  projectId: string
  secondProjectId: string
  foreignProjectId: string
  rootDocumentId: string
  documentId: string
  editorDocumentId: string
  secondDocumentId: string
  emptyDocumentId: string
  foreignDocumentId: string
  storageStatePath: string
  foreignStorageStatePath: string
  yesterday: string
  previousDay: string
}

const API = 'http://localhost:3001/api'
const fixturePath = process.env.STATS_E2E_FIXTURE ?? join(tmpdir(), 'archivum-phase10-fixture.json')
const test = base.extend<{ fixture: StatsFixture }>({
  fixture: async ({}, use) => {
    const value: unknown = JSON.parse(await readFile(fixturePath, 'utf8'))
    const keys = ['projectId', 'secondProjectId', 'foreignProjectId', 'rootDocumentId', 'documentId', 'editorDocumentId', 'secondDocumentId', 'emptyDocumentId', 'foreignDocumentId', 'storageStatePath', 'foreignStorageStatePath', 'yesterday', 'previousDay']
    if (!value || typeof value !== 'object' || !keys.every((key) => key in value && typeof Reflect.get(value, key) === 'string')) throw new Error('STATS_E2E_FIXTURE must point to a complete synthetic phase 10 fixture')
    await use(value as StatsFixture)
  },
  storageState: async ({ fixture }, use) => use(fixture.storageStatePath),
})

test.use({ channel: process.env.STATS_E2E_BROWSER_CHANNEL, timezoneId: 'UTC' })

async function report(request: APIRequestContext, query: Record<string, string> = {}): Promise<WritingStats> {
  const response = await request.get(`${API}/stats?${new URLSearchParams({ days: '30', timeZone: 'UTC', ...query })}`)
  expect(response.status()).toBe(200)
  return response.json()
}

function content(text: string, bold = false) {
  return { type: 'doc', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text, ...(bold ? { marks: [{ type: 'bold' }] } : {}) }] : [] }] }
}

async function createDocument(request: APIRequestContext, projectId: string, text = ''): Promise<string> {
  const response = await request.post(`${API}/documents`, { data: { projectId, type: 'chapter', title: `E2E Stats ${randomUUID()}`, content: content(text) } })
  expect(response.status()).toBe(201)
  return (await response.json()).id
}

async function patch(request: APIRequestContext, id: string, text: string, bold = false) {
  const response = await request.patch(`${API}/documents/${id}`, { data: { content: content(text, bold), timeZone: 'UTC' } })
  expect(response.status()).toBe(200)
}

async function openStats(page: Page) {
  await page.goto('/app/stats')
  await expect(page.getByRole('heading', { name: 'Estadísticas de escritura', exact: true })).toBeVisible()
  await expect(page.locator('[data-metric="currentWords"]')).toBeVisible()
}

test.describe('Fase 10: estadísticas con API y persistencia reales', () => {
  test('exige sesión, rechaza datos ajenos y revalida una suspensión posterior al login', async ({ playwright, request, fixture }) => {
    const anonymous = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } })
    const suspended = await playwright.request.newContext({ storageState: fixture.foreignStorageStatePath })
    try {
      expect((await anonymous.get(`${API}/stats?days=30&timeZone=UTC`)).status()).toBe(401)
      expect((await request.get(`${API}/stats?days=30&timeZone=UTC&projectId=${fixture.foreignProjectId}`)).status()).toBe(404)
      expect((await request.get(`${API}/stats?days=30&timeZone=UTC&documentId=${fixture.foreignDocumentId}`)).status()).toBe(404)
      expect((await suspended.get(`${API}/stats?days=30&timeZone=UTC`)).status()).toBe(403)
      expect((await request.get(`${API}/stats?days=30&timeZone=Not_A_Zone`)).status()).toBe(400)
      expect((await request.get(`${API}/stats?days=29&timeZone=UTC`)).status()).toBe(400)
    } finally {
      await anonymous.dispose()
      await suspended.dispose()
    }
  })

  test('devuelve fechas completas, actividad histórica y filtros de documento con descendientes', async ({ request, fixture }) => {
    for (const days of [30, 90, 365]) {
      const stats = await report(request, { days: String(days), documentId: fixture.documentId })
      expect(stats.days).toHaveLength(days)
      expect(stats.days[0].date).toBe(stats.range.from)
      expect(stats.days.at(-1)?.date).toBe(stats.today)
      expect(new Set(stats.days.map((day) => day.date)).size).toBe(days)
      expect(stats.summary).toMatchObject({ totalWords: 2, wordsAdded: 40, activeSeconds: 600, activeDays: 1 })
      expect(stats.days.find((day) => day.date === fixture.yesterday)).toMatchObject({ wordsAdded: 40, activeSeconds: 600 })
      expect(stats.days.filter((day) => day.wordsAdded === 0)).toHaveLength(days - 1)
    }
    const account = await report(request)
    expect(account.projects.map((project) => project.id)).not.toContain(fixture.foreignProjectId)
    expect(account.documents.map((document) => document.id)).not.toContain(fixture.foreignDocumentId)
    const root = await report(request, { documentId: fixture.rootDocumentId })
    expect(root.summary.totalWords).toBeGreaterThanOrEqual(2)
    expect(root.summary.wordsAdded).toBeGreaterThanOrEqual(40)
    const second = await report(request, { projectId: fixture.secondProjectId, documentId: fixture.secondDocumentId })
    expect(second.summary).toMatchObject({ totalWords: 2, wordsAdded: 15, activeSeconds: 120 })
  })

  test('cuenta crecimiento una vez, ignora formato y conserva la actividad al borrar', async ({ request, fixture }) => {
    const before = await report(request, { projectId: fixture.projectId })
    const id = await createDocument(request, fixture.projectId, 'Aurora mira')
    try {
      expect((await report(request, { projectId: fixture.projectId })).summary.wordsAdded).toBe(before.summary.wordsAdded)
      await patch(request, id, 'Aurora mira el faro')
      await patch(request, id, 'Aurora mira el faro')
      await patch(request, id, 'Aurora mira el faro', true)
      const stats = await report(request, { documentId: id })
      expect(stats.summary).toMatchObject({ totalWords: 4, wordsAdded: 2, todayWords: 2 })
      expect((await report(request, { projectId: fixture.projectId })).summary.wordsAdded).toBe(before.summary.wordsAdded + 2)
    } finally {
      expect((await request.delete(`${API}/documents/${id}`)).status()).toBe(200)
    }
    const after = await report(request, { projectId: fixture.projectId })
    expect(after.summary.wordsAdded).toBe(before.summary.wordsAdded + 2)
    expect(after.summary.totalWords).toBe(before.summary.totalWords)
    expect((await request.get(`${API}/stats?days=30&timeZone=UTC&documentId=${id}`)).status()).toBe(404)
  })

  test('crear versiones, restaurar y duplicar no se registran como escritura nueva', async ({ request, fixture }) => {
    const id = await createDocument(request, fixture.projectId, 'El faro ilumina el puerto')
    let duplicateId: string | undefined
    try {
      const baseline = await report(request, { projectId: fixture.projectId })
      const versionResponse = await request.post(`${API}/documents/${id}/versions`, { data: {} })
      expect(versionResponse.status()).toBe(201)
      const version = await versionResponse.json()
      await patch(request, id, 'El faro')
      expect((await report(request, { documentId: id })).summary.wordsAdded).toBe(0)
      expect((await request.post(`${API}/versions/${version.id}/restore`, { data: {} })).status()).toBe(200)
      expect((await report(request, { documentId: id })).summary).toMatchObject({ totalWords: 5, wordsAdded: 0 })
      const duplicated = await request.post(`${API}/documents/${id}/duplicate`)
      expect(duplicated.status()).toBe(201)
      duplicateId = (await duplicated.json()).id
      const after = await report(request, { projectId: fixture.projectId })
      expect(after.summary.wordsAdded).toBe(baseline.summary.wordsAdded)
      expect(after.summary.totalWords).toBe(baseline.summary.totalWords + 5)
    } finally {
      if (duplicateId) await request.delete(`${API}/documents/${duplicateId}`)
      await request.delete(`${API}/documents/${id}`)
    }
  })

  test('el autosave del editor incrementa palabras y recargar mantiene el contador', async ({ page, request, fixture }) => {
    await patch(request, fixture.editorDocumentId, '')
    const before = await report(request, { documentId: fixture.editorDocumentId })
    await page.goto(`/app/editor/${fixture.projectId}/${fixture.editorDocumentId}`)
    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible()
    const saved = page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().endsWith(`/documents/${fixture.editorDocumentId}`)
      && JSON.stringify(response.request().postDataJSON()?.content ?? null).includes('Aurora encuentra el faro.'))
    const started = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/stats/activity')
      && response.request().postDataJSON()?.documentId === fixture.editorDocumentId && response.request().postDataJSON()?.activeMilliseconds === 0)
    await editor.pressSequentially('Aurora encuentra el faro.')
    expect((await saved).status()).toBe(200)
    expect((await started).status()).toBe(200)
    const written = await report(request, { documentId: fixture.editorDocumentId })
    expect(written.summary.totalWords).toBe(4)
    expect(written.summary.wordsAdded).toBe(before.summary.wordsAdded + 4)
    await page.reload()
    await expect(editor).toHaveText('Aurora encuentra el faro.')
    await expect(page.getByText(/4 palabras/)).toBeVisible()
    const reloaded = await report(request, { documentId: fixture.editorDocumentId })
    expect(reloaded.summary.wordsAdded).toBe(written.summary.wordsAdded)
    await openStats(page)
    await page.getByRole('combobox', { name: 'Historia', exact: true }).selectOption(fixture.projectId)
    await page.getByRole('combobox', { name: 'Documento', exact: true }).selectOption(fixture.editorDocumentId)
    await expect(page.locator('[data-metric="currentWords"]')).toHaveText('4')
  })

  test('la actividad exige inicio cero y los reportes repetidos no duplican tiempo', async ({ request, fixture }) => {
    const id = await createDocument(request, fixture.projectId)
    const sessionId = randomUUID()
    const activity = (activeMilliseconds: number, documentId = id) => request.post(`${API}/stats/activity`, { data: { documentId, sessionId, activeMilliseconds, timeZone: 'UTC' } })
    try {
      const missing = await activity(1000)
      expect(missing.status()).toBe(409)
      expect(await missing.json()).toEqual({ error: 'STATS_SESSION_NOT_STARTED' })
      const initial = await activity(0)
      expect(initial.status()).toBe(200)
      expect(await initial.json()).toMatchObject({ sessionId, acceptedMilliseconds: 0, creditedMilliseconds: 0, totalActiveMilliseconds: 0 })
      const update = await activity(1000)
      expect(update.status()).toBe(200)
      const credited = await update.json()
      expect(credited.creditedMilliseconds).toBeGreaterThanOrEqual(0)
      expect(credited.creditedMilliseconds).toBeLessThanOrEqual(1000)
      const repeat = await activity(1000)
      expect(repeat.status()).toBe(200)
      expect(await repeat.json()).toMatchObject({ creditedMilliseconds: 0, totalActiveMilliseconds: credited.totalActiveMilliseconds })
      expect((await activity(1000, fixture.documentId)).status()).toBe(409)
      const foreign = await request.post(`${API}/stats/activity`, { data: { documentId: fixture.foreignDocumentId, sessionId: randomUUID(), activeMilliseconds: 0, timeZone: 'UTC' } })
      expect(foreign.status()).toBe(404)
    } finally {
      await request.delete(`${API}/documents/${id}`)
    }
  })

  test('los filtros muestran fechas reales, detalles accesibles y un calendario vacío', async ({ page, fixture }) => {
    await openStats(page)
    await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('30')
    await page.getByRole('combobox', { name: 'Historia', exact: true }).selectOption(fixture.projectId)
    await page.getByRole('combobox', { name: 'Documento', exact: true }).selectOption(fixture.documentId)
    await expect(page.locator('[data-metric="wordsAdded"]')).toHaveText('40')
    await expect(page.locator('button[data-date]')).toHaveCount(30)
    const historic = page.locator(`button[data-date="${fixture.yesterday}"]`)
    await historic.focus()
    await expect(historic).toHaveAttribute('aria-pressed', 'true')
    await expect(historic).toHaveAccessibleName(/40 palabras añadidas/)
    await expect(page.getByText('40 palabras añadidas · 10 min 0 s activos')).toBeVisible()
    const encouragement = page.getByRole('complementary', { name: 'Una idea para seguir escribiendo' })
    const phrase = await encouragement.innerText()
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click()
    await expect(encouragement).toHaveText(phrase)
    await page.getByRole('combobox', { name: 'Historia', exact: true }).selectOption(fixture.secondProjectId)
    await expect(page.getByRole('combobox', { name: 'Documento', exact: true })).toHaveValue('')
    await expect(page.locator(`option[value="${fixture.documentId}"]`)).toHaveCount(0)
    await page.getByRole('combobox', { name: 'Documento', exact: true }).selectOption(fixture.emptyDocumentId)
    await expect(page.getByRole('heading', { name: 'Todavía no hay actividad en este período' })).toBeVisible()
    await expect(page.locator('[data-metric="currentWords"]')).toHaveText('0')
    await expect(page.locator('button[data-date]')).toHaveCount(30)
    expect(await page.locator('button[data-date]').evaluateAll((buttons) => buttons.every((button) => button.getAttribute('aria-label')?.includes('0 palabras añadidas')))).toBe(true)
    await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('90')
    await expect(page.locator('button[data-date]')).toHaveCount(90)
  })

  test('los controles y el calendario anual caben en móvil y tablet', async ({ page }) => {
    await openStats(page)
    await expect(page.locator('button[data-date]')).toHaveCount(365)
    for (const width of [320, 375, 414, 768]) {
      await page.setViewportSize({ width, height: 900 })
      const dashboard = page.getByTestId('stats-dashboard')
      const bounds = await dashboard.boundingBox()
      expect(bounds).not.toBeNull()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1)
      await expect(page.getByRole('combobox', { name: 'Período', exact: true })).toBeVisible()
      expect(await page.locator('.stats-calendar-scroll').evaluate((element) => element.clientWidth <= element.parentElement!.clientWidth)).toBe(true)
      expect(await dashboard.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    }
  })

  test('las escrituras y sesiones concurrentes cuentan palabras y tiempo una sola vez', async ({ request, fixture }) => {
    test.setTimeout(60_000)
    type Receipt = { creditedMilliseconds: number; totalActiveMilliseconds: number; expiresAt: string }
    const id = await createDocument(request, fixture.projectId)
    const sessionIds = [randomUUID(), randomUUID()]
    const activity = (activeMilliseconds: number) => Promise.all(sessionIds.map((sessionId) => request.post(`${API}/stats/activity`, {
      data: { documentId: id, sessionId, activeMilliseconds, timeZone: 'UTC' },
    })))
    try {
      const patches = await Promise.all([0, 1, 2].map(() => request.patch(`${API}/documents/${id}`, {
        data: { content: content('Aurora contempla el faro'), timeZone: 'UTC' },
      })))
      expect(patches.map((response) => response.status())).toEqual([200, 200, 200])
      expect((await report(request, { documentId: id })).summary).toMatchObject({ totalWords: 4, wordsAdded: 4, activeSeconds: 0 })

      const initialized = await activity(0)
      expect(initialized.map((response) => response.status())).toEqual([200, 200])
      const starts = await Promise.all(initialized.map(async (response): Promise<Receipt> => response.json()))
      for (const receipt of starts) expect(receipt).toMatchObject({ creditedMilliseconds: 0, totalActiveMilliseconds: 0 })
      const firstStartedAt = Math.min(...starts.map((receipt) => Date.parse(receipt.expiresAt) - 8 * 60 * 60 * 1000))
      expect(Number.isFinite(firstStartedAt)).toBe(true)

      const updated = await activity(60_000)
      const lastReceivedAt = Date.now()
      expect(updated.map((response) => response.status())).toEqual([200, 200])
      const receipts = await Promise.all(updated.map(async (response): Promise<Receipt> => response.json()))
      const totalCredited = receipts.reduce((sum, receipt) => sum + receipt.creditedMilliseconds, 0)
      expect(totalCredited).toBeGreaterThan(0)
      expect(totalCredited).toBeLessThanOrEqual(lastReceivedAt - firstStartedAt + 100)
      expect(receipts.reduce((sum, receipt) => sum + receipt.totalActiveMilliseconds, 0)).toBe(totalCredited)
      expect((await report(request, { documentId: id })).summary.activeSeconds).toBeCloseTo(totalCredited / 1000, 3)

      const repeated = await activity(60_000)
      expect(repeated.map((response) => response.status())).toEqual([200, 200])
      const replays = await Promise.all(repeated.map(async (response): Promise<Receipt> => response.json()))
      replays.forEach((receipt, index) => expect(receipt).toMatchObject({ creditedMilliseconds: 0, totalActiveMilliseconds: receipts[index].totalActiveMilliseconds }))
      const finalStats = await report(request, { documentId: id })
      expect(finalStats.summary.wordsAdded).toBe(4)
      expect(finalStats.summary.activeSeconds).toBeCloseTo(totalCredited / 1000, 3)
    } finally {
      expect((await request.delete(`${API}/documents/${id}`)).status()).toBe(200)
    }
  })
})
