import { randomUUID } from 'node:crypto'
import { open, readFile, type FileHandle } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { PrismaClient } from '@generated/client'
import { existingFile, FixtureError, removeFiles, saveManifest, saveState, temporaryPath } from './ai-fixture.js'

const name = 'Phase 10 synthetic verification'
const api = 'http://localhost:3001/api'
const markerPattern = /^phase10-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const idKeys = ['userId', 'foreignUserId', 'projectId', 'secondProjectId', 'foreignProjectId', 'rootDocumentId', 'documentId', 'editorDocumentId', 'secondDocumentId', 'emptyDocumentId', 'foreignDocumentId'] as const
type IdKey = typeof idKeys[number]
export interface StatsFixture extends Partial<Record<IdKey, string>> {
  version: 1
  marker: string
  storageStatePath: string
  foreignStorageStatePath: string
  yesterday: string
  previousDay: string
}

export function parseStatsFixture(value: unknown, path: string): StatsFixture {
  if (!value || typeof value !== 'object') throw new FixtureError('Invalid stats fixture manifest.')
  const data = value as Record<string, unknown>
  if (data.version !== 1 || typeof data.marker !== 'string' || !markerPattern.test(data.marker)) throw new FixtureError('Invalid phase 10 marker.')
  for (const key of idKeys) if (data[key] !== undefined && (typeof data[key] !== 'string' || !data[key])) throw new FixtureError('Invalid tracked identifier.')
  for (const key of ['yesterday', 'previousDay']) if (typeof data[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data[key])) throw new FixtureError('Invalid fixture date.')
  if (data.storageStatePath !== join(dirname(path), `archivum-${data.marker}-owner-auth.json`)
    || data.foreignStorageStatePath !== join(dirname(path), `archivum-${data.marker}-foreign-auth.json`)) throw new FixtureError('Authentication paths do not belong to this fixture.')
  if (data.userId && data.userId === data.foreignUserId) throw new FixtureError('Fixture accounts must be distinct.')
  return data as unknown as StatsFixture
}

async function signup(fixture: StatsFixture, kind: 'owner' | 'foreign', file: FileHandle): Promise<string> {
  const response = await fetch(`${api}/auth/sign-up/email`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({ name, email: `${fixture.marker}-${kind}@example.invalid`, password: `Phase10!${randomUUID()}` }),
    signal: AbortSignal.timeout(20_000),
  })
  const data: unknown = await response.json()
  if (!response.ok || !data || typeof data !== 'object' || !('user' in data) || !data.user || typeof data.user !== 'object'
    || !('id' in data.user) || typeof data.user.id !== 'string') throw new FixtureError(`Signup failed with HTTP ${response.status}.`)
  if (kind === 'owner') fixture.userId = data.user.id
  else fixture.foreignUserId = data.user.id
  await saveManifest(file, fixture)
  await saveState(kind === 'owner' ? fixture.storageStatePath : fixture.foreignStorageStatePath, response.headers)
  return response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ')
}

