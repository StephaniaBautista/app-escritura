import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock, versionServiceMock, settingsServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    document: { findFirst: vi.fn(), update: vi.fn() },
    documentVersion: { findFirst: vi.fn() },
    $executeRaw: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
  versionServiceMock: { create: vi.fn() },
  settingsServiceMock: { getAutoVersionConfig: vi.fn() },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))
vi.mock('../version-service.js', () => ({ versionService: versionServiceMock }))
vi.mock('../settings-service.js', () => ({
  settingsService: settingsServiceMock,
  DEFAULT_AUTO_VERSION_CONFIG: {
    inactivity: { enabled: true, intervalMs: 5 * 60 * 1000 },
    exit: { enabled: true },
    hourly: { enabled: true, intervalMs: 60 * 60 * 1000 },
    daily: { enabled: true, intervalMs: 24 * 60 * 60 * 1000 },
    weekly: { enabled: true, intervalMs: 7 * 24 * 60 * 60 * 1000 },
    monthly: { enabled: true, intervalMs: 30 * 24 * 60 * 60 * 1000 },
  },
}))

import { autoVersionService } from '../auto-version-service.js'

const docRow = {
  id: 'doc-1',
  userId: 'user-1',
  updatedAt: new Date(),
  autoVersionState: {},
}

const defaultConfig = {
  inactivity: { enabled: true, intervalMs: 5 * 60 * 1000 },
  exit: { enabled: true },
  hourly: { enabled: true, intervalMs: 60 * 60 * 1000 },
  daily: { enabled: true, intervalMs: 24 * 60 * 60 * 1000 },
  weekly: { enabled: true, intervalMs: 7 * 24 * 60 * 60 * 1000 },
  monthly: { enabled: true, intervalMs: 30 * 24 * 60 * 60 * 1000 },
}

describe('autoVersionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    settingsServiceMock.getAutoVersionConfig.mockResolvedValue(defaultConfig)
  })

  it('checkAndCreate: no crea versión si trigger está deshabilitado', async () => {
    settingsServiceMock.getAutoVersionConfig.mockResolvedValue({
      ...defaultConfig,
      inactivity: { enabled: false, intervalMs: 5 * 60 * 1000 },
    })

    const result = await autoVersionService.checkAndCreate('doc-1', 'user-1', 'inactivity')

    expect(result.created).toBe(false)
    expect(versionServiceMock.create).not.toHaveBeenCalled()
  })

  it('checkAndCreate: no crea versión si no hay cambios desde última versión', async () => {
    const recentDate = new Date()
    prismaMock.document.findFirst.mockResolvedValue(docRow)
    prismaMock.documentVersion.findFirst.mockResolvedValue({ createdAt: recentDate })

    const result = await autoVersionService.checkAndCreate('doc-1', 'user-1', 'hourly')

    expect(result.created).toBe(false)
  })

  it('checkAndCreate: crea versión si hay cambios y trigger habilitado', async () => {
    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000)
    prismaMock.document.findFirst.mockResolvedValue({ ...docRow, updatedAt: new Date() })
    prismaMock.documentVersion.findFirst.mockResolvedValue({ createdAt: oldDate })
    versionServiceMock.create.mockResolvedValue({ id: 'ver-1' })

    const result = await autoVersionService.checkAndCreate('doc-1', 'user-1', 'hourly')

    expect(result.created).toBe(true)
    expect(versionServiceMock.create).toHaveBeenCalledWith('doc-1', 'user-1', undefined, undefined)
  })

  it('checkAndCreate: propaga branchId a versionService.create', async () => {
    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000)
    prismaMock.document.findFirst.mockResolvedValue({ ...docRow, updatedAt: new Date() })
    prismaMock.documentVersion.findFirst.mockResolvedValue({ createdAt: oldDate })
    versionServiceMock.create.mockResolvedValue({ id: 'ver-1' })

    const result = await autoVersionService.checkAndCreate('doc-1', 'user-1', 'hourly', undefined, 'branch-1')

    expect(result.created).toBe(true)
    expect(versionServiceMock.create).toHaveBeenCalledWith('doc-1', 'user-1', undefined, 'branch-1')
  })

  it('checkAndCreate: crea versión si no hay versiones previas', async () => {
    prismaMock.document.findFirst.mockResolvedValue({ ...docRow, updatedAt: new Date() })
    prismaMock.documentVersion.findFirst.mockResolvedValue(null)
    versionServiceMock.create.mockResolvedValue({ id: 'ver-1' })

    const result = await autoVersionService.checkAndCreate('doc-1', 'user-1', 'exit')

    expect(result.created).toBe(true)
  })

  it('checkAndCreate: no crea si intervalo no ha pasado', async () => {
    const recentTrigger = new Date().toISOString()
    prismaMock.document.findFirst.mockResolvedValue({
      ...docRow,
      autoVersionState: { lastHourlyAt: recentTrigger },
    })

    const result = await autoVersionService.checkAndCreate('doc-1', 'user-1', 'hourly')

    expect(result.created).toBe(false)
  })

  it('updateActivity: actualiza lastActivityAt en el documento', async () => {
    prismaMock.document.findFirst.mockResolvedValue(docRow)
    prismaMock.$executeRawUnsafe.mockResolvedValue(undefined)

    await autoVersionService.updateActivity('doc-1', 'user-1', new Date().toISOString())

    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalled()
  })

  it('updateActivity: retorna null si documento no pertenece al usuario', async () => {
    prismaMock.document.findFirst.mockResolvedValue(null)

    const result = await autoVersionService.updateActivity('doc-1', 'user-1', new Date().toISOString())

    expect(result).toBeNull()
  })

  it('getState: retorna el estado del documento', async () => {
    prismaMock.document.findFirst.mockResolvedValue({ autoVersionState: { lastHourlyAt: '2026-01-01' } })

    const state = await autoVersionService.getState('doc-1', 'user-1')

    expect(state?.lastHourlyAt).toBe('2026-01-01')
  })
})
