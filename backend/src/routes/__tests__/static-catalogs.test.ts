import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

const { mocks } = vi.hoisted(() => {
  const characterOptionService = {
    listByType: vi.fn(),
    listGrouped: vi.fn(),
  }
  const storySectionService = {
    list: vi.fn(),
  }
  return {
    mocks: {
      getSessionUser: vi.fn(),
      characterOptionService,
      storySectionService,
    },
  }
})

vi.mock('../../lib/session.js', () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock('../../services/character-option-service.js', () => ({
  characterOptionService: mocks.characterOptionService,
  CHARACTER_OPTION_TYPES: ['gender', 'orientation', 'maritalStatus', 'role'],
}))
vi.mock('../../services/story-section-service.js', () => ({
  storySectionService: mocks.storySectionService,
}))

import { characterOptionsRoutes } from '../character-options.js'
import { storySectionsRoutes } from '../story-sections.js'

async function buildApp() {
  const app = Fastify()
  await app.register(characterOptionsRoutes, { prefix: '/api' })
  await app.register(storySectionsRoutes, { prefix: '/api' })
  await app.ready()
  return app
}

describe('catálogos estáticos (M41)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1' })
  })

  it('GET /character-options: sin type devuelve grouped', async () => {
    mocks.characterOptionService.listGrouped.mockResolvedValue([{ type: 'gender', options: [] }])
    const app = await buildApp()

    const res = await app.inject({ method: 'GET', url: '/api/character-options' })

    expect(res.statusCode).toBe(200)
    expect(mocks.characterOptionService.listGrouped).toHaveBeenCalled()
    expect(JSON.parse(res.body)).toEqual([{ type: 'gender', options: [] }])
  })

  it('GET /character-options: con type válido filtra por tipo', async () => {
    mocks.characterOptionService.listByType.mockResolvedValue([{ id: 'co-1' }])
    const app = await buildApp()

    const res = await app.inject({ method: 'GET', url: '/api/character-options?type=role' })

    expect(res.statusCode).toBe(200)
    expect(mocks.characterOptionService.listByType).toHaveBeenCalledWith('role')
  })

  it('GET /character-options: type inválido → 400', async () => {
    const app = await buildApp()

    const res = await app.inject({ method: 'GET', url: '/api/character-options?type=hack' })

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).statusCode).toBe(400)
  })

  it('GET /character-options: sin sesión → 401', async () => {
    mocks.getSessionUser.mockResolvedValue(null)
    const app = await buildApp()

    const res = await app.inject({ method: 'GET', url: '/api/character-options' })

    expect(res.statusCode).toBe(401)
  })

  it('GET /story-sections: lista las secciones estándar', async () => {
    mocks.storySectionService.list.mockResolvedValue([{ id: 'inicio', sortOrder: 1 }])
    const app = await buildApp()

    const res = await app.inject({ method: 'GET', url: '/api/story-sections' })

    expect(res.statusCode).toBe(200)
    expect(mocks.storySectionService.list).toHaveBeenCalled()
  })

  it('GET /story-sections: sin sesión → 401', async () => {
    mocks.getSessionUser.mockResolvedValue(null)
    const app = await buildApp()

    const res = await app.inject({ method: 'GET', url: '/api/story-sections' })

    expect(res.statusCode).toBe(401)
  })
})
