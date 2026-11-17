import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { subplot: { findFirst: vi.fn() } },
}))

vi.mock('../prisma.js', () => ({ prisma: prismaMock }))

import { resolveSubplotId, replySubplotError, SubplotNotInProjectError } from '../subplot-link.js'

function fakeReply() {
  const reply = { code: vi.fn(), send: vi.fn() }
  reply.code.mockReturnValue(reply)
  reply.send.mockReturnValue(reply)
  return reply
}

describe('resolveSubplotId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deja undefined y null tal cual sin consultar', async () => {
    expect(await resolveSubplotId('proj-1', undefined)).toBeUndefined()
    expect(await resolveSubplotId('proj-1', null)).toBeNull()
    expect(prismaMock.subplot.findFirst).not.toHaveBeenCalled()
  })

  it('devuelve el id si la subtrama es del proyecto', async () => {
    prismaMock.subplot.findFirst.mockResolvedValue({ id: 'sub-1' })
    expect(await resolveSubplotId('proj-1', 'sub-1')).toBe('sub-1')
    expect(prismaMock.subplot.findFirst).toHaveBeenCalledWith({ where: { id: 'sub-1', projectId: 'proj-1' }, select: { id: true } })
  })

  it('lanza SubplotNotInProjectError si no pertenece', async () => {
    prismaMock.subplot.findFirst.mockResolvedValue(null)
    await expect(resolveSubplotId('proj-1', 'sub-x')).rejects.toBeInstanceOf(SubplotNotInProjectError)
  })
})

describe('replySubplotError', () => {
  it('responde 400 con el código para SubplotNotInProjectError', () => {
    const reply = fakeReply()
    replySubplotError(reply as never, new SubplotNotInProjectError())
    expect(reply.code).toHaveBeenCalledWith(400)
    expect(reply.send).toHaveBeenCalledWith({ error: { code: 'SUBPLOT_NOT_IN_PROJECT', message: expect.any(String) } })
  })

  it('relanza cualquier otro error', () => {
    const reply = fakeReply()
    expect(() => replySubplotError(reply as never, new Error('boom'))).toThrow('boom')
    expect(reply.code).not.toHaveBeenCalled()
  })
})
