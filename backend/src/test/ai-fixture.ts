import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { lstat, open, readFile, realpath, unlink, type FileHandle } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { PrismaClient } from '@generated/client'

const name = 'Phase 9 synthetic verification'
const markerPattern = /^phase9-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const api = 'http://localhost:3001/api'
const origin = 'http://localhost:5173'
const idKeys = ['projectId', 'deniedProjectId', 'rootDocumentId', 'chapterId', 'secondChapterId', 'characterId', 'subplotId', 'historyConversationId'] as const
type SeedIds = Record<typeof idKeys[number], string>
interface Fixture extends Partial<SeedIds> {
  version: 1
  marker: string
  roleName: string
  roleCreated: boolean
  deniedRoleName: string
  deniedRoleCreated: boolean
  userId?: string
  deniedUserId?: string
  storageStatePath: string
  deniedStorageStatePath: string
}

export class FixtureError extends Error {}

function options() {
  const args = process.argv.slice(2)
  let fixturePath = process.env.AI_E2E_FIXTURE ?? join(tmpdir(), 'archivum-phase9-fixture.json')
  let cleanup = false
  let help = false
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--cleanup') cleanup = true
    else if (argument === '--help') help = true
    else if (argument === '--fixture' && args[index + 1]) fixturePath = args[++index]
    else throw new FixtureError('Use --fixture <temporary-path>, --cleanup or --help.')
  }
  return { fixturePath: resolve(fixturePath), cleanup, help }
}

export async function temporaryPath(path: string, phase: 9 | 10 = 9) {
  const parent = await realpath(dirname(path))
  const roots = [await realpath(tmpdir())]
  try { roots.push(await realpath('/tmp')) } catch {}
  const contained = roots.some((root) => {
    const difference = relative(root, parent)
    return difference === '' || !isAbsolute(difference) && difference !== '..' && !difference.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
  })
  if (!contained || !new RegExp(`^archivum-phase${phase}[\\w.-]*\\.json$`).test(basename(path))) {
    throw new FixtureError(`Fixture files must be named archivum-phase${phase}*.json inside a temporary directory.`)
  }
  return join(parent, basename(path))
}

export async function existingFile(path: string) {
  const stat = await lstat(path)
  if (!stat.isFile() || stat.isSymbolicLink() || process.getuid && stat.uid !== process.getuid()) {
    throw new FixtureError('Refusing a fixture file that is not a regular file owned by the current user.')
  }
  return stat
}

export function parseFixture(value: unknown, path: string): Fixture {
  if (!value || typeof value !== 'object') throw new FixtureError('Invalid fixture manifest.')
  const data = value as Record<string, unknown>
  if (data.version !== 1 || typeof data.marker !== 'string' || !markerPattern.test(data.marker)
    || data.roleName !== data.marker || typeof data.roleCreated !== 'boolean'
    || data.deniedRoleName !== `${data.marker}-denied` || typeof data.deniedRoleCreated !== 'boolean') throw new FixtureError('Invalid synthetic fixture marker.')
  for (const key of ['userId', 'deniedUserId', ...idKeys]) {
    if (data[key] !== undefined && (typeof data[key] !== 'string' || !data[key])) throw new FixtureError('Invalid tracked fixture identifier.')
  }
  if (data.storageStatePath !== join(dirname(path), `archivum-${data.marker}-writer-auth.json`)
    || data.deniedStorageStatePath !== join(dirname(path), `archivum-${data.marker}-denied-auth.json`)) {
    throw new FixtureError('Authentication files do not belong to this fixture marker.')
  }
  if (data.userId && data.userId === data.deniedUserId) throw new FixtureError('Fixture accounts must be distinct.')
  return data as unknown as Fixture
}

export async function saveManifest(file: FileHandle, fixture: object) {
  const bytes = Buffer.from(JSON.stringify(fixture, null, 2))
  await file.truncate(0)
  await file.write(bytes, 0, bytes.length, 0)
  await file.sync()
}

export async function saveState(path: string, headers: Headers) {
  const cookies = headers.getSetCookie().map((header) => {
    const [pair, ...attributes] = header.split(';')
    const separator = pair.indexOf('=')
    const flags = attributes.map((attribute) => attribute.trim().toLowerCase())
    if (separator < 1) throw new FixtureError('Invalid signup session cookie.')
    const sameSite = flags.includes('samesite=strict') ? 'Strict' : flags.includes('samesite=none') ? 'None' : 'Lax'
    return { name: pair.slice(0, separator), value: pair.slice(separator + 1), domain: 'localhost', path: '/',
      expires: -1, httpOnly: flags.includes('httponly'), secure: flags.includes('secure'), sameSite }
  })
  if (!cookies.length) throw new FixtureError('Local BetterAuth signup must return a session for this fixture.')
  const file = await open(path, 'wx', 0o600)
  try { await file.writeFile(JSON.stringify({ cookies, origins: [] })) } finally { await file.close() }
}

