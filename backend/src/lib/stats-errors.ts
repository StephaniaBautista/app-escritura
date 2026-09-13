function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

const databaseKinds = new Set(['TransactionWriteConflict', 'UniqueConstraintViolation', 'ForeignKeyConstraintViolation', 'TooManyConnections', 'ConnectionClosed', 'SocketTimeout', 'postgres'])

export function statsErrorDetails(error: unknown) {
  const row = object(error)
  const errorType = error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,79}$/.test(error.name) ? error.name : 'UnknownError'
  const errorCode = typeof row?.code === 'string' && /^P\d{4}$/.test(row.code) ? row.code : undefined
  const adapter = errorType === 'DriverAdapterError' ? row : object(object(row?.meta)?.driverAdapterError)
  const cause = object(adapter?.cause)
  const originalCode = cause?.originalCode ?? cause?.code
  const databaseCode = typeof originalCode === 'string' && /^[0-9A-Z]{5}$/.test(originalCode) ? originalCode : undefined
  const databaseKind = typeof cause?.kind === 'string' && databaseKinds.has(cause.kind) ? cause.kind : undefined
  return { errorType, ...(errorCode ? { errorCode } : {}), ...(databaseCode ? { databaseCode } : {}), ...(databaseKind ? { databaseKind } : {}) }
}

export function isWritingConflict(error: unknown): boolean {
  const details = statsErrorDetails(error)
  return details.errorCode === 'P2034' || (details.databaseCode === '40001' && details.databaseKind === 'TransactionWriteConflict')
}
