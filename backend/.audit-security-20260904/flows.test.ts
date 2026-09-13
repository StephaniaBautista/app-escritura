import { beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'

const m = vi.hoisted(() => ({
  prisma: {
    branch: { findMany: vi.fn(), findFirst: vi.fn() },
    documentVersion: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    document: { findFirst: vi.fn(), update: vi.fn() },
    character: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    versionParent: { createMany: vi.fn() },
  },
  remove: vi.fn(),
  authHandler: vi.fn(),
}))
vi.mock('../src/lib/prisma.js', () => ({ prisma: m.prisma }))
vi.mock('@generated/client', () => ({ Prisma: { JsonNull: null } }))
vi.mock('../src/lib/session.js', () => ({ getSessionUser: vi.fn(async () => ({ id: 'actor' })) }))
vi.mock('../src/lib/auth.js', () => ({ auth: { handler: m.authHandler } }))
vi.mock('../src/lib/supabase.js', () => ({
  SUPABASE_BUCKET: 'character-images',
  getSupabaseAdmin: () => ({ storage: { from: () => ({ remove: m.remove }) } }),
}))
import { branchRoutes } from '../src/routes/branches.js'
import { characterRoutes } from '../src/routes/characters.js'
import { authRoutes } from '../src/routes/auth.js'
import { characterService } from '../src/services/character-service.js'
import { documentService } from '../src/services/document-service.js'
import { mergeService } from '../src/services/merge-service.js'

describe('Reproducciones de auditoría con datos sintéticos', () => {
  beforeEach(() => { vi.resetAllMocks() })
  it('S02: una sesión ajena recibe el título privado en el grafo', async () => {
    m.prisma.branch.findMany.mockResolvedValue([])
    m.prisma.documentVersion.findMany.mockImplementation(async ({ where }) => {
      if (where.userId && where.userId !== 'victim') return []
      return [{ id: 'v-private', documentId: 'doc-victim', branchId: 'b-private', userId: 'victim', title: 'Título privado sintético', version: 1, createdAt: new Date(), parents: [] }]
    })
    const app = Fastify()
    await app.register(branchRoutes, { prefix: '/api' })
    const res = await app.inject('/api/documents/doc-victim/branches/graph')
    expect(res.statusCode).toBe(200)
    expect(res.json().nodes[0].title).toBe('Título privado sintético')
    await app.close()
  })
  it('S03: asignar URL ajena al personaje propio permite borrarla del bucket', async () => {
    const own: Record<string, unknown> = { id: 'own', projectId: 'p-actor', parentIds: [], imageUrl: null }
    m.prisma.character.findFirst.mockImplementation(async ({ where }) => where.id === 'own' && where.project.userId === 'actor' ? { ...own } : null)
    m.prisma.character.update.mockImplementation(async ({ data }) => {
      for (const [k, v] of Object.entries(data)) if (v !== undefined) own[k] = v
      return { ...own }
    })
    m.remove.mockResolvedValue({ error: null })
    const app = Fastify()
    await app.register(characterRoutes, { prefix: '/api' })
    const set = await app.inject({ method: 'PUT', url: '/api/characters/own', payload: { imageUrl: 'https://example.invalid/storage/v1/object/public/character-images/victim-photo.png' } })
    expect(set.statusCode).toBe(200)
    const del = await app.inject({ method: 'DELETE', url: '/api/characters/own/image' })
    expect(del.statusCode).toBe(200)
    expect(m.remove).toHaveBeenCalledWith(['victim-photo.png'])
    await app.close()
  })
  it('F03: actualizar solo nombre elimina los padres existentes', async () => {
    m.prisma.character.findFirst.mockResolvedValue({ id: 'own', projectId: 'p', parentIds: ['parent'] })
    m.prisma.character.update.mockImplementation(async ({ data }) => data)
    const updated = await characterService.update('own', 'actor', { name: 'Nombre nuevo' })
    expect(updated.parentIds).toEqual([])
  })
  it('F04: se acepta que un documento sea su propio padre', async () => {
    m.prisma.document.findFirst.mockResolvedValue({ id: 'doc', userId: 'actor', projectId: 'p' })
    m.prisma.document.update.mockImplementation(async ({ data }) => data)
    const updated = await documentService.update('doc', 'actor', { parentId: 'doc' })
    expect(updated.parentId).toBe('doc')
  })
  it('F05: se fusionan ramas de documentos distintos', async () => {
    m.prisma.branch.findFirst.mockImplementation(async ({ where }) => ({ id: where.id, userId: 'actor', documentId: where.id === 'source' ? 'doc-a' : 'doc-b', name: where.id, sourceVersionId: null }))
    m.prisma.document.findFirst.mockResolvedValue({ id: 'doc-b', title: 'B', userId: 'actor' })
    m.prisma.documentVersion.findFirst.mockResolvedValue(null)
    m.prisma.documentVersion.create.mockImplementation(async ({ data }) => ({ ...data, id: 'commit' }))
    const result = await mergeService.merge('source', 'target', 'actor')
    expect(result?.merged).toBe(true)
    expect(m.prisma.documentVersion.create.mock.calls[0][0].data.documentId).toBe('doc-b')
  })
  it('F06: una imagen de 900 KiB se rechaza antes del handler por el límite global', async () => {
    const app = Fastify()
    await app.register(characterRoutes, { prefix: '/api' })
    const res = await app.inject({ method: 'PUT', url: '/api/characters/own/image', payload: { dataUrl: `data:image/png;base64,${Buffer.alloc(900 * 1024).toString('base64')}` } })
    expect(res.statusCode).toBe(413)
    expect(m.prisma.character.findFirst).not.toHaveBeenCalled()
    await app.close()
  })
  it('F07: el puente de autenticación elimina la cabecera Location de un 302', async () => {
    m.authHandler.mockResolvedValue(new Response(null, { status: 302, headers: { Location: 'https://example.invalid/app' } }))
    const app = Fastify()
    await app.register(authRoutes, { prefix: '/api' })
    const res = await app.inject('/api/auth/callback/google?code=synthetic')
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBeUndefined()
    await app.close()
  })
})