async function createUser(prisma: PrismaClient, fixture: Fixture, suffix: 'writer' | 'denied', manifest: FileHandle) {
  const email = `${fixture.marker}-${suffix}@example.invalid`
  const response = await fetch(`${api}/auth/sign-up/email`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email, password: `Phase9!${randomUUID()}`, name }), signal: AbortSignal.timeout(20_000),
  })
  const data: unknown = await response.json()
  if (!response.ok || !data || typeof data !== 'object' || !('user' in data) || !data.user
    || typeof data.user !== 'object' || !('id' in data.user) || typeof data.user.id !== 'string') {
    throw new FixtureError(`Synthetic signup failed with HTTP ${response.status}.`)
  }
  if (suffix === 'writer') fixture.userId = data.user.id
  else fixture.deniedUserId = data.user.id
  await saveManifest(manifest, fixture)
  const user = await prisma.user.findUnique({ where: { id: data.user.id }, select: { email: true, name: true } })
  if (!user || user.email !== email || user.name !== name) throw new FixtureError('Local API and fixture database do not identify the same synthetic account.')
  await saveState(suffix === 'writer' ? fixture.storageStatePath : fixture.deniedStorageStatePath, response.headers)
}

export async function removeDatabaseFixture(prisma: PrismaClient, fixture: Fixture) {
  const accounts = [{ id: fixture.userId, suffix: 'writer' }, { id: fixture.deniedUserId, suffix: 'denied' }]
  const roles = [{ name: fixture.roleName, created: fixture.roleCreated }, { name: fixture.deniedRoleName, created: fixture.deniedRoleCreated }].filter((role) => role.created)
  await prisma.$transaction(async (transaction) => {
    for (const account of accounts) {
      if (!account.id) continue
      const user = await transaction.user.findUnique({ where: { id: account.id }, select: { email: true, name: true } })
      if (user && (user.email !== `${fixture.marker}-${account.suffix}@example.invalid` || user.name !== name)) {
        throw new FixtureError('Refusing to remove an account without the exact synthetic marker, email and name.')
      }
    }
    for (const trackedRole of roles) {
      const role = await transaction.role.findUnique({ where: { name: trackedRole.name }, select: { isSystem: true, label: true } })
      if (role && (role.isSystem || role.label !== name)) throw new FixtureError('Refusing to remove a role that is not owned by this synthetic fixture.')
      const untracked = await transaction.user.count({ where: { role: trackedRole.name, id: { notIn: accounts.flatMap((account) => account.id ? [account.id] : []) } } })
      if (untracked) throw new FixtureError('Synthetic role is assigned to an untracked account; cleanup stopped.')
    }
    for (const account of accounts) {
      if (account.id) await transaction.user.deleteMany({ where: { id: account.id, email: `${fixture.marker}-${account.suffix}@example.invalid`, name } })
    }
    for (const role of roles) await transaction.role.deleteMany({ where: { name: role.name, label: name, isSystem: false } })
  }, { maxWait: 10_000, timeout: 30_000 })
}

export async function removeFiles(paths: string[], phase: 9 | 10 = 9) {
  for (const path of paths) {
    await temporaryPath(path, phase)
    try { await existingFile(path) } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') continue
      throw error
    }
    await unlink(path)
  }
}

const tiptap = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

