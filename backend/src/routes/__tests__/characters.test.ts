import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

const { mocks } = vi.hoisted(() => {
  const characterService = {
    listByProject: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    evolve: vi.fn(),
  }
  const storageService = {
    uploadCharacterImage: vi.fn(),
    deleteCharacterImage: vi.fn(),
  }
  return {
    mocks: {
      getSessionUser: vi.fn(),
      characterService,
      storageService,
      StorageUnavailableError: class extends Error {
        constructor() {
          super('storage unavailable')
          this.name = 'StorageUnavailableError'
        }
      },
      MAX_IMAGE_BYTES: 3 * 1024 * 1024,
    },
  }
})

vi.mock('../../lib/session.js', () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock('../../services/character-service.js', () => ({ characterService: mocks.characterService }))
vi.mock('../../services/storage-service.js', () => ({
  storageService: mocks.storageService,
  StorageUnavailableError: mocks.StorageUnavailableError,
  MAX_IMAGE_BYTES: mocks.MAX_IMAGE_BYTES,
}))

import { characterRoutes } from '../characters.js'

async function buildApp() {
  const app = Fastify()
  await app.register(characterRoutes, { prefix: '/api' })
  await app.ready()
  return app
}

const charRow = {
  id: 'char-1',
  projectId: 'proj-1',
  name: 'Lyra',
  description: null,
  imageUrl: null,
  nicknames: [],
  age: null,
  gender: null,
  heightCm: null,
  orientation: null,
  maritalStatus: null,
  species: null,
  birthPlace: null,
  birthDate: null,
  role: null,
  roleSpec: null,
  isOC: false,
  parentIds: [],
  evolvesFromId: null,
  evolutionReason: null,
  attributes: {},
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

describe('characterRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1', email: 'a@b.c' })
  })

  it('401 sin sesión', async () => {
    mocks.getSessionUser.mockResolvedValue(null)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/projects/proj-1/characters' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('GET /projects/:projectId/characters devuelve la lista', async () => {
    mocks.characterService.listByProject.mockResolvedValue([charRow])
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/projects/proj-1/characters' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([expect.objectContaining({ id: 'char-1' })])
    await app.close()
  })

  it('GET lista: 404 si el proyecto no es del usuario', async () => {
    mocks.characterService.listByProject.mockResolvedValue(null)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/projects/proj-1/characters' })
    expect(res.statusCode).toBe(404)
    await app.close()
  })

  it('POST create: 201 y llama al service con el body', async () => {
    mocks.characterService.create.mockResolvedValue(charRow)
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects/proj-1/characters',
      payload: { name: 'Lyra' },
    })
    expect(res.statusCode).toBe(201)
    expect(mocks.characterService.create).toHaveBeenCalledWith('proj-1', 'user-1', { name: 'Lyra' })
    await app.close()
  })

  it('POST create: 400 sin nombre (validación de schema)', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects/proj-1/characters',
      payload: { age: '17' },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('GET /characters/:id devuelve el personaje', async () => {
    mocks.characterService.get.mockResolvedValue(charRow)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/characters/char-1' })
    expect(res.statusCode).toBe(200)
    await app.close()
  })

  it('PUT update: 404 si no existe', async () => {
    mocks.characterService.update.mockResolvedValue(null)
    const app = await buildApp()
    const res = await app.inject({ method: 'PUT', url: '/api/characters/char-1', payload: { name: 'X' } })
    expect(res.statusCode).toBe(404)
    await app.close()
  })

  it('DELETE elimina y devuelve mensaje', async () => {
    mocks.characterService.delete.mockResolvedValue(true)
    const app = await buildApp()
    const res = await app.inject({ method: 'DELETE', url: '/api/characters/char-1' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Personaje eliminado' })
    await app.close()
  })

  it('POST evolve: 201 y pasa reason + changes', async () => {
    mocks.characterService.evolve.mockResolvedValue(charRow)
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/characters/char-1/evolve',
      payload: { reason: 'envejece', changes: { name: 'Lyra mayor' } },
    })
    expect(res.statusCode).toBe(201)
    expect(mocks.characterService.evolve).toHaveBeenCalledWith('char-1', 'user-1', {
      reason: 'envejece',
      changes: { name: 'Lyra mayor' },
    })
    await app.close()
  })

  it('POST evolve: 400 sin reason', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'POST', url: '/api/characters/char-1/evolve', payload: {} })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('PUT image: 400 con dataUrl inválida', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/api/characters/char-1/image',
      payload: { dataUrl: 'no-es-una-dataurl' },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('PUT image: sube, actualiza y borra la imagen anterior', async () => {
    mocks.characterService.get.mockResolvedValue({ ...charRow, imageUrl: 'https://old/image.png' })
    mocks.storageService.uploadCharacterImage.mockResolvedValue('https://cdn/new.png')
    mocks.characterService.update.mockResolvedValue({ ...charRow, imageUrl: 'https://cdn/new.png' })
    mocks.storageService.deleteCharacterImage.mockResolvedValue(true)
    const app = await buildApp()

    const res = await app.inject({
      method: 'PUT',
      url: '/api/characters/char-1/image',
      payload: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
    })

    expect(res.statusCode).toBe(200)
    expect(mocks.storageService.uploadCharacterImage).toHaveBeenCalled()
    expect(mocks.characterService.update).toHaveBeenCalledWith('char-1', 'user-1', { imageUrl: 'https://cdn/new.png' })
    expect(mocks.storageService.deleteCharacterImage).toHaveBeenCalledWith('https://old/image.png')
    await app.close()
  })

  it('PUT image: 503 si storage no está configurado', async () => {
    mocks.characterService.get.mockResolvedValue(charRow)
    mocks.storageService.uploadCharacterImage.mockRejectedValue(new mocks.StorageUnavailableError())
    const app = await buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/api/characters/char-1/image',
      payload: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
    })
    expect(res.statusCode).toBe(503)
    await app.close()
  })

  it('PUT image: 400 si la imagen supera el tamaño máximo', async () => {
    mocks.characterService.get.mockResolvedValue(charRow)
    mocks.storageService.uploadCharacterImage.mockRejectedValue(new Error('La imagen supera el tamaño máximo de 3 MB'))
    const app = await buildApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/api/characters/char-1/image',
      payload: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('IMAGE_TOO_LARGE')
    await app.close()
  })

  it('DELETE image: quita la url del personaje', async () => {
    mocks.characterService.get.mockResolvedValue({ ...charRow, imageUrl: 'https://cdn/x.png' })
    mocks.storageService.deleteCharacterImage.mockResolvedValue(true)
    mocks.characterService.update.mockResolvedValue({ ...charRow, imageUrl: null })
    const app = await buildApp()
    const res = await app.inject({ method: 'DELETE', url: '/api/characters/char-1/image' })
    expect(res.statusCode).toBe(200)
    expect(mocks.characterService.update).toHaveBeenCalledWith('char-1', 'user-1', { imageUrl: null })
    await app.close()
  })
})
