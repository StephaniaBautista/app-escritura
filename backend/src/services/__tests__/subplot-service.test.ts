import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findFirst: vi.fn() },
    subplot: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    $transaction: vi.fn((promises: Promise<unknown>[]) => Promise.all(promises)),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { subplotService } from '../subplot-service.js'

const projectRow = { id: 'proj-1', name: 'Mi novela', userId: 'user-1' }
const subplotRow = { id: 'sub-1', projectId: 'proj-1', title: 'Romance secundario', status: 'active', order: 0 }

describe('subplotService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation((promises: Promise<unknown>[]) => Promise.all(promises))
  })

  it('list devuelve null sin ownership', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null)

    expect(await subplotService.list('proj-1', 'user-1')).toBeNull()
    expect(prismaMock.subplot.findMany).not.toHaveBeenCalled()
  })

  it('list devuelve las subtramas ordenadas', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRow)
    prismaMock.subplot.findMany.mockResolvedValue([subplotRow])

    const result = await subplotService.list('proj-1', 'user-1')

    expect(prismaMock.subplot.findMany).toHaveBeenCalledWith({
      where: { projectId: 'proj-1' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    expect(result).toEqual([subplotRow])
  })

  it('create normaliza status inválido a active y usa el contador como order', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRow)
    prismaMock.subplot.count.mockResolvedValue(3)
    prismaMock.subplot.create.mockResolvedValue(subplotRow)

    await subplotService.create('proj-1', 'user-1', { title: 'Romance secundario', status: 'inexistente' })

    expect(prismaMock.subplot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: 'Romance secundario', status: 'active', order: 3 }),
    })
  })

  it('create devuelve null sin ownership', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null)

    expect(await subplotService.create('proj-1', 'user-2', { title: 'X' })).toBeNull()
    expect(prismaMock.subplot.create).not.toHaveBeenCalled()
  })

  it('update devuelve null si la subtrama es de otro usuario', async () => {
    prismaMock.subplot.findFirst.mockResolvedValue(null)

    expect(await subplotService.update('sub-1', 'user-2', { title: 'X' })).toBeNull()
    expect(prismaMock.subplot.update).not.toHaveBeenCalled()
  })

  it('update normaliza el status y actualiza', async () => {
    prismaMock.subplot.findFirst.mockResolvedValue(subplotRow)
    prismaMock.subplot.update.mockResolvedValue({ ...subplotRow, status: 'resolved' })

    const result = await subplotService.update('sub-1', 'user-1', { status: 'resolved' })

    expect(prismaMock.subplot.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: expect.objectContaining({ status: 'resolved' }),
    })
    expect(result).toEqual({ ...subplotRow, status: 'resolved' })
  })

  it('remove devuelve false si no existe', async () => {
    prismaMock.subplot.findFirst.mockResolvedValue(null)

    expect(await subplotService.remove('sub-1', 'user-1')).toBe(false)
    expect(prismaMock.subplot.delete).not.toHaveBeenCalled()
  })

  it('remove borra y devuelve true', async () => {
    prismaMock.subplot.findFirst.mockResolvedValue(subplotRow)
    prismaMock.subplot.delete.mockResolvedValue(subplotRow)

    expect(await subplotService.remove('sub-1', 'user-1')).toBe(true)
    expect(prismaMock.subplot.delete).toHaveBeenCalledWith({ where: { id: 'sub-1' } })
  })

  it('reorder actualiza order por índice del array en una transacción', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRow)
    prismaMock.subplot.findMany.mockResolvedValue([{ id: 'sub-1' }, { id: 'sub-2' }])
    prismaMock.subplot.update.mockResolvedValue({})

    await subplotService.reorder('proj-1', 'user-1', ['sub-2', 'sub-1'])

    expect(prismaMock.subplot.update).toHaveBeenNthCalledWith(1, { where: { id: 'sub-2' }, data: { order: 0 } })
    expect(prismaMock.subplot.update).toHaveBeenNthCalledWith(2, { where: { id: 'sub-1' }, data: { order: 1 } })
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
  })

  it('reorder ignora ids ajenos al proyecto', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRow)
    prismaMock.subplot.findMany.mockResolvedValue([{ id: 'sub-1' }])
    prismaMock.subplot.update.mockResolvedValue({})

    await subplotService.reorder('proj-1', 'user-1', ['sub-ajena', 'sub-1'])

    expect(prismaMock.subplot.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.subplot.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { order: 0 } })
  })

  it('reorder devuelve null sin ownership', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null)

    expect(await subplotService.reorder('proj-1', 'user-2', ['sub-1'])).toBeNull()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })
})