async function seed(prisma: PrismaClient, fixture: Fixture): Promise<SeedIds> {
  const { userId, deniedUserId } = fixture
  if (!userId || !deniedUserId) throw new FixtureError('Both synthetic users must exist before seeding.')
  return prisma.$transaction(async (transaction) => {
    await transaction.role.create({ data: { name: fixture.roleName, label: name, permissions: ['ai_chat', 'ai_characters', 'ai_suggestions'], isSystem: false } })
    await transaction.role.create({ data: { name: fixture.deniedRoleName, label: name, permissions: [], isSystem: false } })
    await transaction.user.update({ where: { id: userId }, data: { role: fixture.roleName } })
    await transaction.user.update({ where: { id: deniedUserId }, data: { role: fixture.deniedRoleName } })
    const project = await transaction.project.create({ data: { userId, name: 'El faro de Aurora · prueba IA', description: 'Historia ficticia para verificar asistencia contextual. Aurora quiere reparar un faro antes de una tormenta.' } })
    const denied = await transaction.project.create({ data: { userId: deniedUserId, name: 'Phase 9 permission verification' } })
    const root = await transaction.document.create({ data: { userId, projectId: project.id, title: 'El faro de Aurora', type: 'document', content: tiptap('Manuscrito sintético.') } })
    const chapter = await transaction.document.create({ data: { userId, projectId: project.id, parentId: root.id, type: 'chapter', order: 0, title: 'Capítulo 1 · La llegada', content: tiptap('Aurora tiene diecisiete años. Aurora es cartógrafa y teme las alturas. En su mochila guarda un mapa azul. El faro lleva diez años apagado. Bruno es su hermano mayor.') } })
    const second = await transaction.document.create({ data: { userId, projectId: project.id, parentId: root.id, type: 'chapter', order: 1, title: 'Capítulo 2 · La tormenta', content: tiptap('Al día siguiente, Aurora afirma tener treinta años. Encuentra una llave roja en el sótano: la palabra secreta es LUCERO-47. Bruno confiesa que apagó el faro.') } })
    const character = await transaction.character.create({ data: { projectId: project.id, name: 'Aurora', age: '17', description: 'Cartógrafa del puerto.', attributes: { personality: 'Curiosa', motivations: 'Reparar el faro' } } })
    const subplot = await transaction.subplot.create({ data: { projectId: project.id, title: 'El mapa incompleto', description: 'Aurora investiga por qué falta una isla en el mapa del puerto.', order: 0 } })
    const now = Date.now()
    const conversation = await transaction.aiConversation.create({ data: {
      userId, projectId: project.id, mode: 'adviser', title: 'Conversación de prueba guardada', expiresAt: new Date(now + 86_400_000),
      messages: { create: [
        { role: 'user', content: '¿Qué conflicto tiene Aurora?', requestId: 'fixture-history', requestHash: 'fixture-history', createdAt: new Date(now) },
        { role: 'assistant', content: '• Aurora quiere reparar el faro, pero teme las alturas. ¿Cómo afecta ese miedo a sus decisiones?', requestId: 'fixture-history', requestHash: 'fixture-history', provider: 'deepseek', model: 'synthetic-fixture', createdAt: new Date(now + 1), sources: [{ id: `document:${chapter.id}`, type: 'document', title: chapter.title, excerpt: 'Aurora es cartógrafa y teme las alturas.' }] },
      ] },
    } })
    return { projectId: project.id, deniedProjectId: denied.id, rootDocumentId: root.id, chapterId: chapter.id, secondChapterId: second.id, characterId: character.id, subplotId: subplot.id, historyConversationId: conversation.id }
  }, { maxWait: 10_000, timeout: 30_000 })
}

async function setup(prisma: PrismaClient, path: string) {
  const marker = `phase9-${randomUUID()}`
  const fixture: Fixture = { version: 1, marker, roleName: marker, roleCreated: false, deniedRoleName: `${marker}-denied`, deniedRoleCreated: false,
    storageStatePath: join(dirname(path), `archivum-${marker}-writer-auth.json`),
    deniedStorageStatePath: join(dirname(path), `archivum-${marker}-denied-auth.json`) }
  const manifest = await open(path, 'wx', 0o600)
  try {
    await saveManifest(manifest, fixture)
    await createUser(prisma, fixture, 'writer', manifest)
    await createUser(prisma, fixture, 'denied', manifest)
    Object.assign(fixture, await seed(prisma, fixture), { roleCreated: true, deniedRoleCreated: true })
    await saveManifest(manifest, fixture)
  } catch (error) {
    try {
      await removeDatabaseFixture(prisma, fixture)
      await removeFiles([fixture.storageStatePath, fixture.deniedStorageStatePath, path])
    } catch {
      await saveManifest(manifest, fixture)
      throw new FixtureError('Setup failed and partial cleanup could not finish. Preserve the manifest and retry --cleanup with the same --fixture path.')
    }
    throw error
  } finally { await manifest.close() }
  console.log(`Synthetic fixture ready: ${path}`)
}

async function main() {
  const configuration = options()
  if (configuration.help) {
    console.log('Setup: NODE_ENV=test pnpm exec tsx src/test/ai-fixture.ts [--fixture <temporary-path>]\nCleanup: same command with --cleanup. Requires local API 3001, frontend 5173 and matching backend DATABASE_URL. Default fixture path uses os.tmpdir(); AI_E2E_FIXTURE overrides it.')
    return
  }
  if (process.env.NODE_ENV === 'production') throw new FixtureError('This fixture helper cannot run with NODE_ENV=production.')
  process.env.NODE_ENV = 'test'
  const path = await temporaryPath(configuration.fixturePath)
  const { prisma } = await import('../lib/prisma.js')
  try {
    if (configuration.cleanup) {
      const stat = await existingFile(path)
      if (stat.size > 65_536) throw new FixtureError('Fixture manifest is unexpectedly large.')
      const fixture = parseFixture(JSON.parse(await readFile(path, 'utf8')), path)
      await removeDatabaseFixture(prisma, fixture)
      await removeFiles([fixture.storageStatePath, fixture.deniedStorageStatePath, path])
      console.log('Tracked synthetic accounts, projects, role and temporary files removed.')
    } else await setup(prisma, path)
  } finally { await prisma.$disconnect() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof FixtureError ? error.message : `Fixture operation failed (${error instanceof Error ? error.name : 'UnknownError'}).`)
    process.exitCode = 1
  })
}
