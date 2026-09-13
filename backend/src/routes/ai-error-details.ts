import { AI_VALIDATION_ISSUES, type AiValidationIssue } from '../services/ai-types.js'

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export function aiErrorDetails(error: unknown) {
  const row = object(error)
  const errorType = error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,79}$/.test(error.name) ? error.name : 'UnknownError'
  const errorCode = typeof row?.code === 'string' && /^P\d{4}$/.test(row.code) ? row.code : undefined
  const adapter = object(object(row?.meta)?.driverAdapterError)
  const cause = object(adapter?.cause)
  const originalCode = cause?.originalCode
  const databaseCode = typeof originalCode === 'string' && /^[0-9A-Z]{5}$/.test(originalCode) ? originalCode : undefined
  const validationIssue = typeof row?.validationIssue === 'string' && AI_VALIDATION_ISSUES.includes(row.validationIssue as AiValidationIssue) ? row.validationIssue : undefined
  return { errorType, ...(validationIssue ? { validationIssue } : {}), ...(errorCode ? { errorCode } : {}), ...(databaseCode ? { databaseCode } : {}) }
}
