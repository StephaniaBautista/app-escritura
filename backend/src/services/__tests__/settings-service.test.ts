import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    userSettings: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { settingsService, DEFAULT_AUTO_VERSION_CONFIG } from '../settings-service.js'

const settingsRow = (overrides?: Record<string, unknown>) => ({
  id: 'settings-1',
  userId: 'user-1',
  theme: 'system',
  language: 'es',
  autoVersion: DEFAULT_AUTO_VERSION_CONFIG,
  ...overrides,
})

describe('settingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('get: retorna settings existentes', async () => {
    prismaMock.userSettings.findUnique.mockResolvedValue(settingsRow())

    const result = await settingsService.get('user-1')

    expect(prismaMock.userSettings.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    expect(result.theme).toBe('system')
  })

  it('get: crea defaults si no existen settings', async () => {
    prismaMock.userSettings.findUnique.mockResolvedValue(null)
    prismaMock.userSettings.create.mockResolvedValue(settingsRow())

    const result = await settingsService.get('user-1')

    expect(prismaMock.userSettings.create).toHaveBeenCalled()
    expect(result.theme).toBe('system')
  })

  it('update: actualiza settings existentes', async () => {
    prismaMock.userSettings.findUnique.mockResolvedValue(settingsRow())
    prismaMock.userSettings.update.mockResolvedValue(settingsRow({ theme: 'dark' }))

    const result = await settingsService.update('user-1', { theme: 'dark' })

    expect(prismaMock.userSettings.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { theme: 'dark' },
    })
    expect(result.theme).toBe('dark')
  })

  it('update: crea settings si no existen', async () => {
    prismaMock.userSettings.findUnique.mockResolvedValue(null)
    prismaMock.userSettings.create.mockResolvedValue(settingsRow({ theme: 'dark' }))

    await settingsService.update('user-1', { theme: 'dark' })

    expect(prismaMock.userSettings.create).toHaveBeenCalled()
  })

  it('update: merge de autoVersion config', async () => {
    prismaMock.userSettings.findUnique.mockResolvedValue(settingsRow())
    prismaMock.userSettings.update.mockResolvedValue(settingsRow())

    await settingsService.update('user-1', {
      autoVersion: { inactivity: { enabled: false, intervalMs: 10000 } },
    })

    const updateCall = prismaMock.userSettings.update.mock.calls[0][0]
    expect(updateCall.data.autoVersion.inactivity.enabled).toBe(false)
  })

  it('getAutoVersionConfig: retorna config mergeda con defaults', async () => {
    prismaMock.userSettings.findUnique.mockResolvedValue(settingsRow())

    const config = await settingsService.getAutoVersionConfig('user-1')

    expect(config.inactivity.enabled).toBe(true)
    expect(config.hourly.enabled).toBe(true)
  })
})
