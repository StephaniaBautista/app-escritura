import { describe, expect, it } from 'vitest'
import { isWritingConflict, statsErrorDetails } from '../stats-errors.js'

const adapterError = (cause: object) => Object.assign(new Error('private SQL and document text'), { name: 'DriverAdapterError', cause })
const conflict = { originalCode: '40001', originalMessage: 'private details', kind: 'TransactionWriteConflict' }

describe('statistics database failure classification', () => {
  it('recognizes explicit raw PostgreSQL serialization conflicts from the installed adapter', () => {
    expect(isWritingConflict(adapterError(conflict))).toBe(true)
    expect(statsErrorDetails(adapterError(conflict))).toEqual({ errorType: 'DriverAdapterError', databaseCode: '40001', databaseKind: 'TransactionWriteConflict' })
  })
  it('recognizes wrapped adapter conflicts and Prisma P2034', () => {
    expect(isWritingConflict(Object.assign(new Error('conflict'), { meta: { driverAdapterError: { cause: conflict } } }))).toBe(true)
    expect(isWritingConflict(Object.assign(new Error('conflict'), { code: 'P2034' }))).toBe(true)
  })
  it.each([
    {}, { originalCode: '40001' }, { kind: 'TransactionWriteConflict' },
    { originalCode: '08006', kind: 'ConnectionClosed' }, { originalCode: '23505', kind: 'UniqueConstraintViolation' },
    { originalCode: '40001', kind: 'postgres' },
  ])('does not retry ambiguous or unrelated adapter errors %j', (cause) => {
    expect(isWritingConflict(adapterError(cause))).toBe(false)
  })
  it('never exposes database messages, fields, identifiers or unrecognized kind strings', () => {
    const error = adapterError({ originalCode: 'secret value', kind: 'private document text', originalMessage: 'secret', detail: 'credentials', userId: 'owner' })
    expect(statsErrorDetails(error)).toEqual({ errorType: 'DriverAdapterError' })
    expect(statsErrorDetails(Object.assign(new Error('secret'), { name: 'private text with spaces' }))).toEqual({ errorType: 'UnknownError' })
  })
})
