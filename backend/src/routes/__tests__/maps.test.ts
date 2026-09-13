import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getSessionUser: vi.fn(),
    mapService: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      attachBackground: vi.fn(),
      clearBackground: vi.fn(),
      remove: vi.fn(),
    },
    storageService: {
      uploadMapBackground: vi.fn(),
      deleteCharacterImage: vi.fn(),
    },
  },
}))

vi.mock('../../lib/session.js', () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock('../../services/map-service.js', () => ({ mapService: mocks.mapService }))
vi.mock('../../services/storage-service.js', async () => {
  const actual = await vi.importActual<typeof import('../../services/storage-service.js')>('../../services/storage-service.js')
  return { ...actual, storageService: mocks.storageService }
})

import { mapRoutes } from '../maps.js'
import { EMPTY_MAP_CANVAS } from '../../lib/map-canvas.js'

async function buildApp() {
  const app = Fastify()
  await app.register(mapRoutes, { prefix: '/api' })
  await app.ready()
  return app
}

const mapRow = {
  id: 'map-1',
  projectId: 'proj-1',
  name: 'Reino',
  backgroundUrl: null,
  canvas: EMPTY_MAP_CANVAS,
  order: 0,
  createdAt: '2026-09-12T00:00:00.000Z',
  updatedAt: '2026-09-12T00:00:00.000Z',
}

describe('mapRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1', email: 'a@b.c' })
  })

  it('401 sin sesión', async () => {
    mocks.getSessionUser.mockResolvedValue(null)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/projects/proj-1/maps' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('GET lista mapas', async () => {
    mocks.mapService.list.mockResolvedValue([mapRow])
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/projects/proj-1/maps' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([expect.objectContaining({ id: 'map-1' })])
    await app.close()
  })

  it('POST crea un mapa', async () => {
    mocks.mapService.create.mockResolvedValue(mapRow)
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects/proj-1/maps',
      payload: { name: 'Reino' },
    })
    expect(res.statusCode).toBe(201)
    expect(mocks.mapService.create).toHaveBeenCalledWith('proj-1', 'user-1', { name: 'Reino' })
    await app.close()
  })

  it('PUT canvas inválido responde 400', async () => {
    mocks.mapService.update.mockResolvedValue({ error: 'CANVAS_INVALID' })
    const app = await buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/api/maps/map-1',
      payload: { canvas: { objects: 'nope' } },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'CANVAS_INVALID' })
    await app.close()
  })

  it('DELETE mapa 204', async () => {
    mocks.mapService.remove.mockResolvedValue(mapRow)
    const app = await buildApp()
    const res = await app.inject({ method: 'DELETE', url: '/api/maps/map-1' })
    expect(res.statusCode).toBe(204)
    await app.close()
  })
})