async function create(fixture: StatsFixture, file: FileHandle, cookie: string, endpoint: string, key: IdKey, body: object) {
  const response = await fetch(`${api}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000) })
  const data: unknown = await response.json()
  if (!response.ok || !data || typeof data !== 'object' || !('id' in data) || typeof data.id !== 'string') throw new FixtureError(`Synthetic API creation failed with HTTP ${response.status}.`)
  fixture[key] = data.id
  await saveManifest(file, fixture)
  return data.id
}

export async function verifyStatsOwners(prisma: Pick<PrismaClient, 'user' | 'project'>, fixture: StatsFixture) {
  for (const [id, kind] of [[fixture.userId, 'owner'], [fixture.foreignUserId, 'foreign']]) {
    if (!id) continue
    const user = await prisma.user.findUnique({ where: { id }, select: { email: true, name: true } })
    if (user && (user.email !== `${fixture.marker}-${kind}@example.invalid` || user.name !== name)) throw new FixtureError('Synthetic account identity does not match; no data changed.')
  }
  for (const [id, userId] of [[fixture.projectId, fixture.userId], [fixture.secondProjectId, fixture.userId], [fixture.foreignProjectId, fixture.foreignUserId]]) {
    if (!id) continue
    const project = await prisma.project.findUnique({ where: { id }, select: { userId: true } })
    if (project && project.userId !== userId) throw new FixtureError('Project ownership changed; no data changed.')
  }
}

export async function cleanupStats(prisma: PrismaClient, fixture: StatsFixture) {
  await prisma.$transaction(async (transaction) => {
    await verifyStatsOwners(transaction, fixture)
    for (const [id, kind] of [[fixture.userId, 'owner'], [fixture.foreignUserId, 'foreign']]) {
      if (id) await transaction.user.deleteMany({ where: { id, email: `${fixture.marker}-${kind}@example.invalid`, name } })
    }
  }, { maxWait: 10_000, timeout: 30_000 })
}

const content = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] })

async function seed(fixture: StatsFixture, prisma: PrismaClient, file: FileHandle) {
  const ownerCookie = await signup(fixture, 'owner', file)
  const foreignCookie = await signup(fixture, 'foreign', file)
  const projectId = await create(fixture, file, ownerCookie, '/projects', 'projectId', { name: 'Faro · estadísticas sintéticas' })
  const secondProjectId = await create(fixture, file, ownerCookie, '/projects', 'secondProjectId', { name: 'Isla · estadísticas sintéticas' })
  const foreignProjectId = await create(fixture, file, foreignCookie, '/projects', 'foreignProjectId', { name: 'Proyecto ajeno · estadísticas sintéticas' })
  const rootDocumentId = await create(fixture, file, ownerCookie, '/documents', 'rootDocumentId', { projectId, title: 'Manuscrito del faro', type: 'document', content: content('') })
  const documentId = await create(fixture, file, ownerCookie, '/documents', 'documentId', { projectId, parentId: rootDocumentId, title: 'Capítulo histórico', type: 'chapter', content: content('El faro') })
  await create(fixture, file, ownerCookie, '/documents', 'editorDocumentId', { projectId, parentId: rootDocumentId, title: 'Capítulo de escritura', type: 'chapter', content: content('') })
  const secondDocumentId = await create(fixture, file, ownerCookie, '/documents', 'secondDocumentId', { projectId: secondProjectId, title: 'La isla', type: 'chapter', content: content('La isla') })
  await create(fixture, file, ownerCookie, '/documents', 'emptyDocumentId', { projectId: secondProjectId, title: 'Sin actividad', type: 'chapter', content: content('') })
  await create(fixture, file, foreignCookie, '/documents', 'foreignDocumentId', { projectId: foreignProjectId, title: 'Documento ajeno', type: 'chapter', content: content('Datos de la cuenta ajena') })
  await verifyStatsOwners(prisma, fixture)
  const owned = await prisma.document.count({ where: { userId: fixture.userId, OR: [{ id: documentId, projectId }, { id: secondDocumentId, projectId: secondProjectId }] } })
  if (owned !== 2) throw new FixtureError('Historical fixture documents are not owned by the synthetic writer.')
  await prisma.writingStats.createMany({ data: [
    { userId: fixture.userId!, projectId, documentId, day: fixture.yesterday, wordsAdded: 40, activeMilliseconds: 600_000 },
    { userId: fixture.userId!, projectId: secondProjectId, documentId: secondDocumentId, day: fixture.previousDay, wordsAdded: 15, activeMilliseconds: 120_000 },
  ] })
  const suspended = await prisma.user.updateMany({ where: { id: fixture.foreignUserId, email: `${fixture.marker}-foreign@example.invalid`, name }, data: { status: 'suspended', suspendedUntil: new Date(Date.now() + 86_400_000) } })
  if (suspended.count !== 1) throw new FixtureError('Synthetic suspension fixture could not be prepared.')
}

async function setup(path: string, prisma: PrismaClient) {
  const marker = `phase10-${randomUUID()}`
  const fixture: StatsFixture = { version: 1, marker,
    storageStatePath: join(dirname(path), `archivum-${marker}-owner-auth.json`), foreignStorageStatePath: join(dirname(path), `archivum-${marker}-foreign-auth.json`),
    yesterday: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10), previousDay: new Date(Date.now() - 172_800_000).toISOString().slice(0, 10) }
  const file = await open(path, 'wx', 0o600)
  try {
    await saveManifest(file, fixture)
    await seed(fixture, prisma, file)
    await saveManifest(file, fixture)
  } catch (error) {
    try { await cleanupStats(prisma, fixture); await removeFiles([fixture.storageStatePath, fixture.foreignStorageStatePath, path], 10) } catch {
      await saveManifest(file, fixture)
      throw new FixtureError('Setup failed and partial cleanup could not finish. Preserve this manifest and retry --cleanup.')
    }
    throw error
  } finally { await file.close() }
  console.log(`Synthetic stats fixture ready: ${path}`)
}

async function main() {
  let path = process.env.STATS_E2E_FIXTURE ?? join(tmpdir(), 'archivum-phase10-fixture.json')
  let cleanup = false
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--help') { console.log('pnpm exec node --import tsx src/test/stats-fixture.ts [--fixture <temporary-path>] [--cleanup]\nRequires local API 3001 and its database. STATS_E2E_FIXTURE overrides the os.tmpdir() default.'); return }
    if (args[index] === '--cleanup') cleanup = true
    else if (args[index] === '--fixture' && args[index + 1]) path = args[++index]
    else throw new FixtureError('Unsupported argument.')
  }
  if (process.env.NODE_ENV === 'production') throw new FixtureError('Stats fixtures cannot run in production mode.')
  process.env.NODE_ENV = 'test'
  path = await temporaryPath(resolve(path), 10)
  const { prisma } = await import('../lib/prisma.js')
  try {
    if (cleanup) {
      const stat = await existingFile(path)
      if (stat.size > 65_536) throw new FixtureError('Unexpected manifest size.')
      const fixture = parseStatsFixture(JSON.parse(await readFile(path, 'utf8')), path)
      await cleanupStats(prisma, fixture)
      await removeFiles([fixture.storageStatePath, fixture.foreignStorageStatePath, path], 10)
      console.log('Tracked phase 10 synthetic accounts and temporary files removed.')
    } else await setup(path, prisma)
  } finally { await prisma.$disconnect() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void main().catch((error: unknown) => {
  console.error(error instanceof FixtureError ? error.message : `Stats fixture failed (${error instanceof Error ? error.name : 'UnknownError'}).`)
  process.exitCode = 1
})
