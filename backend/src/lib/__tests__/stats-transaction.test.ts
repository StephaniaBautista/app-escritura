import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ $transaction: vi.fn() }))
vi.mock('../prisma.js', () => ({ prisma: db }))
import { writingTransaction } from '../stats-transaction.js'

const failure = (code: string) => Object.assign(new Error('transaction failure'), { code })
beforeEach(() => { vi.resetAllMocks(); db.$transaction.mockImplementation((run) => run({})) })

describe('safe acquisition retries', () => {
  it('retries one P2028 only when the callback has never started', async () => {
    db.$transaction.mockRejectedValueOnce(failure('P2028'))
    const run = vi.fn().mockResolvedValue('saved')
    expect(await writingTransaction(run)).toBe('saved')
    expect(run).toHaveBeenCalledTimes(1)
    expect(db.$transaction).toHaveBeenCalledTimes(2)
    expect(db.$transaction).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 })
  })
  it('stops after the second failed acquisition without running a write', async () => {
    db.$transaction.mockRejectedValue(failure('P2028'))
    const run = vi.fn()
    await expect(writingTransaction(run)).rejects.toMatchObject({ code: 'P2028' })
    expect(run).not.toHaveBeenCalled()
    expect(db.$transaction).toHaveBeenCalledTimes(2)
  })
  it('never repeats an ambiguous failure after the callback returned', async () => {
    db.$transaction.mockImplementation(async (run) => { await run({}); throw failure('P2028') })
    const run = vi.fn().mockResolvedValue('saved')
    await expect(writingTransaction(run)).rejects.toMatchObject({ code: 'P2028' })
    expect(run).toHaveBeenCalledTimes(1)
    expect(db.$transaction).toHaveBeenCalledTimes(1)
  })
  it('never retries a timeout thrown during the write callback', async () => {
    const run = vi.fn().mockRejectedValue(failure('P2028'))
    await expect(writingTransaction(run)).rejects.toMatchObject({ code: 'P2028' })
    expect(run).toHaveBeenCalledTimes(1)
    expect(db.$transaction).toHaveBeenCalledTimes(1)
  })
  it('retries an explicit raw adapter serialization conflict at commit', async () => {
    let attempts = 0
    const error = Object.assign(new Error('transaction failed'), { name: 'DriverAdapterError', cause: { originalCode: '40001', kind: 'TransactionWriteConflict' } })
    db.$transaction.mockImplementation(async (run) => {
      const result = await run({})
      if (++attempts === 1) throw error
      return result
    })
    const run = vi.fn().mockResolvedValue('saved')
    expect(await writingTransaction(run)).toBe('saved')
    expect(run).toHaveBeenCalledTimes(2)
  })
  it('bounds raw adapter serialization retries at three attempts', async () => {
    const error = Object.assign(new Error('transaction failed'), { name: 'DriverAdapterError', cause: { originalCode: '40001', kind: 'TransactionWriteConflict' } })
    db.$transaction.mockImplementation(async (run) => { await run({}); throw error })
    const run = vi.fn().mockResolvedValue('saved')
    await expect(writingTransaction(run)).rejects.toBe(error)
    expect(run).toHaveBeenCalledTimes(3)
    expect(db.$transaction).toHaveBeenCalledTimes(3)
  })

  it('keeps the three-attempt total bound when contention follows acquisition timeout', async () => {
    db.$transaction.mockRejectedValueOnce(failure('P2028')).mockRejectedValue(failure('P2034'))
    await expect(writingTransaction(async () => 'saved')).rejects.toMatchObject({ code: 'P2034' })
    expect(db.$transaction).toHaveBeenCalledTimes(3)
  })
})
